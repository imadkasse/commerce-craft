import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listOrdersForStore, getOrderStatsForStore } from "@/lib/server/orders";
import { OrdersView } from "./orders-view";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session?.storeId) redirect("/login");
  const [initial, stats] = await Promise.all([
    listOrdersForStore(session.storeId, { page: 1, limit: 20 }),
    getOrderStatsForStore(session.storeId),
  ]);
  return <OrdersView initial={{ ...initial, stats }} />;
}
