import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS labor_hours NUMERIC(10, 2) DEFAULT 0;
  `);
  console.log('✓ labor_hours column added to recipes');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
