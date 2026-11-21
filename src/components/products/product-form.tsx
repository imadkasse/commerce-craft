"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  X,
  Package,
  Shirt,
  Loader2,
  ImageIcon,
} from "lucide-react";
import {
  toProductPayload,
  totalClothingStock,
  validateProductForm,
} from "@/services/products.service";
import type {
  ColorWithSizes,
  ProductColor,
  ProductFormValues,
  ProductPayload,
  ProductSize,
} from "@/services/products.service";

interface ProductFormProps {
  initialProduct?: Partial<ProductFormValues>;
  initialColors?: ColorWithSizes[];
  initialSizes?: { colorId: string; sizeLabel: string; stockQuantity: number }[];
  onSubmit: (data: {
    product: ProductPayload;
    colors: ColorWithSizes[];
  }) => Promise<void>;
  isEditing?: boolean;
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Custom"];

export function ProductForm({
  initialProduct,
  initialColors,
  onSubmit,
  isEditing = false,
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<ProductFormValues>({
    name: initialProduct?.name || "",
    description: initialProduct?.description || "",
    type: initialProduct?.type || "",
    price: initialProduct?.price?.toString() || "",
    compareAtPrice: initialProduct?.compareAtPrice?.toString() || "",
    images: initialProduct?.images || [],
    tags: initialProduct?.tags || [],
    stockQuantity: initialProduct?.stockQuantity || 0,
    isActive: initialProduct?.isActive ?? true,
  });

  const [colors, setColors] = useState<ColorWithSizes[]>(
    initialColors || []
  );

  const [tagInput, setTagInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const updateForm = useCallback(
    (field: keyof ProductFormValues, value: unknown) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addImage = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    updateForm("images", [...form.images, url]);
    setImageUrlInput("");
  };

  const removeImage = (idx: number) => {
    updateForm(
      "images",
      form.images.filter((_, i) => i !== idx)
    );
  };

  const addTag = () => {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !form.tags.includes(t));
    if (tags.length) {
      updateForm("tags", [...form.tags, ...tags]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    updateForm(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  };

  const addColor = () => {
    setColors((prev) => [
      ...prev,
      { name: "", hexCode: "#000000", stockQuantity: 0, sizes: [] },
    ]);
  };

  const updateColor = (
    idx: number,
    field: keyof ProductColor,
    value: unknown
  ) => {
    setColors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const removeColor = (idx: number) => {
    setColors((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSize = (colorIdx: number) => {
    setColors((prev) =>
      prev.map((c, i) =>
        i === colorIdx
          ? { ...c, sizes: [...c.sizes, { sizeLabel: "M", stockQuantity: 0 }] }
          : c
      )
    );
  };

  const updateSize = (
    colorIdx: number,
    sizeIdx: number,
    field: keyof ProductSize,
    value: unknown
  ) => {
    setColors((prev) =>
      prev.map((c, i) =>
        i === colorIdx
          ? {
              ...c,
              sizes: c.sizes.map((s, j) =>
                j === sizeIdx ? { ...s, [field]: value } : s
              ),
            }
          : c
      )
    );
  };

  const removeSize = (colorIdx: number, sizeIdx: number) => {
    setColors((prev) =>
      prev.map((c, i) =>
        i === colorIdx
          ? { ...c, sizes: c.sizes.filter((_, j) => j !== sizeIdx) }
          : c
      )
    );
  };

  const totalStock = totalClothingStock(colors);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateProductForm(form, colors);
    if (validationError) return setError(validationError);

    setLoading(true);
    try {
      const productData = toProductPayload(form, totalStock);
      await onSubmit({ product: productData, colors });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-950">Basic Information</h2>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              placeholder="e.g. Classic T-Shirt"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => updateForm("price", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            placeholder="Product description..."
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
          />
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Label htmlFor="compareAt">Compare At Price ($)</Label>
          <Input
            id="compareAt"
            type="number"
            step="0.01"
            min="0"
            placeholder="Optional"
            value={form.compareAtPrice}
            onChange={(e) => updateForm("compareAtPrice", e.target.value)}
          />
        </div>
      </div>

      {/* Product Type Selector */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-950">Product Type</h2>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => updateForm("type", "CLOTHING")}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${
              form.type === "CLOTHING"
                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                form.type === "CLOTHING"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Shirt className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-950">Clothing</p>
              <p className="mt-1 text-sm text-gray-500">
                Products with colors and sizes
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateForm("type", "GENERAL")}
            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${
              form.type === "GENERAL"
                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                form.type === "GENERAL"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-950">General Product</p>
              <p className="mt-1 text-sm text-gray-500">
                Simple stock quantity
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Clothing Stock */}
      {form.type === "CLOTHING" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-950">
              Clothing Stock
            </h2>
            <Badge variant="secondary">
              Total: {totalStock} units
            </Badge>
          </div>
          <Separator />

          {colors.map((color, ci) => (
            <Card key={ci}>
              <CardContent className="p-4">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={color.hexCode}
                      onChange={(e) => updateColor(ci, "hexCode", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
                    />
                    <Input
                      placeholder="Color name"
                      value={color.name}
                      onChange={(e) => updateColor(ci, "name", e.target.value)}
                      className="max-w-[200px]"
                    />
                    {color.sizes.length === 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap text-xs text-gray-500">
                          Stock:
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={color.stockQuantity}
                          onChange={(e) =>
                            updateColor(
                              ci,
                              "stockQuantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-8 w-20"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => removeColor(ci)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sizes */}
                <div className="ml-13 space-y-2">
                  {color.sizes.map((size, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <Select
                        value={size.sizeLabel}
                        onChange={(e) =>
                          updateSize(ci, si, "sizeLabel", e.target.value)
                        }
                        className="h-8 w-28"
                      >
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                      <Label className="whitespace-nowrap text-xs text-gray-500">
                        Stock:
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={size.stockQuantity}
                        onChange={(e) =>
                          updateSize(
                            ci,
                            si,
                            "stockQuantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-8 w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => removeSize(ci, si)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600"
                    onClick={() => addSize(ci)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Size
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            className="border-dashed"
            onClick={addColor}
          >
            <Plus className="h-4 w-4" />
            Add Color
          </Button>
        </div>
      )}

      {/* General Stock */}
      {form.type === "GENERAL" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-950">Stock</h2>
          <Separator />
          <div className="max-w-xs space-y-2">
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) =>
                updateForm("stockQuantity", parseInt(e.target.value) || 0)
              }
            />
          </div>
        </div>
      )}

      {/* Images */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-950">Images</h2>
        <Separator />
        <div className="flex gap-2">
          <Input
            placeholder="Image URL"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImage();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
            Add
          </Button>
        </div>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {form.images.map((img, idx) => (
              <div key={idx} className="group relative">
                <img
                  src={img}
                  alt={`Product ${idx + 1}`}
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {form.images.length === 0 && (
          <p className="text-sm text-gray-400">No images added yet</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-950">Tags</h2>
        <Separator />
        <div className="flex gap-2">
          <Input
            placeholder="Comma-separated tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Add
          </Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Product"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
