// Creates the 6 catalog tables directly via SQL (CREATE TABLE IF NOT EXISTS),
// bypassing drizzle-kit push's TTY-only prompts. Non-destructive — if tables
// already exist, it's a no-op. Safe to re-run.
//
// Run with: node scripts/create-catalog-tables.mjs

import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const statements = [
  `CREATE TABLE IF NOT EXISTS appetizer_categories (
    id            SERIAL PRIMARY KEY,
    category_key  TEXT NOT NULL UNIQUE,
    label         TEXT NOT NULL,
    per_person    BOOLEAN NOT NULL DEFAULT FALSE,
    serving_pack  JSONB,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS appetizer_items (
    id            SERIAL PRIMARY KEY,
    category_id   INTEGER NOT NULL REFERENCES appetizer_categories(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    price_cents   INTEGER NOT NULL,
    unit          TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS dessert_items (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    price_cents   INTEGER NOT NULL,
    unit          TEXT NOT NULL DEFAULT 'per_piece',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS equipment_categories (
    id            SERIAL PRIMARY KEY,
    category_key  TEXT NOT NULL UNIQUE,
    label         TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS equipment_items (
    id            SERIAL PRIMARY KEY,
    category_id   INTEGER NOT NULL REFERENCES equipment_categories(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    price_cents   INTEGER NOT NULL,
    unit          TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS pricing_config (
    id                                     SERIAL PRIMARY KEY,
    wet_hire_rate_cents_per_hour           INTEGER NOT NULL DEFAULT 1500,
    dry_hire_rate_cents_per_hour           INTEGER NOT NULL DEFAULT 800,
    liquor_multiplier_well                 INTEGER NOT NULL DEFAULT 100,
    liquor_multiplier_mid_shelf            INTEGER NOT NULL DEFAULT 125,
    liquor_multiplier_top_shelf            INTEGER NOT NULL DEFAULT 150,
    non_alcoholic_package_cents            INTEGER NOT NULL DEFAULT 500,
    coffee_tea_service_cents               INTEGER NOT NULL DEFAULT 400,
    table_water_service_cents              INTEGER NOT NULL DEFAULT 650,
    glassware_cents                        INTEGER NOT NULL DEFAULT 200,
    service_fee_drop_off_bps               INTEGER NOT NULL DEFAULT 0,
    service_fee_standard_bps               INTEGER NOT NULL DEFAULT 1500,
    service_fee_full_no_setup_bps          INTEGER NOT NULL DEFAULT 1750,
    service_fee_full_bps                   INTEGER NOT NULL DEFAULT 2000,
    tax_rate_bps                           INTEGER NOT NULL DEFAULT 1025,
    updated_at                             TIMESTAMP NOT NULL DEFAULT now()
  )`,
];

try {
  for (const sql of statements) {
    const firstLine = sql.split('\n')[0];
    await client.query(sql);
    console.log(`✓ ${firstLine}`);
  }
  console.log('\nAll catalog tables ready.');
} catch (err) {
  console.error('Table creation failed:', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
