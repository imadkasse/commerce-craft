/**
 * Dashboard overview service (server-only).
 *
 * Unlike the other client-facing services, this module runs on the server and
 * talks to Drizzle directly so the dashboard page stays a pure renderer.
 */

import { db } from "@/lib/db";
import {
  products,
  orders,
  landingPages,
  activityLogs,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
}

export interface DashboardActivity {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: Date;
  userName: string | null;
}

export interface DashboardSalesPoint {
  date: string;
  revenue: string;
}

export interface DashboardOverview {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeLandingPages: number;
  recentOrders: DashboardRecentOrder[];
  recentActivity: DashboardActivity[];
  salesOverTime: DashboardSalesPoint[];
}

export async function getDashboardOverview(
  storeId: string,
): Promise<DashboardOverview> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    productResult,
    orderResult,
    revenueResult,
    landingPageResult,
    recentOrdersResult,
    activityResult,
    salesOverTimeResult,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.storeId, storeId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.storeId, storeId)),
    db
      .select({ revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
      .from(orders)
      .where(
        and(eq(orders.storeId, storeId), eq(orders.status, "delivered")),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(landingPages)
      .where(
        and(
          eq(landingPages.storeId, storeId),
          eq(landingPages.status, "published"),
        ),
      ),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt))
      .limit(5),
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        userName: users.name,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.storeId, storeId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(10),
    db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.status, "delivered"),
          gte(orders.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`),
  ]);

  const totalProducts = Number(productResult[0]?.count ?? 0);
  const totalOrders = Number(orderResult[0]?.count ?? 0);
  const totalRevenue = Number(revenueResult[0]?.revenue ?? 0);
  const activeLandingPages = Number(landingPageResult[0]?.count ?? 0);
  const recentOrders = recentOrdersResult ?? [];
  const recentActivity = activityResult ?? [];
  const salesOverTime = salesOverTimeResult ?? [];

  return {
    totalProducts,
    totalOrders,
    totalRevenue,
    activeLandingPages,
    recentOrders,
    recentActivity,
    salesOverTime,
  };
}

export const dashboardService = {
  getDashboardOverview,
};
