import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { orders, orderItems, shippingConfig, activityLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    const secret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Shipping webhook secret is not configured" },
        { status: 401 }
      );
    }

    const signature =
      request.headers.get("x-provider-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("x-webhook-signature");

    if (!signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const rawBody = await request.text();
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

    const providedBuf = Buffer.from(signature.trim().toLowerCase(), "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");

    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

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
