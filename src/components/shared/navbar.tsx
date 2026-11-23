"use client";

import * as React from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreSwitcher } from "@/components/shared/store-switcher";
import { UserMenu } from "@/components/shared/user-menu";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/80 px-6 backdrop-blur">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>
      </div>

      <StoreSwitcher />

      <div className="flex items-center gap-3 border-l border-line pl-4">
        <UserMenu />
      </div>
    </header>
  );
}
