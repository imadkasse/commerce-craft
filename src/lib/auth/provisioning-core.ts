import { z } from "zod";

export const CREDENTIAL_PROVIDER_ID = "credential" as const;

const EMAIL = z.email();
const UUID = z.uuid();
const BCRYPT_12 = /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export type ProvisioningRole = "SUPERADMIN" | "ADMIN";

export interface CredentialUserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  role: ProvisioningRole;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialAccountRecord {
  id: string;
  accountId: string;
  providerId: typeof CREDENTIAL_PROVIDER_ID;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvisionedStoreRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvisionedMembershipRecord {
  id: string;
  userId: string;
  storeId: string;
  role: ProvisioningRole;
  createdAt: Date;
}

export interface StoreMembershipAccess {
  store: ProvisionedStoreRecord;
  membership: ProvisionedMembershipRecord;
}

export interface NewDefaultStoreRecord extends ProvisionedStoreRecord {
  description: null;
  logoUrl: null;
  domain: null;
  theme: Record<string, never>;
  status: "draft";
}

export interface AuthProvisioningTransaction {
  insertUser(user: CredentialUserRecord): Promise<CredentialUserRecord>;
  lockUser(userId: string): Promise<CredentialUserRecord | null>;
  updateLegacyPasswordHash(
    userId: string,
    passwordHash: string,
    updatedAt: Date,
  ): Promise<void>;
  listCredentialAccounts(userId: string): Promise<CredentialAccountRecord[]>;
  insertCredentialAccount(
    account: CredentialAccountRecord,
  ): Promise<CredentialAccountRecord>;
  updateCredentialAccount(
    accountId: string,
    values: Pick<CredentialAccountRecord, "accountId" | "password" | "updatedAt">,
  ): Promise<CredentialAccountRecord>;
  findFirstMembershipStore(
    userId: string,
  ): Promise<StoreMembershipAccess | null>;
  findFirstOwnedStore(userId: string): Promise<ProvisionedStoreRecord | null>;
  findStoreBySlug(slug: string): Promise<ProvisionedStoreRecord | null>;
  insertDefaultStore(
    store: NewDefaultStoreRecord,
  ): Promise<ProvisionedStoreRecord | null>;
  ensureMembership(
    membership: ProvisionedMembershipRecord,
  ): Promise<ProvisionedMembershipRecord>;
}

export interface AuthProvisioningRepository {
  transaction<T>(
    operation: (transaction: AuthProvisioningTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface AuthProvisioningDependencies {
  repository: AuthProvisioningRepository;
  hashPassword(password: string): Promise<string>;
  createId(): string;
  now(): Date;
}

export interface CreateCredentialUserInput {
  email: string;
  name: string;
  password: string;
}

export interface CredentialUserProvisioningResult {
  user: CredentialUserRecord;
  credentialAccount: CredentialAccountRecord;
}

export interface DefaultStoreProvisioningResult extends StoreMembershipAccess {
  created: boolean;
}

export class AuthProvisioningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthProvisioningValidationError";
  }
}

export class AuthProvisioningNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthProvisioningNotFoundError";
  }
}

export class CredentialAccountConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialAccountConflictError";
  }
}

export class DefaultStoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DefaultStoreConflictError";
  }
}

export function normalizeCredentialEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL.safeParse(normalized).success) {
    throw new AuthProvisioningValidationError("A valid email is required");
  }
  return normalized;
}

export function isBcrypt12Hash(value: string | null): value is string {
  return typeof value === "string" && BCRYPT_12.test(value);
}

export function defaultStoreSlug(userId: string): string {
  if (!UUID.safeParse(userId).success) {
    throw new AuthProvisioningValidationError("A UUID user ID is required");
  }
  return `default-${userId.toLowerCase()}`;
}

function checkedUuid(createId: () => string): string {
  const id = createId();
  if (!UUID.safeParse(id).success) {
    throw new AuthProvisioningValidationError(
      "The provisioning ID generator must return UUIDs",
    );
  }
  return id;
}

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new AuthProvisioningValidationError("Name is required");
  }
  return normalized;
}

function validatePassword(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AuthProvisioningValidationError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
}

function chooseCredentialHash(
  user: CredentialUserRecord,
  account: CredentialAccountRecord | undefined,
): string {
  const legacyHash = isBcrypt12Hash(user.passwordHash)
    ? user.passwordHash
    : null;
  const accountHash = isBcrypt12Hash(account?.password ?? null)
    ? account?.password ?? null
    : null;

  if (legacyHash && accountHash && legacyHash !== accountHash) {
    throw new CredentialAccountConflictError(
      "The legacy and credential account password digests do not match",
    );
  }

  const passwordHash = legacyHash ?? accountHash;
  if (!passwordHash) {
    throw new CredentialAccountConflictError(
      "A bcrypt-12 password digest is required to provision credentials",
    );
  }
  return passwordHash;
}

