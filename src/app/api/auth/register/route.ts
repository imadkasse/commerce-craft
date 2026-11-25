import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth/jwt";
import {
  createCredentialUser,
  provisionDefaultStore,
} from "@/lib/auth/provisioning";
import { COOKIE_NAME } from "@/lib/auth/session";

const DUPLICATE_REGISTRATION_ERROR =
  "Unable to register with the provided details";

function isUniqueConstraintViolation(error: unknown): boolean {
  const visited = new Set<object>();
  let current = error;

  while (typeof current === "object" && current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);

    const candidate = current as { cause?: unknown; code?: unknown };
    if (candidate.code === "23505") return true;
    current = candidate.cause;
  }

  return false;
}

async function provisionStoreWithRetry(userId: string) {
  try {
    return await provisionDefaultStore(userId);
  } catch {
    // Provisioning is idempotent. One retry safely handles an ambiguous commit
    // without risking a second default store or membership.
    return provisionDefaultStore(userId);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    let newUser;
    try {
      ({ user: newUser } = await createCredentialUser({
        email: normalizedEmail,
        name: name.trim(),
        password,
      }));
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return NextResponse.json(
          { error: DUPLICATE_REGISTRATION_ERROR },
          { status: 409 },
        );
      }
      throw error;
    }

    // Registration must never accept or mint a privileged role, even if the
    // service contract is accidentally weakened later.
    if (newUser.role !== "ADMIN") {
      throw new Error("Registration created a non-ADMIN user");
    }

    const { store: newStore } = await provisionStoreWithRetry(newUser.id);

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      storeId: newStore.id,
    });

    const response = NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      store: {
        id: newStore.id,
        name: newStore.name,
        slug: newStore.slug,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    // Errors from database drivers may contain query parameters. Do not log or
    // return those details from this public credential endpoint.
    console.error("Register error: registration could not be completed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
