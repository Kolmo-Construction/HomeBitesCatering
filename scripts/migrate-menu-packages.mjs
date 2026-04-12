import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
ALTER TABLE menus ADD COLUMN IF NOT EXISTS theme_key TEXT;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS category_items JSONB DEFAULT '{}'::jsonb;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_menus_theme_key ON menus(theme_key) WHERE theme_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menus_display_on_customer_form ON menus(display_on_customer_form) WHERE display_on_customer_form = true;
`;

try {
  await client.query(sql);
  console.log('✓ menus table extended with packages, category_items, theme_key, display_order');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
