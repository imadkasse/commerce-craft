import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productColors, productSizes } from "@/lib/db/schema";
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
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const colorId = url.searchParams.get("colorId");

    const conditions = [eq(productSizes.productId, id)];
    if (colorId) {
      conditions.push(eq(productSizes.colorId, colorId));
    }

    const sizes = await db
      .select()
      .from(productSizes)
      .where(and(...conditions))
      .orderBy(productSizes.sortOrder);

    return NextResponse.json({ sizes });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const { colorId, sizeLabel, stockQuantity } = body;

    if (!colorId || !sizeLabel) {
      return NextResponse.json({ error: "colorId and sizeLabel are required" }, { status: 400 });
    }

    const [color] = await db
      .select({ id: productColors.id })
      .from(productColors)
      .where(and(eq(productColors.id, colorId), eq(productColors.productId, id)));

    if (!color) {
      return NextResponse.json({ error: "Color not found for this product" }, { status: 404 });
    }

    const [newSize] = await db
      .insert(productSizes)
      .values({
        productId: id,
        colorId,
        sizeLabel: sizeLabel.trim(),
        stockQuantity: stockQuantity || 0,
      })
      .returning();

    return NextResponse.json({ size: newSize }, { status: 201 });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
