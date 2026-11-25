#!/usr/bin/env tsx

import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { accounts, stores, teamMembers, users } from "../src/lib/db/schema";

const CREDENTIAL_PROVIDER = "credential";
const DEFAULT_BATCH_SIZE = 500;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BCRYPT_DIGEST = /^\$2[aby]\$(?:0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;
const EMAIL = z.email();

const migrationSchema = {
  accounts,
  stores,
  teamMembers,
  users,
};

type MigrationDatabase = PostgresJsDatabase<typeof migrationSchema>;
type SelectExecutor = Pick<MigrationDatabase, "select">;
type Mode = "dry-run" | "apply" | "verify";

interface CliOptions {
  batchSize: number;
  help: boolean;
  mode: Mode;
}

interface LegacyUser {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  passwordHash: string | null;
  updatedAt: Date;
}

interface CredentialAccount {
  accountId: string;
  id: string;
  password: string | null;
  providerId: string;
  userId: string;
}

interface ProtectedState {
  stores: ProtectedTableState;
  teamMemberships: ProtectedTableState;
  users: ProtectedTableState;
}

interface ProtectedTableState {
  count: number;
  idFingerprint: string;
}

interface Snapshot {
  credentialAccounts: CredentialAccount[];
  protectedState: ProtectedState;
  users: LegacyUser[];
}

interface ValidationCounts {
  bcrypt: {
    invalid: number;
    missing: number;
  };
  credentialAccounts: {
    duplicateIdentityGroups: number;
    duplicateIdentityRows: number;
    mismatchedAccountIds: number;
    passwordMismatches: number;
    unknownUsers: number;
    usersWithMultiple: number;
  };
  email: {
    collisionGroups: number;
    collisionUsers: number;
    empty: number;
    malformed: number;
    untrimmed: number;
  };
  timestamps: {
    invalid: number;
  };
}

interface Analysis {
  conflictUsers: number;
  counts: ValidationCounts;
  isValid: boolean;
  skippedUsers: number;
  usersToInsert: LegacyUser[];
  usersToVerify: LegacyUser[];
}

interface ProtectedComparison {
  stores: ProtectedTableComparison;
  teamMemberships: ProtectedTableComparison;
  users: ProtectedTableComparison;
}

interface ProtectedTableComparison {
  after: number;
  before: number;
  countUnchanged: boolean;
  idsUnchanged: boolean;
}

class SafeMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeMigrationError";
  }
}

function parseCli(argv: string[]): CliOptions {
  let batchSize = DEFAULT_BATCH_SIZE;
  let requestedMode: Mode | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--apply") {
      if (requestedMode && requestedMode !== "apply") {
        throw new SafeMigrationError("Choose only one of --apply, --dry-run, or --verify.");
      }
      requestedMode = "apply";
      continue;
    }

    if (argument === "--dry-run") {
      if (requestedMode && requestedMode !== "dry-run") {
        throw new SafeMigrationError("Choose only one of --apply, --dry-run, or --verify.");
      }
      requestedMode = "dry-run";
      continue;
    }

    if (argument === "--verify") {
      if (requestedMode && requestedMode !== "verify") {
        throw new SafeMigrationError("Choose only one of --apply, --dry-run, or --verify.");
      }
      requestedMode = "verify";
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }

    if (argument === "--batch-size") {
      const value = argv[index + 1];
      if (!value) {
        throw new SafeMigrationError("--batch-size requires a positive integer.");
      }
      batchSize = parseBatchSize(value);
      index += 1;
      continue;
    }

    if (argument.startsWith("--batch-size=")) {
      batchSize = parseBatchSize(argument.slice("--batch-size=".length));
      continue;
    }

    throw new SafeMigrationError(`Unknown argument: ${argument}`);
  }

  return {
    batchSize,
    help,
    mode: requestedMode ?? "dry-run",
  };
}

function parseBatchSize(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 5_000) {
    throw new SafeMigrationError("--batch-size must be an integer between 1 and 5000.");
  }
  return parsed;
}

