import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productColors, productSizes, landingPages } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const colors = await db
      .select()
      .from(productColors)
      .where(eq(productColors.productId, id))
      .orderBy(productColors.sortOrder);

    const sizes = await db
      .select()
      .from(productSizes)
      .where(eq(productSizes.productId, id))
      .orderBy(productSizes.sortOrder);

    return NextResponse.json({ product, colors, sizes });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, type, price, compareAtPrice, images, tags, stockQuantity, isActive } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (price !== undefined) updates.price = String(price);
    if (compareAtPrice !== undefined) updates.compareAtPrice = compareAtPrice ? String(compareAtPrice) : null;
    if (images !== undefined) updates.images = images;
    if (tags !== undefined) updates.tags = tags;
    if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
    if (isActive !== undefined) updates.isActive = isActive;

    if (name !== undefined) {
      let slug = (name as string).toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
      const existingSlugs = await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(eq(products.slug, slug), eq(products.id, id)));
      if (existingSlugs.length === 0) {
        const allSlugs = await db.select({ slug: products.slug }).from(products).where(eq(products.slug, slug));
        if (allSlugs.length > 0) {
          slug = slug + "-" + Date.now().toString(36);
        }
      }
      updates.slug = slug;
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();

    return NextResponse.json({ product: updated });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(landingPages).where(eq(landingPages.productId, id));
      await tx.delete(productSizes).where(eq(productSizes.productId, id));
      await tx.delete(productColors).where(eq(productColors.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
