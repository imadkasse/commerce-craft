ALTER TABLE "orders" ADD COLUMN "customer_commune" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "custom_fields" jsonb DEFAULT '[]'::jsonb NOT NULL;