function printHelp(): void {
  console.log(`Better Auth credential backfill

Usage:
  tsx scripts/backfill-better-auth-credentials.ts [--dry-run]
  tsx scripts/backfill-better-auth-credentials.ts --apply
  tsx scripts/backfill-better-auth-credentials.ts --verify

Options:
  --dry-run             Validate and report planned writes (default)
  --apply               Apply the backfill in a locked transaction
  --verify              Run post-migration validation without writes
  --batch-size <count>  Read/write batch size (default: ${DEFAULT_BATCH_SIZE})
  --help                Show this help`);
}

function loadDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    for (const filename of [".env.local", ".env"]) {
      const envPath = path.join(ROOT, filename);
      if (existsSync(envPath)) {
        config({ path: envPath, quiet: true });
      }
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new SafeMigrationError(
      "DATABASE_URL is required in the process environment, .env.local, or .env.",
    );
  }
  return databaseUrl;
}

async function loadUsers(executor: SelectExecutor, batchSize: number): Promise<LegacyUser[]> {
  const result: LegacyUser[] = [];
  let cursor: string | undefined;

  do {
    const page = await executor
      .select({
        createdAt: users.createdAt,
        email: users.email,
        emailVerified: users.emailVerified,
        id: users.id,
        passwordHash: users.passwordHash,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(cursor ? gt(users.id, cursor) : undefined)
      .orderBy(asc(users.id))
      .limit(batchSize);

    result.push(...page);
    cursor = page.at(-1)?.id;

    if (page.length < batchSize) {
      break;
    }
  } while (cursor);

  return result;
}

async function loadCredentialAccounts(
  executor: SelectExecutor,
  batchSize: number,
): Promise<CredentialAccount[]> {
  const result: CredentialAccount[] = [];
  let cursor: string | undefined;

  do {
    const page = await executor
      .select({
        accountId: accounts.accountId,
        id: accounts.id,
        password: accounts.password,
        providerId: accounts.providerId,
        userId: accounts.userId,
      })
      .from(accounts)
      .where(
        cursor
          ? and(eq(accounts.providerId, CREDENTIAL_PROVIDER), gt(accounts.id, cursor))
          : eq(accounts.providerId, CREDENTIAL_PROVIDER),
      )
      .orderBy(asc(accounts.id))
      .limit(batchSize);

    result.push(...page);
    cursor = page.at(-1)?.id;

    if (page.length < batchSize) {
      break;
    }
  } while (cursor);

  return result;
}

async function loadStoreIds(executor: SelectExecutor, batchSize: number): Promise<string[]> {
  const result: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await executor
      .select({ id: stores.id })
      .from(stores)
      .where(cursor ? gt(stores.id, cursor) : undefined)
      .orderBy(asc(stores.id))
      .limit(batchSize);

    result.push(...page.map((row) => row.id));
    cursor = page.at(-1)?.id;

    if (page.length < batchSize) {
      break;
    }
  } while (cursor);

  return result;
}

async function loadTeamMembershipIds(
  executor: SelectExecutor,
  batchSize: number,
): Promise<string[]> {
  const result: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await executor
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(cursor ? gt(teamMembers.id, cursor) : undefined)
      .orderBy(asc(teamMembers.id))
      .limit(batchSize);

    result.push(...page.map((row) => row.id));
    cursor = page.at(-1)?.id;

    if (page.length < batchSize) {
      break;
    }
  } while (cursor);

  return result;
}

function fingerprintIds(ids: string[]): string {
  const hash = createHash("sha256");
  for (const id of ids) {
    hash.update(id);
    hash.update("\n");
  }
  return hash.digest("hex");
}

async function readSnapshot(executor: SelectExecutor, batchSize: number): Promise<Snapshot> {
  const loadedUsers = await loadUsers(executor, batchSize);
  const credentialAccounts = await loadCredentialAccounts(executor, batchSize);
  const storeIds = await loadStoreIds(executor, batchSize);
  const teamMembershipIds = await loadTeamMembershipIds(executor, batchSize);
  const userIds = loadedUsers.map((user) => user.id);

  return {
    credentialAccounts,
    protectedState: {
      stores: {
        count: storeIds.length,
        idFingerprint: fingerprintIds(storeIds),
      },
      teamMemberships: {
        count: teamMembershipIds.length,
        idFingerprint: fingerprintIds(teamMembershipIds),
      },
      users: {
        count: userIds.length,
        idFingerprint: fingerprintIds(userIds),
      },
    },
    users: loadedUsers,
  };
}

