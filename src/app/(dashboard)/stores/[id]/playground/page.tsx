"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_THEME,
  normalizeTheme,
  type StoreTheme,
} from "@/lib/store-theme";
import {
  renderStorefrontHtml,
  type StorefrontProduct,
} from "@/components/storefront/storefront-html";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  domain: string | null;
  theme: Partial<StoreTheme> | null;
  status: "draft" | "published";
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

const SAMPLE_PRODUCTS: StorefrontProduct[] = [
  {
    id: "1",
    name: "Classic Sneakers",
    price: "12 500.00 DZD",
    image: "https://placehold.co/300x300?text=Classic+Sneakers",
    landingPageUrl: "/lp/classic-sneakers",
  },
  {
    id: "2",
    name: "Premium Watch",
    price: "45 000.00 DZD",
    image: "https://placehold.co/300x300?text=Premium+Watch",
    landingPageUrl: "/lp/premium-watch",
  },
  {
    id: "3",
    name: "Leather Backpack",
    price: "22 000.00 DZD",
    image: "https://placehold.co/300x300?text=Leather+Backpack",
  },
  {
    id: "4",
    name: "Sunglasses",
    price: "8 500.00 DZD",
    image: "https://placehold.co/300x300?text=Sunglasses",
    landingPageUrl: "/lp/sunglasses",
  },
  {
    id: "5",
    name: "Oversized Hoodie",
    price: "7 900.00 DZD",
    image: "https://placehold.co/300x300?text=Oversized+Hoodie",
  },
  {
    id: "6",
    name: "Denim Jacket",
    price: "18 500.00 DZD",
    landingPageUrl: "/lp/denim-jacket",
  },
];

const PRESET_COLORS = [
  "#B4401F", // rust
  "#9A3412", // burnt clay
  "#4F46E5", // indigo
  "#3F6212", // forest
  "#0F766E", // teal
  "#B45309", // amber
  "#7C3AED", // plum
  "#1E3A8A", // ink navy
];

const GRID_COLUMNS = [2, 3, 4] as const;

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-wider text-muted"
    >
      {children}
    </Label>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-sm font-semibold tracking-wide text-ink">
      {children}
    </h2>
  );
}

