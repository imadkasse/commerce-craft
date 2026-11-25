import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productColors } from "@/lib/db/schema";
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

    const colors = await db
      .select()
      .from(productColors)
      .where(eq(productColors.productId, id))
      .orderBy(productColors.sortOrder);

    return NextResponse.json({ colors });
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
    const { name, hexCode, stockQuantity } = body;

    if (!name || !hexCode) {
      return NextResponse.json({ error: "Name and hexCode are required" }, { status: 400 });
    }

    const [newColor] = await db
      .insert(productColors)
      .values({
        productId: id,
        name: name.trim(),
        hexCode,
        stockQuantity: stockQuantity || 0,
      })
      .returning();

    return NextResponse.json({ color: newColor }, { status: 201 });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
