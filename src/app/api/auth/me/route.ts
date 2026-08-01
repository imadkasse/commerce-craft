import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, stores, teamMembers } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, payload.userId));
    if (foundUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = foundUsers[0];
    let storeInfo = null;

    if (payload.storeId) {
      const storeResults = await db.select().from(stores).where(eq(stores.id, payload.storeId));
      if (storeResults.length > 0) {
        const s = storeResults[0];
        storeInfo = { id: s.id, name: s.name, slug: s.slug };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      store: storeInfo,
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