export function createAuthProvisioningService(
  dependencies: AuthProvisioningDependencies,
) {
  async function createCredentialUser(
    input: CreateCredentialUserInput,
  ): Promise<CredentialUserProvisioningResult> {
    const email = normalizeCredentialEmail(input.email);
    const name = normalizeName(input.name);
    validatePassword(input.password);

    // Hash before opening a transaction so bcrypt's work never extends a
    // database lock. Both rollback-compatible columns receive this exact digest.
    const passwordHash = await dependencies.hashPassword(input.password);
    if (!isBcrypt12Hash(passwordHash)) {
      throw new CredentialAccountConflictError(
        "The credential password hasher must produce a bcrypt-12 digest",
      );
    }

    const userId = checkedUuid(dependencies.createId);
    const accountRowId = checkedUuid(dependencies.createId);
    const now = dependencies.now();

    return dependencies.repository.transaction(async (transaction) => {
      const user = await transaction.insertUser({
        id: userId,
        email,
        passwordHash,
        name,
        role: "ADMIN",
        emailVerified: false,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      });

      const credentialAccount = await transaction.insertCredentialAccount({
        id: accountRowId,
        accountId: user.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: user.id,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      return { user, credentialAccount };
    });
  }

  async function ensureCredentialAccount(
    userId: string,
  ): Promise<CredentialAccountRecord> {
    return dependencies.repository.transaction(async (transaction) => {
      // The user row is the serialization point for every credential mutation.
      const user = await transaction.lockUser(userId);
      if (!user) {
        throw new AuthProvisioningNotFoundError("User not found");
      }

      const accounts = await transaction.listCredentialAccounts(user.id);
      if (accounts.length > 1) {
        throw new CredentialAccountConflictError(
          "A user cannot have more than one credential account",
        );
      }

      const existing = accounts[0];
      const passwordHash = chooseCredentialHash(user, existing);
      const now = dependencies.now();

      if (user.passwordHash !== passwordHash) {
        await transaction.updateLegacyPasswordHash(user.id, passwordHash, now);
      }

      if (existing) {
        if (
          existing.accountId === user.id &&
          existing.password === passwordHash
        ) {
          return existing;
        }

        return transaction.updateCredentialAccount(existing.id, {
          accountId: user.id,
          password: passwordHash,
          updatedAt: now,
        });
      }

      return transaction.insertCredentialAccount({
        id: checkedUuid(dependencies.createId),
        accountId: user.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: user.id,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async function provisionDefaultStore(
    userId: string,
  ): Promise<DefaultStoreProvisioningResult> {
    return dependencies.repository.transaction(async (transaction) => {
      // Lock first, then recheck. Concurrent attempts for the same user cannot
      // both observe an empty store set and create separate defaults.
      const user = await transaction.lockUser(userId);
      if (!user) {
        throw new AuthProvisioningNotFoundError("User not found");
      }

      const accessible = await transaction.findFirstMembershipStore(user.id);
      if (accessible) {
        return { ...accessible, created: false };
      }

      // Ownership alone is not authorization in the current application, but
      // repairing its missing membership is preferable to creating a duplicate.
      const ownedStore = await transaction.findFirstOwnedStore(user.id);
      if (ownedStore) {
        const membership = await transaction.ensureMembership({
          id: checkedUuid(dependencies.createId),
          userId: user.id,
          storeId: ownedStore.id,
          role: user.role,
          createdAt: dependencies.now(),
        });
        return { store: ownedStore, membership, created: false };
      }

      const slug = defaultStoreSlug(user.id);
      let store = await transaction.findStoreBySlug(slug);
      let created = false;

      if (store && store.ownerId !== user.id) {
        throw new DefaultStoreConflictError(
          "The deterministic default-store slug is already in use",
        );
      }

      if (!store) {
        const now = dependencies.now();
        store = await transaction.insertDefaultStore({
          id: checkedUuid(dependencies.createId),
          name: `${normalizeName(user.name)}'s Store`,
          slug,
          description: null,
          logoUrl: null,
          domain: null,
          theme: {},
          status: "draft",
          ownerId: user.id,
          createdAt: now,
          updatedAt: now,
        });
        created = store !== null;

        // A slug conflict can happen outside this service. Re-read it and only
        // adopt it when it belongs to this same user.
        if (!store) {
          store = await transaction.findStoreBySlug(slug);
          if (!store || store.ownerId !== user.id) {
            throw new DefaultStoreConflictError(
              "Unable to claim the deterministic default-store slug",
            );
          }
        }
      }

      const membership = await transaction.ensureMembership({
        id: checkedUuid(dependencies.createId),
        userId: user.id,
        storeId: store.id,
        role: user.role,
        createdAt: dependencies.now(),
      });

      return { store, membership, created };
    });
  }

  return {
    createCredentialUser,
    ensureCredentialAccount,
    provisionDefaultStore,
  };
}

export interface AccessibleStoreReader {
  findUserRole(userId: string): Promise<ProvisioningRole | null>;
  findFirstMembershipStoreId(userId: string): Promise<string | null>;
  findFirstStoreId(): Promise<string | null>;
}

export async function resolveFirstAccessibleStoreId(
  userId: string,
  reader: AccessibleStoreReader,
): Promise<string | null> {
  const role = await reader.findUserRole(userId);
  if (!role) return null;

  const membershipStoreId = await reader.findFirstMembershipStoreId(userId);
  if (membershipStoreId) return membershipStoreId;

  // Preserve Phase 4 authorization: a global SUPERADMIN can access any store,
  // while an owner without a membership cannot access that store as an ADMIN.
  return role === "SUPERADMIN" ? reader.findFirstStoreId() : null;
}

export interface SessionCreateInput {
  userId: string;
  [key: string]: unknown;
}

export function createSessionInitialStoreHook(
  findFirstAccessibleStoreId: (userId: string) => Promise<string | null>,
) {
  return async <TSession extends SessionCreateInput>(session: TSession) => ({
    data: {
      ...session,
      // Always override input. Session store selection is application-owned.
      activeStoreId: await findFirstAccessibleStoreId(session.userId),
    },
  });
}
