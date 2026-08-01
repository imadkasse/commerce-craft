import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, shippingConfig, activityLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const body = await request.json();

    // Extract tracking code and status from webhook payload
    // Different providers send different payloads
    const trackingCode = body.tracking_number || body.trackingCode || body.id;
    const eventStatus = body.status || body.event;

    if (!trackingCode) {
      return NextResponse.json({ error: "No tracking code" }, { status: 400 });
    }

    // Find the order by tracking code
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.trackingCode, trackingCode));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map webhook statuses to order statuses
    let newStatus: string | null = null;
    const statusLower = (eventStatus || "").toLowerCase();

    if (["delivered", "delivery_successful"].includes(statusLower)) {
      newStatus = "delivered";
    } else if (["shipped", "in_transit", "picked_up"].includes(statusLower)) {
      newStatus = "shipped";
    } else if (["failed", "returned", "cancelled"].includes(statusLower)) {
      newStatus = "cancelled";
    }

    if (newStatus && newStatus !== order.status) {
      await db
        .update(orders)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      await db.insert(activityLogs).values({
        storeId: order.storeId,
        action: "order.status_updated",
        details: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldStatus: order.status,
          newStatus,
          source: "webhook",
          provider,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
