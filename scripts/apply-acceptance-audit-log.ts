/**
 * One-off: create the acceptance_audit_log table non-interactively.
 *
 * drizzle-kit push can't handle this unattended because it thinks the new
 * table might be a rename of one of several existing unrelated tables. The
 * schema definition is in shared/schema.ts; this script just runs the raw
 * CREATE TABLE IF NOT EXISTS that matches it.
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS acceptance_audit_log (
      id            SERIAL PRIMARY KEY,
      quote_id      INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      typed_name    TEXT NOT NULL,
      customer_email TEXT,
      ip_address    TEXT,
      user_agent    TEXT,
      token_used    TEXT,
      terms_snapshot TEXT,
      terms_version TEXT,
      accepted_at   TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ acceptance_audit_log ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
