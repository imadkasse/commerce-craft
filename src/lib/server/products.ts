/**
 * Server-only products data loaders.
 *
 * These mirror the read queries in `src/app/api/products/route.ts` and
 * `src/app/api/products/[id]/route.ts` so server components can render the
 * first paint without an extra client-side API round trip.
 */

import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productColors, productSizes, products } from "@/lib/db/schema";
import type { ColorWithSizes, Product } from "@/services/products.service";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

type ProductRow = typeof products.$inferSelect;

/** Converts a drizzle row into the JSON-shaped `Product` the UI expects. */
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    type: row.type,
    price: row.price,
    compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
    images: row.images,
    tags: row.tags,
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProductsForStore(
  storeId: string,
  params: ListProductsParams = {},
): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(products.storeId, storeId)];
  if (params.type && (params.type === "CLOTHING" || params.type === "GENERAL")) {
    conditions.push(eq(products.type, params.type));
  }
  if (params.search) {
    conditions.push(like(products.name, `%${params.search}%`));
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where),
  ]);

  return {
    items: rows.map(toProduct),
    total: Number(countResult[0]?.count || 0),
    page,
    limit,
  };
}

export async function getProductForStore(
  storeId: string,
  id: string,
): Promise<{ product: Product; colors: ColorWithSizes[] } | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.storeId, storeId)));

  if (!product) return null;

  const [colorRows, sizeRows] = await Promise.all([
    db
      .select()
      .from(productColors)
      .where(eq(productColors.productId, id))
      .orderBy(productColors.sortOrder),
    db
      .select()
      .from(productSizes)
      .where(eq(productSizes.productId, id))
      .orderBy(productSizes.sortOrder),
  ]);

  const colors: ColorWithSizes[] = colorRows.map((color) => ({
    id: color.id,
    name: color.name,
    hexCode: color.hexCode,
    stockQuantity: color.stockQuantity,
    sizes: sizeRows
      .filter((size) => size.colorId === color.id)
      .map((size) => ({
        id: size.id,
        sizeLabel: size.sizeLabel,
        stockQuantity: size.stockQuantity,
      })),
  }));

  return { product: toProduct(product), colors };
}
