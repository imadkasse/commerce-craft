import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadStorefrontData } from "@/lib/storefront-data";
import { renderStorefrontHtml } from "@/components/storefront/storefront-html";
import { normalizeTheme } from "@/lib/store-theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadStorefrontData({ slug });
  if (!data) return { title: "Store Not Found" };

  return {
    title: data.store.name,
    description: data.store.description ?? undefined,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadStorefrontData({ slug });
  if (!data) notFound();

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: renderStorefrontHtml({
          store: {
            name: data.store.name,
            slug: data.store.slug,
            description: data.store.description,
            logoUrl: data.store.logoUrl,
          },
          theme: normalizeTheme(data.store.theme),
          products: data.products,
        }),
      }}
    />
  );
}