function addToMap<T>(map: Map<string, T[]>, key: string, value: T): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

function analyzeSnapshot(snapshot: Snapshot): Analysis {
  const conflictUserIds = new Set<string>();
  const normalizedEmails = new Map<string, LegacyUser[]>();
  const userById = new Map(snapshot.users.map((user) => [user.id, user]));
  const credentialsByUser = new Map<string, CredentialAccount[]>();
  const credentialsByIdentity = new Map<string, CredentialAccount[]>();
  const usersToInsert: LegacyUser[] = [];
  const usersToVerify = snapshot.users.filter((user) => !user.emailVerified);

  const counts: ValidationCounts = {
    bcrypt: {
      invalid: 0,
      missing: 0,
    },
    credentialAccounts: {
      duplicateIdentityGroups: 0,
      duplicateIdentityRows: 0,
      mismatchedAccountIds: 0,
      passwordMismatches: 0,
      unknownUsers: 0,
      usersWithMultiple: 0,
    },
    email: {
      collisionGroups: 0,
      collisionUsers: 0,
      empty: 0,
      malformed: 0,
      untrimmed: 0,
    },
    timestamps: {
      invalid: 0,
    },
  };

  for (const user of snapshot.users) {
    const trimmedEmail = user.email.trim();

    if (!trimmedEmail) {
      counts.email.empty += 1;
      conflictUserIds.add(user.id);
    } else {
      if (trimmedEmail !== user.email) {
        counts.email.untrimmed += 1;
        conflictUserIds.add(user.id);
      }
      if (!EMAIL.safeParse(trimmedEmail).success) {
        counts.email.malformed += 1;
        conflictUserIds.add(user.id);
      }
      addToMap(normalizedEmails, trimmedEmail.toLowerCase(), user);
    }

    if (!user.passwordHash) {
      counts.bcrypt.missing += 1;
      conflictUserIds.add(user.id);
    } else if (!BCRYPT_DIGEST.test(user.passwordHash)) {
      counts.bcrypt.invalid += 1;
      conflictUserIds.add(user.id);
    }

    if (
      !Number.isFinite(user.createdAt.getTime()) ||
      !Number.isFinite(user.updatedAt.getTime()) ||
      user.updatedAt < user.createdAt
    ) {
      counts.timestamps.invalid += 1;
      conflictUserIds.add(user.id);
    }
  }

  for (const sameEmailUsers of normalizedEmails.values()) {
    if (sameEmailUsers.length > 1) {
      counts.email.collisionGroups += 1;
      counts.email.collisionUsers += sameEmailUsers.length;
      for (const user of sameEmailUsers) {
        conflictUserIds.add(user.id);
      }
    }
  }

  for (const account of snapshot.credentialAccounts) {
    addToMap(credentialsByUser, account.userId, account);
    addToMap(credentialsByIdentity, account.accountId, account);

    const owner = userById.get(account.userId);
    if (!owner) {
      counts.credentialAccounts.unknownUsers += 1;
      conflictUserIds.add(account.userId);
      continue;
    }

    if (account.providerId !== CREDENTIAL_PROVIDER || account.accountId !== owner.id) {
      counts.credentialAccounts.mismatchedAccountIds += 1;
      conflictUserIds.add(owner.id);
    }

    if (account.password !== owner.passwordHash) {
      counts.credentialAccounts.passwordMismatches += 1;
      conflictUserIds.add(owner.id);
    }
  }

  for (const sameIdentityAccounts of credentialsByIdentity.values()) {
    if (sameIdentityAccounts.length > 1) {
      counts.credentialAccounts.duplicateIdentityGroups += 1;
      counts.credentialAccounts.duplicateIdentityRows += sameIdentityAccounts.length;
      for (const account of sameIdentityAccounts) {
        conflictUserIds.add(account.userId);
      }
    }
  }

  for (const sameUserAccounts of credentialsByUser.values()) {
    if (sameUserAccounts.length > 1) {
      counts.credentialAccounts.usersWithMultiple += 1;
      for (const account of sameUserAccounts) {
        conflictUserIds.add(account.userId);
      }
    }
  }

  let skippedUsers = 0;

  for (const user of snapshot.users) {
    const forUser = credentialsByUser.get(user.id) ?? [];
    const forIdentity = credentialsByIdentity.get(user.id) ?? [];
    const exactExistingAccount =
      forUser.length === 1 &&
      forIdentity.length === 1 &&
      forUser[0] === forIdentity[0] &&
      forUser[0].providerId === CREDENTIAL_PROVIDER &&
      forUser[0].accountId === user.id &&
      forUser[0].password === user.passwordHash;

    if (exactExistingAccount) {
      skippedUsers += 1;
    } else if (forUser.length === 0 && forIdentity.length === 0) {
      usersToInsert.push(user);
    } else {
      conflictUserIds.add(user.id);
    }
  }

  const isValid =
    counts.email.empty === 0 &&
    counts.email.untrimmed === 0 &&
    counts.email.malformed === 0 &&
    counts.email.collisionGroups === 0 &&
    counts.bcrypt.missing === 0 &&
    counts.bcrypt.invalid === 0 &&
    counts.timestamps.invalid === 0 &&
    counts.credentialAccounts.unknownUsers === 0 &&
    counts.credentialAccounts.mismatchedAccountIds === 0 &&
    counts.credentialAccounts.passwordMismatches === 0 &&
    counts.credentialAccounts.duplicateIdentityGroups === 0 &&
    counts.credentialAccounts.usersWithMultiple === 0 &&
    conflictUserIds.size === 0;

  return {
    conflictUsers: conflictUserIds.size,
    counts,
    isValid,
    skippedUsers,
    usersToInsert,
    usersToVerify,
  };
}

