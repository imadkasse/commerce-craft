import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sheetsConfig } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

const defaultFieldMapping: Record<string, string> = {
  "Order Number": "orderNumber",
  "Customer Name": "customerName",
  "Phone": "customerPhone",
  "Address": "customerAddress",
  "City": "customerCity",
  "Product": "items[0].productName",
  "Quantity": "items[0].quantity",
  "Total": "total",
  "Status": "status",
  "Tracking Code": "trackingCode",
  "Date": "createdAt",
};

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store found" }, { status: 404 });
    }

    const results = await db
      .select()
      .from(sheetsConfig)
      .where(eq(sheetsConfig.storeId, payload.storeId));

    if (results.length === 0) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({ config: results[0] });
  } catch (error) {
    console.error("Sheets config GET error:", error);
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
    const { spreadsheetId, sheetName, fieldMapping, autoSync } = body;

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: "spreadsheetId and sheetName are required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(sheetsConfig)
      .where(eq(sheetsConfig.storeId, payload.storeId));

    let saved;
    if (existing.length > 0) {
      [saved] = await db
        .update(sheetsConfig)
        .set({
          spreadsheetId,
          sheetName,
          fieldMapping: fieldMapping ?? defaultFieldMapping,
          autoSync: autoSync ?? false,
          updatedAt: new Date(),
        })
        .where(eq(sheetsConfig.storeId, payload.storeId))
        .returning();
    } else {
      [saved] = await db
        .insert(sheetsConfig)
        .values({
          storeId: payload.storeId,
          spreadsheetId,
          sheetName,
          fieldMapping: fieldMapping ?? defaultFieldMapping,
          autoSync: autoSync ?? false,
        })
        .returning();
    }

    let warning: string | undefined;
    try {
      const { validateConnection } = await import("@/lib/services/google-sheets");
      await validateConnection(saved.spreadsheetId, saved.sheetName);
    } catch {
      warning = "Config saved but connection validation failed";
    }

    return NextResponse.json(warning ? { config: saved, warning } : { config: saved });
  } catch (error) {
    console.error("Sheets config POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
