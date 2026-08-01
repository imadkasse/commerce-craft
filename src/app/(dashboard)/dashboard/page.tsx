import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { products, orders, landingPages, activityLogs, users } from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { Package, ShoppingCart, FileText, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentOrdersWidget } from "@/components/dashboard/recent-orders";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.storeId) redirect("/login");

  const storeId = session.storeId;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [productResult, orderResult, revenueResult, landingPageResult, recentOrdersResult, activityResult, salesOverTimeResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.storeId, storeId)),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.storeId, storeId)),
    db.select({ revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)` }).from(orders).where(and(eq(orders.storeId, storeId), eq(orders.status, "delivered"))),
    db.select({ count: sql<number>`count(*)` }).from(landingPages).where(and(eq(landingPages.storeId, storeId), eq(landingPages.status, "published"))),
    db.select({ id: orders.id, orderNumber: orders.orderNumber, customerName: orders.customerName, total: orders.total, status: orders.status, createdAt: orders.createdAt }).from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.createdAt)).limit(5),
    db.select({ id: activityLogs.id, action: activityLogs.action, details: activityLogs.details, createdAt: activityLogs.createdAt, userName: users.name }).from(activityLogs).leftJoin(users, eq(activityLogs.userId, users.id)).where(eq(activityLogs.storeId, storeId)).orderBy(desc(activityLogs.createdAt)).limit(10),
    db.select({ date: sql<string>`DATE(${orders.createdAt})`, revenue: sql<string>`COALESCE(SUM(${orders.total}), 0)` }).from(orders).where(and(eq(orders.storeId, storeId), eq(orders.status, "delivered"), gte(orders.createdAt, thirtyDaysAgo))).groupBy(sql`DATE(${orders.createdAt})`).orderBy(sql`DATE(${orders.createdAt})`),
  ]);

  const totalProducts = Number(productResult[0]?.count ?? 0);
  const totalOrders = Number(orderResult[0]?.count ?? 0);
  const totalRevenue = Number(revenueResult[0]?.revenue ?? 0);
  const activeLandingPages = Number(landingPageResult[0]?.count ?? 0);
  const recentOrders = recentOrdersResult ?? [];
  const recentActivity = activityResult ?? [];
  const salesOverTime = salesOverTimeResult ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {session.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          description={totalProducts === 0 ? "No products yet" : `${totalProducts} products in catalog`}
        />
        <StatsCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          description={totalOrders === 0 ? "No orders yet" : `${totalOrders} orders received`}
        />
        <StatsCard
          title="Active Landing Pages"
          value={activeLandingPages}
          icon={FileText}
          description={activeLandingPages === 0 ? "No pages published" : `${activeLandingPages} pages live`}
        />
        <StatsCard
          title="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={TrendingUp}
          description={totalRevenue === 0 ? "Start selling!" : "Total delivered revenue"}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <SalesChart data={salesOverTime} />
        <ActivityFeed activities={recentActivity} />
      </div>

      <RecentOrdersWidget orders={recentOrders} />
    </div>
  );
}
