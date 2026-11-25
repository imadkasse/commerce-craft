import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores, activityLogs } from "@/lib/db/schema";
import {
  ForbiddenError,
  requireStoreAccess,
  requireStoreOwnerOrSuperAdmin,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { and, eq, ne } from "drizzle-orm";
import type { StoreTheme } from "@/lib/store-theme";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireStoreAccess(id, request);

    return NextResponse.json({ store: access.store });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireStoreAccess(id, request);

    const body = await request.json();
    const { name, slug, description, logoUrl, domain, theme, status } = body;

    const protectedFields = ["name", "slug", "domain", "status"];
    const wantsIdentityChange = protectedFields.some((field) => body[field] !== undefined);
    if (
      wantsIdentityChange &&
      access.auth.user.role !== "SUPERADMIN" &&
      !access.isOwner
    ) {
      throw new ForbiddenError(
        "Only the store owner or a super admin can update these fields",
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
      userId: access.auth.user.id,
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
    return routeAuthErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireStoreOwnerOrSuperAdmin(id, request);

    await db.delete(stores).where(eq(stores.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
