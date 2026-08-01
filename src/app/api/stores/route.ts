import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores, teamMembers, activityLogs } from "@/lib/db/schema";
import { getTokenFromRequest } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";
import type { JWTPayload } from "@/lib/auth/jwt";
import type { StoreTheme } from "@/lib/store-theme";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "store";
}

async function resolveUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;
  for (;;) {
    if (attempt > 0) candidate = `${base}-${attempt + 1}`;
    const existing = await db.select().from(stores).where(eq(stores.slug, candidate));
    if (existing.length === 0) return candidate;
    attempt++;
  }
}

export async function GET(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (payload.role === "SUPERADMIN") {
      const allStores = await db.select().from(stores).orderBy(desc(stores.createdAt));
      return NextResponse.json({
        stores: allStores.map((store) => ({
          ...store,
          role: "SUPERADMIN",
          isOwner: store.ownerId === payload.userId,
        })),
      });
    }

    const rows = await db
      .select({ store: stores, role: teamMembers.role })
      .from(teamMembers)
      .innerJoin(stores, eq(stores.id, teamMembers.storeId))
      .where(eq(teamMembers.userId, payload.userId))
      .orderBy(desc(stores.createdAt));

    return NextResponse.json({
      stores: rows.map(({ store, role }) => ({
        ...store,
        role,
        isOwner: store.ownerId === payload.userId,
      })),
    });
  } catch (error) {
    console.error("Stores GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = getTokenFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, logoUrl, theme } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let finalSlug: string;
    if (slug !== undefined) {
      if (typeof slug !== "string" || !SLUG_REGEX.test(slug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 },
        );
      }
      const existing = await db.select().from(stores).where(eq(stores.slug, slug));
      if (existing.length > 0) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
      }
      finalSlug = slug;
    } else {
      finalSlug = await resolveUniqueSlug(slugify(name));
    }

    const [newStore] = await db
      .insert(stores)
      .values({
        name: name.trim(),
        slug: finalSlug,
        description: description !== undefined ? description : null,
        logoUrl: logoUrl !== undefined ? logoUrl : null,
        theme: theme !== undefined ? (theme as Partial<StoreTheme>) : {},
        ownerId: payload.userId,
      })
      .returning();

    await db.insert(teamMembers).values({
      userId: payload.userId,
      storeId: newStore.id,
      role: payload.role,
    });

    await db.insert(activityLogs).values({
      userId: payload.userId,
      storeId: newStore.id,
      action: "store.created",
      details: { name: newStore.name },
    });

    return NextResponse.json({ store: newStore }, { status: 201 });
  } catch (error) {
    console.error("Stores POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
