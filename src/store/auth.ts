"use client";

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN";
  avatarUrl?: string;
}

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  store: StoreInfo | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setStore: (store: StoreInfo | null) => void;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  switchStore: (storeId: string) => Promise<{ error?: string }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  store: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setStore: (store) => set({ store }),

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      set({ user: data.user, store: data.store || null });
      return {};
    } catch {
      return { error: "Network error" };
    }
  },

  register: async (name, email, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Registration failed" };
      set({ user: data.user, store: data.store || null });
      return {};
    } catch {
      return { error: "Network error" };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, store: null });
      window.location.href = "/login";
    }
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        set({ user: null, store: null, isLoading: false });
        return;
      }
      const data = await res.json();
      set({ user: data.user, store: data.store || null, isLoading: false });
    } catch {
      set({ user: null, store: null, isLoading: false });
    }
  },

  switchStore: async (storeId) => {
    try {
      const res = await fetch("/api/auth/switch-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to switch store" };
      set({ user: data.user, store: data.store || null });
      return {};
    } catch {
      return { error: "Network error" };
    }
  },
}));
