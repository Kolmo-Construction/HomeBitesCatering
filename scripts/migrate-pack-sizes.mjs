/**
 * Idempotent migration — create the ingredient_pack_sizes table and seed it
 * from the existing `baseIngredients.purchase_*` defaults so everything
 * already in the system has at least one pack size.
 *
 * Run with:  npx tsx scripts/migrate-pack-sizes.mjs
 * (or plain node — it uses pg directly, no TS)
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
  console.log("Creating ingredient_pack_sizes table (if not exists)...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS ingredient_pack_sizes (
      id serial PRIMARY KEY,
      base_ingredient_id integer NOT NULL REFERENCES base_ingredients(id) ON DELETE CASCADE,
      label text NOT NULL,
      quantity numeric(10, 3) NOT NULL,
      unit text NOT NULL,
      price numeric(10, 2) NOT NULL,
      supplier text,
      sku text,
      min_order_packs integer NOT NULL DEFAULT 1,
      is_default boolean NOT NULL DEFAULT false,
      notes text,
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ingredient_pack_sizes_ingredient
      ON ingredient_pack_sizes (base_ingredient_id);
  `);

  // Ensure at most one default pack per ingredient
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_pack_sizes_default_per_ingredient
      ON ingredient_pack_sizes (base_ingredient_id)
      WHERE is_default = true;
  `);

  // Seed default pack from the legacy purchase_* columns for any ingredient
  // that doesn't already have one.
  const seedResult = await client.query(`
    INSERT INTO ingredient_pack_sizes
      (base_ingredient_id, label, quantity, unit, price, supplier, sku, is_default)
    SELECT
      bi.id,
      bi.purchase_quantity::text || ' ' || bi.purchase_unit AS label,
      bi.purchase_quantity,
      bi.purchase_unit,
      bi.purchase_price,
      bi.supplier,
      bi.sku,
      true
    FROM base_ingredients bi
    WHERE NOT EXISTS (
      SELECT 1 FROM ingredient_pack_sizes ips WHERE ips.base_ingredient_id = bi.id
    )
    RETURNING id;
  `);

  console.log(
    `✓ ingredient_pack_sizes table ready — seeded ${seedResult.rowCount} default packs from base_ingredients`,
  );
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
