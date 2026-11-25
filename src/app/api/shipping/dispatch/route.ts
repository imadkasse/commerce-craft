import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, shippingConfig, activityLogs } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and } from "drizzle-orm";
import { getProvider } from "@/lib/services/shipping";

export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const body = await request.json();
    const { orderId, provider: providerId } = body;

    if (!orderId || !providerId) {
      return NextResponse.json(
        { error: "orderId and provider are required" },
        { status: 400 }
      );
    }

    // Fetch the order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.storeId, access.store.id)));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "confirmed") {
      return NextResponse.json(
        { error: "Order must be in 'confirmed' status to dispatch" },
        { status: 400 }
      );
    }

    // Fetch order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Fetch provider config from shipping_config
    const [config] = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, access.store.id));

    const providerConfig = config?.providers?.[providerId] || {};

    // Get the shipping provider implementation
    const provider = getProvider(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown shipping provider: ${providerId}` },
        { status: 400 }
      );
    }

    // Dispatch
    const result = await provider.dispatch(
      {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerCity: order.customerCity || undefined,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
        })),
        total: Number(order.total),
      },
      {
        apiKey: providerConfig.apiKey,
        apiSecret: providerConfig.apiSecret,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Dispatch failed" },
        { status: 500 }
      );
    }

    // Update order with tracking info and status
    await db
      .update(orders)
      .set({
        status: "shipped",
        trackingCode: result.trackingCode,
        shippingProvider: provider.name,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log activity
    await db.insert(activityLogs).values({
      userId: access.auth.user.id,
      storeId: access.store.id,
      action: "order.shipped",
      details: {
        orderId,
        orderNumber: order.orderNumber,
        provider: provider.name,
        trackingCode: result.trackingCode,
      },
    });

    return NextResponse.json({
      success: true,
      trackingCode: result.trackingCode,
      labelUrl: result.labelUrl,
    });
  } catch (error) {
    console.error("Dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
