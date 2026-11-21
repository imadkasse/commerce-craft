"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { productsService } from "@/services/products.service";
import type {
  ColorWithSizes,
  Product,
  ProductPayload,
} from "@/services/products.service";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<ColorWithSizes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await productsService.getProductWithColors(id);
        setProduct(data.product);
        setColors(data.colors);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (data: {
    product: ProductPayload;
    colors: ColorWithSizes[];
  }) => {
    await productsService.updateProductVariants(id, data);

    router.push("/products");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
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
            {error || "Product not found"}
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-gray-500">Update &quot;{product.name}&quot;</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <ProductForm
          initialProduct={{
            ...product,
            price: product.price.toString(),
            compareAtPrice: product.compareAtPrice?.toString(),
          }}
          initialColors={colors}
          onSubmit={handleSubmit}
          isEditing
        />
      </div>
    </div>
  );
}
