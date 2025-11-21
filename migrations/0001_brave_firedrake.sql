CREATE TYPE "public"."conditional_logic_action_type" AS ENUM('show_question', 'hide_question', 'require_question', 'unrequire_question', 'skip_to_page', 'enable_option', 'disable_option', 'set_value', 'show_page', 'hide_page');--> statement-breakpoint
CREATE TYPE "public"."conditional_logic_condition_type" AS ENUM('equals', 'not_equals', 'is_filled', 'is_not_filled', 'contains', 'does_not_contain', 'greater_than', 'less_than', 'is_selected_option_value', 'is_not_selected_option_value');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('wedding', 'corporate', 'birthday', 'anniversary', 'graduation', 'holiday_party', 'fundraiser', 'conference', 'workshop', 'reunion', 'celebration', 'other');--> statement-breakpoint
CREATE TYPE "public"."form_question_type" AS ENUM('header', 'text_display', 'textbox', 'textarea', 'email', 'phone', 'number', 'datetime', 'time', 'checkbox_group', 'radio_group', 'dropdown', 'full_name', 'address', 'matrix', 'image_upload', 'file_upload', 'signature_pad', 'rating_scale', 'slider', 'toggle_switch', 'location_picker', 'tag_select', 'date_range_picker', 'stepper_input', 'hidden_calculation');--> statement-breakpoint
CREATE TYPE "public"."form_rule_target_type" AS ENUM('question', 'page');--> statement-breakpoint
CREATE TABLE "form_page_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_page_id" integer NOT NULL,
	"library_question_id" integer NOT NULL,
	"display_order" integer NOT NULL,
	"display_text_override" text,
	"is_required_override" boolean,
	"is_hidden_override" boolean,
	"placeholder_override" text,
	"helper_text_override" text,
	"metadata_overrides" jsonb,
	"options_overrides" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_page_questions_form_page_id_display_order_unique" UNIQUE("form_page_id","display_order")
);
--> statement-breakpoint
CREATE TABLE "form_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"page_title" text,
	"page_order" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_pages_form_id_page_order_unique" UNIQUE("form_id","page_order")
);
--> statement-breakpoint
CREATE TABLE "form_rule_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"target_type" "form_rule_target_type" NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"trigger_form_page_question_id" integer NOT NULL,
	"condition_type" "conditional_logic_condition_type" NOT NULL,
	"condition_value" text,
	"action_type" "conditional_logic_action_type" NOT NULL,
	"rule_description" text,
	"execution_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submission_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_submission_id" integer NOT NULL,
	"form_page_question_id" integer NOT NULL,
	"answer_value" jsonb,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"form_version" integer NOT NULL,
	"user_id" integer,
	"client_id" integer,
	"opportunity_id" integer,
	"raw_lead_id" integer,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_key" text NOT NULL,
	"form_title" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forms_form_key_unique" UNIQUE("form_key")
);
--> statement-breakpoint
CREATE TABLE "library_matrix_columns" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_question_id" integer NOT NULL,
	"column_key" text NOT NULL,
	"header" text NOT NULL,
	"cell_input_type" text NOT NULL,
	"default_metadata" jsonb,
	"column_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_matrix_columns_library_question_id_column_key_unique" UNIQUE("library_question_id","column_key")
);
--> statement-breakpoint
CREATE TABLE "library_matrix_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_question_id" integer NOT NULL,
	"row_key" text NOT NULL,
	"label" text NOT NULL,
	"price" text,
	"default_metadata" jsonb,
	"row_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_matrix_rows_library_question_id_row_key_unique" UNIQUE("library_question_id","row_key")
);
--> statement-breakpoint
CREATE TABLE "question_library" (
	"id" serial PRIMARY KEY NOT NULL,
	"library_question_key" text NOT NULL,
	"default_text" text NOT NULL,
	"question_type" "form_question_type" NOT NULL,
	"default_metadata" jsonb,
	"default_options" jsonb,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "question_library_library_question_key_unique" UNIQUE("library_question_key")
);
--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "upcharge" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "additional_dietary_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "event_type" "event_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "is_publicly_visible" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "menus" ADD COLUMN "display_on_customer_form" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD COLUMN "ai_urgency_reason" text;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD COLUMN "ai_budget_reason" text;--> statement-breakpoint
ALTER TABLE "raw_leads" ADD COLUMN "ai_clarity_reason" text;--> statement-breakpoint
ALTER TABLE "form_page_questions" ADD CONSTRAINT "form_page_questions_form_page_id_form_pages_id_fk" FOREIGN KEY ("form_page_id") REFERENCES "public"."form_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_page_questions" ADD CONSTRAINT "form_page_questions_library_question_id_question_library_id_fk" FOREIGN KEY ("library_question_id") REFERENCES "public"."question_library"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_pages" ADD CONSTRAINT "form_pages_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_rule_targets" ADD CONSTRAINT "form_rule_targets_rule_id_form_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."form_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_rules" ADD CONSTRAINT "form_rules_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_rules" ADD CONSTRAINT "form_rules_trigger_form_page_question_id_form_page_questions_id_fk" FOREIGN KEY ("trigger_form_page_question_id") REFERENCES "public"."form_page_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission_answers" ADD CONSTRAINT "form_submission_answers_form_submission_id_form_submissions_id_fk" FOREIGN KEY ("form_submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission_answers" ADD CONSTRAINT "form_submission_answers_form_page_question_id_form_page_questions_id_fk" FOREIGN KEY ("form_page_question_id") REFERENCES "public"."form_page_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_raw_lead_id_raw_leads_id_fk" FOREIGN KEY ("raw_lead_id") REFERENCES "public"."raw_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_matrix_columns" ADD CONSTRAINT "library_matrix_columns_library_question_id_question_library_id_fk" FOREIGN KEY ("library_question_id") REFERENCES "public"."question_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_matrix_rows" ADD CONSTRAINT "library_matrix_rows_library_question_id_question_library_id_fk" FOREIGN KEY ("library_question_id") REFERENCES "public"."question_library"("id") ON DELETE cascade ON UPDATE no action;