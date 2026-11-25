import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores, teamMembers, activityLogs } from "@/lib/db/schema";
import { requireAuth, routeAuthErrorResponse } from "@/lib/auth/guards";
import { desc, eq } from "drizzle-orm";
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
    const auth = await requireAuth(request);

    if (auth.user.role === "SUPERADMIN") {
      const allStores = await db.select().from(stores).orderBy(desc(stores.createdAt));
      return NextResponse.json({
        stores: allStores.map((store) => ({
          ...store,
          role: "SUPERADMIN",
          isOwner: store.ownerId === auth.user.id,
        })),
      });
    }

    const rows = await db
      .select({ store: stores, role: teamMembers.role })
      .from(teamMembers)
      .innerJoin(stores, eq(stores.id, teamMembers.storeId))
      .where(eq(teamMembers.userId, auth.user.id))
      .orderBy(desc(stores.createdAt));

    return NextResponse.json({
      stores: rows.map(({ store, role }) => ({
        ...store,
        role,
        isOwner: store.ownerId === auth.user.id,
      })),
    });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

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
        ownerId: auth.user.id,
      })
      .returning();

    await db.insert(teamMembers).values({
      userId: auth.user.id,
      storeId: newStore.id,
      role: auth.user.role,
    });

    await db.insert(activityLogs).values({
      userId: auth.user.id,
      storeId: newStore.id,
      action: "store.created",
      details: { name: newStore.name },
    });

    return NextResponse.json({ store: newStore }, { status: 201 });
  } catch (error) {
    return routeAuthErrorResponse(error);
  }
}
