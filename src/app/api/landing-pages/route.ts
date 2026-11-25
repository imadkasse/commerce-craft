import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, products, activityLogs } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and, desc, like, sql } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(): string {
  return `lp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function GET(request: Request) {
  try {
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [eq(landingPages.storeId, storeId)];
    if (search) {
      conditions.push(like(landingPages.title, `%${search}%`));
    }

    const where = and(...conditions);

    const results = await db
      .select({
        id: landingPages.id,
        slug: landingPages.slug,
        title: landingPages.title,
        status: landingPages.status,
        productName: products.name,
        productId: products.id,
        createdAt: landingPages.createdAt,
        updatedAt: landingPages.updatedAt,
      })
      .from(landingPages)
      .leftJoin(products, eq(products.id, landingPages.productId))
      .where(where)
      .orderBy(desc(landingPages.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(landingPages)
      .where(where);

    return NextResponse.json({
      landingPages: results,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const body = await request.json();
    const { title, slug: providedSlug, productId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let slug = providedSlug || slugify(title);
    if (!slug) {
      slug = generateUniqueSlug();
    }

    const [existingSlug] = await db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, slug));

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const [newLandingPage] = await db
      .insert(landingPages)
      .values({
        slug,
        title: title.trim(),
        storeId,
        productId: productId ?? null,
      })
      .returning();

    await db.insert(activityLogs).values({
      userId: access.auth.user.id,
      storeId,
      action: "landing_page.created",
      details: { landingPageId: newLandingPage.id, title: newLandingPage.title, slug: newLandingPage.slug },
    });

    return NextResponse.json({ landingPage: newLandingPage }, { status: 201 });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
