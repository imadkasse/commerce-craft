import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const results = await db.select().from(stores).where(eq(stores.id, payload.storeId));
    if (results.length === 0) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({ store: results[0] });
  } catch (error) {
    console.error("Store GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, description, logoUrl, domain, theme } = body;

    if (slug) {
      const existing = await db.select().from(stores).where(eq(stores.slug, slug));
      if (existing.length > 0 && existing[0].id !== payload.storeId) {
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
      .where(eq(stores.id, payload.storeId))
      .returning();

    return NextResponse.json({ store: updated });
  } catch (error) {
    console.error("Store PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
