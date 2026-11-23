"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, Store, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null) {
  if (!name) return "AU";
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "AU";
}

function getRoleLabel(role?: string) {
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  return role;
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const store = useAuthStore((s) => s.store);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);

  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const fetchedRef = React.useRef(false);

  // Hydrate the user once if the client store is still empty on mount.
  React.useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (!user) {
      void fetchUser().catch(() => {
        /* Session may be absent — the menu falls back to placeholders. */
      });
    }
  }, [user, fetchUser]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  // Close on Escape and restore focus to the trigger.
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const toastId = toast.loading("Signing out...");
    try {
      await logout();
      toast.success("Signed out", {
        id: toastId,
        description: "See you next time.",
      });
      router.replace("/login");
      // Server components re-read the cleared cookie.
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.", { id: toastId });
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user?.name ?? "Admin User";
  const displayEmail = user?.email ?? "admin@commercecraft.io";
  const roleLabel = getRoleLabel(user?.role);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 text-left transition-colors hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-medium text-gray-900">{displayName}</span>
          <span className="block text-xs text-gray-500">{displayEmail}</span>
        </span>
        <Avatar>
          <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
        </Avatar>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          <div className="px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-ink">{displayName}</p>
              {roleLabel && (
                <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-strong">
                  {roleLabel}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted">{displayEmail}</p>
            {store?.name && (
              <p className="mt-1 truncate text-xs text-muted">{store.name}</p>
            )}
          </div>

          <hr className="my-1 h-px border-0 bg-line" />

          <Link
            href="/stores/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-accent-soft/50"
          >
            <Store className="h-4 w-4 shrink-0 text-muted" />
            Store settings
          </Link>
          <Link
            href="/team"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-accent-soft/50"
          >
            <Users className="h-4 w-4 shrink-0 text-muted" />
            Team
          </Link>

          <hr className="my-1 h-px border-0 bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-clay-strong hover:bg-clay-soft/50",
              loggingOut && "cursor-not-allowed opacity-70"
            )}
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
