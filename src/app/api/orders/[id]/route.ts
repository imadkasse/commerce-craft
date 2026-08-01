import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

const VALID_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

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

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, payload.storeId)));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    return NextResponse.json({ order, items });
  } catch (error) {
    console.error("Order GET error:", error);
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
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, payload.storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, trackingCode, shippingProvider, notes, customerName, customerPhone, customerAddress, customerCity } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updates.status = status;
    }
    if (trackingCode !== undefined) updates.trackingCode = trackingCode;
    if (shippingProvider !== undefined) updates.shippingProvider = shippingProvider;
    if (notes !== undefined) updates.notes = notes;
    if (customerName !== undefined) updates.customerName = customerName;
    if (customerPhone !== undefined) updates.customerPhone = customerPhone;
    if (customerAddress !== undefined) updates.customerAddress = customerAddress;
    if (customerCity !== undefined) updates.customerCity = customerCity;

    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();

    const oldStatus = existing.status;
    const newStatus = status as string | undefined;

    if (newStatus && newStatus !== oldStatus) {
      await db.insert(activityLogs).values({
        userId: payload.userId,
        storeId: payload.storeId,
        action: "order.status_updated",
        details: { orderId: id, orderNumber: existing.orderNumber, oldStatus, newStatus },
      });

      if (newStatus === "shipped" && trackingCode) {
        await db.insert(activityLogs).values({
          userId: payload.userId,
          storeId: payload.storeId,
          action: "order.shipped",
          details: { orderId: id, orderNumber: existing.orderNumber, trackingCode },
        });
      }
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Order PUT error:", error);
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
      .select({ id: orders.id, orderNumber: orders.orderNumber })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, payload.storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: payload.storeId,
      action: "order.deleted",
      details: { orderId: id, orderNumber: existing.orderNumber },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
