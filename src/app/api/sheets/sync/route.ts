import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, sheetsConfig, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and, inArray } from "drizzle-orm";
import { formatOrderRow, appendRows, isSheetsConfigured } from "@/lib/services/google-sheets";

export async function POST(request: Request) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storeId = token.storeId as string;

    const [config] = await db
      .select()
      .from(sheetsConfig)
      .where(eq(sheetsConfig.storeId, storeId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { error: "Google Sheets not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { orderIds }: { orderIds?: string[] } = body;

    let ordersToSync: typeof orders.$inferSelect[];

    if (orderIds && orderIds.length > 0) {
      ordersToSync = await db
        .select()
        .from(orders)
        .where(
          and(eq(orders.storeId, storeId), inArray(orders.id, orderIds))
        );
    } else {
      ordersToSync = await db
        .select()
        .from(orders)
        .where(
          and(eq(orders.storeId, storeId), eq(orders.sheetsSynced, false))
        );
    }

    if (ordersToSync.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const fieldMapping = config.fieldMapping as Record<string, string>;
    const headers = Object.keys(fieldMapping);

    const rows = [];

    for (const order of ordersToSync) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      rows.push(formatOrderRow(order, items, fieldMapping));
    }

    await appendRows(config.spreadsheetId, config.sheetName, headers, rows);

    for (const order of ordersToSync) {
      await db
        .update(orders)
        .set({ sheetsSynced: true })
        .where(eq(orders.id, order.id));
    }

    await db.insert(activityLogs).values({
      storeId,
      action: "sheets_sync",
      details: { count: ordersToSync.length },
    });

    return NextResponse.json({ success: true, count: ordersToSync.length });
  } catch (error) {
    console.error("Sheets sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
