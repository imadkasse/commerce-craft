"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Store,
  Truck,
  Users,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/landing-pages", label: "Landing Pages", icon: FileText },
  { href: "/stores/settings", label: "Store Settings", icon: Store },
  { href: "/store/shipping", label: "Shipping", icon: Truck },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/team", label: "Team", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default border-0 bg-black/50 p-0 text-left lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 rounded-md bg-accent p-2 text-white shadow-lg lg:hidden"
        onClick={toggleSidebar}
        type="button"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#211C18] text-gray-300 transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-sm text-white">
            CC
          </div>
          <span className="text-lg font-semibold text-gray-50">CommerceCraft</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                )}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4">
          <p className="text-xs text-gray-500">CommerceCraft v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
