"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import {
  sheetsService,
  mappingToEntries,
  entriesToMapping,
  resolveMapping,
  countSyncMessage,
  defaultMapping,
  type FieldMappingEntry,
  type SheetsConfig,
} from "@/services/sheets.service";
import {
  ActionsCard,
  ConfigMessageBanner,
  HowItWorksCard,
  MappingEditorCard,
  MiniSyncIndicator,
} from "./sheets-config-parts";

export function SheetsConfigView({ config }: { config: SheetsConfig | null }) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mode, setMode] = useState<"live" | "demo">(
    config?.spreadsheetId ? "live" : "demo",
  );

  const [spreadsheetId, setSpreadsheetId] = useState(
    config?.spreadsheetId ?? "",
  );
  const [sheetName, setSheetName] = useState(config?.sheetName ?? "Sheet1");
  const [autoSync, setAutoSync] = useState(config?.autoSync ?? false);
  const [mappings, setMappings] = useState<FieldMappingEntry[]>(() =>
    mappingToEntries(config ? resolveMapping(config.fieldMapping) : defaultMapping),
  );

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { id: "map-" + prev.length, header: "", field: "orderNumber" },
    ]);
  }

  function removeMapping(id: string) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(id: string, key: "header" | "field", value: string) {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
    );
  }

  async function handleSave() {
    if (!spreadsheetId.trim()) {
      setMessage({ type: "error", text: "Spreadsheet ID is required." });
      return;
    }
    if (!sheetName.trim()) {
      setMessage({ type: "error", text: "Sheet name is required." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const mapping = entriesToMapping(mappings);
      const data = await sheetsService.saveConfig({
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim(),
        fieldMapping: mapping,
        autoSync,
      });

      setMode("live");
      if (data.warning) {
        setMessage({
          type: "info",
          text: "Configuration saved. " + data.warning + ".",
        });
      } else {
        setMessage({ type: "success", text: "Configuration saved successfully." });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save configuration.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!spreadsheetId.trim()) {
      setMessage({ type: "error", text: "Enter a Spreadsheet ID first." });
      return;
    }

    setTesting(true);
    setMessage(null);
    try {
      const mapping = entriesToMapping(mappings);
      const data = await sheetsService.testConnection({
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim(),
        fieldMapping: mapping,
        autoSync,
      });

      if (data.warning) {
        setMessage({
          type: "info",
          text: "Config saved but connection validation failed. Check your spreadsheet ID and permissions.",
        });
      } else {
        setMessage({ type: "success", text: "Connection successful! Spreadsheet is accessible." });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Connection test failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setMessage(null);
    try {
      const data = await sheetsService.syncNow();
      setMessage({
        type: "success",
        text: countSyncMessage(data.count),
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Sync failed.",
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/orders"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Google Sheets Config</h1>
            <p className="text-gray-500">
              Configure how orders are exported to Google Sheets
            </p>
          </div>
        </div>
        <MiniSyncIndicator
          configured={!!spreadsheetId}
          mode={mode}
        />
      </div>

      {message && (
        <ConfigMessageBanner
          message={message}
          onDismiss={() => setMessage(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sheet Details</CardTitle>
              <CardDescription>
                Link your Google Sheet for order exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="spreadsheetId">
                  Spreadsheet ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="spreadsheetId"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  The ID from your Google Sheet URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sheetName">
                  Sheet Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sheetName"
                  placeholder="Sheet1"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSync}
                  aria-label="Auto-sync"
                  onClick={() => setAutoSync((prev) => !prev)}
                  className={
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 " +
                    (autoSync ? "bg-gray-950" : "bg-gray-200")
                  }
                >
                  <span
                    className={
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform " +
                      (autoSync ? "translate-x-4" : "translate-x-0")
                    }
                  />
                </button>
                <div>
                  <Label className="text-sm font-medium text-gray-950">
                    Auto-sync
                  </Label>
                  <p className="text-xs text-gray-400">
                    Automatically export orders when status changes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <MappingEditorCard
            mappings={mappings}
            onAdd={addMapping}
            onRemove={removeMapping}
            onUpdate={updateMapping}
          />
        </div>

        <div className="space-y-6">
          <ActionsCard
            saving={saving}
            testing={testing}
            syncing={syncing}
            spreadsheetConfigured={!!spreadsheetId.trim()}
            onSave={handleSave}
            onTestConnection={handleTestConnection}
            onSyncNow={handleSyncNow}
          />

          <HowItWorksCard />
        </div>
      </div>
    </div>
  );
}
