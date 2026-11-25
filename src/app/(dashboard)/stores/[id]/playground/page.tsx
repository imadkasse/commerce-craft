import { requirePageStoreAccess } from "@/lib/auth/guards";
import StorePlaygroundPageClient from "./store-playground-client";

type StorePlaygroundPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StorePlaygroundPage({
  params,
}: StorePlaygroundPageProps) {
  const { id } = await params;
  const returnPath = `/stores/${encodeURIComponent(id)}/playground`;
  await requirePageStoreAccess(id, returnPath);

  return <StorePlaygroundPageClient />;
}
