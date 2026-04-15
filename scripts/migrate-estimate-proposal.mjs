// Adds estimates.proposal (jsonb, nullable).
//
// Run against the target DB:
//   DATABASE_URL=postgres://... node scripts/migrate-estimate-proposal.mjs
//
// The column is the single source of truth for the customer-facing public
// quote page — couple names, timeline, menu, appetizers, desserts, beverages,
// dietary, special requests, pricing. Populated at quote_request → estimate
// conversion and edited directly by the admin before send.
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    ALTER TABLE estimates
    ADD COLUMN IF NOT EXISTS proposal jsonb;
  `);
  console.log('✓ estimates.proposal column added');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
