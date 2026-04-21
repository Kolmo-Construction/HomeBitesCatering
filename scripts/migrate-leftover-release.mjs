// Adds the leftover-release + multi-doc acceptance columns.
// Idempotent. Run once per environment: `node scripts/migrate-leftover-release.mjs`
import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
ALTER TABLE acceptance_audit_log
  ADD COLUMN IF NOT EXISTS accepted_docs jsonb,
  ADD COLUMN IF NOT EXISTS leftover_release_signed_at timestamp;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS leftover_release_signed_at timestamp;
`;

try {
  await client.query(sql);
  console.log('✓ leftover-release columns applied');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
