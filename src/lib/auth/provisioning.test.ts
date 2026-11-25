import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { hashPassword } from "./password";
import {
  CREDENTIAL_PROVIDER_ID,
  createAuthProvisioningService,
  createSessionInitialStoreHook,
  defaultStoreSlug,
  normalizeCredentialEmail,
  resolveFirstAccessibleStoreId,
  type AccessibleStoreReader,
  type AuthProvisioningRepository,
  type AuthProvisioningTransaction,
  type CredentialAccountRecord,
  type CredentialUserRecord,
  type NewDefaultStoreRecord,
  type ProvisionedMembershipRecord,
  type ProvisionedStoreRecord,
} from "./provisioning-core";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "10000000-0000-4000-8000-000000000002";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-11-25T12:00:00.000Z");

function compareStoreAccess(
  left: { store: ProvisionedStoreRecord; membership: ProvisionedMembershipRecord },
  right: { store: ProvisionedStoreRecord; membership: ProvisionedMembershipRecord },
): number {
  return (
    left.membership.createdAt.getTime() - right.membership.createdAt.getTime() ||
    left.store.createdAt.getTime() - right.store.createdAt.getTime() ||
    left.store.id.localeCompare(right.store.id)
  );
}

class MemoryProvisioningRepository implements AuthProvisioningRepository {
  users: CredentialUserRecord[] = [];
  accounts: CredentialAccountRecord[] = [];
  stores: ProvisionedStoreRecord[] = [];
  memberships: ProvisionedMembershipRecord[] = [];
  lockCalls = new Map<string, number>();
  failNextCredentialInsert = false;

  private transactionQueue: Promise<void> = Promise.resolve();

  async transaction<T>(
    operation: (transaction: AuthProvisioningTransaction) => Promise<T>,
  ): Promise<T> {
    const previous = this.transactionQueue;
    let release!: () => void;
    this.transactionQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    const snapshot = {
      users: [...this.users],
      accounts: [...this.accounts],
      stores: [...this.stores],
      memberships: [...this.memberships],
    };

    try {
      return await operation(this.createTransaction());
    } catch (error) {
      this.users = snapshot.users;
      this.accounts = snapshot.accounts;
      this.stores = snapshot.stores;
      this.memberships = snapshot.memberships;
      throw error;
    } finally {
      release();
    }
  }

  private createTransaction(): AuthProvisioningTransaction {
    return {
      insertUser: async (user) => {
        if (
          this.users.some(
            (candidate) =>
              candidate.id === user.id || candidate.email === user.email,
          )
        ) {
          throw new Error("duplicate user");
        }
        this.users.push(user);
        return user;
      },

      lockUser: async (userId) => {
        this.lockCalls.set(userId, (this.lockCalls.get(userId) ?? 0) + 1);
        return this.users.find((user) => user.id === userId) ?? null;
      },

      updateLegacyPasswordHash: async (userId, passwordHash, updatedAt) => {
        const index = this.users.findIndex((user) => user.id === userId);
        if (index === -1) throw new Error("missing user");
        this.users[index] = {
          ...this.users[index],
          passwordHash,
          updatedAt,
        };
      },

      listCredentialAccounts: async (userId) =>
        this.accounts
          .filter(
            (account) =>
              account.userId === userId &&
              account.providerId === CREDENTIAL_PROVIDER_ID,
          )
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id),
          ),

      insertCredentialAccount: async (account) => {
        if (this.failNextCredentialInsert) {
          this.failNextCredentialInsert = false;
          throw new Error("simulated account insert failure");
        }
        if (
          this.accounts.some(
            (candidate) =>
              (candidate.providerId === account.providerId &&
                candidate.accountId === account.accountId) ||
              (account.providerId === CREDENTIAL_PROVIDER_ID &&
                candidate.providerId === CREDENTIAL_PROVIDER_ID &&
                candidate.userId === account.userId),
          )
        ) {
          throw new Error("duplicate credential account");
        }
        this.accounts.push(account);
        return account;
      },

      updateCredentialAccount: async (accountRowId, values) => {
        const index = this.accounts.findIndex(
          (account) => account.id === accountRowId,
        );
        if (index === -1) throw new Error("missing account");
        const updated = { ...this.accounts[index], ...values };
        this.accounts[index] = updated;
        return updated;
      },

