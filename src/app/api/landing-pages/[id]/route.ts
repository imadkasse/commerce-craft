import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, products, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

const VALID_STATUSES = ["draft", "published"] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const [landingPage] = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.id, id), eq(landingPages.storeId, payload.storeId)));

    if (!landingPage) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    const [linkedProduct] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        images: products.images,
      })
      .from(products)
      .where(eq(products.landingPageId, id))
      .limit(1);

    return NextResponse.json({ landingPage, product: linkedProduct || null });
  } catch (error) {
    console.error("LandingPage GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const [existing] = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.id, id), eq(landingPages.storeId, payload.storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, slug, generatedCode, status, customizations } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (slug !== undefined) {
      if (slug !== existing.slug) {
        const [existingSlug] = await db
          .select({ id: landingPages.id })
          .from(landingPages)
          .where(eq(landingPages.slug, slug));

        if (existingSlug && existingSlug.id !== id) {
          return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
        }
      }
      updates.slug = slug;
    }

    if (generatedCode !== undefined) {
      updates.generatedCode = generatedCode;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status. Must be 'draft' or 'published'" }, { status: 400 });
      }
      updates.status = status;
    }

    if (customizations !== undefined) {
      updates.customizations = customizations;
    }

    const [updated] = await db
      .update(landingPages)
      .set(updates)
      .where(eq(landingPages.id, id))
      .returning();

    const oldStatus = existing.status;
    const newStatus = status as string | undefined;

    if (newStatus && newStatus !== oldStatus) {
      await db.insert(activityLogs).values({
        userId: payload.userId,
        storeId: payload.storeId,
        action: "landing_page.status_updated",
        details: { landingPageId: id, title: existing.title, oldStatus, newStatus },
      });
    }

    return NextResponse.json({ landingPage: updated });
  } catch (error) {
    console.error("LandingPage PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const [existing] = await db
      .select({ id: landingPages.id, title: landingPages.title })
      .from(landingPages)
      .where(and(eq(landingPages.id, id), eq(landingPages.storeId, payload.storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    await db
      .update(products)
      .set({ landingPageId: null })
      .where(eq(products.landingPageId, id));

    await db.delete(landingPages).where(eq(landingPages.id, id));

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: payload.storeId,
      action: "landing_page.deleted",
      details: { landingPageId: id, title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LandingPage DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
