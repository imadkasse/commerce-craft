import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getTokenFromRequest(request);
    if (!payload?.storeId) {
      return NextResponse.json({ error: "No store" }, { status: 401 });
    }

    const [existing] = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.id, id), eq(landingPages.storeId, payload.storeId)));

    if (!existing) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    if (existing.status === "published") {
      return NextResponse.json({ landingPage: existing });
    }

    const [updated] = await db
      .update(landingPages)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(landingPages.id, id))
      .returning();

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: payload.storeId,
      action: "landing_page.published",
      details: { landingPageId: id, title: existing.title },
    });

    return NextResponse.json({ landingPage: updated });
  } catch (error) {
    console.error("LandingPage PUBLISH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
