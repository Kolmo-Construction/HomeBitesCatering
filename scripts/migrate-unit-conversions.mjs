import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    ALTER TABLE base_ingredients
    ADD COLUMN IF NOT EXISTS unit_conversions JSONB DEFAULT '{}'::jsonb;
  `);
  console.log('✓ unit_conversions column added to base_ingredients');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
