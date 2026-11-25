import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { StoreTheme } from "@/lib/store-theme";
import type { Section } from "@/lib/ai/sections/schemas";

// â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    role: text("role", { enum: ["SUPERADMIN", "ADMIN"] })
      .notNull()
      .default("ADMIN"),
    emailVerified: boolean("email_verified").default(false).notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

// â”€â”€â”€ Stores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const stores = pgTable(
  "stores",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    domain: text("domain").unique(),
    theme: jsonb("theme")
      .$type<Partial<StoreTheme>>()
      .default({})
      .notNull(),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("stores_slug_idx").on(t.slug)],
);

// â”€â”€â”€ Team Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["SUPERADMIN", "ADMIN"] }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("team_members_user_store_idx").on(t.userId, t.storeId)],
);

// â”€â”€â”€ Landing Pages (defined early so products can reference it) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const landingPages = pgTable(
  "landing_pages",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").unique().notNull(),
    title: text("title").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id").unique().references(() => products.id, {
      onDelete: "cascade",
    }),
    generatedCode: text("generated_code"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    customizations: jsonb("customizations")
      .$type<{
        font?: string;
        colors?: Record<string, string>;
        sectionVisibility?: Record<string, boolean>;
      }>()
      .default({})
      .notNull(),
    sections: jsonb("sections").$type<Section[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("landing_pages_slug_idx").on(t.slug)],
);

// â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const products = pgTable(
  "products",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").unique().notNull(),
    type: text("type", { enum: ["CLOTHING", "GENERAL"] })
      .notNull()
      .default("GENERAL"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", {
      precision: 12,
      scale: 2,
    }),
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("products_store_id_idx").on(t.storeId), index("products_type_idx").on(t.type)],
);

// â”€â”€â”€ Product Colors (CLOTHING) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const productColors = pgTable(
  "product_colors",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hexCode: text("hex_code").notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("product_colors_product_id_idx").on(t.productId)],
);

// â”€â”€â”€ Product Sizes (CLOTHING) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const productSizes = pgTable(
  "product_sizes",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorId: uuid("color_id")
      .notNull()
      .references(() => productColors.id, { onDelete: "cascade" }),
    sizeLabel: text("size_label").notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("product_sizes_product_id_idx").on(t.productId),
    index("product_sizes_color_id_idx").on(t.colorId),
  ],
);

// â”€â”€â”€ Product Variants (GENERAL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    sku: text("sku"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("product_variants_product_id_idx").on(t.productId)],
);

// â”€â”€â”€ Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const orders = pgTable(
  "orders",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderNumber: text("order_number").unique().notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address").notNull(),
    customerCity: text("customer_city"),
    customerCommune: text("customer_commune"),
    customFields: jsonb("custom_fields").$type<Array<{ label: string; value: string }>>().default([]).notNull(),
    status: text("status", {
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    })
      .notNull()
      .default("pending"),
    trackingCode: text("tracking_code"),
    shippingProvider: text("shipping_provider"),
    notes: text("notes"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sheetsSynced: boolean("sheets_synced").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("orders_store_id_idx").on(t.storeId),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
  ],
);

// â”€â”€â”€ Order Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    productImage: text("product_image"),
    color: text("color"),
    size: text("size"),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);

// â”€â”€â”€ Sheets Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const sheetsConfig = pgTable(
  "sheets_config",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: uuid("store_id")
      .unique()
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    spreadsheetId: text("spreadsheet_id").notNull(),
    sheetName: text("sheet_name").notNull(),
    fieldMapping: jsonb("field_mapping").$type<Record<string, string>>().default({}).notNull(),
    autoSync: boolean("auto_sync").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sheets_config_store_id_idx").on(t.storeId)],
);

// â”€â”€â”€ Activity Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    storeId: uuid("store_id").references(() => stores.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("activity_logs_store_id_idx").on(t.storeId),
    index("activity_logs_created_at_idx").on(t.createdAt),
  ],
);
// ??? Shipping Config ??????????????????????????????????????????????????????????

export const shippingConfig = pgTable(
  "shipping_config",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storeId: uuid("store_id")
      .unique()
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    defaultProvider: text("default_provider", {
      enum: ["zr_express", "yalidin", "noest"],
    }),
    providers: jsonb("providers")
      .$type<Record<string, { apiKey?: string; apiSecret?: string; enabled: boolean }>>()
      .default({})
      .notNull(),
    rates: jsonb("rates")
      .$type<Array<{ name: string; price: number; zones?: string[]; minWeight?: number; maxWeight?: number }>>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("shipping_config_store_id_idx").on(t.storeId)],
);

// ─── Better Auth: accounts ───────────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    uniqueIndex("accounts_provider_account_idx").on(
      t.providerId,
      t.accountId,
    ),
    uniqueIndex("accounts_credential_user_idx")
      .on(t.userId)
      .where(sql`${t.providerId} = 'credential'`),
  ],
);

// ─── Better Auth: sessions ───────────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeStoreId: uuid("active_store_id").references(() => stores.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_token_idx").on(t.token)],
);

// ─── Better Auth: verifications ─────────────────────────────────────────────

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

// ─── Better Auth: rate_limits ────────────────────────────────────────────────

export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rate_limits_key_idx").on(t.key)],
);

