import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, orders, landingPages, activityLogs, users } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export async function GET(request: Request) {
  let access: Awaited<ReturnType<typeof requireActiveStore>>;
  try {
    access = await requireActiveStore(request);
  } catch (error) {
    return routeAuthErrorResponse(error);
  }

  try {
    const storeId = access.store.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      [productCount],
      [orderCount],
      [revenueResult],
      [landingPageCount],
      recentOrders,
      recentActivity,
      salesOverTime,
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
        .select({ total: sql<string>`COALESCE(SUM(${orders.total}), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.status, "delivered"),
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(landingPages)
        .where(
          and(
            eq(landingPages.storeId, storeId),
            eq(landingPages.status, "published"),
          )
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
          userName: users.name,
          createdAt: activityLogs.createdAt,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(eq(activityLogs.storeId, storeId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(10),
      db
        .select({
          date: sql<string>`DATE(${orders.createdAt})`,
          revenue: sql<string>`SUM(${orders.total})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.status, "delivered"),
            gte(orders.createdAt, thirtyDaysAgo),
          )
        )
        .groupBy(sql`DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`),
    ]);

    return NextResponse.json({
      totalProducts: Number(productCount?.count || 0),
      totalOrders: Number(orderCount?.count || 0),
      totalRevenue: Number(revenueResult?.total || 0),
      activeLandingPages: Number(landingPageCount?.count || 0),
      recentOrders,
      recentActivity,
      salesOverTime,
    });
  } catch (error) {
    console.error("Dashboard stats GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
