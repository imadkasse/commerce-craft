import { requirePageActiveStore } from "@/lib/auth/guards";
import { listOrdersForStore, getOrderStatsForStore } from "@/lib/server/orders";
import { OrdersView } from "./orders-view";

export default async function OrdersPage() {
  const access = await requirePageActiveStore("/orders");
  const [initial, stats] = await Promise.all([
    listOrdersForStore(access.store.id, { page: 1, limit: 20 }),
    getOrderStatsForStore(access.store.id),
  ]);
  return <OrdersView initial={{ ...initial, stats }} />;
}
