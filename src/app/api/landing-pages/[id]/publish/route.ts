import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { landingPages, activityLogs } from "@/lib/db/schema";
import {
  requireActiveStore,
  routeAuthErrorResponse,
} from "@/lib/auth/guards";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireActiveStore(request);
    const storeId = access.store.id;

    const [existing] = await db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.id, id), eq(landingPages.storeId, storeId)));

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
      userId: access.auth.user.id,
      storeId,
      action: "landing_page.published",
      details: { landingPageId: id, title: existing.title },
    });

    return NextResponse.json({ landingPage: updated });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
