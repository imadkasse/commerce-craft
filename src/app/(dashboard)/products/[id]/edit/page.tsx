"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";

interface Product {
  id: string;
  name: string;
  description: string;
  type: "CLOTHING" | "GENERAL";
  price: number;
  compareAtPrice?: number;
  images: string[];
  tags: string[];
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ColorWithSizes {
  id?: string;
  name: string;
  hexCode: string;
  stockQuantity: number;
  sizes: { id?: string; sizeLabel: string; stockQuantity: number }[];
}

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
        const [productRes, colorsRes, sizesRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch(`/api/products/${id}/colors`),
          fetch(`/api/products/${id}/sizes`),
        ]);

        if (!productRes.ok) throw new Error("Failed to load product");
        const productData = await productRes.json();
        setProduct(productData.product);

        let colorsData: { id: string; name: string; hexCode: string; stockQuantity: number }[] = [];
        if (colorsRes.ok) {
          const cd = await colorsRes.json();
          colorsData = cd.colors || [];
        }

        let sizesData: { colorId: string; sizeLabel: string; stockQuantity: number }[] = [];
        if (sizesRes.ok) {
          const sd = await sizesRes.json();
          sizesData = sd.sizes || [];
        }

        const colorsWithSizes: ColorWithSizes[] = colorsData.map((color) => ({
          id: color.id,
          name: color.name,
          hexCode: color.hexCode,
          stockQuantity: color.stockQuantity,
          sizes: sizesData
            .filter((s) => s.colorId === color.id)
            .map((s) => ({
              sizeLabel: s.sizeLabel,
              stockQuantity: s.stockQuantity,
            })),
        }));

        setColors(colorsWithSizes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
    colors: ColorWithSizes[];
  }) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.product),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Failed to update product");
    }

    if (data.product.type === "CLOTHING") {
      for (const color of data.colors) {
        if (color.id) {
          await fetch(`/api/products/${id}/colors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: color.name,
              hexCode: color.hexCode,
              stockQuantity: color.stockQuantity,
            }),
          });
        }

        for (const size of color.sizes) {
          if (!size.id) {
            await fetch(`/api/products/${id}/sizes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                colorId: color.id,
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
