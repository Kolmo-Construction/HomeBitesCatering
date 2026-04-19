// Adds venues.event_types (text[]) column + backfills the existing 25 venues
// as {wedding, engagement} (the farms/gardens seeded from the JotForm are all
// wedding-adjacent). Idempotent.
//
// Usage: node --env-file=.env scripts/add-venue-event-types.mjs

import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await c.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS event_types TEXT[]`);
  console.log('✓ venues.event_types column ready');
  const r = await c.query(`
    UPDATE venues
    SET event_types = ARRAY['wedding','engagement']
    WHERE event_types IS NULL OR array_length(event_types, 1) IS NULL
  `);
  console.log(`✓ backfilled ${r.rowCount} venues with {wedding, engagement}`);
} catch (err) {
  console.error('Failed:', err);
  process.exitCode = 1;
} finally {
  await c.end();
}
