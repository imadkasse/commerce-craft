import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  landingPages,
  products,
  productColors,
  productSizes,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Metadata } from "next";
import { OrderForm } from "@/components/landing-pages/order-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const [page] = await db
    .select({
      title: landingPages.title,
      productName: products.name,
      productDescription: products.description,
      productImages: products.images,
    })
    .from(landingPages)
    .leftJoin(products, eq(products.landingPageId, landingPages.id))
    .where(
      and(eq(landingPages.slug, slug), eq(landingPages.status, "published"))
    )
    .limit(1);

  if (!page) {
    return { title: "Page Not Found" };
  }

  const images = Array.isArray(page.productImages)
    ? page.productImages.filter(Boolean)
    : [];

  return {
    title: `${page.title} | CommerceCraft`,
    description:
      page.productDescription || page.productName || page.title,
    openGraph: {
      title: page.title,
      description: page.productDescription ?? undefined,
      images: images.length > 0 ? images : undefined,
    },
  };
}

export default async function LandingPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [landingPage] = await db
    .select()
    .from(landingPages)
    .where(
      and(eq(landingPages.slug, slug), eq(landingPages.status, "published"))
    )
    .limit(1);

  if (!landingPage) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.landingPageId, landingPage.id))
    .limit(1);

  let colors: (typeof productColors.$inferSelect)[] = [];
  let sizes: (typeof productSizes.$inferSelect)[] = [];

  if (product?.type === "CLOTHING") {
    [colors, sizes] = await Promise.all([
      db
        .select()
        .from(productColors)
        .where(eq(productColors.productId, product.id))
        .orderBy(productColors.sortOrder),
      db
        .select()
        .from(productSizes)
        .where(eq(productSizes.productId, product.id))
        .orderBy(productSizes.sortOrder),
    ]);
  }

  const customizations = landingPage.customizations ?? {};
  const colorsMap = customizations.colors ?? {};
  const primaryColor = colorsMap.primary ?? colorsMap["primary"] ?? "#4f46e5";
  const bgColor =
    colorsMap.background ?? colorsMap["background"] ?? "#ffffff";
  const fontFamily = customizations.font ?? "inherit";

  return (
    <main>
      <style>{`
        :root {
          --lp-primary: ${primaryColor};
          --lp-bg: ${bgColor};
          --lp-font: ${fontFamily};
        }
        .lp-content {
          font-family: var(--lp-font);
        }
      `}</style>

      <div
        className="lp-content"
        style={{ backgroundColor: bgColor }}
        dangerouslySetInnerHTML={{
          __html: landingPage.generatedCode ?? "",
        }}
      />

      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Passer commande
          </h2>
          <OrderForm
            product={product ?? null}
            landingPageSlug={slug}
            colors={colors}
            sizes={sizes}
          />
        </div>
      </section>
    </main>
  );
}