function compareProtectedState(
  before: ProtectedState,
  after: ProtectedState,
): ProtectedComparison {
  return {
    stores: compareProtectedTable(before.stores, after.stores),
    teamMemberships: compareProtectedTable(before.teamMemberships, after.teamMemberships),
    users: compareProtectedTable(before.users, after.users),
  };
}

function compareProtectedTable(
  before: ProtectedTableState,
  after: ProtectedTableState,
): ProtectedTableComparison {
  return {
    after: after.count,
    before: before.count,
    countUnchanged: before.count === after.count,
    idsUnchanged: before.idFingerprint === after.idFingerprint,
  };
}

function protectedStateIsUnchanged(comparison: ProtectedComparison): boolean {
  return Object.values(comparison).every(
    (table) => table.countUnchanged && table.idsUnchanged,
  );
}

function publicValidation(analysis: Analysis) {
  return {
    bcryptHashes: {
      invalid: analysis.counts.bcrypt.invalid,
      missing: analysis.counts.bcrypt.missing,
      ok: analysis.counts.bcrypt.invalid === 0 && analysis.counts.bcrypt.missing === 0,
    },
    credentialAccounts: {
      ...analysis.counts.credentialAccounts,
      ok:
        analysis.counts.credentialAccounts.duplicateIdentityGroups === 0 &&
        analysis.counts.credentialAccounts.mismatchedAccountIds === 0 &&
        analysis.counts.credentialAccounts.passwordMismatches === 0 &&
        analysis.counts.credentialAccounts.unknownUsers === 0 &&
        analysis.counts.credentialAccounts.usersWithMultiple === 0,
    },
    email: {
      ...analysis.counts.email,
      ok:
        analysis.counts.email.collisionGroups === 0 &&
        analysis.counts.email.empty === 0 &&
        analysis.counts.email.malformed === 0 &&
        analysis.counts.email.untrimmed === 0,
    },
    timestamps: {
      ...analysis.counts.timestamps,
      ok: analysis.counts.timestamps.invalid === 0,
    },
  };
}

