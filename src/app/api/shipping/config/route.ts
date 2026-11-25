import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingConfig } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const results = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, access.store.id));

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
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const body = await request.json();
    const { defaultProvider, providers, rates } = body;

    const existing = await db
      .select()
      .from(shippingConfig)
      .where(eq(shippingConfig.storeId, access.store.id));

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
        .where(eq(shippingConfig.storeId, access.store.id))
        .returning();
    } else {
      [saved] = await db
        .insert(shippingConfig)
        .values({
          storeId: access.store.id,
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
