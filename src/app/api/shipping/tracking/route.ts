import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, shippingConfig } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and } from "drizzle-orm";
import { getProvider } from "@/lib/services/shipping";

export async function GET(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const trackingCode = url.searchParams.get("trackingCode");
    const providerId = url.searchParams.get("provider");

    let actualTrackingCode = trackingCode;
    let actualProvider = providerId;

    // If orderId is given, look up tracking info from the order
    if (orderId) {
      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.storeId, access.store.id)));

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      actualTrackingCode = order.trackingCode;
      if (!actualTrackingCode) {
        return NextResponse.json(
          { error: "Order has no tracking code" },
          { status: 400 }
        );
      }

      // Map provider name back to ID
      if (order.shippingProvider) {
        const providerName = order.shippingProvider.toLowerCase();
        if (providerName.includes("zr")) actualProvider = "zr_express";
        else if (providerName.includes("yalidin")) actualProvider = "yalidin";
        else if (providerName.includes("noest")) actualProvider = "noest";
      }
    }

    if (!actualTrackingCode || !actualProvider) {
      return NextResponse.json(
        { error: "trackingCode and provider are required" },
        { status: 400 }
      );
    }

    // Get provider config
    const [config] = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, access.store.id));

    const providerConfig = config?.providers?.[actualProvider] || {};

    // Get tracking info
    const provider = getProvider(actualProvider);
    if (!provider) {
      return NextResponse.json(
        { error: `Unknown provider: ${actualProvider}` },
        { status: 400 }
      );
    }

    const trackingResult = await provider.getTracking(actualTrackingCode, {
      apiKey: providerConfig.apiKey,
      apiSecret: providerConfig.apiSecret,
    });

    return NextResponse.json({ tracking: trackingResult });
  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
