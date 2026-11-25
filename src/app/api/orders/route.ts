import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, activityLogs } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and, desc, like, sql, or, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const storeId = access.store.id;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.storeId, storeId)];
    if (status) {
      conditions.push(eq(orders.status, status as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"));
    }
    if (search) {
      const searchCondition = or(
        like(orders.customerName, `%${search}%`),
        like(orders.customerPhone, `%${search}%`),
        like(orders.orderNumber, `%${search}%`),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    if (dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(orders.createdAt, new Date(dateTo)));
    }

    const where = and(...conditions);

    const results = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(where);

    return NextResponse.json({
      orders: results,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const storeId = access.store.id;

    const body = await request.json();
    const { customerName, customerPhone, customerAddress, customerCity, notes, total, items } = body;

    if (!customerName || !customerPhone || !customerAddress || !total || !items?.length) {
      return NextResponse.json(
        { error: "customerName, customerPhone, customerAddress, total, and items are required" },
        { status: 400 },
      );
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [newOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity?.trim() || null,
        notes: notes || null,
        total: String(total),
        storeId,
      })
      .returning();

    const orderItemsData = items.map((item: { productId?: string; productName: string; productImage?: string; color?: string; size?: string; quantity: number; unitPrice: string | number; totalPrice: string | number }) => ({
      orderId: newOrder.id,
      productId: item.productId || null,
      productName: item.productName,
      productImage: item.productImage || null,
      color: item.color || null,
      size: item.size || null,
      quantity: item.quantity || 1,
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.totalPrice),
    }));

    const createdItems = await db.insert(orderItems).values(orderItemsData).returning();

    await db.insert(activityLogs).values({
      userId: access.auth.user.id,
      storeId,
      action: "order.created",
      details: { orderId: newOrder.id, orderNumber, total, itemCount: items.length },
    });

    return NextResponse.json({ order: { ...newOrder, items: createdItems } }, { status: 201 });
  } catch (error) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
