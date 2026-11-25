export type AuthRole = "SUPERADMIN" | "ADMIN";
export type AuthSessionSource = "better-auth" | "legacy-jwt";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  avatarUrl: string | null;
}

export interface AuthContext {
  user: AuthUser;
  activeStoreId: string | null;
  sessionSource: AuthSessionSource;
}

export interface AuthStoreRecord {
  id: string;
  ownerId: string;
}

export interface StoreMembershipRecord {
  role: AuthRole;
}

export interface StoreAccess<TStore extends AuthStoreRecord = AuthStoreRecord> {
  auth: AuthContext;
  store: TStore;
  storeRole: AuthRole;
  isOwner: boolean;
}

export interface AuthGuardDependencies<TStore extends AuthStoreRecord> {
  readBetterAuthSession(headers: Headers): Promise<unknown>;
  readLegacySession(headers: Headers): Promise<unknown>;
  findUserById(userId: string): Promise<AuthUser | null>;
  findStoreById(storeId: string): Promise<TStore | null>;
  findMembership(
    userId: string,
    storeId: string,
  ): Promise<StoreMembershipRecord | null>;
}

export interface SessionIdentity {
  userId: string;
  activeStoreId: string | null;
  source: AuthSessionSource;
}

const SAFE_REDIRECT_ORIGIN = "https://commercecraft.invalid";
const UNSAFE_REDIRECT_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function normalizeBetterAuthSession(
  value: unknown,
): SessionIdentity | null {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.session)) {
    return null;
  }

  const userId = optionalString(value.user.id);
  const sessionUserId = optionalString(value.session.userId);
  if (!userId || !sessionUserId || sessionUserId !== userId) return null;

  return {
    userId,
    activeStoreId: optionalString(value.session.activeStoreId),
    source: "better-auth",
  };
}

export function normalizeLegacySession(value: unknown): SessionIdentity | null {
  if (!isRecord(value)) return null;

  const userId = optionalString(value.userId);
  if (!userId) return null;

  return {
    userId,
    activeStoreId: optionalString(value.storeId),
    source: "legacy-jwt",
  };
}

export class UnauthenticatedError extends Error {
  readonly status = 401 as const;
  readonly code = "UNAUTHENTICATED" as const;

