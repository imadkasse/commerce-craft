export interface ShippingProvider {
  id: string;
  name: string;
  dispatch(order: DispatchOrder, config: ProviderConfig): Promise<DispatchResult>;
  getTracking(trackingCode: string, config: ProviderConfig): Promise<TrackingResult>;
}

export interface DispatchOrder {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  items: Array<{ productName: string; quantity: number }>;
  total: number;
}

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  [key: string]: unknown;
}

export interface DispatchResult {
  success: boolean;
  trackingCode?: string;
  labelUrl?: string;
  error?: string;
}

export interface TrackingResult {
  status: "pending" | "in_transit" | "delivered" | "failed" | "unknown";
  location?: string;
  estimatedDelivery?: string;
  lastUpdate?: string;
  events?: Array<{ date: string; description: string; location?: string }>;
}

const providers = new Map<string, ShippingProvider>();

export function registerProvider(provider: ShippingProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): ShippingProvider | undefined {
  return providers.get(id);
}

export function getAllProviders(): ShippingProvider[] {
  return Array.from(providers.values());
}

export function isDemoMode(): boolean {
  return !process.env.SHIPPING_API_KEY_ZR &&
    !process.env.SHIPPING_API_KEY_YALIDIN &&
    !process.env.SHIPPING_API_KEY_NOEST;
}
