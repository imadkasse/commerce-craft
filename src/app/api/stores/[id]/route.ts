import { NextResponse } from "next/server";
import { db, type Database } from "@/lib/db";
import { stores, teamMembers, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { and, eq, ne } from "drizzle-orm";
import type { JWTPayload } from "@/lib/auth/jwt";
import type { StoreTheme } from "@/lib/store-theme";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

async function getStoreAccess(
  db: Database,
  storeId: string,
  payload: JWTPayload,
): Promise<{ store: typeof stores.$inferSelect; role: string } | null> {
  const found = await db.select().from(stores).where(eq(stores.id, storeId));
  if (found.length === 0) return null;
  const store = found[0];

  if (payload.role === "SUPERADMIN") {
    return { store, role: "SUPERADMIN" };
  }

  const memberships = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, payload.userId), eq(teamMembers.storeId, storeId)));
  if (memberships.length === 0) return null;

  return { store, role: memberships[0].role };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getStoreAccess(db, id, payload);
    if (!access) {
      const found = await db.select().from(stores).where(eq(stores.id, id));
      return NextResponse.json(
        { error: found.length > 0 ? "Forbidden" : "Store not found" },
        { status: found.length > 0 ? 403 : 404 },
      );
    }

    return NextResponse.json({ store: access.store });
  } catch (error) {
    console.error("Stores [id] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getStoreAccess(db, id, payload);
    if (!access) {
      const found = await db.select().from(stores).where(eq(stores.id, id));
      return NextResponse.json(
        { error: found.length > 0 ? "Forbidden" : "Store not found" },
        { status: found.length > 0 ? 403 : 404 },
      );
    }

    const body = await request.json();
    const { name, slug, description, logoUrl, domain, theme, status } = body;

    const canEditIdentity = payload.role === "SUPERADMIN" || access.store.ownerId === payload.userId;

    const protectedFields = ["name", "slug", "domain", "status"];
    const wantsIdentityChange = protectedFields.some((field) => body[field] !== undefined);
    if (wantsIdentityChange && !canEditIdentity) {
      return NextResponse.json(
        { error: "Only the store owner or a super admin can update these fields" },
        { status: 403 },
      );
    }

    let normalizedDomain: string | undefined;
    if (domain !== undefined) {
      if (typeof domain !== "string") {
        return NextResponse.json({ error: "Domain must be a string" }, { status: 400 });
      }
      normalizedDomain = normalizeDomain(domain);
      const existing = await db
        .select()
        .from(stores)
        .where(and(eq(stores.domain, normalizedDomain), ne(stores.id, id)));
      if (existing.length > 0) {
        return NextResponse.json({ error: "Domain is already in use" }, { status: 409 });
      }
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || !SLUG_REGEX.test(slug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 },
        );
      }
      const existing = await db
        .select()
        .from(stores)
        .where(and(eq(stores.slug, slug), ne(stores.id, id)));
      if (existing.length > 0) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
      }
    }

    if (status !== undefined && status !== "draft" && status !== "published") {
      return NextResponse.json({ error: "Status must be 'draft' or 'published'" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (domain !== undefined) updateData.domain = normalizedDomain;
    if (theme !== undefined) updateData.theme = theme as Partial<StoreTheme>;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: id,
      action: "store.updated",
      details: {
        name: name !== undefined ? name : undefined,
        slug: slug !== undefined ? slug : undefined,
        domain: normalizedDomain,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({ store: updated });
  } catch (error) {
    console.error("Stores [id] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getStoreAccess(db, id, payload);
    if (!access) {
      const found = await db.select().from(stores).where(eq(stores.id, id));
      return NextResponse.json(
        { error: found.length > 0 ? "Forbidden" : "Store not found" },
        { status: found.length > 0 ? 403 : 404 },
      );
    }

    const canDelete = payload.role === "SUPERADMIN" || access.store.ownerId === payload.userId;
    if (!canDelete) {
      return NextResponse.json(
        { error: "Only the store owner or a super admin can delete this store" },
        { status: 403 },
      );
    }

    await db.delete(stores).where(eq(stores.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stores [id] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
