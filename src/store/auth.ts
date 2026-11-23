"use client";

import { create } from "zustand";
import {
  authService,
  toAuthError,
  type StoreInfo,
  type User,
} from "@/services/auth.service";

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
      const { user, store } = await authService.login(email, password);
      set({ user, store: store || null });
      return {};
    } catch (error) {
      return toAuthError(error, "Login failed");
    }
  },

  register: async (name, email, password) => {
    try {
      const { user, store } = await authService.register(name, email, password);
      set({ user, store: store || null });
      return {};
    } catch (error) {
      return toAuthError(error, "Registration failed");
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore transport errors: the client session is cleared regardless.
    } finally {
      set({ user: null, store: null });
    }
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const { user, store } = await authService.me();
      set({ user, store: store || null, isLoading: false });
    } catch {
      set({ user: null, store: null, isLoading: false });
    }
  },

  switchStore: async (storeId) => {
    try {
      const { user, store } = await authService.switchStore(storeId);
      set({ user, store: store || null });
      return {};
    } catch (error) {
      return toAuthError(error, "Failed to switch store");
    }
  },
}));
