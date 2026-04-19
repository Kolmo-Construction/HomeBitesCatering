// Adds the adult/child count columns + child discount column. Idempotent —
// ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
//
// Usage: node --env-file=.env scripts/add-child-pricing-cols.mjs
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await c.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS adult_count INTEGER`);
  await c.query(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0`);
  await c.query(`ALTER TABLE pricing_config ADD COLUMN IF NOT EXISTS child_discount_bps INTEGER NOT NULL DEFAULT 5000`);
  console.log('✓ inquiries.adult_count, inquiries.child_count, pricing_config.child_discount_bps');

  // Backfill adult_count = guest_count for any inquiries that pre-date this
  // change so analytics don't break. child_count stays at 0 (default).
  const r = await c.query(`UPDATE inquiries SET adult_count = guest_count WHERE adult_count IS NULL`);
  console.log(`✓ backfilled adult_count on ${r.rowCount} pre-existing inquiry rows`);
} catch (err) {
  console.error('Failed:', err);
  process.exitCode = 1;
} finally {
  await c.end();
}
