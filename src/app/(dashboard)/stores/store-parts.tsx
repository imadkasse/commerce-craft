import Link from "next/link";
import { cn } from "@/lib/utils";
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
import type { Store } from "@/services/stores.service";
import {
  ArrowRightLeft,
  CheckCircle2,
  Palette,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";

const FALLBACK_ACCENT = "#b4552e";

const quietIcon =
  "flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft/40 hover:text-ink disabled:pointer-events-none disabled:opacity-50";

export function StatusPill({ status }: { status: Store["status"] }) {
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

function StoreMonogram({ store }: { store: Store }) {
  if (store.logoUrl) {
    return (
      <img
        src={store.logoUrl}
        alt={store.name}
        className="h-12 w-12 rounded-xl border border-line object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-semibold text-accent-strong">
      {store.name.charAt(0).toUpperCase() || "S"}
    </div>
  );
}

function StoreIdentity({
  store,
  primaryColor,
}: {
  store: Store;
  primaryColor: string;
}) {
  return (
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
  );
}

function StoreRowActions({
  store,
  busy,
  isActive,
  switchingId,
  onSwitch,
}: {
  store: Store;
  busy: boolean;
  isActive: boolean;
  switchingId: string | null;
  onSwitch: (id: string) => void;
}) {
  return (
    <>
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
    </>
  );
}

function DeleteStoreDialog({
  store,
  busy,
  deletingId,
  onDelete,
}: {
  store: Store;
  busy: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  return (
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
  );
}

export function StoreRow({
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
        <StoreMonogram store={store} />
      </div>

      {/* Identity */}
      <StoreIdentity store={store} primaryColor={primaryColor} />

      {/* Status + quiet actions */}
      <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
        <StatusPill status={store.status} />
        <div className="flex items-center gap-1 lg:opacity-0 lg:transition-opacity lg:duration-200 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <StoreRowActions
            store={store}
            busy={busy}
            isActive={isActive}
            switchingId={switchingId}
            onSwitch={onSwitch}
          />
          {store.isOwner && (
            <DeleteStoreDialog
              store={store}
              busy={busy}
              deletingId={deletingId}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </li>
  );
}

export function StoreListSkeleton() {
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