      findFirstMembershipStore: async (userId) => {
        const accessible = this.memberships
          .filter((membership) => membership.userId === userId)
          .map((membership) => ({
            membership,
            store: this.stores.find(
              (store) => store.id === membership.storeId,
            ),
          }))
          .filter(
            (
              access,
            ): access is {
              membership: ProvisionedMembershipRecord;
              store: ProvisionedStoreRecord;
            } => Boolean(access.store),
          )
          .sort(compareStoreAccess);
        return accessible[0] ?? null;
      },

      findFirstOwnedStore: async (userId) =>
        this.stores
          .filter((store) => store.ownerId === userId)
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id),
          )[0] ?? null,

      findStoreBySlug: async (slug) =>
        this.stores.find((store) => store.slug === slug) ?? null,

      insertDefaultStore: async (store: NewDefaultStoreRecord) => {
        if (this.stores.some((candidate) => candidate.slug === store.slug)) {
          return null;
        }
        const persisted: ProvisionedStoreRecord = {
          id: store.id,
          name: store.name,
          slug: store.slug,
          ownerId: store.ownerId,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
        };
        this.stores.push(persisted);
        return persisted;
      },

      ensureMembership: async (membership) => {
        const existing = this.memberships.find(
          (candidate) =>
            candidate.userId === membership.userId &&
            candidate.storeId === membership.storeId,
        );
        if (existing) return existing;
        this.memberships.push(membership);
        return membership;
      },
    };
  }
}

