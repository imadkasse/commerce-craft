import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Table,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  TestTube,
  Upload,
} from "lucide-react";
import {
  orderFields,
  type FieldMappingEntry,
} from "@/services/sheets.service";

export function MiniSyncIndicator({
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

export function ActionsCard({
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

export function HowItWorksCard() {
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

export function ConfigMessageBanner({
  message,
  onDismiss,
}: {
  message: { type: "success" | "error" | "info"; text: string };
  onDismiss: () => void;
}) {
  return (
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
        onClick={onDismiss}
        className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MappingEditorCard({
  mappings,
  onAdd,
  onRemove,
  onUpdate,
}: {
  mappings: FieldMappingEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: "header" | "field", value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Field Mapping</CardTitle>
          <CardDescription>
            Map order fields to spreadsheet column headers
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
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
                    onUpdate(entry.id, "header", e.target.value)
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
                    onUpdate(entry.id, "field", e.target.value)
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
                onClick={() => onRemove(entry.id)}
                className="mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
