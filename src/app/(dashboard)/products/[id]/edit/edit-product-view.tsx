"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { productsService } from "@/services/products.service";
import type {
  ColorWithSizes,
  ProductFormValues,
  ProductPayload,
} from "@/services/products.service";

export interface EditProductViewProps {
  id: string;
  initialProduct: Partial<ProductFormValues>;
  initialColors: ColorWithSizes[];
}

export function EditProductView({
  id,
  initialProduct,
  initialColors,
}: EditProductViewProps) {
  const router = useRouter();

  const handleSubmit = async (data: {
    product: ProductPayload;
    colors: ColorWithSizes[];
  }) => {
    await productsService.updateProductVariants(id, data);

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
          <h1 className="text-2xl font-bold text-gray-950">Edit Product</h1>
          <p className="text-gray-500">Update &quot;{initialProduct.name}&quot;</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <ProductForm
          initialProduct={initialProduct}
          initialColors={initialColors}
          onSubmit={handleSubmit}
          isEditing
        />
      </div>
    </div>
  );
}
