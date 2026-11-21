/**
 * Authentication service.
 *
 * Owns every `/api/auth/*` request, response shaping and error-message
 * extraction. Framework-agnostic: no React, no `"use client"`.
 */

import { ApiError, apiFetch } from "./http";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN";
  avatarUrl?: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
}

/** Payload shared by login, register, switch-store and me. */
export interface AuthResult {
  user: User;
  store: StoreInfo | null;
}

/** Convenience alias used by the auth store's `{ error }` return shape. */
export interface AuthErrorResult {
  error: string;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  return apiFetch<AuthResult>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  return apiFetch<AuthResult>("/api/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function me(): Promise<AuthResult> {
  return apiFetch<AuthResult>("/api/auth/me");
}

export async function switchStore(storeId: string): Promise<AuthResult> {
  return apiFetch<AuthResult>("/api/auth/switch-store", {
    method: "POST",
    body: { storeId },
  });
}

function readErrorField(data: unknown): string | null {
  if (data !== null && typeof data === "object") {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/**
 * Translate a thrown auth error into the `{ error }` shape the auth store
 * returns. Mirrors the original inline handling: a body-level error message
 * wins, otherwise the caller's fallback; transport/parse failures become
 * `"Network error"`.
 */
export function toAuthError(
  error: unknown,
  fallback: string,
): AuthErrorResult {
  if (error instanceof ApiError) {
    if (error.data === null || error.data === undefined) {
      return { error: "Network error" };
    }
    return { error: readErrorField(error.data) ?? fallback };
  }
  return { error: "Network error" };
}

export const authService = {
  login,
  register,
  logout,
  me,
  switchStore,
};
