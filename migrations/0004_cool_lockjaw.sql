CREATE TABLE "opportunity_email_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"opportunity_id" integer,
	"raw_lead_id" integer,
	"primary_email_address" text NOT NULL,
	"participant_emails" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_email_threads_gmail_thread_id_unique" UNIQUE("gmail_thread_id")
);
--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "gmail_thread_id" text;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "gmail_message_id" text;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "gcp_storage_path" text;--> statement-breakpoint
ALTER TABLE "opportunity_email_threads" ADD CONSTRAINT "opportunity_email_threads_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_email_threads" ADD CONSTRAINT "opportunity_email_threads_raw_lead_id_raw_leads_id_fk" FOREIGN KEY ("raw_lead_id") REFERENCES "public"."raw_leads"("id") ON DELETE set null ON UPDATE no action;