"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  storesService,
  getStoreErrorMessage,
  type Store,
  type StoreTheme,
} from "@/services/stores.service";
import { Loader2, Save, Check, Store as StoreIcon } from "lucide-react";

function StatusPill({ status }: { status: Store["status"] }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          published ? "bg-green-600" : "bg-amber-500"
        )}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

export default function StoresSettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [font, setFont] = useState<StoreTheme["font"]>("Inter");
  const [layout, setLayout] = useState<StoreTheme["layout"]>("grid");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedStore = stores.find((s) => s.id === selectedId) ?? null;

  const loadStores = useCallback(async () => {
    try {
      const data = await storesService.list();
      setStores(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      setLoadError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // When the selected store changes, load its values into local state.
  useEffect(() => {
    if (!selectedStore) return;
    setName(selectedStore.name);
    setSlug(selectedStore.slug);
    setDescription(selectedStore.description ?? "");
    setLogoUrl(selectedStore.logoUrl ?? "");
    setDomain(selectedStore.domain ?? "");
    setPrimaryColor(selectedStore.theme?.primaryColor ?? "#6366f1");
    setFont(selectedStore.theme?.font ?? "Inter");
    setLayout(selectedStore.theme?.layout ?? "grid");
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const applyUpdated = useCallback((updated: Store) => {
    setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleSaveProfile = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, {
        name,
        slug,
        description,
        logoUrl,
      });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update profile") });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, {
        theme: { primaryColor, font, layout },
      });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Theme updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update theme") });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, { domain });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Domain updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update domain") });
    } finally {
      setSaving(false);
    }
  };

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    loadStores();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Store Settings</h1>
        <p className="text-sm text-gray-500">
          Manage the profile, theme, and domain for every store in your workspace.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : loadError ? (
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {loadError}
          </div>
          <Button onClick={retry} variant="outline">
            Retry
          </Button>
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <StoreIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-gray-900">No stores yet</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Create your first store on the Stores page to start managing its settings.
          </p>
          <Link
            href="/stores"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Go to Stores
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
          {/* Store list */}
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle>Stores</CardTitle>
              <CardDescription>Select a store to edit its settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 p-3">
              {stores.map((store) => {
                const selected = store.id === selectedId;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedId(store.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-indigo-300 bg-indigo-50/70"
                        : "border-transparent hover:bg-gray-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">
                          {store.name}
                        </span>
                        <StatusPill status={store.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate font-mono text-xs text-gray-500">
                          /{store.slug}
                        </span>
                        {store.isOwner === false && (
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                    {selected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Settings editor for the selected store */}
          <div className="min-w-0">
            {message && (
              <div
                className={`mb-4 rounded-md px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {selectedStore && (
              <Tabs defaultValue="profile">
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="theme">Theme</TabsTrigger>
                  <TabsTrigger value="domain">Domain</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Store Profile</CardTitle>
                      <CardDescription>Your store name, description, and logo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="store-name">Store Name</Label>
                          <Input
                            id="store-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Store"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="store-slug">Slug</Label>
                          <Input
                            id="store-slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="my-store"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="store-description">Description</Label>
                        <Input
                          id="store-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="A brief description of your store"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="store-logo">Logo URL</Label>
                        <Input
                          id="store-logo"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      {logoUrl && (
                        <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                          <img
                            src={logoUrl}
                            alt="Store logo preview"
                            className="h-10 w-10 rounded object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span className="text-xs text-gray-500">Logo preview</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="theme">
                  <Card>
                    <CardHeader>
                      <CardTitle>Theme</CardTitle>
                      <CardDescription>
                        Customize colors, fonts, and layout for your landing pages.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="primary-color">Primary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            id="primary-color"
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 p-1"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-32 font-mono"
                            placeholder="#6366f1"
                            aria-label="Primary color hex value"
                          />
                          <div
                            className="h-8 w-8 rounded-full border border-gray-200"
                            style={{ backgroundColor: primaryColor }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store-font">Font Family</Label>
                        <Select
                          id="store-font"
                          value={font}
                          onChange={(e) => setFont(e.target.value as StoreTheme["font"])}
                        >
                          <option value="Inter">Inter</option>
                          <option value="Geist">Geist</option>
                          <option value="Bricolage Grotesque">Bricolage Grotesque</option>
                          <option value="Schibsted Grotesk">Schibsted Grotesk</option>
                          <option value="system-ui">System Default</option>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Layout Style</Label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setLayout("grid")}
                            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                              layout === "grid"
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            Grid
                          </button>
                          <button
                            onClick={() => setLayout("list")}
                            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                              layout === "list"
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            List
                          </button>
                        </div>
                      </div>

                      <Separator />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveTheme}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Theme
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="domain">
                  <Card>
                    <CardHeader>
                      <CardTitle>Custom Domain</CardTitle>
                      <CardDescription>Map a custom domain to your store landing pages.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="store-domain">Domain</Label>
                        <Input
                          id="store-domain"
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          placeholder="shop.example.com"
                        />
                      </div>

                      <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Public URL Pattern
                        </p>
                        <p className="mt-1 text-sm text-gray-700 font-mono">
                          {domain
                            ? `https://${domain}/:landing-page-slug`
                            : `https://${slug || "your-store"}.commercecraft.app/:landing-page-slug`}
                        </p>
                      </div>

                      {domain && (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                          <span>After saving, add a CNAME record pointing your domain to</span>
                          <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono">
                            proxy.commercecraft.app
                          </code>
                        </div>
                      )}

                      <Separator />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveDomain}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Domain
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
