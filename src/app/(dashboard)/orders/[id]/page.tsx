import { notFound } from "next/navigation";
import { requirePageActiveStore } from "@/lib/auth/guards";
import { getOrderForStore, getShippingProvidersForStore } from "@/lib/server/orders";
import { OrderDetailView } from "./order-detail-view";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requirePageActiveStore(`/orders/${id}`);

  const [detail, providers] = await Promise.all([
    getOrderForStore(access.store.id, id),
    getShippingProvidersForStore(access.store.id),
  ]);

  if (!detail) notFound();

  return <OrderDetailView order={detail.order} providers={providers} />;
}
