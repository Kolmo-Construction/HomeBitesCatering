CREATE TABLE "base_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"purchase_price" numeric(10, 2) NOT NULL,
	"purchase_unit" text NOT NULL,
	"purchase_quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"supplier" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" text NOT NULL,
	"base_ingredient_id" integer NOT NULL,
	"quantity" numeric(10, 4) NOT NULL,
	"unit" text NOT NULL,
	"prep_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_base_ingredient_id_base_ingredients_id_fk" FOREIGN KEY ("base_ingredient_id") REFERENCES "public"."base_ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" DROP COLUMN "ai_calendar_conflict_assessment";