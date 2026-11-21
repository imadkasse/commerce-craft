/**
 * Shipping / logistics domain service.
 *
 * Owns the shipping-config shape, provider metadata, rate mutations, and all
 * `/api/shipping/*` requests.
 */

import { ApiError, apiFetch, withQuery } from "@/services/http";
import type { Id } from "@/services/types";

export interface ProviderSetting {
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
}

export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  minWeight: number | null;
  maxWeight: number | null;
}

export interface ShippingConfig {
  defaultProvider: string;
  providers: Record<string, ProviderSetting>;
  rates: ShippingRate[];
}

/** Raw `GET/POST /api/shipping/config` body. */
export interface ShippingConfigResponse {
  config: ShippingConfig | null;
}

export interface ShippingProvider {
  id: string;
  name: string;
  isDemo: boolean;
}

export interface TrackingEvent {
  date: string;
  description: string;
}

export interface TrackingInfo {
  status: string;
  estimatedDelivery?: string;
  events?: TrackingEvent[];
}

export interface TrackingResponse {
  tracking: TrackingInfo;
}

export interface DispatchResponse {
  success?: boolean;
  trackingCode?: string;
  shippingProvider?: string;
}

export const defaultProviders: Record<string, ProviderSetting> = {
  zr_express: { apiKey: "", apiSecret: "", enabled: false },
  yalidin: { apiKey: "", apiSecret: "", enabled: false },
  noest: { apiKey: "", apiSecret: "", enabled: false },
};

export const providerKeys = ["zr_express", "yalidin", "noest"] as const;

export const providerNames: Record<string, string> = {
  zr_express: "ZR Express",
  yalidin: "Yalidin",
  noest: "NOEST Express",
};

export const defaultConfig: ShippingConfig = {
  defaultProvider: "zr_express",
  providers: { ...defaultProviders },
  rates: [
    { id: "1", name: "Standard", price: 0, minWeight: null, maxWeight: null },
  ],
};

/** Session-scoped counter shared by every `addRate` call. */
let rateIdCounter = 1;

function normalizeApiError(err: unknown, fallback: string): unknown {
  if (err instanceof ApiError) {
    const data = err.data;
    if (
      data !== null &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string" &&
      (data as { error: string }).error
    ) {
      return new Error((data as { error: string }).error);
    }
    return new Error(fallback);
  }
  return err;
}

export async function getConfig(): Promise<ShippingConfigResponse> {
  return apiFetch<ShippingConfigResponse>("/api/shipping/config");
}

export async function saveConfig(
  config: ShippingConfig,
): Promise<ShippingConfigResponse> {
  try {
    return await apiFetch<ShippingConfigResponse>("/api/shipping/config", {
      method: "POST",
      body: config,
    });
  } catch (err) {
    throw normalizeApiError(err, "Failed to save");
  }
}

export async function dispatch(
  orderId: Id,
  provider: string,
): Promise<DispatchResponse> {
  try {
    return await apiFetch<DispatchResponse>("/api/shipping/dispatch", {
      method: "POST",
      body: { orderId, provider },
    });
  } catch (err) {
    throw normalizeApiError(err, "Dispatch failed");
  }
}

export async function getTracking(orderId: Id): Promise<TrackingResponse> {
  try {
    return await apiFetch<TrackingResponse>(
      withQuery("/api/shipping/tracking", { orderId }),
    );
  } catch (err) {
    throw normalizeApiError(err, "Failed to fetch tracking");
  }
}

/**
 * Provider options for the order-detail dispatch picker, derived from the
 * saved shipping config. Missing/failed config yields an empty list.
 */
export async function getProviderList(): Promise<ShippingProvider[]> {
  let data: ShippingConfigResponse | null = null;
  try {
    data = await apiFetch<ShippingConfigResponse>("/api/shipping/config");
  } catch {
    return [];
  }

  if (!data?.config?.providers) return [];

  return Object.entries(data.config.providers).map(([id, cfg]) => ({
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    isDemo: !cfg.apiKey,
  }));
}

/* -------------------------------------------------------------------------- */
/* Pure config mutations                                                      */
/* -------------------------------------------------------------------------- */

export function updateProvider(
  config: ShippingConfig,
  key: string,
  field: keyof ProviderSetting,
  value: string | boolean,
): ShippingConfig {
  return {
    ...config,
    providers: {
      ...config.providers,
      [key]: { ...config.providers[key], [field]: value },
    },
  };
}

export function addRate(config: ShippingConfig): ShippingConfig {
  rateIdCounter += 1;
  const newRate: ShippingRate = {
    id: String(rateIdCounter),
    name: "",
    price: 0,
    minWeight: null,
    maxWeight: null,
  };
  return { ...config, rates: [...config.rates, newRate] };
}

export function removeRate(config: ShippingConfig, id: string): ShippingConfig {
  return {
    ...config,
    rates: config.rates.filter((r) => r.id !== id),
  };
}

export function updateRate(
  config: ShippingConfig,
  id: string,
  field: keyof ShippingRate,
  value: string | number | null,
): ShippingConfig {
  return {
    ...config,
    rates: config.rates.map((r) =>
      r.id === id ? { ...r, [field]: value } : r,
    ),
  };
}

export const shippingService = {
  getConfig,
  saveConfig,
  dispatch,
  getTracking,
  getProviderList,
  updateProvider,
  addRate,
  removeRate,
  updateRate,
};
