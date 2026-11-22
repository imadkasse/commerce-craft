"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, TestTube, Upload, CheckCircle, XCircle, AlertCircle, Table, Plus, Trash2, RefreshCw } from "lucide-react";
import {
  sheetsService,
  mappingToEntries,
  entriesToMapping,
  resolveMapping,
  countSyncMessage,
  orderFields,
  defaultMapping,
  type FieldMappingEntry,
} from "@/services/sheets.service";

function MiniSyncIndicator({
  configured,
  mode,
}: {
  configured: boolean;
  mode: "live" | "demo";
}) {
  return (
    <div className="flex items-center gap-3">
      {configured ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          <CheckCircle className="h-3.5 w-3.5" />
          Connected
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          <XCircle className="h-3.5 w-3.5" />
          Not configured
        </span>
      )}
      <span
        className={
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset " +
          (mode === "live"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
            : "bg-amber-50 text-amber-700 ring-amber-600/20")
        }
      >
        <Table className="h-3.5 w-3.5" />
        {mode === "live" ? "Live" : "Demo"}
      </span>
    </div>
  );
}

function ActionsCard({
  saving,
  testing,
  syncing,
  spreadsheetConfigured,
  onSave,
  onTestConnection,
  onSyncNow,
}: {
  saving: boolean;
  testing: boolean;
  syncing: boolean;
  spreadsheetConfigured: boolean;
  onSave: () => void;
  onTestConnection: () => void;
  onSyncNow: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Manage your sheets connection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={onSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Config"}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={onTestConnection}
          disabled={testing || !spreadsheetConfigured}
        >
          {testing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TestTube className="mr-2 h-4 w-4" />
          )}
          {testing ? "Testing..." : "Test Connection"}
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={onSyncNow}
          disabled={syncing || !spreadsheetConfigured}
        >
          {syncing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </CardContent>
    </Card>
  );
}

function HowItWorksCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-500">
        <p>
          <strong className="text-gray-700">1.</strong> Enter your Google
          Sheet&apos;s Spreadsheet ID.
        </p>
        <p>
          <strong className="text-gray-700">2.</strong> Map order fields
          to spreadsheet columns.
        </p>
        <p>
          <strong className="text-gray-700">3.</strong> Click{" "}
          <strong className="text-gray-700">Test Connection</strong> to
          verify access.
        </p>
        <p>
          <strong className="text-gray-700">4.</strong> Use{" "}
          <strong className="text-gray-700">Sync Now</strong> to export
          pending orders.
        </p>
        <p>
          Enable <strong className="text-gray-700">Auto-sync</strong> to
          export automatically on status changes.
        </p>
      </CardContent>
    </Card>
  );
}

export default function SheetsConfigPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mode, setMode] = useState<"live" | "demo">("demo");

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [autoSync, setAutoSync] = useState(false);
  const [mappings, setMappings] = useState<FieldMappingEntry[]>([]);

  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function fetchConfig() {
    setLoading(true);
    setMessage(null);
    try {
      const { config } = await sheetsService.getConfig();

      if (config) {
        setSpreadsheetId(config.spreadsheetId);
        setSheetName(config.sheetName);
        setAutoSync(config.autoSync);

        setMappings(mappingToEntries(resolveMapping(config.fieldMapping)));

        const configMode = config.spreadsheetId ? "live" : "demo";
        setMode(configMode);
      } else {
        setMappings(mappingToEntries(defaultMapping));
        setMode("demo");
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load Google Sheets configuration." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfig();
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Card>
          <CardContent className="space-y-6 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
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
        <div
          className={
            "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm " +
            (message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : message.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800")
          }
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : message.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage(null)}
            className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Field Mapping</CardTitle>
                <CardDescription>
                  Map order fields to spreadsheet column headers
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addMapping}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Field
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {mappings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Table className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    No field mappings configured. Click &quot;Add Field&quot; to get started.
                  </p>
                </div>
              ) : (
                mappings.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`header-${entry.id}`} className="text-xs text-gray-500">
                        Column Header
                      </Label>
                      <Input
                        id={`header-${entry.id}`}
                        placeholder="Column name in Sheets"
                        value={entry.header}
                        onChange={(e) =>
                          updateMapping(entry.id, "header", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`field-${entry.id}`} className="text-xs text-gray-500">
                        Order Field
                      </Label>
                      <select
                        id={`field-${entry.id}`}
                        className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={entry.field}
                        onChange={(e) =>
                          updateMapping(entry.id, "field", e.target.value)
                        }
                      >
                        {orderFields.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove mapping"
                      onClick={() => removeMapping(entry.id)}
                      className="mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
