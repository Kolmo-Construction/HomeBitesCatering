-- Auth overhaul (commit 68819d5): adds password lifecycle, lockout, 2FA, recovery tokens.
-- All additions are non-destructive: nullable columns or new tables.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" timestamp;

CREATE TABLE IF NOT EXISTS "user_mfa" (
  "user_id" integer PRIMARY KEY NOT NULL,
  "secret_encrypted" text NOT NULL,
  "recovery_codes_hashed" text[] NOT NULL,
  "enrolled_at" timestamp DEFAULT now() NOT NULL,
  "last_used_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."auth_token_purpose" AS ENUM('password_reset', 'invite', 'email_change');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "token_hash" text NOT NULL,
  "purpose" "auth_token_purpose" DEFAULT 'password_reset' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "requested_ip" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);

DO $$ BEGIN
  ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
