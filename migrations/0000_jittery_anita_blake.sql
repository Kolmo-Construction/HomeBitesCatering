CREATE TYPE "public"."budget_indication" AS ENUM('not_mentioned', 'low', 'medium', 'high', 'specific_amount');--> statement-breakpoint
CREATE TYPE "public"."communication_direction" AS ENUM('incoming', 'outgoing', 'internal');--> statement-breakpoint
CREATE TYPE "public"."communication_type" AS ENUM('email', 'call', 'sms', 'note', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."identifier_type" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."lead_quality_category" AS ENUM('hot', 'warm', 'cold', 'nurture');--> statement-breakpoint
CREATE TYPE "public"."lead_score" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."opportunity_priority" AS ENUM('hot', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."raw_lead_status" AS ENUM('new', 'under_review', 'qualified', 'archived', 'junk', 'parsing_failed', 'needs_manual_review');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative', 'urgent');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"notes" text,
	"opportunity_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer,
	"client_id" integer,
	"user_id" integer,
	"type" "communication_type" NOT NULL,
	"direction" "communication_direction" NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"source" text,
	"external_id" text,
	"subject" text,
	"from_address" text,
	"to_address" text,
	"body_raw" text,
	"body_summary" text,
	"duration_minutes" integer,
	"recording_url" text,
	"meta_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_identifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer,
	"client_id" integer,
	"type" "identifier_type" NOT NULL,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"event_date" timestamp,
	"event_type" text NOT NULL,
	"guest_count" integer,
	"venue" text,
	"venue_address" text,
	"venue_city" text,
	"venue_state" text,
	"venue_zip" text,
	"tax_rate" double precision,
	"zip_code" text,
	"menu_id" integer,
	"items" jsonb,
	"additional_services" jsonb,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"expires_at" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"estimate_id" integer,
	"event_date" timestamp NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"event_type" text NOT NULL,
	"guest_count" integer NOT NULL,
	"venue" text NOT NULL,
	"menu_id" integer,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_sync_state" (
	"target_email" text PRIMARY KEY NOT NULL,
	"last_history_id" text NOT NULL,
	"watch_expiration_timestamp" timestamp,
	"last_watch_attempt_timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"price" numeric(10, 2),
	"ingredients" text,
	"is_vegetarian" boolean DEFAULT false,
	"is_vegan" boolean DEFAULT false,
	"is_gluten_free" boolean DEFAULT false,
	"is_dairy_free" boolean DEFAULT false,
	"is_nut_free" boolean DEFAULT false,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"event_type" text NOT NULL,
	"event_date" timestamp,
	"guest_count" integer,
	"venue" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"opportunity_source" text,
	"priority" "opportunity_priority" DEFAULT 'medium',
	"assigned_to" integer,
	"client_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"gmail_id" text NOT NULL,
	"service" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"label_applied" boolean DEFAULT false,
	CONSTRAINT "processed_emails_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "raw_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"raw_data" jsonb,
	"extracted_prospect_name" text,
	"extracted_prospect_email" text,
	"extracted_prospect_phone" text,
	"event_summary" text,
	"received_at" timestamp NOT NULL,
	"status" "raw_lead_status" DEFAULT 'new' NOT NULL,
	"created_opportunity_id" integer,
	"internal_notes" text,
	"assigned_to_user_id" integer,
	"extracted_event_type" text,
	"extracted_event_date" text,
	"extracted_event_time" text,
	"extracted_guest_count" integer,
	"extracted_venue" text,
	"extracted_message_summary" text,
	"lead_source_platform" text,
	"ai_urgency_score" "lead_score",
	"ai_budget_indication" "budget_indication",
	"ai_budget_value" integer,
	"ai_clarity_of_request_score" "lead_score",
	"ai_decision_maker_likelihood" "lead_score",
	"ai_key_requirements" jsonb,
	"ai_potential_red_flags" jsonb,
	"ai_overall_lead_quality" "lead_quality_category",
	"ai_suggested_next_step" text,
	"ai_sentiment" "sentiment",
	"ai_confidence_score" double precision,
	"ai_calendar_conflict_assessment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identifiers" ADD CONSTRAINT "contact_identifiers_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_identifiers" ADD CONSTRAINT "contact_identifiers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_created_opportunity_id_opportunities_id_fk" FOREIGN KEY ("created_opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD CONSTRAINT "raw_leads_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;