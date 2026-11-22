/**
 * Server-only Drizzle loaders for the orders routes.
 *
 * Mirrors the queries in `src/app/api/orders/**` and the stats logic in
 * `orders.service.getStats`, so server components can render initial data
 * without an extra client round-trip.
 *
 * Only read *types* are imported (type-only, erased at compile time).
 */

import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { orderItems, orders, shippingConfig } from "@/lib/db/schema";
import type {
  Order,
  OrderItem,
  OrderListParams,
  OrderStats,
} from "@/services/orders.service";
import type { ShippingProvider } from "@/services/shipping.service";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

/** `OrderItem` with the numeric columns kept as the strings the API returns. */
function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.productId ?? undefined,
    productName: row.productName,
    productImage: row.productImage ?? undefined,
    color: row.color ?? undefined,
    size: row.size ?? undefined,
    quantity: row.quantity,
    // numeric columns are strings over JSON too → same shape as the API.
    unitPrice: row.unitPrice as unknown as number,
    totalPrice: row.totalPrice as unknown as number,
  };
}

/** Serialize a DB order row into the client-safe `Order` shape. */
function toOrder(row: OrderRow, items: OrderItem[] = []): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    customerCity: row.customerCity ?? "",
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    trackingCode: row.trackingCode ?? undefined,
    shippingProvider: row.shippingProvider ?? undefined,
    notes: row.notes ?? undefined,
    items,
  };
}

/**
 * Equivalent of `GET /api/orders`: same filters, ordering and pagination.
 * Items are not loaded here — the list view never renders them.
 */
export async function listOrdersForStore(
  storeId: string,
  params: OrderListParams = {},
): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(orders.storeId, storeId)];

  if (params.status) {
    conditions.push(eq(orders.status, params.status as Order["status"]));
  }
  if (params.search) {
    const searchCondition = or(
      like(orders.customerName, `%${params.search}%`),
      like(orders.customerPhone, `%${params.search}%`),
      like(orders.orderNumber, `%${params.search}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (params.dateFrom) {
    conditions.push(gte(orders.createdAt, new Date(params.dateFrom)));
  }
  if (params.dateTo) {
    conditions.push(lte(orders.createdAt, new Date(params.dateTo)));
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(where),
  ]);

  return {
    orders: rows.map((row) => toOrder(row)),
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  };
}

/**
 * Equivalent of `GET /api/orders/:id`, scoped to the store.
 *
 * The returned `order` has `items` merged in (`{ ...order, items }`) because
 * the detail UI reads `order.items`; `items` is also returned separately for
 * parity with the API response.
 */
export async function getOrderForStore(
  storeId: string,
  id: string,
): Promise<{ order: Order; items: OrderItem[] } | null> {
  const [[row], itemRows] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.storeId, storeId))),
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
  ]);

  if (!row) return null;

  const items = itemRows.map(toOrderItem);

  return {
    order: { ...toOrder(row), items },
    items,
  };
}

/** Dashboard counters: total plus one count per status, all in parallel. */
export async function getOrderStatsForStore(
  storeId: string,
): Promise<OrderStats> {
  const [total, ...perStatus] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.storeId, storeId)),
    ...ORDER_STATUSES.map((status) =>
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.status, status))),
    ),
  ]);

  return {
    total: Number(total[0]?.count ?? 0),
    pending: Number(perStatus[0]?.[0]?.count ?? 0),
    confirmed: Number(perStatus[1]?.[0]?.count ?? 0),
    shipped: Number(perStatus[2]?.[0]?.count ?? 0),
    delivered: Number(perStatus[3]?.[0]?.count ?? 0),
    cancelled: Number(perStatus[4]?.[0]?.count ?? 0),
  };
}

/**
 * Shipping provider options for the dispatch picker, derived exactly like
 * `shipping.service.getProviderList` (`name` from the id, `isDemo` = no key).
 * Missing config yields an empty list.
 */
export async function getShippingProvidersForStore(
  storeId: string,
): Promise<ShippingProvider[]> {
  const [row] = await db
    .select({ providers: shippingConfig.providers })
    .from(shippingConfig)
    .where(eq(shippingConfig.storeId, storeId));

  if (!row?.providers) return [];

  return Object.entries(row.providers).map(([id, cfg]) => ({
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    isDemo: !cfg?.apiKey,
  }));
}
