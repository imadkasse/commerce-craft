import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dashboardService } from "@/services/dashboard.service";
import { Package, ShoppingCart, FileText, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentOrdersWidget } from "@/components/dashboard/recent-orders";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.storeId) redirect("/login");

  const {
    totalProducts,
    totalOrders,
    totalRevenue,
    activeLandingPages,
    recentOrders,
    recentActivity,
    salesOverTime,
  } = await dashboardService.getDashboardOverview(session.storeId);

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
