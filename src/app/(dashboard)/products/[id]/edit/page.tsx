import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getProductForStore } from "@/lib/server/products";
import { EditProductView } from "./edit-product-view";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session?.storeId) redirect("/login");

  const data = await getProductForStore(session.storeId, id);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Edit Product</h1>
          </div>
        </div>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Product not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <EditProductView
      id={id}
      initialProduct={{
        ...data.product,
        price: data.product.price.toString(),
        compareAtPrice: data.product.compareAtPrice?.toString(),
      }}
      initialColors={data.colors}
    />
  );
}
