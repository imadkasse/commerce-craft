ALTER TABLE "products" DROP CONSTRAINT "products_landing_page_id_landing_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "landing_pages" ADD COLUMN "product_id" uuid;
--> statement-breakpoint
UPDATE "landing_pages" lp
SET "product_id" = sub."id"
FROM (
  SELECT DISTINCT ON ("landing_page_id") "landing_page_id", "id"
  FROM "products"
  WHERE "landing_page_id" IS NOT NULL
  ORDER BY "landing_page_id", "created_at" ASC
) sub
WHERE lp."id" = sub."landing_page_id" AND lp."product_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "landing_page_id";
--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_product_id_unique" UNIQUE("product_id");
