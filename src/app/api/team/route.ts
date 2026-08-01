import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, stores, teamMembers } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!payload.storeId) {
      return NextResponse.json({ members: [] });
    }

    const members = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        createdAt: teamMembers.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatarUrl,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.storeId, payload.storeId));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!payload.storeId) {
      return NextResponse.json({ error: "No store associated with your account" }, { status: 400 });
    }

    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    let targetUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (targetUser.length === 0) {
      const tempPassword = await hashPassword("ChangeMe123!");
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash: tempPassword,
          name: name.trim(),
          role: role || "ADMIN",
        })
        .returning();
      targetUser = [newUser];
    }

    const user = targetUser[0];

    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, user.id), eq(teamMembers.storeId, payload.storeId))
      );

    if (existingMember.length > 0) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
    }

    const [newMember] = await db
      .insert(teamMembers)
      .values({
        userId: user.id,
        storeId: payload.storeId,
        role: role || "ADMIN",
      })
      .returning();

    return NextResponse.json({
      member: {
        id: newMember.id,
        role: newMember.role,
        createdAt: newMember.createdAt,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      },
    });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
