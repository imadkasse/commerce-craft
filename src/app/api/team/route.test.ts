import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";
import {
  ForbiddenError,
  UnauthenticatedError,
  getApiErrorDescriptor,
} from "../../../lib/auth/guards-core";

type Role = "SUPERADMIN" | "ADMIN";

interface AccessStub {
  auth: { user: { role: Role } };
  store: { id: string };
  isOwner: boolean;
}

interface UserStub {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "ADMIN";
  emailVerified: boolean;
  avatarUrl: null;
  createdAt: Date;
  updatedAt: Date;
}

interface CredentialUserInputStub {
  email: string;
  name: string;
  password: string;
}

const NOW = new Date("2026-01-01T00:00:00.000Z");
const PROVISIONED_USER_ID = "11111111-1111-4111-8111-111111111111";

function userStub(
  overrides: Partial<UserStub> = {},
): UserStub {
  return {
    id: PROVISIONED_USER_ID,
    email: "invitee@example.com",
    passwordHash: "<existing-bcrypt-12-digest>",
    name: "Invitee",
    role: "ADMIN",
    emailVerified: false,
    avatarUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function credentialProvisioningResult(user: UserStub = userStub()) {
  return {
    user,
    credentialAccount: {
      id: "22222222-2222-4222-8222-222222222222",
      accountId: user.id,
      providerId: "credential" as const,
      userId: user.id,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: user.passwordHash,
      createdAt: NOW,
      updatedAt: NOW,
    },
  };
}

let activeStoreAccess: AccessStub;
let activeStoreError: unknown;
let activeStoreCalls = 0;
let errorMapperCalls = 0;
let selectCalls = 0;
let selectResults: unknown[][] = [];
let insertedValues: unknown[] = [];
let insertResults: unknown[][] = [];
let conflictTargetCalls = 0;
let credentialUserCalls: CredentialUserInputStub[] = [];
let credentialUserError: unknown;
let credentialAccountCreations = 0;
let provisionedResult = credentialProvisioningResult();

const dbStub = {
  select() {
    const takeResult = async () => {
      selectCalls += 1;
      return selectResults.shift() ?? [];
    };

    return {
      from() {
        return {
          where: takeResult,
          innerJoin() {
            return { where: takeResult };
          },
        };
      },
    };
  },
  insert() {
    return {
      values(values: unknown) {
        insertedValues.push(values);
        return {
          onConflictDoNothing() {
            conflictTargetCalls += 1;
            return {
              returning: async () => insertResults.shift() ?? [],
            };
          },
        };
      },
    };
  },
};

mock.module(new URL("../../../lib/db/index.ts", import.meta.url).href, {
  namedExports: { db: dbStub },
});

mock.module(new URL("../../../lib/auth/guards.ts", import.meta.url).href, {
  namedExports: {
    ForbiddenError,
    requireActiveStore: async () => {
      activeStoreCalls += 1;
      if (activeStoreError) throw activeStoreError;
      return activeStoreAccess;
    },
    routeAuthErrorResponse: (error: unknown) => {
      errorMapperCalls += 1;
      const descriptor = getApiErrorDescriptor(error);
      return Response.json(descriptor.body, { status: descriptor.status });
    },
  },
});

mock.module(new URL("../../../lib/auth/provisioning.ts", import.meta.url).href, {
  namedExports: {
    createCredentialUser: async (input: CredentialUserInputStub) => {
      credentialUserCalls.push({ ...input });
      if (credentialUserError) throw credentialUserError;
      credentialAccountCreations += 1;
      return provisionedResult;
    },
  },
});

let handlers!: typeof import("./route");

before(async () => {
  handlers = await import("./route");
});

beforeEach(() => {
  activeStoreAccess = {
    auth: { user: { role: "ADMIN" } },
    store: { id: "store-1" },
    isOwner: true,
  };
  activeStoreError = null;
  activeStoreCalls = 0;
  errorMapperCalls = 0;
  selectCalls = 0;
  selectResults = [];
  insertedValues = [];
  insertResults = [
    [
      {
        id: "member-1",
        role: "ADMIN",
        createdAt: NOW,
      },
    ],
  ];
  conflictTargetCalls = 0;
  credentialUserCalls = [];
  credentialUserError = null;
  credentialAccountCreations = 0;
  provisionedResult = credentialProvisioningResult();
});

function postRequest(
  role: Role,
  overrides: Partial<{ email: string; name: string }> = {},
) {
  return new Request("http://localhost/api/team", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "invitee@example.com",
      name: "Invitee",
      role,
      ...overrides,
    }),
  });
}

function prepareExistingUser(role: Role, user: UserStub = userStub()) {
  selectResults = [[user]];
  insertResults = [
    [
      {
        id: "member-1",
        role,
        createdAt: NOW,
      },
    ],
  ];
}

