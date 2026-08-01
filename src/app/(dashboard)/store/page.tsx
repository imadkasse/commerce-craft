"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, ExternalLink } from "lucide-react";

interface StoreTheme {
  primaryColor?: string;
  font?: string;
  layout?: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  domain: string | null;
  theme: StoreTheme;
  createdAt: string;
  updatedAt: string;
}

export default function StorePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [font, setFont] = useState("Inter");
  const [layout, setLayout] = useState("grid");

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch("/api/store");
      if (!res.ok) throw new Error("Failed to load store");
      const data = await res.json();
      const s: Store = data.store;
      setStore(s);
      setName(s.name);
      setSlug(s.slug);
      setDescription(s.description ?? "");
      setLogoUrl(s.logoUrl ?? "");
      setDomain(s.domain ?? "");
      setPrimaryColor(s.theme?.primaryColor ?? "#6366f1");
      setFont(s.theme?.font ?? "Inter");
      setLayout(s.theme?.layout ?? "grid");
    } catch {
      setMessage({ type: "error", text: "Failed to load store data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, logoUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      const data = await res.json();
      setStore(data.store);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: { primaryColor, font, layout } }),
      });
      if (!res.ok) throw new Error("Failed to update theme");
      const data = await res.json();
      setStore(data.store);
      setMessage({ type: "success", text: "Theme updated successfully." });
    } catch {
      setMessage({ type: "error", text: "Failed to update theme." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      const data = await res.json();
      setStore(data.store);
      setMessage({ type: "success", text: "Domain updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed." });
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
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Store Settings</h1>
        <p className="text-sm text-gray-500">Manage your store profile, theme, and domain.</p>
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
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
              <CardDescription>Customize colors, fonts, and layout for your landing pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
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
                  />
                  <div
                    className="h-8 w-8 rounded-full border border-gray-200"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-font">Font Family</Label>
                <Select id="store-font" value={font} onChange={(e) => setFont(e.target.value)}>
                  <option value="Inter">Inter</option>
                  <option value="Geist">Geist</option>
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
                <Button onClick={handleSaveTheme} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Public URL Pattern</p>
                <p className="mt-1 text-sm text-gray-700 font-mono">
                  {domain
                    ? `https://${domain}/:landing-page-slug`
                    : `https://${slug || "your-store"}.commercecraft.app/:landing-page-slug`}
                </p>
              </div>

              {domain && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <span>After saving, add a CNAME record pointing your domain to</span>
                  <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono">proxy.commercecraft.app</code>
                </div>
              )}

              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveDomain} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Domain
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
