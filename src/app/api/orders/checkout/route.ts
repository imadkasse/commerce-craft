import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, landingPages, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slug,
      customerName,
      customerPhone,
      customerAddress,
      customerCity,
      customerCommune,
      deliveryOption,
      productId,
      quantity,
      color,
      size,
      customFields,
    } = body;

    const missing: string[] = [];
    if (!slug) missing.push("slug");
    if (!customerName) missing.push("customerName");
    if (!customerPhone) missing.push("customerPhone");
    if (!customerAddress) missing.push("customerAddress");
    if (!productId) missing.push("productId");
    if (!quantity || quantity < 1) missing.push("quantity");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const [landingPage] = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.slug, slug))
      .limit(1);

    if (!landingPage) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const unitPrice = Number(product.price);
    const subtotal = unitPrice * quantity;
    const shippingCost = deliveryOption === "home" ? 500 : 0;
    const total = subtotal + shippingCost;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity?.trim() || null,
        customerCommune: customerCommune?.trim() || null,
        status: "pending",
        total: String(total),
        storeId: landingPage.storeId,
        customFields: customFields || [],
        notes: deliveryOption ? `Delivery: ${deliveryOption === "home" ? "Home" : "Desk"}` : null,
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: newOrder.id,
      productId: product.id,
      productName: product.name,
      productImage: (product.images as string[])?.[0] || null,
      color: color || null,
      size: size || null,
      quantity,
      unitPrice: String(unitPrice),
      totalPrice: String(subtotal),
    });

    return NextResponse.json(
      {
        success: true,
        order: {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          total: newOrder.total,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Checkout POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

