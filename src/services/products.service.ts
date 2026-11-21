/**
 * Products domain service.
 *
 * Owns every request/response detail for the products pages (list, CRUD,
 * colors, sizes, and the composite "product with variants" flows) so the UI
 * only deals with state and rendering.
 */

import { ApiError, apiFetch, withQuery } from "@/services/http";
import type { Paginated } from "@/services/types";

export type ProductType = "CLOTHING" | "GENERAL";

/** A product as returned by the API. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: ProductType;
  price: number;
  compareAtPrice?: number;
  images: string[];
  tags: string[];
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Raw color row as returned by the API. */
export interface ProductColorRecord {
  id: string;
  productId?: string;
  name: string;
  hexCode: string;
  stockQuantity: number;
}

/** Raw size row as returned by the API. */
export interface ProductSizeRecord {
  id: string;
  productId?: string;
  colorId: string;
  sizeLabel: string;
  stockQuantity: number;
}

/** Color shape consumed by the product form (color + nested sizes). */
export interface ProductSize {
  id?: string;
  sizeLabel: string;
  stockQuantity: number;
}

export interface ProductColor {
  id?: string;
  name: string;
  hexCode: string;
  stockQuantity: number;
  sizes: ProductSize[];
}

/** A color assembled together with its sizes (edit page / form). */
export type ColorWithSizes = ProductColor;

/** Form state for the product form. */
export interface ProductFormValues {
  id?: string;
  name: string;
  description: string;
  type: ProductType | "";
  price: string;
  compareAtPrice: string;
  images: string[];
  tags: string[];
  stockQuantity: number;
  isActive: boolean;
}

/** Payload accepted by the create/update endpoints. */
export interface ProductInput {
  id?: string;
  name: string;
  description?: string;
  type: ProductType | "";
  price: number;
  compareAtPrice?: number;
  images?: string[];
  tags?: string[];
  stockQuantity?: number;
  isActive?: boolean;
}

/** Product body after the form has been normalized for submission. */
export type ProductPayload = Omit<
  ProductFormValues,
  "price" | "compareAtPrice"
> & {
  price: number;
  compareAtPrice?: number;
};

export interface ColorInput {
  name: string;
  hexCode: string;
  stockQuantity: number;
}

export interface SizeInput {
  colorId?: string;
  sizeLabel: string;
  stockQuantity: number;
}

interface ProductsListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductDetail {
  product: Product;
  colors: ProductColorRecord[];
  sizes: ProductSizeRecord[];
}

interface ProductResponse {
  product: Product;
}

interface ColorResponse {
  color: ProductColorRecord;
}

