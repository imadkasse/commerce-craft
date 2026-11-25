"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth";
import {
  storesService,
  getCreateStoreErrorMessage,
  getStoreErrorMessage,
  type Store,
} from "@/services/stores.service";
import { Plus, Store as StoreIcon, Loader2, X } from "lucide-react";
import { StoreListSkeleton, StoreRow } from "./store-parts";

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
      setSlugAvailable(await storesService.checkSlug(trimmed));
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
      const store = await storesService.create({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      toast.success("Store created");
      onCreated();
      onClose();
      const result = await switchStore(store.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        router.push(`/stores/${store.id}/playground`);
      }
    } catch (err) {
      toast.error(getCreateStoreErrorMessage(err));
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
              // eslint-disable-next-line @next/next/no-img-element -- Keep the existing arbitrary external logo preview behavior.
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
    return storesService.list();
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
      await storesService.remove(id);
      toast.success("Store deleted");
      setLoading(true);
      fetchStores();
    } catch (err) {
      toast.error(getStoreErrorMessage(err, "Failed to delete"));
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
