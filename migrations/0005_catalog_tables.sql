-- Catalog & pricing-config tables. Backs the admin-editable catalog that
-- the /inquire form and quote generator read from.
--
-- NOTE: these tables were originally created via scripts/create-catalog-tables.mjs
-- because drizzle-kit push is stuck on interactive TTY prompts in this environment.
-- This file is provided for traceability / version control. Contents are
-- idempotent (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "appetizer_categories" (
	"id"            serial PRIMARY KEY NOT NULL,
	"category_key"  text NOT NULL,
	"label"         text NOT NULL,
	"per_person"    boolean DEFAULT false NOT NULL,
	"serving_pack"  jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active"     boolean DEFAULT true NOT NULL,
	"created_at"    timestamp DEFAULT now() NOT NULL,
	"updated_at"    timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appetizer_categories_category_key_unique" UNIQUE("category_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appetizer_items" (
	"id"            serial PRIMARY KEY NOT NULL,
	"category_id"   integer NOT NULL,
	"name"          text NOT NULL,
	"price_cents"   integer NOT NULL,
	"unit"          text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active"     boolean DEFAULT true NOT NULL,
	"created_at"    timestamp DEFAULT now() NOT NULL,
	"updated_at"    timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dessert_items" (
	"id"            serial PRIMARY KEY NOT NULL,
	"name"          text NOT NULL,
	"price_cents"   integer NOT NULL,
	"unit"          text DEFAULT 'per_piece' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active"     boolean DEFAULT true NOT NULL,
	"created_at"    timestamp DEFAULT now() NOT NULL,
	"updated_at"    timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipment_categories" (
	"id"            serial PRIMARY KEY NOT NULL,
	"category_key"  text NOT NULL,
	"label"         text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active"     boolean DEFAULT true NOT NULL,
	"created_at"    timestamp DEFAULT now() NOT NULL,
	"updated_at"    timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_categories_category_key_unique" UNIQUE("category_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipment_items" (
	"id"            serial PRIMARY KEY NOT NULL,
	"category_id"   integer NOT NULL,
	"name"          text NOT NULL,
	"price_cents"   integer NOT NULL,
	"unit"          text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active"     boolean DEFAULT true NOT NULL,
	"created_at"    timestamp DEFAULT now() NOT NULL,
	"updated_at"    timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_config" (
	"id"                                     serial PRIMARY KEY NOT NULL,
	"wet_hire_rate_cents_per_hour"           integer DEFAULT 1500 NOT NULL,
	"dry_hire_rate_cents_per_hour"           integer DEFAULT 800 NOT NULL,
	"liquor_multiplier_well"                 integer DEFAULT 100 NOT NULL,
	"liquor_multiplier_mid_shelf"            integer DEFAULT 125 NOT NULL,
	"liquor_multiplier_top_shelf"            integer DEFAULT 150 NOT NULL,
	"non_alcoholic_package_cents"            integer DEFAULT 500 NOT NULL,
	"coffee_tea_service_cents"               integer DEFAULT 400 NOT NULL,
	"table_water_service_cents"              integer DEFAULT 650 NOT NULL,
	"glassware_cents"                        integer DEFAULT 200 NOT NULL,
	"service_fee_drop_off_bps"               integer DEFAULT 0 NOT NULL,
	"service_fee_standard_bps"               integer DEFAULT 1500 NOT NULL,
	"service_fee_full_no_setup_bps"          integer DEFAULT 1750 NOT NULL,
	"service_fee_full_bps"                   integer DEFAULT 2000 NOT NULL,
	"tax_rate_bps"                           integer DEFAULT 1025 NOT NULL,
	"updated_at"                             timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "appetizer_items" ADD CONSTRAINT "appetizer_items_category_id_appetizer_categories_id_fk"
		FOREIGN KEY ("category_id") REFERENCES "public"."appetizer_categories"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_category_id_equipment_categories_id_fk"
		FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