export default function StorePlaygroundPage() {
  const params = useParams();
  const id = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [theme, setTheme] = useState<StoreTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/stores/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load store (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setStore(data.store);
        setTheme(normalizeTheme(data.store.theme));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateTheme = (patch: Partial<StoreTheme>) => {
    setTheme((prev) => ({ ...prev, ...patch }));
  };

  const previewSrcDoc = useMemo(() => {
    if (!store) return "";
    return renderStorefrontHtml({
      store: {
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl,
      },
      theme: normalizeTheme(theme),
      products: SAMPLE_PRODUCTS,
    });
  }, [store, theme]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: normalizeTheme(theme) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save theme");
      }
      const data = await res.json();
      setStore(data.store);
      toast.success("Theme saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!store) return;
    const newStatus = store.status === "published" ? "draft" : "published";
    setPublishing(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      const data = await res.json();
      setStore(data.store);
      toast.success(
        newStatus === "published" ? "Store published!" : "Store unpublished."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="-m-6 flex h-[calc(100vh-4rem)] items-center justify-center bg-paper">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 bg-paper px-6">
        <div className="w-full max-w-md rounded-xl bg-clay-soft p-4 text-sm text-clay">
          {error}
        </div>
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stores
        </Link>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface/80 px-6 backdrop-blur">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/stores"
            aria-label="Back to stores"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-6 w-px bg-line" />
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold tracking-tight text-ink">
                {store.name}
              </h1>
              <p className="truncate text-sm text-muted">/{store.slug}</p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                store.status === "published"
                  ? "bg-forest-soft text-forest"
                  : "bg-amber-soft text-amber"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  store.status === "published" ? "bg-forest" : "bg-amber"
                )}
              />
              {store.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href={`/s/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <ExternalLink className="h-4 w-4" />
            View Live
          </a>
          <Button
            variant={store.status === "published" ? "outline" : "default"}
            onClick={handlePublishToggle}
            disabled={publishing}
            className={cn(
              "rounded-full",
              store.status === "published" && "border-line text-muted hover:text-ink"
            )}
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {store.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 bg-paper p-6">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="flex h-9 shrink-0 items-center border-b border-line px-4">
              <span className="flex w-12 items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              </span>
              <div className="mx-4 flex h-6 flex-1 items-center justify-center rounded-full bg-gray-100 px-3 text-xs text-muted">
                https://{store.slug}.commercecraft.app
              </div>
              <span className="w-12" />
            </div>
            <iframe
              title="Storefront preview"
              className="h-[calc(100%-2.25rem)] w-full border-0 bg-white"
              sandbox="allow-scripts"
              srcDoc={previewSrcDoc}
            />
          </div>
        </div>

        <div className="flex w-96 shrink-0 flex-col border-l border-line bg-paper">
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <section className="space-y-4 border-t border-line pt-4">
              <SectionHeader>Design</SectionHeader>

              <div className="space-y-2">
                <FieldLabel>Primary Color</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((color) => {
                    const active =
                      theme.primaryColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateTheme({ primaryColor: color })}
                        aria-label={`Set primary color to ${color}`}
                        aria-pressed={active}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 border-transparent transition-transform hover:scale-105",
                          active
                            ? "ring-2 ring-accent ring-offset-2 ring-offset-paper"
                            : "hover:ring-2 hover:ring-line hover:ring-offset-2 hover:ring-offset-paper"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      updateTheme({ primaryColor: e.target.value })
                    }
                    aria-label="Pick a custom primary color"
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
                  />
                  <Input
                    value={theme.primaryColor}
                    onChange={(e) =>
                      updateTheme({ primaryColor: e.target.value })
                    }
                    aria-label="Primary color hex value"
                    className="h-9 flex-1 font-mono text-sm"
                  />
                  <div
                    className="h-7 w-7 shrink-0 rounded-full border border-line shadow-inner"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="font">Font</FieldLabel>
                <Select
                  id="font"
                  className="rounded-lg"
                  value={theme.font}
                  onChange={(e) =>
                    updateTheme({ font: e.target.value as StoreTheme["font"] })
                  }
                >
                  <option value="Inter">Inter</option>
                  <option value="Geist">Geist</option>
                  <option value="Bricolage Grotesque">
                    Bricolage Grotesque
                  </option>
                  <option value="Schibsted Grotesk">Schibsted Grotesk</option>
                  <option value="system-ui">System Default</option>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="navbar-style">Navbar Style</FieldLabel>
                <Select
                  id="navbar-style"
                  className="rounded-lg"
                  value={theme.navbarStyle}
                  onChange={(e) =>
                    updateTheme({
                      navbarStyle: e.target
                        .value as StoreTheme["navbarStyle"],
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="gradient">Gradient</option>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>Product Columns</FieldLabel>
                <div className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">
                  {GRID_COLUMNS.map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => updateTheme({ gridColumns: cols })}
                      className={cn(
                        "rounded-full px-2 py-1.5 text-sm transition-colors",
                        theme.gridColumns === cols
                          ? "bg-accent font-medium text-white"
                          : "text-muted hover:text-ink"
                      )}
                    >
                      {cols} col
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-line pt-4">
              <SectionHeader>Content</SectionHeader>

              <div className="space-y-2">
                <FieldLabel htmlFor="hero-headline">Hero Headline</FieldLabel>
                <Input
                  id="hero-headline"
                  value={theme.hero.headline}
                  onChange={(e) =>
                    updateTheme({
                      hero: { ...theme.hero, headline: e.target.value },
                    })
                  }
                  placeholder="Welcome to our store"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="hero-subtitle">Hero Subtitle</FieldLabel>
                <Input
                  id="hero-subtitle"
                  value={theme.hero.subtitle}
                  onChange={(e) =>
                    updateTheme({
                      hero: { ...theme.hero, subtitle: e.target.value },
                    })
                  }
                  placeholder="Discover our latest products"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="hero-image">Hero Image URL</FieldLabel>
                <Input
                  id="hero-image"
                  value={theme.hero.imageUrl}
                  onChange={(e) =>
                    updateTheme({
                      hero: { ...theme.hero, imageUrl: e.target.value },
                    })
                  }
                  placeholder="https://example.com/hero.jpg"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">
                  Show categories
                </span>
                <span className="relative inline-flex items-center">
                  <input
                    id="show-categories"
                    name="show-categories"
                    type="checkbox"
                    checked={theme.showCategories}
                    onChange={(e) =>
                      updateTheme({ showCategories: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <span className="h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30 peer-focus-visible:ring-offset-1" />
                  <span className="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            </section>
          </div>

          <div className="border-t border-line p-5 pt-4">
            <Button
              className="w-full rounded-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
