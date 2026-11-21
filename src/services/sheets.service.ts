/**
 * Google Sheets configuration service.
 *
 * Wraps the sheets config/sync endpoints and holds the pure field-mapping
 * helpers used by the settings screen.
 */

import { apiFetch } from "./http";

export interface SheetsConfig {
  id: string;
  storeId: string;
  spreadsheetId: string;
  sheetName: string;
  fieldMapping: Record<string, string>;
  autoSync: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMappingEntry {
  id: string;
  header: string;
  field: string;
}

export interface OrderFieldOption {
  value: string;
  label: string;
}

export interface SheetsConfigResponse {
  config: SheetsConfig | null;
}

export interface SaveSheetsConfigPayload {
  spreadsheetId: string;
  sheetName: string;
  fieldMapping: Record<string, string>;
  autoSync: boolean;
}

export interface SaveSheetsConfigResult {
  config: SheetsConfig;
  warning?: string;
}

export interface SyncNowResult {
  success?: boolean;
  count: number;
}

export const orderFields: OrderFieldOption[] = [
  { value: "orderNumber", label: "Order Number" },
  { value: "customerName", label: "Customer Name" },
  { value: "customerPhone", label: "Phone" },
  { value: "customerAddress", label: "Address" },
  { value: "customerCity", label: "City" },
  { value: "items[0].productName", label: "Product Name" },
  { value: "items[0].quantity", label: "Quantity" },
  { value: "total", label: "Total" },
  { value: "status", label: "Status" },
  { value: "trackingCode", label: "Tracking Code" },
  { value: "shippingProvider", label: "Shipping Provider" },
  { value: "notes", label: "Notes" },
  { value: "createdAt", label: "Date" },
];

export const defaultMapping: Record<string, string> = {
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

export function mappingToEntries(
  mapping: Record<string, string>,
): FieldMappingEntry[] {
  return Object.entries(mapping).map(([header, field], index) => ({
    id: "map-" + index,
    header,
    field,
  }));
}

export function entriesToMapping(
  entries: FieldMappingEntry[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.header.trim()) {
      mapping[entry.header.trim()] = entry.field;
    }
  }
  return mapping;
}

/**
 * A saved config with an empty field mapping falls back to the defaults.
 */
export function resolveMapping(
  fieldMapping: Record<string, string> | null | undefined,
): Record<string, string> {
  return fieldMapping &&
    typeof fieldMapping === "object" &&
    Object.keys(fieldMapping).length > 0
    ? fieldMapping
    : defaultMapping;
}

export function countSyncMessage(count: number): string {
  return `Sync complete. ${count} order${count !== 1 ? "s" : ""} exported.`;
}

export async function getConfig(): Promise<SheetsConfigResponse> {
  return apiFetch<SheetsConfigResponse>("/api/sheets/config");
}

export async function saveConfig(
  payload: SaveSheetsConfigPayload,
): Promise<SaveSheetsConfigResult> {
  return apiFetch<SaveSheetsConfigResult>("/api/sheets/config", {
    method: "POST",
    body: payload,
  });
}

/**
 * Testing a connection reuses the save endpoint (matching the settings UI).
 */
export async function testConnection(
  payload: SaveSheetsConfigPayload,
): Promise<SaveSheetsConfigResult> {
  return saveConfig(payload);
}

export async function syncNow(): Promise<SyncNowResult> {
  return apiFetch<SyncNowResult>("/api/sheets/sync", { method: "POST" });
}

export const sheetsService = {
  getConfig,
  saveConfig,
  testConnection,
  syncNow,
  orderFields,
  defaultMapping,
  mappingToEntries,
  entriesToMapping,
  resolveMapping,
  countSyncMessage,
};
