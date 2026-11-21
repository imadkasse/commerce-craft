/**
 * Stores service.
 *
 * Covers both the multi-store management endpoints (`/api/stores*`) and the
 * active-store settings endpoints (`/api/store`). Framework-agnostic: no
 * React, no `"use client"`.
 */

import { ApiError, apiFetch, withQuery } from "./http";
import type { StoreTheme } from "@/lib/store-theme";

export type { StoreTheme };

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  domain: string | null;
  theme: Partial<StoreTheme> | null;
  status: "draft" | "published";
  ownerId: string;
  role?: string;
  isOwner?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreListResponse {
  stores: Store[];
}

export interface StoreResponse {
  store: Store;
}

export interface CreateStoreInput {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  theme?: Partial<StoreTheme>;
}

export interface UpdateStoreInput {
  name?: string;
  slug?: string;
  description?: string | null;
  logoUrl?: string | null;
  domain?: string;
  theme?: Partial<StoreTheme>;
  status?: "draft" | "published";
}

/** Theme shape edited from the active-store settings page. */
export interface CurrentStoreThemeInput {
  primaryColor: string;
  font: string;
  layout: string;
}

export interface UpdateCurrentStoreInput {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  theme?: CurrentStoreThemeInput;
}

function readErrorField(data: unknown): string | null {
  if (data !== null && typeof data === "object") {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/** `GET /api/stores` — stores the current user can access. */
export async function list(): Promise<Store[]> {
  const data = await apiFetch<StoreListResponse>("/api/stores");
  return data.stores;
}

/** `POST /api/stores` */
export async function create(input: CreateStoreInput): Promise<Store> {
  const data = await apiFetch<StoreResponse>("/api/stores", {
    method: "POST",
    body: input,
  });
  return data.store;
}

/** `GET /api/stores/:id` */
export async function get(id: string): Promise<Store> {
  const data = await apiFetch<StoreResponse>(`/api/stores/${id}`);
  return data.store;
}

/** `PUT /api/stores/:id` — theme, status and profile fields. */
export async function update(
  id: string,
  input: UpdateStoreInput,
): Promise<Store> {
  const data = await apiFetch<StoreResponse>(`/api/stores/${id}`, {
    method: "PUT",
    body: input,
  });
  return data.store;
}

/** `DELETE /api/stores/:id` */
export async function remove(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/stores/${id}`, {
    method: "DELETE",
  });
}

/** `GET /api/stores/check-domain?slug=` — returns whether the slug is free. */
export async function checkSlug(slug: string): Promise<boolean> {
  const data = await apiFetch<{ slugAvailable?: boolean }>(
    withQuery("/api/stores/check-domain", { slug }),
  );
  return data.slugAvailable === true;
}

/** `GET /api/store` — the currently selected store's settings. */
export async function getCurrentStore(): Promise<Store> {
  const data = await apiFetch<StoreResponse>("/api/store");
  return data.store;
}

/** `PUT /api/store` — profile, theme or domain update. */
export async function updateCurrentStore(
  input: UpdateCurrentStoreInput,
): Promise<Store> {
  const data = await apiFetch<StoreResponse>("/api/store", {
    method: "PUT",
    body: input,
  });
  return data.store;
}

/** True when a store request failed because the slug/domain is taken. */
export function isSlugConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/**
 * Error message for store mutations, mirroring the original inline handling:
 * prefer the API's `error` field, fall back to the caller's message.
 */
export function getStoreErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    return readErrorField(error.data) ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Message shown when creating a store fails. A 409 always reads as a taken
 * slug, exactly like the original form.
 */
export function getCreateStoreErrorMessage(error: unknown): string {
  if (isSlugConflict(error)) return "Slug is already taken";
  if (error instanceof ApiError) {
    return readErrorField(error.data) ?? "Failed to create store";
  }
  return "Failed to create store";
}

/**
 * Message shown when loading a single store fails. Falls back to the status
 * code, matching `Failed to load store (${status})`.
 */
export function getLoadStoreErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = readErrorField(error.data);
    return message ?? `Failed to load store (${error.status})`;
  }
  return error instanceof Error ? error.message : "Failed to load store";
}

export const storesService = {
  list,
  create,
  get,
  update,
  remove,
  checkSlug,
  getCurrentStore,
  updateCurrentStore,
};
