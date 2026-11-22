import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { landingPages, products, stores } from "@/lib/db/schema";
import type { StoreTheme } from "@/lib/store-theme";

export interface StorefrontData {
  store: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    theme: Partial<StoreTheme>;
    status: "draft" | "published";
  };
  products: Array<{
    id: string;
    name: string;
    price: string;
    image?: string | null;
    landingPageUrl?: string | null;
  }>;
}

function formatPrice(price: string): string {
  return Number(price).toLocaleString("en-US");
}

export async function loadStorefrontData(params: {
  slug?: string;
  domain?: string;
}): Promise<StorefrontData | null> {
  const conditions = [eq(stores.status, "published")];

  if (params.slug) {
    conditions.push(eq(stores.slug, params.slug));
  } else if (params.domain) {
    conditions.push(eq(stores.domain, params.domain.toLowerCase()));
  } else {
    return null;
  }

  const [store] = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      description: stores.description,
      logoUrl: stores.logoUrl,
      theme: stores.theme,
      status: stores.status,
    })
    .from(stores)
    .where(and(...conditions))
    .limit(1);

  if (!store) return null;

  const storeProducts = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      images: products.images,
    })
    .from(products)
    .where(and(eq(products.storeId, store.id), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))
    .limit(24);

  const productIds = storeProducts.map((product) => product.id);

  const landingSlugs = new Map<string, string>();
  if (productIds.length > 0) {
    const publishedPages = await db
      .select({ productId: landingPages.productId, slug: landingPages.slug })
      .from(landingPages)
      .where(
        and(
          inArray(landingPages.productId, productIds),
          eq(landingPages.status, "published")
        )
      );

    for (const page of publishedPages) {
      if (page.productId) {
        landingSlugs.set(page.productId, page.slug);
      }
    }
  }

  return {
    store,
    products: storeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: formatPrice(product.price),
      image: product.images?.[0] ?? null,
      landingPageUrl: landingSlugs.get(product.id)
        ? `/lp/${landingSlugs.get(product.id)}`
        : null,
    })),
  };
}