function publicProtectedBaseline(state: ProtectedState) {
  return {
    stores: state.stores.count,
    teamMemberships: state.teamMemberships.count,
    users: state.users.count,
  };
}

function buildDryRunReport(snapshot: Snapshot, analysis: Analysis, batchSize: number) {
  return {
    mode: "dry-run",
    status: analysis.isValid ? "ready" : "blocked",
    batchSize,
    counts: {
      conflictUsers: analysis.conflictUsers,
      credentialAccountsBefore: snapshot.credentialAccounts.length,
      legacyUsers: snapshot.users.length,
      skipped: analysis.skippedUsers,
      wouldInsert: analysis.usersToInsert.length,
      wouldMarkEmailVerified: analysis.usersToVerify.length,
    },
    protectedRecordBaseline: publicProtectedBaseline(snapshot.protectedState),
    validation: publicValidation(analysis),
    writesPerformed: false,
  };
}

function buildVerificationReport(snapshot: Snapshot, analysis: Analysis, batchSize: number) {
  const checks = {
    allLegacyUsersEmailVerified: analysis.usersToVerify.length === 0,
    allLegacyUsersHaveExactlyOneCredentialAccount:
      analysis.usersToInsert.length === 0 && analysis.skippedUsers === snapshot.users.length,
    migratedCountsMatch:
      analysis.skippedUsers === snapshot.users.length &&
      snapshot.credentialAccounts.length === snapshot.users.length,
    noCredentialConflicts: analysis.conflictUsers === 0,
    noDuplicateCredentialIdentities:
      analysis.counts.credentialAccounts.duplicateIdentityGroups === 0,
  };
  const passed = analysis.isValid && Object.values(checks).every(Boolean);

  return {
    mode: "verify",
    status: passed ? "passed" : "failed",
    batchSize,
    counts: {
      conflictUsers: analysis.conflictUsers,
      credentialAccounts: snapshot.credentialAccounts.length,
      legacyUsers: snapshot.users.length,
      matchedCredentialUsers: analysis.skippedUsers,
      missingCredentialUsers: analysis.usersToInsert.length,
      unverifiedLegacyUsers: analysis.usersToVerify.length,
    },
    checks,
    protectedRecordCounts: publicProtectedBaseline(snapshot.protectedState),
    validation: publicValidation(analysis),
    writesPerformed: false,
  };
}

function chunk<T>(values: T[], batchSize: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    result.push(values.slice(index, index + batchSize));
  }
  return result;
}

async function runDryRun(database: MigrationDatabase, batchSize: number): Promise<boolean> {
  const snapshot = await database.transaction(
    async (transaction) => readSnapshot(transaction, batchSize),
    { accessMode: "read only", isolationLevel: "repeatable read" },
  );
  const analysis = analyzeSnapshot(snapshot);
  console.log(JSON.stringify(buildDryRunReport(snapshot, analysis, batchSize), null, 2));
  console.log("Dry run complete; no writes were performed.");
  return analysis.isValid;
}

async function runVerification(database: MigrationDatabase, batchSize: number): Promise<boolean> {
  const snapshot = await database.transaction(
    async (transaction) => readSnapshot(transaction, batchSize),
    { accessMode: "read only", isolationLevel: "repeatable read" },
  );
  const analysis = analyzeSnapshot(snapshot);
  const report = buildVerificationReport(snapshot, analysis, batchSize);
  console.log(JSON.stringify(report, null, 2));
  return report.status === "passed";
}