  constructor() {
    super("Unauthorized");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403 as const;
  readonly code = "FORBIDDEN" as const;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class AuthResourceNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code = "NOT_FOUND" as const;

  constructor(message: string) {
    super(message);
    this.name = "AuthResourceNotFoundError";
  }
}

export type AuthGuardError =
  | UnauthenticatedError
  | ForbiddenError
  | AuthResourceNotFoundError;

export interface AuthApiErrorBody {
  error: string;
}

export interface AuthErrorDescriptor {
  status: 401 | 403 | 404;
  body: AuthApiErrorBody;
}

export interface ApiErrorDescriptor {
  status: 401 | 403 | 404 | 500;
  body: AuthApiErrorBody;
}

export function getAuthErrorDescriptor(
  error: unknown,
): AuthErrorDescriptor | null {
  if (error instanceof UnauthenticatedError) {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  if (error instanceof ForbiddenError) {
    return { status: 403, body: { error: error.message || "Forbidden" } };
  }
  if (error instanceof AuthResourceNotFoundError) {
    return { status: 404, body: { error: error.message } };
  }
  return null;
}

export function getApiErrorDescriptor(error: unknown): ApiErrorDescriptor {
  return getAuthErrorDescriptor(error) ?? {
    status: 500,
    body: { error: "Internal server error" },
  };
}

function normalizeLocalRedirectPath(path: unknown): string | null {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    UNSAFE_REDIRECT_CHARACTERS.test(path)
  ) {
    return null;
  }

  try {
    const url = new URL(path, SAFE_REDIRECT_ORIGIN);
    if (url.origin !== SAFE_REDIRECT_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function safeLocalRedirectPath(
  path: unknown,
  fallback: string = "/dashboard",
): string {
  return (
    normalizeLocalRedirectPath(path) ??
    normalizeLocalRedirectPath(fallback) ??
    "/dashboard"
  );
}

export function createAuthGuardService<TStore extends AuthStoreRecord>(
  dependencies: AuthGuardDependencies<TStore>,
) {
  async function getAuthContext(headers: Headers): Promise<AuthContext | null> {
    const primarySession = await dependencies.readBetterAuthSession(headers);

    // Only an absent primary session may use the transitional cookie. If
    // Better Auth returns a malformed session, fail closed instead of silently
    // authenticating a potentially different legacy identity.
    const identity =
      primarySession === null || primarySession === undefined
        ? normalizeLegacySession(
            await dependencies.readLegacySession(headers),
          )
        : normalizeBetterAuthSession(primarySession);
    if (!identity) return null;

    // Cookie/session claims identify the account only. Current authorization
    // always comes from the database.
    const user = await dependencies.findUserById(identity.userId);
    if (!user) return null;

    return {
      user,
      activeStoreId: identity.activeStoreId,
      sessionSource: identity.source,
    };
  }

  async function requireAuth(headers: Headers): Promise<AuthContext> {
    const context = await getAuthContext(headers);
    if (!context) throw new UnauthenticatedError();
    return context;
  }

  async function requireStoreAccessForContext(
    context: AuthContext,
    storeId: string,
  ): Promise<StoreAccess<TStore>> {
    const store = await dependencies.findStoreById(storeId);
    if (!store) throw new AuthResourceNotFoundError("Store not found");

    if (context.user.role === "SUPERADMIN") {
      return {
        auth: context,
        store,
        storeRole: "SUPERADMIN",
        isOwner: store.ownerId === context.user.id,
      };
    }

    const membership = await dependencies.findMembership(
      context.user.id,
      storeId,
    );
    if (!membership) throw new ForbiddenError();

    return {
      auth: context,
      store,
      storeRole: membership.role,
      isOwner: store.ownerId === context.user.id,
    };
  }

  async function requireStoreAccess(
    storeId: string,
    headers: Headers,
  ): Promise<StoreAccess<TStore>> {
    const context = await requireAuth(headers);
    return requireStoreAccessForContext(context, storeId);
  }

  async function requireActiveStoreForContext(
    context: AuthContext,
  ): Promise<StoreAccess<TStore>> {
    if (!context.activeStoreId) {
      throw new ForbiddenError("No active store");
    }
    return requireStoreAccessForContext(context, context.activeStoreId);
  }

  async function requireActiveStore(
    headers: Headers,
  ): Promise<StoreAccess<TStore>> {
    const context = await requireAuth(headers);
    return requireActiveStoreForContext(context);
  }

  function requireSuperAdminForContext(context: AuthContext): AuthContext {
    if (context.user.role !== "SUPERADMIN") throw new ForbiddenError();
    return context;
  }

  async function requireSuperAdmin(headers: Headers): Promise<AuthContext> {
    return requireSuperAdminForContext(await requireAuth(headers));
  }

  async function requireOwnerOrSuperAdminForContext(
    context: AuthContext,
    storeId: string,
  ): Promise<StoreAccess<TStore>> {
    const access = await requireStoreAccessForContext(context, storeId);
    if (context.user.role !== "SUPERADMIN" && !access.isOwner) {
      throw new ForbiddenError(
        "Only the store owner or a super admin can perform this action",
      );
    }
    return access;
  }

  async function requireOwnerOrSuperAdmin(
    storeId: string,
    headers: Headers,
  ): Promise<StoreAccess<TStore>> {
    const context = await requireAuth(headers);
    return requireOwnerOrSuperAdminForContext(context, storeId);
  }

  return {
    getAuthContext,
    requireAuth,
    requireActiveStore,
    requireActiveStoreForContext,
    requireStoreAccess,
    requireStoreAccessForContext,
    requireSuperAdmin,
    requireSuperAdminForContext,
    requireOwnerOrSuperAdmin,
    requireOwnerOrSuperAdminForContext,
  };
}

export type AuthGuardService<TStore extends AuthStoreRecord> = ReturnType<
  typeof createAuthGuardService<TStore>
>;
