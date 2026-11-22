import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getOrderForStore, getShippingProvidersForStore } from "@/lib/server/orders";
import { OrderDetailView } from "./order-detail-view";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  if (!session?.storeId) redirect("/login");

  const [detail, providers] = await Promise.all([
    getOrderForStore(session.storeId, id),
    getShippingProvidersForStore(session.storeId),
  ]);

  if (!detail) notFound();

  return <OrderDetailView order={detail.order} providers={providers} />;
}
