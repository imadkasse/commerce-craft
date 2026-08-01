"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth";
import {
  Plus,
  Store as StoreIcon,
  ArrowRightLeft,
  CheckCircle2,
  Palette,
  ExternalLink,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

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
  theme: StoreTheme | null;
  status: "draft" | "published";
  ownerId: string;
  role: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoresResponse {
  stores: Store[];
}

const FALLBACK_ACCENT = "#b4552e";

const quietIcon =
  "flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink disabled:pointer-events-none disabled:opacity-50";

function StatusPill({ status }: { status: Store["status"] }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        published ? "bg-forest-soft text-forest" : "bg-amber-soft text-amber"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          published ? "bg-forest" : "bg-amber"
        )}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

// ── Create Store form (inline, progressive disclosure — no modal) ──
function CreateStoreForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const switchStore = useAuthStore((s) => s.switchStore);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checkSlug = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    try {
      const res = await fetch(
        `/api/stores/check-domain?slug=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error("Failed to check slug");
      const data = await res.json();
      setSlugAvailable(data.slugAvailable === true);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Slug is already taken");
        } else {
          toast.error(data.error || "Failed to create store");
        }
        return;
      }
      toast.success("Store created");
      onCreated();
      onClose();
      const result = await switchStore(data.store.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        router.push(`/stores/${data.store.id}/playground`);
      }
    } catch {
      toast.error("Failed to create store");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel-in rounded-2xl border border-line bg-surface p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
            Craft a new store
          </h2>
          <p className="mt-1 text-sm text-muted">
            Give it a name, claim its address, and start shaping its storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="store-name" className="font-medium text-ink">
            Store name <span className="text-accent-strong">*</span>
          </Label>
          <Input
            id="store-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atelier Oran"
            className="h-10 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="store-slug" className="font-medium text-ink">
            Slug <span className="text-xs font-normal text-muted">optional</span>
          </Label>
          <Input
            id="store-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugAvailable(null);
            }}
            onBlur={(e) => checkSlug(e.target.value)}
            placeholder="atelier-oran"
            className={cn(
              "h-10 rounded-lg",
              slugAvailable === false && "border-clay/50 focus:border-clay"
            )}
          />
          {slugChecking ? (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking availability...
            </p>
          ) : slugAvailable === true ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              Available
            </p>
          ) : slugAvailable === false ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-clay">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" />
              Already taken
            </p>
          ) : (
            <p className="text-xs text-muted">
              Leave empty to auto-generate a slug from the store name.
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="store-description" className="font-medium text-ink">
            Description
          </Label>
          <Textarea
            id="store-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short line about what this store sells..."
            rows={2}
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="store-logo" className="font-medium text-ink">
            Logo URL
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="store-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="h-10 rounded-lg"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Store logo preview"
                className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          An empty slug is auto-crafted from the store name.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="rounded-full bg-accent px-5 py-2.5 text-white hover:bg-accent-strong"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create store
          </Button>
        </div>
      </div>
    </section>
  );
}

function StoreRow({
  store,
  isActive,
  deletingId,
  switchingId,
  onSwitch,
  onDelete,
}: {
  store: Store;
  isActive: boolean;
  deletingId: string | null;
  switchingId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const busy = deletingId === store.id || switchingId === store.id;
  const primaryColor = store.theme?.primaryColor ?? FALLBACK_ACCENT;

  return (
    <li className="group flex flex-col gap-4 p-5 transition-colors hover:bg-accent-soft/25 md:flex-row md:items-center md:gap-6">
      {/* Monogram */}
      <div className="flex shrink-0 items-start gap-4">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={store.name}
            className="h-12 w-12 rounded-xl border border-line object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-semibold text-accent-strong">
            {store.name.charAt(0).toUpperCase() || "S"}
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink">
          {store.name}
        </h3>
        <p className="mt-0.5 truncate font-sans text-sm text-muted">
          /{store.slug}
        </p>
        {store.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-500">
            {store.description}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full border border-line"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="text-xs text-muted">{primaryColor}</span>
        </div>
      </div>

      {/* Status + quiet actions */}
      <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
        <StatusPill status={store.status} />
        <div className="flex items-center gap-1 lg:opacity-0 lg:transition-opacity lg:duration-200 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <Link
            href={`/stores/${store.id}/playground`}
            aria-label={`Customize ${store.name}`}
            aria-disabled={busy}
            className={cn(quietIcon, busy && "pointer-events-none opacity-50")}
          >
            <Palette className="h-4 w-4" />
          </Link>
          <Link
            href={`/s/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${store.name} live`}
            aria-disabled={busy}
            className={cn(quietIcon, busy && "pointer-events-none opacity-50")}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => onSwitch(store.id)}
            disabled={busy || isActive}
            aria-label={isActive ? "Current store" : `Switch to ${store.name}`}
            className={cn(quietIcon, isActive && "text-forest disabled:opacity-100")}
          >
            {switchingId === store.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
          </button>
          {store.isOwner && (
            <Dialog>
              <DialogTrigger
                disabled={busy}
                aria-label={`Delete ${store.name}`}
                className={cn(
                  quietIcon,
                  "text-clay hover:bg-clay-soft/60 hover:text-clay-strong"
                )}
              >
                {deletingId === store.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete store?</DialogTitle>
                  <DialogDescription>
                    &quot;{store.name}&quot; and everything inside it will be
                    removed for good. This can&apos;t be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink">
                    Cancel
                  </DialogClose>
                  <DialogClose
                    onClick={() => onDelete(store.id)}
                    disabled={deletingId === store.id}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-strong disabled:pointer-events-none disabled:opacity-50"
                  >
                    {deletingId === store.id ? "Deleting..." : "Delete store"}
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </li>
  );
}

function StoreListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="divide-y divide-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton
                className={cn(
                  "h-4 rounded",
                  i % 3 === 0 ? "w-1/3" : i % 3 === 1 ? "w-1/2" : "w-2/5"
                )}
              />
              <Skeleton className="h-3 w-1/4 rounded" />
              {i % 2 === 0 && <Skeleton className="h-3 w-2/3 rounded" />}
            </div>
            <Skeleton className="hidden h-6 w-16 shrink-0 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoresPage() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.store);
  const switchStore = useAuthStore((s) => s.switchStore);

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const getStores = useCallback(async (): Promise<Store[]> => {
    const res = await fetch("/api/stores");
    if (!res.ok) throw new Error("Failed to fetch stores");
    const data: StoresResponse = await res.json();
    return data.stores;
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      setStores(await getStores());
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [getStores]);

  useEffect(() => {
    let cancelled = false;
    getStores()
      .then((stores) => {
        if (!cancelled) setStores(stores);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load stores");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getStores]);

  const handleSwitch = async (storeId: string) => {
    if (storeId === activeStore?.id || switchingId) return;
    setSwitchingId(storeId);
    try {
      const result = await switchStore(storeId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        const store = stores.find((s) => s.id === storeId);
        toast.success(`Switched to ${store?.name ?? "store"}`);
        router.push("/dashboard");
      }
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Store deleted");
      setLoading(true);
      fetchStores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="font-sans text-xs font-medium uppercase tracking-wide text-accent-strong">
            Workspace
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
            Stores
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Every storefront is a craft. Shape each one&apos;s products, orders,
            and landing pages, then hand it to the world with pride.
          </p>
        </div>
        <Button
          onClick={() => setCreating((v) => !v)}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-white hover:bg-accent-strong"
        >
          <Plus className="h-4 w-4" />
          New Store
        </Button>
      </header>

      {creating && (
        <CreateStoreForm
          onClose={() => setCreating(false)}
          onCreated={fetchStores}
        />
      )}

      {loading ? (
        <StoreListSkeleton />
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
            <StoreIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
            No stores yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Every great storefront starts as a blank page. Craft your first
            store and bring products, orders, and landing pages together in one
            place.
          </p>
          <Button
            onClick={() => setCreating(true)}
            className="mt-6 rounded-full bg-accent px-5 py-2.5 text-white hover:bg-accent-strong"
          >
            <Plus className="h-4 w-4" />
            Create your first store
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <ul className="divide-y divide-line">
            {stores.map((store) => (
              <StoreRow
                key={store.id}
                store={store}
                isActive={store.id === activeStore?.id}
                deletingId={deletingId}
                switchingId={switchingId}
                onSwitch={handleSwitch}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
