import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, teamMembers } from "@/lib/db/schema";
import {
  ForbiddenError,
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { createCredentialUser } from "@/lib/auth/provisioning";
import { eq, and } from "drizzle-orm";

type TeamRole = "SUPERADMIN" | "ADMIN";

const TEMPORARY_INVITE_PASSWORD = "ChangeMe123!";

class InviteProvisioningError extends Error {
  constructor() {
    super("Unable to provision invited user");
    this.name = "InviteProvisioningError";
  }
}

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

function getTeamRole(role: unknown): TeamRole | null {
  if (role === undefined || role === null || role === "") return "ADMIN";
  if (role === "ADMIN" || role === "SUPERADMIN") return role;
  return null;
}

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

async function findOrCreateInvitee(email: string, name: string) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) return existingUser;

  try {
    const { user } = await createCredentialUser({
      email,
      name,
      password: TEMPORARY_INVITE_PASSWORD,
    });
    return user;
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      // A concurrent invite may have committed the same normalized email while
      // this request was provisioning. Reuse that user rather than generating
      // another credential or replacing its password.
      const concurrentUser = await findUserByEmail(email);
      if (concurrentUser) return concurrentUser;
    }

    // Database-driver errors can include query parameters. Do not retain the
    // original error here because credential parameters can contain a digest.
    throw new InviteProvisioningError();
  }
}

function duplicateMemberResponse() {
  return NextResponse.json(
    { error: "User is already a team member" },
    { status: 409 },
  );
}

export async function GET(request: Request) {
  try {
    const access = await requireActiveStore(request);

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
      .where(eq(teamMembers.storeId, access.store.id));

    return NextResponse.json({ members });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireActiveStore(request);
    if (access.auth.user.role !== "SUPERADMIN" && !access.isOwner) {
      throw new ForbiddenError(
        "Only the store owner or a super admin can invite team members",
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { email, name, role } = body;

    if (
      typeof email !== "string" ||
      email.trim().length === 0 ||
      typeof name !== "string" ||
      name.trim().length === 0
    ) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    const memberRole = getTeamRole(role);
    if (!memberRole) {
      return NextResponse.json({ error: "Invalid team role" }, { status: 400 });
    }
    if (
      memberRole === "SUPERADMIN" &&
      access.auth.user.role !== "SUPERADMIN"
    ) {
      throw new ForbiddenError(
        "Only a super admin can grant the SUPERADMIN role",
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findOrCreateInvitee(normalizedEmail, name.trim());

    const [newMember] = await db
      .insert(teamMembers)
      .values({
        userId: user.id,
        storeId: access.store.id,
        role: memberRole,
      })
      .onConflictDoNothing({
        target: [teamMembers.userId, teamMembers.storeId],
      })
      .returning();

    if (!newMember) return duplicateMemberResponse();

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
    if (error instanceof InviteProvisioningError) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    return routeAuthErrorResponse(error);
  }
}
