import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, stores, teamMembers } from "@/lib/db/schema";
import { getTokenFromRequest, COOKIE_NAME } from "@/lib/auth/session";
import { signToken } from "@/lib/auth/jwt";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { storeId } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    let hasAccess = payload.role === "SUPERADMIN";
    if (!hasAccess) {
      const memberships = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, payload.userId), eq(teamMembers.storeId, storeId)));
      hasAccess = memberships.length > 0;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const foundStores = await db.select().from(stores).where(eq(stores.id, storeId));
    if (foundStores.length === 0) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const store = foundStores[0];

    const foundUsers = await db.select().from(users).where(eq(users.id, payload.userId));
    if (foundUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    const user = foundUsers[0];

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
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
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
  } catch (error) {
    console.error("Switch store error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
