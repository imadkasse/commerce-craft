CREATE TABLE "shipping_config" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"default_provider" text,
	"providers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_config_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
ALTER TABLE "shipping_config" ADD CONSTRAINT "shipping_config_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_config_store_id_idx" ON "shipping_config" USING btree ("store_id");