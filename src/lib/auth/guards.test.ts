import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AuthResourceNotFoundError,
  ForbiddenError,
  UnauthenticatedError,
  createAuthGuardService,
  getApiErrorDescriptor,
  getAuthErrorDescriptor,
  safeLocalRedirectPath,
  type AuthGuardDependencies,
  type AuthRole,
} from "./guards-core";

interface TestStore {
  id: string;
  ownerId: string;
  name: string;
}

const admin = {
  id: "user-admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN" as const,
  avatarUrl: null,
};

function setup(overrides: Partial<AuthGuardDependencies<TestStore>> = {}) {
  const stores: TestStore[] = [
    { id: "store-1", ownerId: admin.id, name: "One" },
  ];
  const dependencies: AuthGuardDependencies<TestStore> = {
    readBetterAuthSession: async () => null,
    readLegacySession: async () => null,
    findUserById: async (id) => (id === admin.id ? admin : null),
    findStoreById: async (id) => stores.find((store) => store.id === id) ?? null,
    findMembership: async (userId, storeId) =>
      userId === admin.id && storeId === "store-1"
        ? { role: "ADMIN" }
        : null,
    ...overrides,
  };
  return createAuthGuardService(dependencies);
}

const headers = new Headers();

describe("authentication DAL", () => {
  it("returns null without either session and maps requireAuth to 401", async () => {
    const guards = setup();
    assert.equal(await guards.getAuthContext(headers), null);
    await assert.rejects(() => guards.requireAuth(headers), UnauthenticatedError);
    assert.deepEqual(getAuthErrorDescriptor(new UnauthenticatedError()), {
      status: 401,
      body: { error: "Unauthorized" },
    });
  });

  it("uses the legacy JWT identity only when Better Auth has no session", async () => {
    const guards = setup({
      readLegacySession: async () => ({
        userId: admin.id,
        storeId: "store-1",
        role: "SUPERADMIN",
      }),
    });

    const context = await guards.requireAuth(headers);
    assert.equal(context.sessionSource, "legacy-jwt");
    assert.equal(context.activeStoreId, "store-1");
    assert.equal(context.user.role, "ADMIN", "role must be loaded from users");
  });

  it("accepts the Better Auth session shape and gives it priority", async () => {
    let legacyRead = false;
    const guards = setup({
      readBetterAuthSession: async () => ({
        user: { id: admin.id, role: "SUPERADMIN" },
        session: { userId: admin.id, activeStoreId: "store-1" },
      }),
      readLegacySession: async () => {
        legacyRead = true;
        return { userId: "legacy-user", storeId: "other-store" };
      },
    });

    const context = await guards.requireAuth(headers);
    assert.equal(context.sessionSource, "better-auth");
    assert.equal(context.activeStoreId, "store-1");
    assert.equal(legacyRead, false);
  });

  it("fails closed instead of downgrading a malformed primary session", async () => {
    let legacyRead = false;
    const guards = setup({
      readBetterAuthSession: async () => ({
        user: { id: admin.id },
        session: { userId: "different-user", activeStoreId: "store-1" },
      }),
      readLegacySession: async () => {
        legacyRead = true;
        return { userId: admin.id, storeId: "store-1" };
      },
    });

    assert.equal(await guards.getAuthContext(headers), null);
    assert.equal(legacyRead, false);
  });

  it("rejects a stale active store after membership removal with 403", async () => {
    const guards = setup({
      readBetterAuthSession: async () => ({
        user: { id: admin.id },
        session: { userId: admin.id, activeStoreId: "store-1" },
      }),
      findMembership: async () => null,
    });

    await assert.rejects(() => guards.requireActiveStore(headers), ForbiddenError);
    assert.equal(
      getAuthErrorDescriptor(new ForbiddenError())?.status,
      403,
    );
  });

  it("does not trust a superadmin role claimed by the legacy cookie", async () => {
    const guards = setup({
      readLegacySession: async () => ({
        userId: admin.id,
        storeId: "store-1",
        role: "SUPERADMIN",
      }),
      findMembership: async () => null,
    });

    await assert.rejects(() => guards.requireActiveStore(headers), ForbiddenError);
  });

  it("lets a current global superadmin access any existing store", async () => {
    const superadmin = { ...admin, id: "root", role: "SUPERADMIN" as const };
    const guards = setup({
      readBetterAuthSession: async () => ({
        user: { id: superadmin.id },
        session: { userId: superadmin.id, activeStoreId: "store-1" },
      }),
      findUserById: async () => superadmin,
      findMembership: async () => null,
    });

    const access = await guards.requireActiveStore(headers);
    assert.equal(access.store.id, "store-1");
    assert.equal(access.storeRole, "SUPERADMIN");
  });

  it("requires a current member to be the owner for owner-only operations", async () => {
    const nonOwnerStore: TestStore = {
      id: "store-2",
      ownerId: "someone-else",
      name: "Two",
    };
    let membershipRole: AuthRole | null = "ADMIN";
    const guards = setup({
      readLegacySession: async () => ({ userId: admin.id, storeId: "store-2" }),
      findStoreById: async () => nonOwnerStore,
      findMembership: async () =>
        membershipRole ? { role: membershipRole } : null,
    });

    await assert.rejects(
      () => guards.requireOwnerOrSuperAdmin("store-2", headers),
      ForbiddenError,
    );

    nonOwnerStore.ownerId = admin.id;
    const access = await guards.requireOwnerOrSuperAdmin("store-2", headers);
    assert.equal(access.isOwner, true);

    membershipRole = null;
    await assert.rejects(
      () => guards.requireOwnerOrSuperAdmin("store-2", headers),
      ForbiddenError,
      "an owner whose membership was removed must not retain access",
    );
  });
});

describe("authorization responses and redirects", () => {
  it("maps known authorization errors and unknown failures consistently", () => {
    assert.deepEqual(getApiErrorDescriptor(new ForbiddenError()), {
      status: 403,
      body: { error: "Forbidden" },
    });
    assert.deepEqual(
      getApiErrorDescriptor(new AuthResourceNotFoundError("Store not found")),
      { status: 404, body: { error: "Store not found" } },
    );
    assert.deepEqual(getApiErrorDescriptor(new Error("database details")), {
      status: 500,
      body: { error: "Internal server error" },
    });
  });

  it("allows only same-origin page redirect paths", () => {
    assert.equal(
      safeLocalRedirectPath("/orders?page=2#recent"),
      "/orders?page=2#recent",
    );
    assert.equal(safeLocalRedirectPath("https://evil.example"), "/dashboard");
    assert.equal(safeLocalRedirectPath("//evil.example/path"), "/dashboard");
    assert.equal(safeLocalRedirectPath("/\\evil.example/path"), "/dashboard");
    assert.equal(safeLocalRedirectPath("/orders\n/next"), "/dashboard");
    assert.equal(safeLocalRedirectPath(null, "/stores"), "/stores");
    assert.equal(safeLocalRedirectPath(null, "//evil.example"), "/dashboard");
  });
});
