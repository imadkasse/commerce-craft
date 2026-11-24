import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, landingPages, productColors, productSizes, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { generateSections } from "@/lib/ai/agent";
import { compileSections } from "@/lib/ai/sections/compiler";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, marketingAngles } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, payload.storeId)));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let colors: { name: string; hexCode: string }[] = [];
    let sizes: { sizeLabel: string; colorName: string }[] = [];

    if (product.type === "CLOTHING") {
      colors = await db
        .select({ name: productColors.name, hexCode: productColors.hexCode })
        .from(productColors)
        .where(eq(productColors.productId, product.id));

      const sizesWithColors = await db
        .select({
          sizeLabel: productSizes.sizeLabel,
          colorName: productColors.name,
        })
        .from(productSizes)
        .leftJoin(productColors, eq(productSizes.colorId, productColors.id))
        .where(eq(productSizes.productId, product.id));

      sizes = sizesWithColors.filter((s) => s.colorName !== null) as {
        sizeLabel: string;
        colorName: string;
      }[];
    }

    const productData = {
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : undefined,
      images: product.images,
      tags: product.tags,
      type: product.type as "CLOTHING" | "GENERAL",
      colors,
      sizes,
    };

    const { sections } = await generateSections({ product: productData, marketingAngles });
    const { html } = compileSections(sections);

    const slug = generateSlug(product.name) + "-" + Date.now().toString(36);

    const [landingPage] = await db
      .insert(landingPages)
      .values({
        slug,
        title: product.name,
        storeId: payload.storeId,
        productId: product.id,
        generatedCode: html,
        status: "draft",
        customizations: {},
        sections,
      })
      .returning();

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: payload.storeId,
      action: "landing_page_generated",
      details: {
        productId: product.id,
        landingPageId: landingPage.id,
        productName: product.name,
      },
    });

    return NextResponse.json({ landingPage }, { status: 201 });
  } catch (error) {
    console.error("Generate page error:", error);
    return NextResponse.json(
      { error: "Failed to generate landing page" },
      { status: 500 },
    );
  }
}
