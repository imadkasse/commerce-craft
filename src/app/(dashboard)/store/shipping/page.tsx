"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ArrowLeft, Plus, Trash2, Truck } from "lucide-react";
import {
  defaultConfig,
  providerKeys,
  providerNames,
  shippingService,
  type ProviderSetting,
  type ShippingConfig,
  type ShippingRate,
} from "@/services/shipping.service";

export default function ShippingPage() {
  const [config, setConfig] = useState<ShippingConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await shippingService.getConfig();
      setConfig(data.config ?? (data as unknown as ShippingConfig));
    } catch {
      setMessage({ type: "error", text: "Failed to load shipping config." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateProvider = (key: string, field: keyof ProviderSetting, value: string | boolean) => {
    setConfig((prev) => shippingService.updateProvider(prev, key, field, value));
  };

  const addRate = () => {
    setConfig((prev) => shippingService.addRate(prev));
  };

  const removeRate = (id: string) => {
    setConfig((prev) => shippingService.removeRate(prev, id));
  };

  const updateRate = (id: string, field: keyof ShippingRate, value: string | number | null) => {
    setConfig((prev) => shippingService.updateRate(prev, id, field, value));
  };

  const hasAnyKeys = Object.values(config.providers).some((p) => p.apiKey || p.apiSecret);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await shippingService.saveConfig(config);
      setMessage({ type: "success", text: "Shipping settings saved successfully." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/stores/settings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Store Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-950">Shipping Settings</h1>
          <p className="text-sm text-gray-500">Configure shipping providers, rates, and defaults.</p>
        </div>
        {!hasAnyKeys && (
          <Badge variant="outline" className="flex items-center gap-1.5 border-amber-300 text-amber-700 bg-amber-50">
            <Truck className="h-3.5 w-3.5" />
            Demo Mode
          </Badge>
        )}
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shipping Providers</CardTitle>
          <CardDescription>Enter API credentials for each provider and enable the ones you use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providerKeys.map((key) => {
            const provider = config.providers[key];
            if (!provider) return null;
            return (
              <div key={key} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">{providerNames[key]}</h3>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={provider.enabled}
                    aria-label={`Enable ${providerNames[key]}`}
                    onClick={() => updateProvider(key, "enabled", !provider.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      provider.enabled ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        provider.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`api-key-${key}`}>API Key</Label>
                    <Input
                      id={`api-key-${key}`}
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(key, "apiKey", e.target.value)}
                      placeholder={`${providerNames[key]} API key`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`api-secret-${key}`}>API Secret</Label>
                    <Input
                      id={`api-secret-${key}`}
                      type="password"
                      value={provider.apiSecret}
                      onChange={(e) => updateProvider(key, "apiSecret", e.target.value)}
                      placeholder={`${providerNames[key]} API secret`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Provider</CardTitle>
          <CardDescription>Select which provider is used by default for new orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="default-provider">Default Provider</Label>
            <Select
              id="default-provider"
              value={config.defaultProvider}
              onChange={(e) => setConfig((prev) => ({ ...prev, defaultProvider: e.target.value }))}
            >
              {providerKeys.map((key) => (
                <option key={key} value={key}>
                  {providerNames[key]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shipping Rates</CardTitle>
              <CardDescription>Define shipping rate rules based on weight ranges.</CardDescription>
            </div>
            <Button onClick={addRate} variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.rates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No rates defined. Click "Add Rate" to create one.</p>
          )}
          {config.rates.map((rate, idx) => (
            <div key={rate.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">Rate #{idx + 1}</span>
                <button
                  type="button"
                  aria-label={`Remove rate ${idx + 1}`}
                  onClick={() => removeRate(rate.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor={`rate-name-${rate.id}`}>Name</Label>
                  <Input
                    id={`rate-name-${rate.id}`}
                    value={rate.name}
                    onChange={(e) => updateRate(rate.id, "name", e.target.value)}
                    placeholder="e.g. Standard"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rate-price-${rate.id}`}>Price ($)</Label>
                  <Input
                    id={`rate-price-${rate.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate.price}
                    onChange={(e) => updateRate(rate.id, "price", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rate-min-${rate.id}`}>Min Weight (kg)</Label>
                  <Input
                    id={`rate-min-${rate.id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={rate.minWeight ?? ""}
                    onChange={(e) =>
                      updateRate(rate.id, "minWeight", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rate-max-${rate.id}`}>Max Weight (kg)</Label>
                  <Input
                    id={`rate-max-${rate.id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={rate.maxWeight ?? ""}
                    onChange={(e) =>
                      updateRate(rate.id, "maxWeight", e.target.value ? parseFloat(e.target.value) : null)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Shipping Settings
        </Button>
      </div>
    </div>
  );
}
