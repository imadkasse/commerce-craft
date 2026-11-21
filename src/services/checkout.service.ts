/**
 * Checkout domain service shared by the Arabic (`order-form`) and French
 * (`unified-checkout-form`) storefront checkout forms.
 *
 * All pricing rules and structural validation live here; localized copy is
 * supplied by the caller so both forms keep their exact messages.
 */

import { ApiError, apiFetch } from "@/services/http";

export const HOME_SHIPPING_COST = 500;

export type DeliveryOption = "home" | "desk";

export type CheckoutProductType = "CLOTHING" | "GENERAL";

export interface CheckoutPayload {
  slug: string;
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerCommune?: string;
  deliveryOption?: DeliveryOption;
}

export interface CheckoutResponse {
  success?: boolean;
  order: {
    id?: string;
    orderNumber: string;
    total?: string | number;
  };
}

export interface CheckoutTotalsInput {
  unitPrice: number;
  quantity: number;
  deliveryOption: DeliveryOption;
  /** Defaults to `HOME_SHIPPING_COST` (500). */
  shippingCostHome?: number;
}

export interface CheckoutTotals {
  unitPrice: number;
  subtotal: number;
  shippingCost: number;
  total: number;
}

export interface CheckoutSingleProduct {
  type: CheckoutProductType;
}

export interface CheckoutValidationInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  product: CheckoutSingleProduct | null;
  /** Arabic checkout only. Empty string / null / undefined means "not chosen". */
  wilaya?: string | number | null;
  /** Arabic checkout only. */
  daira?: string;
  colorId?: string;
  sizeId?: string;
  sizes?: Array<{ id: string; stockQuantity: number }>;
}

/**
 * Localized strings for `validateCheckout`. `wilaya`/`daira` are only checked
 * when supplied, which is how the French form opts out of those steps.
 */
export interface CheckoutValidationMessages {
  required: string;
  wilaya?: string;
  daira?: string;
  productUnavailable: string;
  color?: string;
  size?: string;
  outOfStock?: string;
}

export interface ProductSize {
  id: string;
  colorId: string;
  sizeLabel: string;
  stockQuantity: number;
}

export async function submitCheckout(
  payload: CheckoutPayload,
  fallbackError = "Failed to submit order",
): Promise<CheckoutResponse> {
  try {
    return await apiFetch<CheckoutResponse>("/api/orders/checkout", {
      method: "POST",
      body: payload,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      const data = err.data;
      const message =
        data !== null &&
        typeof data === "object" &&
        typeof (data as { error?: unknown }).error === "string" &&
        (data as { error: string }).error
          ? (data as { error: string }).error
          : fallbackError;
      throw new Error(message);
    }
    throw err;
  }
}

export function computeTotals({
  unitPrice,
  quantity,
  deliveryOption,
  shippingCostHome = HOME_SHIPPING_COST,
}: CheckoutTotalsInput): CheckoutTotals {
  const shippingCost = deliveryOption === "home" ? shippingCostHome : 0;
  const subtotal = unitPrice * quantity;
  return {
    unitPrice,
    subtotal,
    shippingCost,
    total: subtotal + shippingCost,
  };
}

/**
 * Structural checkout validation. Returns the first localized error message,
 * or `null` when the input is valid.
 */
export function validateCheckout(
  input: CheckoutValidationInput,
  messages: CheckoutValidationMessages,
): string | null {
  if (!input.customerName || !input.customerPhone || !input.customerAddress) {
    return messages.required;
  }

  if (
    messages.wilaya !== undefined &&
    (input.wilaya === "" || input.wilaya === null || input.wilaya === undefined)
  ) {
    return messages.wilaya;
  }

  if (messages.daira !== undefined && !input.daira) {
    return messages.daira;
  }

  if (!input.product) {
    return messages.productUnavailable;
  }

  if (input.product.type === "CLOTHING") {
    if (messages.color !== undefined && !input.colorId) {
      return messages.color;
    }
    if (messages.size !== undefined && !input.sizeId) {
      return messages.size;
    }
    const sizeObj = input.sizes?.find((s) => s.id === input.sizeId);
    if (sizeObj && sizeObj.stockQuantity === 0) {
      return messages.outOfStock ?? null;
    }
  }

  return null;
}

/** Sizes belonging to the selected color (all sizes when no color is set). */
export function getAvailableSizes<T extends { colorId: string }>(
  colorId: string,
  sizes: T[],
): T[] {
  return colorId ? sizes.filter((s) => s.colorId === colorId) : [];
}

export const checkoutService = {
  submitCheckout,
  computeTotals,
  validateCheckout,
  getAvailableSizes,
};
