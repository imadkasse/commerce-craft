import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listProductsForStore } from "@/lib/server/products";
import { ProductsView } from "./products-view";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session?.storeId) redirect("/login");
  const initial = await listProductsForStore(session.storeId, {
    page: 1,
    limit: 20,
  });
  return <ProductsView initial={initial} />;
}