interface SizeResponse {
  size: ProductSizeRecord;
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

export interface CreateProductWithVariantsInput {
  product: ProductInput;
  colors: ColorWithSizes[];
}

export interface UpdateProductVariantsInput {
  product: ProductInput;
  colors: ColorWithSizes[];
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const data = err.data;
    if (data !== null && typeof data === "object" && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string" && message) return message;
    }
    return fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export async function list(
  params: ListProductsParams = {},
): Promise<Paginated<Product>> {
  const res = await apiFetch<ProductsListResponse>(
    withQuery("/api/products", {
      page: params.page,
      limit: params.limit,
      type: params.type,
      search: params.search,
    }),
  );

  return {
    items: res.products,
    total: res.total,
    page: res.page,
    limit: res.limit,
  };
}

export async function get(id: string): Promise<ProductDetail> {
  const res = await apiFetch<ProductDetail>(`/api/products/${id}`);

  return {
    product: res.product,
    colors: res.colors || [],
    sizes: res.sizes || [],
  };
}

export async function create(product: ProductInput): Promise<ProductResponse> {
  try {
    return await apiFetch<ProductResponse>("/api/products", {
      method: "POST",
      body: product,
    });
  } catch (err) {
    throw new Error(apiErrorMessage(err, "Failed to create product"));
  }
}

export async function update(
  id: string,
  product: ProductInput,
): Promise<ProductResponse> {
  try {
    return await apiFetch<ProductResponse>(`/api/products/${id}`, {
      method: "PUT",
      body: product,
    });
  } catch (err) {
    throw new Error(apiErrorMessage(err, "Failed to update product"));
  }
}

export async function remove(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/products/${id}`, {
    method: "DELETE",
  });
}

export async function listColors(id: string): Promise<ProductColorRecord[]> {
  const res = await apiFetch<{ colors: ProductColorRecord[] }>(
    `/api/products/${id}/colors`,
  );
  return res.colors || [];
}

export async function listSizes(id: string): Promise<ProductSizeRecord[]> {
  const res = await apiFetch<{ sizes: ProductSizeRecord[] }>(
    `/api/products/${id}/sizes`,
  );
  return res.sizes || [];
}

export async function createColor(
  id: string,
  color: ColorInput,
): Promise<ProductColorRecord> {
  const res = await apiFetch<ColorResponse>(`/api/products/${id}/colors`, {
    method: "POST",
    body: color,
  });
  return res.color;
}

export async function createSize(
  id: string,
  size: SizeInput,
): Promise<ProductSizeRecord> {
  const res = await apiFetch<SizeResponse>(`/api/products/${id}/sizes`, {
    method: "POST",
    body: size,
  });
  return res.size;
}

/**
 * Loads a product plus its colors and sizes in parallel and assembles the
 * colors-with-sizes shape used by the edit form. Matches the previous page
 * behavior: a failed product request rejects with "Failed to load product",
 * while failed colors/sizes requests fall back to empty lists.
 */
export async function getProductWithColors(id: string): Promise<{
  product: Product;
  colors: ColorWithSizes[];
}> {
  const [productResult, colorsResult, sizesResult] = await Promise.allSettled([
    get(id),
    listColors(id),
    listSizes(id),
  ]);

  if (productResult.status === "rejected") {
    throw new Error("Failed to load product");
  }

  const colorsData =
    colorsResult.status === "fulfilled" ? colorsResult.value : [];
  const sizesData = sizesResult.status === "fulfilled" ? sizesResult.value : [];

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

  return { product: productResult.value.product, colors: colorsWithSizes };
}

/**
 * Creates a product and, for clothing products, its colors and sizes in order.
 * Color creation failures skip that color's sizes (previous behavior) and size
 * failures are ignored.
 */
export async function createProductWithVariants({
  product,
  colors,
}: CreateProductWithVariantsInput): Promise<Product> {
  const { product: created } = await create(product);

  if (product.type === "CLOTHING" && colors.length > 0) {
    for (const color of colors) {
      let createdColor: ProductColorRecord | undefined;
      try {
        createdColor = await createColor(created.id, {
          name: color.name,
          hexCode: color.hexCode,
          stockQuantity: color.stockQuantity,
        });
      } catch {
        createdColor = undefined;
      }

      if (createdColor && color.sizes.length > 0) {
        for (const size of color.sizes) {
          try {
            await createSize(created.id, {
              colorId: createdColor.id,
              sizeLabel: size.sizeLabel,
              stockQuantity: size.stockQuantity,
            });
          } catch {
            // Previous behavior ignored failed size creation.
          }
        }
      }
    }
  }

  return created;
}

/**
 * Updates a product and, for clothing products, appends new colors/sizes.
 * Matches the previous page semantics exactly: update the product first, then
 * create a color only when it already has an id, then create sizes only when
 * they do not have an id. Variant failures are ignored.
 */
export async function updateProductVariants(
  id: string,
  { product, colors }: UpdateProductVariantsInput,
): Promise<void> {
  await update(id, product);

  if (product.type === "CLOTHING") {
    for (const color of colors) {
      if (color.id) {
        try {
          await createColor(id, {
            name: color.name,
            hexCode: color.hexCode,
            stockQuantity: color.stockQuantity,
          });
        } catch {
          // Previous behavior ignored failed color creation.
        }
      }

      for (const size of color.sizes) {
        if (!size.id) {
          try {
            await createSize(id, {
              colorId: color.id,
              sizeLabel: size.sizeLabel,
              stockQuantity: size.stockQuantity,
            });
          } catch {
            // Previous behavior ignored failed size creation.
          }
        }
      }
    }
  }
}

/** Sums clothing stock, preferring per-size stock when sizes exist. */
export function totalClothingStock(
  colors: readonly ProductColor[],
): number {
  return colors.reduce((sum, c) => {
    if (c.sizes.length > 0) {
      return sum + c.sizes.reduce((s, sz) => s + sz.stockQuantity, 0);
    }
    return sum + c.stockQuantity;
  }, 0);
}

/** Validates the product form using the existing rules/messages. */
export function validateProductForm(
  form: Pick<ProductFormValues, "name" | "type" | "price">,
  colors: readonly ProductColor[],
): string | null {
  if (!form.name.trim()) return "Product name is required";
  if (!form.type) return "Product type is required";
  if (!form.price || parseFloat(form.price) < 0) {
    return "Valid price is required";
  }
  if (form.type === "CLOTHING" && colors.length === 0) {
    return "Add at least one color for clothing products";
  }
  return null;
}

/** Normalizes form state into the payload sent to the API. */
export function toProductPayload(
  form: ProductFormValues,
  totalStock: number,
): ProductPayload {
  return {
    ...form,
    price: parseFloat(form.price),
    compareAtPrice: form.compareAtPrice
      ? parseFloat(form.compareAtPrice)
      : undefined,
    stockQuantity: form.type === "CLOTHING" ? totalStock : form.stockQuantity,
  };
}

export const productsService = {
  list,
  get,
  create,
  update,
  remove,
  listColors,
  listSizes,
  createColor,
  createSize,
  getProductWithColors,
  createProductWithVariants,
  updateProductVariants,
  totalClothingStock,
  validateProductForm,
  toProductPayload,
};
