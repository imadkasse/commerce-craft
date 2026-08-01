import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    const domain = url.searchParams.get("domain");

    const result: { slugAvailable?: boolean; domainAvailable?: boolean } = {};

    if (slug && slug.trim().length > 0) {
      const value = slug.trim();
      if (!SLUG_REGEX.test(value)) {
        result.slugAvailable = false;
      } else {
        const existing = await db.select().from(stores).where(eq(stores.slug, value));
        result.slugAvailable = existing.length === 0;
      }
    }

    if (domain && domain.trim().length > 0) {
      const value = normalizeDomain(domain);
      const existing = await db.select().from(stores).where(eq(stores.domain, value));
      result.domainAvailable = existing.length === 0;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Stores check-domain error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
