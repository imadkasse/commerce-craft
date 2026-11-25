import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and, desc, like, sql } from "drizzle-orm";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export async function GET(request: Request) {
  try {
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [eq(products.storeId, storeId)];
    if (type && (type === "CLOTHING" || type === "GENERAL")) {
      conditions.push(eq(products.type, type));
    }
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    const where = and(...conditions);

    const results = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where);

    return NextResponse.json({
      products: results,
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
    const { name, description, type, price, compareAtPrice, images, tags, stockQuantity } = body;

    if (!name || !type || !price) {
      return NextResponse.json({ error: "Name, type, and price are required" }, { status: 400 });
    }

    let slug = generateSlug(name);
    const existingSlugs = await db.select({ slug: products.slug }).from(products).where(eq(products.slug, slug));
    if (existingSlugs.length > 0) {
      slug = slug + "-" + Date.now().toString(36);
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        name: name.trim(),
        description: description || null,
        slug,
        type,
        price: String(price),
        compareAtPrice: compareAtPrice ? String(compareAtPrice) : null,
        images: images || [],
        tags: tags || [],
        stockQuantity: stockQuantity || 0,
        storeId,
      })
      .returning();

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