async function runApply(database: MigrationDatabase, batchSize: number): Promise<boolean> {
  const outcome = await database.transaction(
    async (transaction) => {
      await transaction.execute(sql`set local lock_timeout = '10s'`);
      await transaction.execute(
        sql`lock table "users", "accounts", "stores", "team_members" in share row exclusive mode`,
      );

      const before = await readSnapshot(transaction, batchSize);
      const beforeAnalysis = analyzeSnapshot(before);

      if (!beforeAnalysis.isValid) {
        return {
          applied: false as const,
          report: {
            ...buildDryRunReport(before, beforeAnalysis, batchSize),
            mode: "apply",
            status: "blocked",
          },
        };
      }

      let inserted = 0;
      for (const userBatch of chunk(beforeAnalysis.usersToInsert, batchSize)) {
        const values = userBatch.map((user) => {
          if (!user.passwordHash) {
            throw new SafeMigrationError(
              "A password hash changed after validation; the transaction was rolled back.",
            );
          }

          return {
            accountId: user.id,
            createdAt: user.createdAt,
            id: randomUUID(),
            password: user.passwordHash,
            providerId: CREDENTIAL_PROVIDER,
            updatedAt: user.updatedAt,
            userId: user.id,
          };
        });

        const insertedRows = await transaction
          .insert(accounts)
          .values(values)
          .returning({ id: accounts.id });
        inserted += insertedRows.length;
      }

      let markedEmailVerified = 0;
      for (const userBatch of chunk(beforeAnalysis.usersToVerify, batchSize)) {
        const updatedRows = await transaction
          .update(users)
          .set({ emailVerified: true })
          .where(
            and(
              inArray(
                users.id,
                userBatch.map((user) => user.id),
              ),
              eq(users.emailVerified, false),
            ),
          )
          .returning({ id: users.id });
        markedEmailVerified += updatedRows.length;
      }

      const after = await readSnapshot(transaction, batchSize);
      const afterAnalysis = analyzeSnapshot(after);
      const protectedRecords = compareProtectedState(
        before.protectedState,
        after.protectedState,
      );
      const checks = {
        allLegacyUsersEmailVerified: afterAnalysis.usersToVerify.length === 0,
        allLegacyUsersHaveExactlyOneCredentialAccount:
          afterAnalysis.usersToInsert.length === 0 &&
          afterAnalysis.skippedUsers === after.users.length,
        insertedCountMatches: inserted === beforeAnalysis.usersToInsert.length,
        migratedCountsMatch:
          inserted + beforeAnalysis.skippedUsers === before.users.length &&
          after.credentialAccounts.length === after.users.length,
        noCredentialConflicts: afterAnalysis.conflictUsers === 0,
        noDuplicateCredentialIdentities:
          afterAnalysis.counts.credentialAccounts.duplicateIdentityGroups === 0,
        protectedRecordsUnchanged: protectedStateIsUnchanged(protectedRecords),
        verifiedCountMatches: markedEmailVerified === beforeAnalysis.usersToVerify.length,
      };

      if (!afterAnalysis.isValid || !Object.values(checks).every(Boolean)) {
        throw new SafeMigrationError(
          "Post-migration validation failed; the transaction was rolled back.",
        );
      }

      return {
        applied: true as const,
        report: {
          mode: "apply",
          status: "applied",
          batchSize,
          counts: {
            conflictUsers: afterAnalysis.conflictUsers,
            credentialAccountsAfter: after.credentialAccounts.length,
            credentialAccountsBefore: before.credentialAccounts.length,
            inserted,
            legacyUsers: after.users.length,
            markedEmailVerified,
            skipped: beforeAnalysis.skippedUsers,
          },
          checks,
          protectedRecords,
          validation: publicValidation(afterAnalysis),
          writesPerformed: inserted > 0 || markedEmailVerified > 0,
        },
      };
    },
    { accessMode: "read write", isolationLevel: "serializable" },
  );

  console.log(JSON.stringify(outcome.report, null, 2));
  return outcome.applied;
}

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const connection = postgres(loadDatabaseUrl(), {
    max: 1,
  });
  const database = drizzle(connection, { schema: migrationSchema });

  try {
    let succeeded = false;
    if (options.mode === "apply") {
      succeeded = await runApply(database, options.batchSize);
    } else if (options.mode === "verify") {
      succeeded = await runVerification(database, options.batchSize);
    } else {
      succeeded = await runDryRun(database, options.batchSize);
    }

    if (!succeeded) {
      process.exitCode = 1;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof SafeMigrationError) {
    console.error(error.message);
  } else {
    // Database errors can include query parameters. Keep this deliberately generic
    // so a failed credential insert can never print a password digest.
    console.error("Better Auth credential backfill failed unexpectedly; no sensitive values were logged.");
  }
  process.exitCode = 1;
});
