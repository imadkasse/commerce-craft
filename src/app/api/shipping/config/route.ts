import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingConfig } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const results = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, payload.storeId));

    if (results.length === 0) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({ config: results[0] });
  } catch (error) {
    console.error("Shipping config GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const body = await request.json();
    const { defaultProvider, providers, rates } = body;

    const existing = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, payload.storeId));

    let saved;
    if (existing.length > 0) {
      [saved] = await db
        .update(shippingConfig)
        .set({
          defaultProvider,
          providers: providers ?? {},
          rates: rates ?? [],
          updatedAt: new Date(),
        })
        .where(eq(shippingConfig.storeId, payload.storeId))
        .returning();
    } else {
      [saved] = await db
        .insert(shippingConfig)
        .values({
          storeId: payload.storeId,
          defaultProvider,
          providers: providers ?? {},
          rates: rates ?? [],
        })
        .returning();
    }

    return NextResponse.json({ config: saved });
  } catch (error) {
    console.error("Shipping config POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
