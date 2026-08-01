import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productColors } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and, desc } from "drizzle-orm";

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

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, payload.storeId)));

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
    console.error("Colors GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, payload.storeId)));

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
    console.error("Colors POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
