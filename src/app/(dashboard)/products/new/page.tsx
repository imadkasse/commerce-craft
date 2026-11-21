"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { productsService } from "@/services/products.service";
import type {
  ColorWithSizes,
  ProductPayload,
} from "@/services/products.service";

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    product: ProductPayload;
    colors: ColorWithSizes[];
  }) => {
    await productsService.createProductWithVariants(data);

    router.push("/products");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Create Product</h1>
          <p className="text-gray-500">Add a new product to your catalog</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <ProductForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