describe("team route authorization", () => {
  it("maps a missing session to 401 before listing members", async () => {
    activeStoreError = new UnauthenticatedError();

    const response = await handlers.GET(
      new Request("http://localhost/api/team"),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(activeStoreCalls, 1);
    assert.equal(errorMapperCalls, 1);
    assert.equal(selectCalls, 0);
  });

  it("maps stale active-store membership to 403 before listing members", async () => {
    activeStoreError = new ForbiddenError();

    const response = await handlers.GET(
      new Request("http://localhost/api/team"),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(activeStoreCalls, 1);
    assert.equal(errorMapperCalls, 1);
    assert.equal(selectCalls, 0);
  });

  it("rejects an ordinary non-owner admin before provisioning", async () => {
    activeStoreAccess.isOwner = false;

    const response = await handlers.POST(postRequest("ADMIN"));

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "Only the store owner or a super admin can invite team members",
    });
    assert.equal(errorMapperCalls, 1);
    assert.equal(selectCalls, 0);
    assert.deepEqual(credentialUserCalls, []);
    assert.deepEqual(insertedValues, []);
  });

  it("rejects an owner admin granting SUPERADMIN before provisioning", async () => {
    const response = await handlers.POST(postRequest("SUPERADMIN"));

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: "Only a super admin can grant the SUPERADMIN role",
    });
    assert.equal(errorMapperCalls, 1);
    assert.equal(selectCalls, 0);
    assert.deepEqual(credentialUserCalls, []);
    assert.deepEqual(insertedValues, []);
  });

  it("allows a current store owner to invite an ADMIN", async () => {
    prepareExistingUser("ADMIN");

    const response = await handlers.POST(postRequest("ADMIN"));

    assert.equal(response.status, 200);
    assert.equal(errorMapperCalls, 0);
    assert.deepEqual(insertedValues, [
      { userId: PROVISIONED_USER_ID, storeId: "store-1", role: "ADMIN" },
    ]);
  });

  it("allows only a global SUPERADMIN to grant SUPERADMIN without ownership", async () => {
    activeStoreAccess.auth.user.role = "SUPERADMIN";
    activeStoreAccess.isOwner = false;
    prepareExistingUser("SUPERADMIN");

    const response = await handlers.POST(postRequest("SUPERADMIN"));

    assert.equal(response.status, 200);
    assert.equal(errorMapperCalls, 0);
    assert.deepEqual(insertedValues, [
      {
        userId: PROVISIONED_USER_ID,
        storeId: "store-1",
        role: "SUPERADMIN",
      },
    ]);
  });
});

describe("team route credential provisioning", () => {
  it("delegates a new temporary user and its sole credential account to the shared service", async () => {
    selectResults = [[]];

    const response = await handlers.POST(
      postRequest("ADMIN", {
        email: "  INVITEE@Example.COM  ",
        name: "  Invitee  ",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(credentialUserCalls, [
      {
        email: "invitee@example.com",
        name: "Invitee",
        password: "ChangeMe123!",
      },
    ]);
    assert.equal(credentialAccountCreations, 1);
    assert.equal(
      provisionedResult.credentialAccount.password,
      provisionedResult.user.passwordHash,
    );
    assert.deepEqual(insertedValues, [
      { userId: PROVISIONED_USER_ID, storeId: "store-1", role: "ADMIN" },
    ]);
    assert.equal(
      Object.hasOwn(insertedValues[0] as object, "passwordHash"),
      false,
    );
    assert.equal(conflictTargetCalls, 1);
  });

  it("does not create credentials or reset the password for an existing user", async () => {
    const existingUser = userStub({
      passwordHash: "<unchanged-existing-digest>",
    });
    prepareExistingUser("ADMIN", existingUser);

    const response = await handlers.POST(postRequest("ADMIN"));

    assert.equal(response.status, 200);
    assert.deepEqual(credentialUserCalls, []);
    assert.equal(credentialAccountCreations, 0);
    assert.equal(existingUser.passwordHash, "<unchanged-existing-digest>");
    assert.deepEqual(insertedValues, [
      { userId: existingUser.id, storeId: "store-1", role: "ADMIN" },
    ]);
  });

  it("recovers from a concurrent duplicate-email insert without reprovisioning", async () => {
    const concurrentUser = userStub({
      passwordHash: "<concurrent-user-digest>",
    });
    selectResults = [[], [concurrentUser]];
    credentialUserError = {
      cause: { code: "23505", constraint_name: "users_email_unique" },
    };

    const response = await handlers.POST(postRequest("ADMIN"));

    assert.equal(response.status, 200);
    assert.equal(selectCalls, 2);
    assert.equal(credentialUserCalls.length, 1);
    assert.equal(credentialAccountCreations, 0);
    assert.equal(concurrentUser.passwordHash, "<concurrent-user-digest>");
    assert.deepEqual(insertedValues, [
      { userId: concurrentUser.id, storeId: "store-1", role: "ADMIN" },
    ]);
  });

  it("keeps user and credential creation idempotent across an invite retry", async () => {
    selectResults = [[], [provisionedResult.user]];
    insertResults = [
      [{ id: "member-1", role: "ADMIN", createdAt: NOW }],
      [],
    ];

    const firstResponse = await handlers.POST(postRequest("ADMIN"));
    const retryResponse = await handlers.POST(postRequest("ADMIN"));

    assert.equal(firstResponse.status, 200);
    assert.equal(retryResponse.status, 409);
    assert.deepEqual(await retryResponse.json(), {
      error: "User is already a team member",
    });
    assert.equal(credentialUserCalls.length, 1);
    assert.equal(credentialAccountCreations, 1);
    assert.equal(conflictTargetCalls, 2);
    assert.equal(insertedValues.length, 2);
  });

  it("returns a conflict when a concurrent membership insert wins", async () => {
    prepareExistingUser("ADMIN");
    insertResults = [[]];

    const response = await handlers.POST(postRequest("ADMIN"));

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "User is already a team member",
    });
    assert.equal(credentialUserCalls.length, 0);
    assert.equal(conflictTargetCalls, 1);
  });

  it("does not expose credential details when provisioning fails", async () => {
    selectResults = [[]];
    credentialUserError = {
      code: "XX000",
      parameters: ["ChangeMe123!", "<sensitive-digest>"],
    };

    const response = await handlers.POST(postRequest("ADMIN"));
    const body = await response.text();

    assert.equal(response.status, 500);
    assert.equal(body, JSON.stringify({ error: "Internal server error" }));
    assert.equal(body.includes("ChangeMe123!"), false);
    assert.equal(body.includes("sensitive-digest"), false);
    assert.equal(errorMapperCalls, 0);
    assert.deepEqual(insertedValues, []);
  });
});
