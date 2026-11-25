import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { headers as getRequestHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { stores, teamMembers, users } from "@/lib/db/schema";
import {
  AuthResourceNotFoundError,
  ForbiddenError,
  UnauthenticatedError,
  createAuthGuardService,
  getApiErrorDescriptor,
  safeLocalRedirectPath,
  type AuthContext,
} from "./guards-core";

function readCookie(cookieHeader: string, name: string): string | null {
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    const value = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

const guardService = createAuthGuardService({
  readBetterAuthSession: async (headers) =>
    auth.api.getSession({
      headers,
      query: {
        // Better Auth is database-backed here. Bypass any cookie cache so a
        // revoked session cannot authorize a protected operation.
        disableCookieCache: true,
        disableRefresh: true,
      },
    }),
  readLegacySession: async (headers) => {
    // PHASE 5 CLEANUP: this is the one compatibility bridge for the current
    // login/register UI. Business routes must never parse this JWT directly.
    const token = readCookie(headers.get("cookie") ?? "", COOKIE_NAME);
    return token ? verifyToken(token) : null;
  },
  findUserById: async (userId) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return null;
    }
    return { ...user, role: user.role };
  },
  findStoreById: async (storeId) => {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    return store ?? null;
  },
  findMembership: async (userId, storeId) => {
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.storeId, storeId),
        ),
      )
      .limit(1);
    return membership ?? null;
  },
});

async function resolveHeaders(request?: Request): Promise<Headers> {
  return request?.headers ?? new Headers(await getRequestHeaders());
}

export async function getAuthContext(
  request?: Request,
): Promise<AuthContext | null> {
  return guardService.getAuthContext(await resolveHeaders(request));
}

// React cache is scoped to a Server Component render. Route Handlers and
// Server Actions use the uncached helpers above/below so authorization is
// re-evaluated for each independently invokable request.
const getServerComponentAuthContext = cache(async () => getAuthContext());

export async function requireAuth(request?: Request) {
  return guardService.requireAuth(await resolveHeaders(request));
}

export async function requireActiveStore(request?: Request) {
  return guardService.requireActiveStore(await resolveHeaders(request));
}

export async function requireStoreAccess(storeId: string, request?: Request) {
  return guardService.requireStoreAccess(storeId, await resolveHeaders(request));
}

export async function requireSuperAdmin(request?: Request) {
  return guardService.requireSuperAdmin(await resolveHeaders(request));
}

export async function requireStoreOwnerOrSuperAdmin(
  storeId: string,
  request?: Request,
) {
  return guardService.requireOwnerOrSuperAdmin(
    storeId,
    await resolveHeaders(request),
  );
}

export function routeAuthErrorResponse(
  error: unknown,
): NextResponse<{ error: string }> {
  const descriptor = getApiErrorDescriptor(error);
  if (descriptor.status === 500) {
    console.error("Unhandled authorization DAL error:", error);
  }
  return NextResponse.json(descriptor.body, { status: descriptor.status });
}

export function redirectToLogin(path: unknown): never {
  const redirectPath = safeLocalRedirectPath(path);
  redirect(`/login?${new URLSearchParams({ redirect: redirectPath })}`);
}

export function redirectToSafePage(
  path: unknown,
  fallback: string = "/dashboard",
): never {
  redirect(safeLocalRedirectPath(path, fallback));
}

function handlePageAuthError(
  error: unknown,
  returnTo: string,
  forbiddenRedirect: string,
): never {
  if (error instanceof UnauthenticatedError) redirectToLogin(returnTo);
  if (
    error instanceof ForbiddenError ||
    error instanceof AuthResourceNotFoundError
  ) {
    redirectToSafePage(forbiddenRedirect);
  }
  throw error;
}

export async function requirePageAuth(path: string): Promise<AuthContext> {
  const context = await getServerComponentAuthContext();
  if (!context) redirectToLogin(path);
  return context;
}

export async function requirePageActiveStore(path: string) {
  const context = await requirePageAuth(path);
  try {
    return await guardService.requireActiveStoreForContext(context);
  } catch (error) {
    handlePageAuthError(error, path, "/stores");
  }
}

export async function requirePageStoreAccess(storeId: string, path: string) {
  const context = await requirePageAuth(path);
  try {
    return await guardService.requireStoreAccessForContext(context, storeId);
  } catch (error) {
    handlePageAuthError(error, path, "/stores");
  }
}

export async function requirePageSuperAdmin(path: string) {
  const context = await requirePageAuth(path);
  try {
    return guardService.requireSuperAdminForContext(context);
  } catch (error) {
    handlePageAuthError(error, path, "/dashboard");
  }
}

export async function requirePageStoreOwnerOrSuperAdmin(
  storeId: string,
  path: string,
) {
  const context = await requirePageAuth(path);
  try {
    return await guardService.requireOwnerOrSuperAdminForContext(
      context,
      storeId,
    );
  } catch (error) {
    handlePageAuthError(error, path, "/stores");
  }
}

export {
  AuthResourceNotFoundError,
  ForbiddenError,
  UnauthenticatedError,
  safeLocalRedirectPath,
} from "./guards-core";
export type {
  AuthApiErrorBody,
  AuthContext,
  AuthGuardError,
  AuthRole,
  StoreAccess,
} from "./guards-core";
