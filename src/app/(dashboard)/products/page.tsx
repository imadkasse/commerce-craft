import { requirePageActiveStore } from "@/lib/auth/guards";
import { listProductsForStore } from "@/lib/server/products";
import { ProductsView } from "./products-view";

export default async function ProductsPage() {
  const access = await requirePageActiveStore("/products");
  const initial = await listProductsForStore(access.store.id, {
    page: 1,
    limit: 20,
  });
  return <ProductsView initial={initial} />;
}
