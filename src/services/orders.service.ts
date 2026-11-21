/**
 * Orders domain service.
 *
 * Owns request shaping/parsing for `/api/orders` and the pure order-status
 * domain rules (metadata + transition graph) so pages stay presentational.
 */

import { ApiError, apiFetch, withQuery } from "@/services/http";
import type { Id } from "@/services/types";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type StatusVariant = "default" | "secondary" | "outline" | "destructive";

/** Icon *names* only — the UI maps these to its icon library. */
export type OrderStatusIcon =
  | "clock"
  | "package"
  | "truck"
  | "check-circle"
  | "x-circle";

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  productImage?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  trackingCode?: string;
  shippingProvider?: string;
  notes?: string;
  items: OrderItem[];
}

/** `GET /api/orders` response. */
export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

/** `GET /api/orders/:id` response. */
export interface OrderDetailResponse {
  order: Order;
  items: OrderItem[];
}

/** `PUT /api/orders/:id` response. */
export interface UpdateOrderStatusResponse {
  order: Order;
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface OrderListParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface OrderStatusMeta {
  label: string;
  variant: StatusVariant;
  color: string;
  icon: OrderStatusIcon;
}

export interface StatusTransition {
  status: OrderStatus;
  label: string;
  variant: StatusVariant;
}

export const STATUS_CONFIG: Record<string, OrderStatusMeta> = {
  pending: {
    label: "Pending",
    variant: "outline",
    icon: "clock",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    variant: "secondary",
    icon: "package",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  shipped: {
    label: "Shipped",
    variant: "default",
    icon: "truck",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  delivered: {
    label: "Delivered",
    variant: "default",
    icon: "check-circle",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    icon: "x-circle",
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

export const STATUS_TRANSITIONS: Record<string, StatusTransition[]> = {
  pending: [
    { status: "confirmed", label: "Confirm Order", variant: "default" },
    { status: "cancelled", label: "Cancel Order", variant: "destructive" },
  ],
  confirmed: [
    { status: "shipped", label: "Mark as Shipped", variant: "default" },
    { status: "cancelled", label: "Cancel Order", variant: "destructive" },
  ],
  shipped: [
    { status: "delivered", label: "Mark as Delivered", variant: "default" },
    { status: "cancelled", label: "Cancel Order", variant: "destructive" },
  ],
  delivered: [],
  cancelled: [],
};

export function getStatusTransitions(status: string): StatusTransition[] {
  return STATUS_TRANSITIONS[status] || [];
}

export async function list(
  params: OrderListParams = {},
): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(
    withQuery("/api/orders", {
      status: params.status,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: params.page,
      limit: params.limit,
    }),
  );
}

export async function get(id: Id): Promise<OrderDetailResponse> {
  return apiFetch<OrderDetailResponse>(`/api/orders/${id}`);
}

/**
 * Best-effort fetch: returns `null` for a non-2xx response, but rethrows
 * transport failures (e.g. network errors) so callers can still surface them.
 */
export async function getQuietly(
  id: Id,
): Promise<OrderDetailResponse | null> {
  try {
    return await get(id);
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

export async function updateStatus(
  id: Id,
  status: OrderStatus | string,
): Promise<UpdateOrderStatusResponse> {
  return apiFetch<UpdateOrderStatusResponse>(`/api/orders/${id}`, {
    method: "PUT",
    body: { status },
  });
}

/**
 * Dashboard counters: total plus one count per status, fetched in parallel.
 */
export async function getStats(): Promise<OrderStats> {
  const statuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;

  const [allData, ...statusData] = await Promise.all([
    apiFetch<PaginatedOrders>(withQuery("/api/orders", { limit: 1 })),
    ...statuses.map((status) =>
      apiFetch<PaginatedOrders>(
        withQuery("/api/orders", { status, limit: 1 }),
      ),
    ),
  ]);

  return {
    total: allData.total || 0,
    pending: statusData[0]?.total || 0,
    confirmed: statusData[1]?.total || 0,
    shipped: statusData[2]?.total || 0,
    delivered: statusData[3]?.total || 0,
    cancelled: statusData[4]?.total || 0,
  };
}

export const ordersService = {
  list,
  get,
  getQuietly,
  updateStatus,
  getStats,
  getStatusTransitions,
};
