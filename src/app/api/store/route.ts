import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import {
  ForbiddenError,
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const access = await requireActiveStore(request);

    return NextResponse.json({ store: access.store });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const body = await request.json();
    const { name, slug, description, logoUrl, domain, theme } = body;

    const protectedFields = ["name", "slug", "domain"];
    const wantsIdentityChange = protectedFields.some(
      (field) => body[field] !== undefined,
    );
    if (
      wantsIdentityChange &&
      access.auth.user.role !== "SUPERADMIN" &&
      !access.isOwner
    ) {
      throw new ForbiddenError(
        "Only the store owner or a super admin can update these fields",
      );
    }

    if (slug) {
      const existing = await db.select().from(stores).where(eq(stores.slug, slug));
      if (existing.length > 0 && existing[0].id !== storeId) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (domain !== undefined) updateData.domain = domain;
    if (theme !== undefined) updateData.theme = theme;

    const [updated] = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, storeId))
      .returning();

    return NextResponse.json({ store: updated });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
