/**
 * Server-side Google Sheets config loading.
 *
 * Mirrors the `/api/sheets/config` GET handler so server components can read
 * the saved config directly from the database.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sheetsConfig } from "@/lib/db/schema";
import type { SheetsConfig } from "@/services/sheets.service";

export async function getSheetsConfigForStore(
  storeId: string,
): Promise<SheetsConfig | null> {
  const results = await db
    .select()
    .from(sheetsConfig)
    .where(eq(sheetsConfig.storeId, storeId));

  if (results.length === 0) return null;

  const row = results[0];

  return {
    id: row.id,
    storeId: row.storeId,
    spreadsheetId: row.spreadsheetId,
    sheetName: row.sheetName,
    fieldMapping: row.fieldMapping,
    autoSync: row.autoSync,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
