import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import jwt from "jsonwebtoken";
import type {
  CreateCredentialUserInput,
  CredentialUserProvisioningResult,
  DefaultStoreProvisioningResult,
} from "../../../../lib/auth/provisioning-core";
import type { JWTPayload } from "../../../../lib/auth/jwt";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const TEST_JWT_SECRET = "register-route-test-secret";

const user: CredentialUserProvisioningResult["user"] = {
  id: USER_ID,
  email: "merchant@example.com",
  passwordHash: "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  name: "Merchant",
  role: "ADMIN",
  emailVerified: false,
  avatarUrl: null,
  createdAt: new Date("2026-11-25T12:00:00.000Z"),
  updatedAt: new Date("2026-11-25T12:00:00.000Z"),
};

const credentialUserResult: CredentialUserProvisioningResult = {
  user,
  credentialAccount: {
    id: "30000000-0000-4000-8000-000000000001",
    accountId: USER_ID,
    providerId: "credential",
    userId: USER_ID,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
};

const defaultStoreResult: DefaultStoreProvisioningResult = {
  store: {
    id: STORE_ID,
    name: "Merchant's Store",
    slug: `default-${USER_ID}`,
    ownerId: USER_ID,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
  membership: {
    id: "40000000-0000-4000-8000-000000000001",
    userId: USER_ID,
    storeId: STORE_ID,
    role: "ADMIN",
    createdAt: user.createdAt,
  },
  created: true,
};

let createCredentialUserCalls: CreateCredentialUserInput[] = [];
let provisionDefaultStoreCalls: string[] = [];
let createCredentialUserImplementation: (
  input: CreateCredentialUserInput,
) => Promise<CredentialUserProvisioningResult>;
let provisionDefaultStoreImplementation: (
  userId: string,
) => Promise<DefaultStoreProvisioningResult>;

mock.module(
  new URL("../../../../lib/auth/provisioning.ts", import.meta.url).href,
  {
    namedExports: {
      createCredentialUser: async (input: CreateCredentialUserInput) => {
        createCredentialUserCalls.push(input);
        return createCredentialUserImplementation(input);
      },
      provisionDefaultStore: async (userId: string) => {
        provisionDefaultStoreCalls.push(userId);
        return provisionDefaultStoreImplementation(userId);
      },
    },
  },
);

let handlers!: typeof import("./route");

before(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  handlers = await import("./route");
});

beforeEach(() => {
  createCredentialUserCalls = [];
  provisionDefaultStoreCalls = [];
  createCredentialUserImplementation = async () => credentialUserResult;
  provisionDefaultStoreImplementation = async () => defaultStoreResult;
});

function registerRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "  Merchant  ",
      email: "  MERCHANT@Example.COM  ",
      password: "Password123!",
      ...overrides,
    }),
  });
}

function readLegacyToken(response: Response) {
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  const match = /commercecraft_token=([^;]+)/.exec(cookie);
  assert.ok(match);
  return {
    cookie,
    payload: jwt.verify(match[1], TEST_JWT_SECRET) as JWTPayload,
  };
}

describe("legacy registration route", () => {
  it("creates credentials, provisions a store, and preserves the legacy response and cookie", async () => {
    const response = await handlers.POST(registerRequest());

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      user: {
        id: USER_ID,
        email: "merchant@example.com",
        name: "Merchant",
        role: "ADMIN",
      },
      store: {
        id: STORE_ID,
        name: "Merchant's Store",
        slug: `default-${USER_ID}`,
      },
    });
    assert.deepEqual(createCredentialUserCalls, [
      {
        email: "merchant@example.com",
        name: "Merchant",
        password: "Password123!",
      },
    ]);
    assert.deepEqual(provisionDefaultStoreCalls, [USER_ID]);

    const { cookie, payload } = readLegacyToken(response);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Path=\//i);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=604800/i);
    assert.deepEqual(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        storeId: payload.storeId,
      },
      {
        userId: USER_ID,
        email: "merchant@example.com",
        role: "ADMIN",
        storeId: STORE_ID,
      },
    );
  });

  it("maps duplicate email constraints to a generic conflict without provisioning or a session", async () => {
    createCredentialUserImplementation = async () => {
      const databaseError = Object.assign(new Error("sensitive database detail"), {
        code: "23505",
      });
      throw new Error("query failed", { cause: databaseError });
    };

    const response = await handlers.POST(registerRequest());
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.deepEqual(body, {
      error: "Unable to register with the provided details",
    });
    assert.doesNotMatch(JSON.stringify(body), /exists|duplicate|merchant@/i);
    assert.equal(createCredentialUserCalls.length, 1);
    assert.deepEqual(provisionDefaultStoreCalls, []);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  it("ignores an untrusted role and only mints ADMIN identity", async () => {
    const response = await handlers.POST(
      registerRequest({ role: "SUPERADMIN" }),
    );
    const body = await response.json();
    const { payload } = readLegacyToken(response);

    assert.equal(response.status, 200);
    assert.equal(body.user.role, "ADMIN");
    assert.equal(payload.role, "ADMIN");
    assert.equal(
      Object.hasOwn(createCredentialUserCalls[0] as object, "role"),
      false,
    );
  });

  it("retries an ambiguous provisioning failure and returns the idempotently recovered store", async () => {
    let attempts = 0;
    provisionDefaultStoreImplementation = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("connection ended after commit");
      }
      return { ...defaultStoreResult, created: false };
    };

    const response = await handlers.POST(registerRequest());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.store.id, STORE_ID);
    assert.equal(createCredentialUserCalls.length, 1);
    assert.deepEqual(provisionDefaultStoreCalls, [USER_ID, USER_ID]);
    readLegacyToken(response);
  });

  it("keeps the credential user recoverable when provisioning still fails", async (context) => {
    provisionDefaultStoreImplementation = async () => {
      throw new Error("store database unavailable");
    };
    const consoleError = context.mock.method(console, "error", () => undefined);

    const response = await handlers.POST(registerRequest());

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
    assert.equal(createCredentialUserCalls.length, 1);
    assert.deepEqual(provisionDefaultStoreCalls, [USER_ID, USER_ID]);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.deepEqual(consoleError.mock.calls[0].arguments, [
      "Register error: registration could not be completed",
    ]);

    // No cleanup API is called: the successful credential transaction remains
    // available for a later idempotent provisioning retry.
    provisionDefaultStoreImplementation = async () => defaultStoreResult;
    assert.equal(
      (await provisionDefaultStoreImplementation(USER_ID)).store.id,
      STORE_ID,
    );
  });
});
