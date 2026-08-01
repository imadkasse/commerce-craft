"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Store } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface StoresResponse {
  stores: Store[];
}

// The project's custom DropdownMenu delivers its content through an injected
// `__dropdownContent` prop carried by one of the trigger's children. This
// carrier simply holds that prop (and renders nothing itself).
function StoreMenuCarrier({ __dropdownContent }: { __dropdownContent: React.ReactNode }) {
  return null;
}

export function StoreSwitcher() {
  const router = useRouter();
  const switchStore = useAuthStore((s) => s.switchStore);
  const activeStore = useAuthStore((s) => s.store);

  const [stores, setStores] = React.useState<Store[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stores");
        if (!res.ok) throw new Error("Failed to fetch stores");
        const data: StoresResponse = await res.json();
        if (!cancelled) setStores(data.stores);
      } catch {
        if (!cancelled) toast.error("Failed to load stores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (storeId: string) => {
    if (storeId === activeStore?.id || switchingId) return;
    setSwitchingId(storeId);
    try {
      const result = await switchStore(storeId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        const target = stores.find((s) => s.id === storeId);
        toast.success(`Switched to ${target?.name ?? "store"}`);
        router.push("/dashboard");
      }
    } finally {
      setSwitchingId(null);
    }
  };

  if (loading) {
    return <Skeleton className="h-9 w-40 rounded-full" />;
  }

  if (stores.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-soft/40">
        <Store className="h-4 w-4 shrink-0 text-accent-strong" />
        <span className="max-w-[140px] truncate">
          {activeStore?.name ?? "Select store"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        <StoreMenuCarrier
          __dropdownContent={
            <DropdownMenuContent className="w-64 rounded-2xl border border-line bg-surface p-2 shadow-lg">
              <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted">
                Switch store
              </div>
              {stores.map((store) => {
                const isActive = store.id === activeStore?.id;
                return (
                  <DropdownMenuItem
                    key={store.id}
                    onClick={() => handleSelect(store.id)}
                    aria-disabled={switchingId === store.id}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink hover:bg-accent-soft/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate",
                          isActive ? "font-medium text-accent-strong" : "text-ink"
                        )}
                      >
                        {store.name}
                      </span>
                      {!isActive && (
                        <span className="block truncate text-xs text-muted">
                          /{store.slug}
                        </span>
                      )}
                    </span>
                    {switchingId === store.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />
                    ) : isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-accent-strong" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          }
        />
      </DropdownMenuTrigger>
    </DropdownMenu>
  );
}
