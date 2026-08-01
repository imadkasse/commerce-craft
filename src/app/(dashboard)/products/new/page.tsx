"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    product: {
      name: string;
      description: string;
      type: "CLOTHING" | "GENERAL" | "";
      price: number;
      compareAtPrice?: number;
      images: string[];
      tags: string[];
      stockQuantity: number;
      isActive: boolean;
    };
    colors: {
      name: string;
      hexCode: string;
      stockQuantity: number;
      sizes: { sizeLabel: string; stockQuantity: number }[];
    }[];
  }) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.product),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Failed to create product");
    }

    const { product } = await res.json();

    if (data.product.type === "CLOTHING" && data.colors.length > 0) {
      for (const color of data.colors) {
        const colorRes = await fetch(`/api/products/${product.id}/colors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: color.name,
            hexCode: color.hexCode,
            stockQuantity: color.stockQuantity,
          }),
        });

        if (colorRes.ok && color.sizes.length > 0) {
          const { color: createdColor } = await colorRes.json();
          for (const size of color.sizes) {
            await fetch(`/api/products/${product.id}/sizes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                colorId: createdColor.id,
                sizeLabel: size.sizeLabel,
                stockQuantity: size.stockQuantity,
              }),
            });
          }
        }
      }
    }

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
