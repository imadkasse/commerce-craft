import { google } from "googleapis";

const isDemoMode = !process.env.GOOGLE_SHEETS_CLIENT_EMAIL;

function getAuthenticatedClient() {
  if (isDemoMode) return null;
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth: auth as any });
}

export async function validateConnection(
  spreadsheetId: string,
  sheetName: string
): Promise<{ success: boolean; error?: string }> {
  if (isDemoMode) {
    console.log(`[Sheets Demo] Validating connection to ${spreadsheetId}, sheet "${sheetName}"`);
    return { success: true };
  }

  try {
    const sheets = getAuthenticatedClient();
    if (!sheets) return { success: false, error: "Failed to initialize Sheets client" };

    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to access spreadsheet" };
  }
}

export async function appendRows(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: string[][]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (rows.length === 0) return { success: true, count: 0 };

  if (isDemoMode) {
    console.log(`[Sheets Demo] Appending ${rows.length} rows to ${spreadsheetId}/${sheetName}`);
    console.log(`[Sheets Demo] Headers: ${headers.join(", ")}`);
    console.log(`[Sheets Demo] First row: ${rows[0].join(", ")}`);
    return { success: true, count: rows.length };
  }

  try {
    const sheets = getAuthenticatedClient();
    if (!sheets) return { success: false, count: 0, error: "Failed to initialize Sheets client" };

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    const hasHeaders =
      existing.data.values &&
      existing.data.values.length > 0 &&
      existing.data.values[0].length > 0;

    const values: string[][] = [];
    if (!hasHeaders) {
      values.push(headers);
    }
    values.push(...rows);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    const updatedRows = response.data.updates?.updatedRows || 0;
    return { success: true, count: updatedRows };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message || "Failed to append rows" };
  }
}

export function formatOrderRow(
  order: any,
  items: any[],
  fieldMapping: Record<string, string>
): string[] {
  const headers = Object.keys(fieldMapping);
  return headers.map((header) => {
    const fieldPath = fieldMapping[header];
    const value = getNestedValue(order, items, fieldPath);
    return value !== null && value !== undefined ? String(value) : "";
  });
}

function getNestedValue(order: any, items: any[], path: string): unknown {
  if (path.startsWith("items[")) {
    const match = path.match(/items\[(\d+)\]\.(.+)/);
    if (match) {
      const idx = parseInt(match[1]);
      const prop = match[2];
      if (items[idx]) {
        return items[idx][prop];
      }
      return "";
    }
  }

  const cleanPath = path.replace(/^order\./, "");
  const keys = cleanPath.split(".");
  let value: unknown = order;
  for (const key of keys) {
    if (value === null || value === undefined) return "";
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export function isSheetsConfigured(): boolean {
  return !isDemoMode;
}

export function getSheetsMode(): "live" | "demo" {
  return isDemoMode ? "demo" : "live";
}