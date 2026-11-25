import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { setInitialStoreOnSessionCreate } from "@/lib/auth/provisioning";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  // Keep the migration deployable with the existing legacy secret while
  // allowing environments to rotate Better Auth onto its own secret.
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => comparePassword(password, hash),
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: setInitialStoreOnSessionCreate,
      },
    },
  },
  advanced: {
    database: {
      validateSchema: true,
      generateId: "uuid",
    },
  },
  user: {
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "ADMIN",
        input: false,
      },
    },
  },
  session: {
    additionalFields: {
      activeStoreId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});
