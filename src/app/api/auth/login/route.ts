import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, stores, teamMembers } from "@/lib/db/schema";
import { comparePassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const foundUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (foundUsers.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = foundUsers[0];
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const memberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id));

    const storeId = memberships.length > 0 ? memberships[0].storeId : undefined;

    let storeInfo = null;
    if (storeId) {
      const storeResults = await db.select().from(stores).where(eq(stores.id, storeId));
      if (storeResults.length > 0) {
        const s = storeResults[0];
        storeInfo = { id: s.id, name: s.name, slug: s.slug };
      }
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as "SUPERADMIN" | "ADMIN",
      storeId,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      store: storeInfo,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