function createUuidFactory() {
  let sequence = 1;
  return () =>
    `f0000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
}

function createService(repository: MemoryProvisioningRepository) {
  let tick = 0;
  return createAuthProvisioningService({
    repository,
    hashPassword,
    createId: createUuidFactory(),
    now: () => new Date(NOW.getTime() + tick++ * 1_000),
  });
}

async function legacyUser(
  overrides: Partial<CredentialUserRecord> = {},
): Promise<CredentialUserRecord> {
  return {
    id: USER_ID,
    email: "merchant@example.com",
    passwordHash: await hashPassword("Password123!"),
    name: "Merchant",
    role: "ADMIN",
    emailVerified: false,
    avatarUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("credential-user provisioning", () => {
  it("normalizes email using the Better Auth lookup form", () => {
    assert.equal(
      normalizeCredentialEmail("  Merchant.Name@EXAMPLE.COM  "),
      "merchant.name@example.com",
    );
    assert.throws(() => normalizeCredentialEmail("not-an-email"));
  });

  it("atomically creates one Better Auth credential account with bcrypt-12", async () => {
    const repository = new MemoryProvisioningRepository();
    const service = createService(repository);

    const result = await service.createCredentialUser({
      email: "  NEW.MERCHANT@Example.COM ",
      name: "  New Merchant  ",
      password: "Password123!",
    });

    assert.equal(repository.users.length, 1);
    assert.equal(repository.accounts.length, 1);
    assert.equal(result.user.email, "new.merchant@example.com");
    assert.equal(result.user.name, "New Merchant");
    assert.equal(result.user.role, "ADMIN");
    assert.equal(result.user.emailVerified, false);
    assert.equal(result.credentialAccount.providerId, "credential");
    assert.equal(result.credentialAccount.accountId, result.user.id);
    assert.equal(result.credentialAccount.userId, result.user.id);
    assert.equal(result.credentialAccount.password, result.user.passwordHash);
    assert.equal(result.credentialAccount.accessToken, null);
    assert.equal(result.credentialAccount.refreshToken, null);
    assert.equal(result.credentialAccount.idToken, null);
    assert.equal(bcrypt.getRounds(result.credentialAccount.password!), 12);
    assert.equal(
      await bcrypt.compare(
        "Password123!",
        result.credentialAccount.password!,
      ),
      true,
    );
  });

  it("rolls back the user when its credential account cannot be inserted", async () => {
    const repository = new MemoryProvisioningRepository();
    repository.failNextCredentialInsert = true;
    const service = createService(repository);

    await assert.rejects(() =>
      service.createCredentialUser({
        email: "merchant@example.com",
        name: "Merchant",
        password: "Password123!",
      }),
    );
    assert.equal(repository.users.length, 0);
    assert.equal(repository.accounts.length, 0);
  });

  it("ensures the credential shape idempotently under concurrent retries", async () => {
    const repository = new MemoryProvisioningRepository();
    const user = await legacyUser();
    repository.users.push(user);
    const service = createService(repository);

    const [first, second] = await Promise.all([
      service.ensureCredentialAccount(user.id),
      service.ensureCredentialAccount(user.id),
    ]);
    const third = await service.ensureCredentialAccount(user.id);

    assert.equal(repository.accounts.length, 1);
    assert.equal(first.id, second.id);
    assert.equal(second.id, third.id);
    assert.equal(first.providerId, CREDENTIAL_PROVIDER_ID);
    assert.equal(first.accountId, user.id);
    assert.equal(first.userId, user.id);
    assert.equal(first.password, user.passwordHash);
    assert.equal(repository.lockCalls.get(user.id), 3);
  });
});

describe("default-store provisioning", () => {
  it("serializes concurrent attempts and returns the same store on retries", async () => {
    const repository = new MemoryProvisioningRepository();
    const user = await legacyUser();
    repository.users.push(user);
    const service = createService(repository);

    const [first, second] = await Promise.all([
      service.provisionDefaultStore(user.id),
      service.provisionDefaultStore(user.id),
    ]);
    const retry = await service.provisionDefaultStore(user.id);

    assert.equal(repository.stores.length, 1);
    assert.equal(repository.memberships.length, 1);
    assert.equal(first.store.id, second.store.id);
    assert.equal(second.store.id, retry.store.id);
    assert.equal(first.store.slug, defaultStoreSlug(user.id));
    assert.equal(first.membership.storeId, first.store.id);
    assert.equal(first.membership.role, user.role);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(retry.created, false);
    assert.equal(repository.lockCalls.get(user.id), 3);
  });

  it("repairs an owned store membership instead of creating another store", async () => {
    const repository = new MemoryProvisioningRepository();
    const user = await legacyUser({ role: "SUPERADMIN" });
    repository.users.push(user);
    repository.stores.push({
      id: STORE_ID,
      name: "Existing Store",
      slug: "existing-store",
      ownerId: user.id,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const service = createService(repository);

    const result = await service.provisionDefaultStore(user.id);

    assert.equal(result.store.id, STORE_ID);
    assert.equal(result.created, false);
    assert.equal(repository.stores.length, 1);
    assert.equal(repository.memberships.length, 1);
    assert.equal(repository.memberships[0].role, "SUPERADMIN");
  });

  it("returns the first existing membership even when another user owns it", async () => {
    const repository = new MemoryProvisioningRepository();
    const user = await legacyUser();
    repository.users.push(user);
    repository.stores.push({
      id: STORE_ID,
      name: "Team Store",
      slug: "team-store",
      ownerId: OTHER_USER_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
    repository.memberships.push({
      id: "30000000-0000-4000-8000-000000000001",
      userId: user.id,
      storeId: STORE_ID,
      role: "ADMIN",
      createdAt: NOW,
    });
    const service = createService(repository);

    const result = await service.provisionDefaultStore(user.id);

    assert.equal(result.store.id, STORE_ID);
    assert.equal(result.created, false);
    assert.equal(repository.stores.length, 1);
    assert.equal(repository.memberships.length, 1);
  });
});

describe("new-session initial store", () => {
  it("prefers the user's first membership and preserves global role semantics", async () => {
    const calls: string[] = [];
    const reader: AccessibleStoreReader = {
      findUserRole: async () => "SUPERADMIN",
      findFirstMembershipStoreId: async () => {
        calls.push("membership");
        return "member-store";
      },
      findFirstStoreId: async () => {
        calls.push("global");
        return "global-store";
      },
    };

    assert.equal(
      await resolveFirstAccessibleStoreId(USER_ID, reader),
      "member-store",
    );
    assert.deepEqual(calls, ["membership"]);

    reader.findFirstMembershipStoreId = async () => null;
    assert.equal(
      await resolveFirstAccessibleStoreId(USER_ID, reader),
      "global-store",
    );

    reader.findUserRole = async () => "ADMIN";
    assert.equal(await resolveFirstAccessibleStoreId(USER_ID, reader), null);
  });

  it("overrides client-supplied store data and keeps null when none exists", async () => {
    const selectedHook = createSessionInitialStoreHook(async (userId) => {
      assert.equal(userId, USER_ID);
      return STORE_ID;
    });
    const selected = await selectedHook({
      id: "session-1",
      userId: USER_ID,
      activeStoreId: "untrusted-store",
    });
    assert.equal(selected.data.activeStoreId, STORE_ID);

    const emptyHook = createSessionInitialStoreHook(async () => null);
    const empty = await emptyHook({ id: "session-2", userId: USER_ID });
    assert.equal(empty.data.activeStoreId, null);
  });
});
