/**
 * Idempotent migration — add yield_pct column to base_ingredients.
 * Represents the edible-portion ratio (e.g. 0.9 for yellow onions) used by
 * the shopping list to compensate for trim/waste when computing how much
 * to buy.
 *
 * Run with: node scripts/migrate-yield-pct.mjs
 */
import pg from "pg";
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    ALTER TABLE base_ingredients
    ADD COLUMN IF NOT EXISTS yield_pct NUMERIC(5, 3);
  `);
  console.log("✓ yield_pct column added to base_ingredients");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
