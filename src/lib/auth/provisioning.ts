import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { accounts, stores, teamMembers, users } from "@/lib/db/schema";
import {
  AuthProvisioningNotFoundError,
  CREDENTIAL_PROVIDER_ID,
  createAuthProvisioningService,
  createSessionInitialStoreHook,
  resolveFirstAccessibleStoreId,
  type AuthProvisioningRepository,
  type CredentialAccountRecord,
  type ProvisionedMembershipRecord,
  type ProvisionedStoreRecord,
  type ProvisioningRole,
} from "./provisioning-core";

type AccountRow = typeof accounts.$inferSelect;
type StoreRow = typeof stores.$inferSelect;
type MembershipRow = typeof teamMembers.$inferSelect;

function toCredentialAccount(row: AccountRow): CredentialAccountRecord {
  if (row.providerId !== CREDENTIAL_PROVIDER_ID) {
    throw new Error("Expected a credential account");
  }
  return { ...row, providerId: CREDENTIAL_PROVIDER_ID };
}

function toProvisionedStore(row: StoreRow): ProvisionedStoreRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toProvisionedMembership(
  row: MembershipRow,
): ProvisionedMembershipRecord {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId,
    role: row.role,
    createdAt: row.createdAt,
  };
}

const provisioningRepository: AuthProvisioningRepository = {
  transaction(operation) {
    return db.transaction(
      async (transaction) =>
        operation({
          async insertUser(user) {
            const [inserted] = await transaction
              .insert(users)
              .values(user)
              .returning();
            if (!inserted) {
              throw new Error("Failed to create credential user");
            }
            return inserted;
          },

          async lockUser(userId) {
            const [user] = await transaction
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1)
              .for("update");
            return user ?? null;
          },

          async updateLegacyPasswordHash(userId, passwordHash, updatedAt) {
            await transaction
              .update(users)
              .set({ passwordHash, updatedAt })
              .where(eq(users.id, userId));
          },

          async listCredentialAccounts(userId) {
            const rows = await transaction
              .select()
              .from(accounts)
              .where(
                and(
                  eq(accounts.userId, userId),
                  eq(accounts.providerId, CREDENTIAL_PROVIDER_ID),
                ),
              )
              .orderBy(asc(accounts.createdAt), asc(accounts.id));
            return rows.map(toCredentialAccount);
          },

          async insertCredentialAccount(account) {
            const [inserted] = await transaction
              .insert(accounts)
              .values(account)
              .returning();
            if (!inserted) {
              throw new Error("Failed to create credential account");
            }
            return toCredentialAccount(inserted);
          },

          async updateCredentialAccount(accountRowId, values) {
            const [updated] = await transaction
              .update(accounts)
              .set(values)
              .where(
                and(
                  eq(accounts.id, accountRowId),
                  eq(accounts.providerId, CREDENTIAL_PROVIDER_ID),
                ),
              )
              .returning();
            if (!updated) {
              throw new AuthProvisioningNotFoundError(
                "Credential account not found",
              );
            }
            return toCredentialAccount(updated);
          },

          async findFirstMembershipStore(userId) {
            const [row] = await transaction
              .select({ store: stores, membership: teamMembers })
              .from(teamMembers)
              .innerJoin(stores, eq(stores.id, teamMembers.storeId))
              .where(eq(teamMembers.userId, userId))
              .orderBy(
                asc(teamMembers.createdAt),
                asc(stores.createdAt),
                asc(stores.id),
              )
              .limit(1);

            return row
              ? {
                  store: toProvisionedStore(row.store),
                  membership: toProvisionedMembership(row.membership),
                }
              : null;
          },

          async findFirstOwnedStore(userId) {
            const [store] = await transaction
              .select()
              .from(stores)
              .where(eq(stores.ownerId, userId))
              .orderBy(asc(stores.createdAt), asc(stores.id))
              .limit(1);
            return store ? toProvisionedStore(store) : null;
          },

          async findStoreBySlug(slug) {
            const [store] = await transaction
              .select()
              .from(stores)
              .where(eq(stores.slug, slug))
              .limit(1);
            return store ? toProvisionedStore(store) : null;
          },

          async insertDefaultStore(store) {
            const [inserted] = await transaction
              .insert(stores)
              .values(store)
              .onConflictDoNothing({ target: stores.slug })
              .returning();
            return inserted ? toProvisionedStore(inserted) : null;
          },

          async ensureMembership(membership) {
            await transaction
              .insert(teamMembers)
              .values(membership)
              .onConflictDoNothing({
                target: [teamMembers.userId, teamMembers.storeId],
              });

            const [persisted] = await transaction
              .select()
              .from(teamMembers)
              .where(
                and(
                  eq(teamMembers.userId, membership.userId),
                  eq(teamMembers.storeId, membership.storeId),
                ),
              )
              .limit(1);
            if (!persisted) {
              throw new Error("Failed to ensure default-store membership");
            }
            return toProvisionedMembership(persisted);
          },
        }),
      // READ COMMITTED lets a waiter recheck rows created by the lock holder
      // after acquiring the user-row lock. A fixed repeatable-read snapshot
      // could miss that committed store and turn a safe race into a retry.
      { isolationLevel: "read committed", accessMode: "read write" },
    );
  },
};

const provisioningService = createAuthProvisioningService({
  repository: provisioningRepository,
  hashPassword,
  createId: randomUUID,
  now: () => new Date(),
});

/**
 * Creates an ADMIN credential user and its sole Better Auth credential account
 * atomically. Role is intentionally not accepted from callers.
 */
export const createCredentialUser = provisioningService.createCredentialUser;

/**
 * Repairs or creates the single Better Auth credential account for a legacy
 * user while preserving the rollback-compatible users.passwordHash digest.
 */
export const ensureCredentialAccount =
  provisioningService.ensureCredentialAccount;

/**
 * Returns an existing initial store or atomically creates one and its
 * membership. Neither store identity nor membership role is caller-controlled.
 */
export const provisionDefaultStore = provisioningService.provisionDefaultStore;

const accessibleStoreReader = {
  async findUserRole(userId: string): Promise<ProvisioningRole | null> {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.role ?? null;
  },

  async findFirstMembershipStoreId(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ storeId: stores.id })
      .from(teamMembers)
      .innerJoin(stores, eq(stores.id, teamMembers.storeId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(
        asc(teamMembers.createdAt),
        asc(stores.createdAt),
        asc(stores.id),
      )
      .limit(1);
    return row?.storeId ?? null;
  },

  async findFirstStoreId(): Promise<string | null> {
    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .orderBy(asc(stores.createdAt), asc(stores.id))
      .limit(1);
    return store?.id ?? null;
  },
};

export function findFirstAccessibleStoreId(
  userId: string,
): Promise<string | null> {
  return resolveFirstAccessibleStoreId(userId, accessibleStoreReader);
}

export const setInitialStoreOnSessionCreate = createSessionInitialStoreHook(
  findFirstAccessibleStoreId,
);
