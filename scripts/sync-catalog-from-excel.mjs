// Sync the catalog tables from the master pricing Excel.
// - Reads /Users/pascalmatta/Downloads/home_bites_master_pricing_v2.xlsx (first path found)
// - Upserts appetizer_categories, appetizer_items, dessert_items, equipment_categories, equipment_items
// - Matches items by (category_id, name) — updates price if changed, inserts if new
// - Items NOT present in the Excel get is_active=false (soft delete, preserves any jsonb snapshots in historical inquiries)
// - Idempotent: safe to re-run whenever the Excel is updated.
//
// Usage: node --env-file=.env scripts/sync-catalog-from-excel.mjs [path/to/file.xlsx]

import pg from 'pg';
import xlsx from 'xlsx';
import { existsSync } from 'node:fs';

const defaultPaths = [
  '/Users/pascalmatta/Downloads/home_bites_master_pricing_v2.xlsx',
  '/Users/pascalmatta/Downloads/home_bites_master_pricing_apps.xlsx',
];
const filePath = process.argv[2] || defaultPaths.find((p) => existsSync(p));
if (!filePath || !existsSync(filePath)) {
  console.error('No Excel file found. Provide a path as the first argument.');
  process.exit(1);
}
console.log(`Reading: ${filePath}`);

const wb = xlsx.readFile(filePath);
const master = xlsx.utils.sheet_to_json(wb.Sheets['Master'], { header: ['category', 'section', 'item', 'unit', 'price'], range: 2 });

// Normalizers
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unitDb = (u) => {
  const x = String(u).toLowerCase().trim();
  if (x === 'per piece' || x === 'per_piece') return 'per_piece';
  if (x === 'per person' || x === 'per_person') return 'per_person';
  if (x === 'each') return 'each';
  if (x === 'per event') return 'per_event';
  if (x === 'per lb') return 'per_lb';
  if (x === 'included') return 'included';
  return x.replace(/\s+/g, '_');
};

// Partition rows by top-level category from the Excel
const hors = master.filter((r) => r.category && String(r.category).startsWith('Hors'));
const desserts = master.filter((r) => r.category === 'Dessert');
const equipment = master.filter((r) => r.category === 'Catering Equipment');

// Map section labels → existing category_key where one exists, else a new slug.
const appetizerKeyMap = {
  'Tea Sandwiches': 'tea_sandwiches',
  'Shooters': 'shooters',
  'Mini skewers': 'mini_skewers',
  'Canapes': 'canapes',
  'Vol au vents': 'vol_au_vents',
  'Simple fare': 'simple_fare',
  'Charcuterie and More': 'charcuterie',
  'Spreads': 'spreads',
};
const equipmentKeyMap = {
  'Linens': 'linens',
  'Dinnerware': 'dinnerware',
  'Furniture': 'furniture',
  'Bar equipment': 'bar_equipment',
  'Glassware': 'glassware',
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function upsertAppetizerCategory({ key, label, order, perPerson, servingPack }) {
  const existing = await client.query('SELECT id FROM appetizer_categories WHERE category_key = $1', [key]);
  if (existing.rows.length === 0) {
    const { rows } = await client.query(
      `INSERT INTO appetizer_categories (category_key, label, per_person, serving_pack, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
      [key, label, perPerson, servingPack ? JSON.stringify(servingPack) : null, order]
    );
    return { id: rows[0].id, created: true };
  }
  await client.query(
    `UPDATE appetizer_categories SET label = $1, per_person = $2, serving_pack = $3,
       display_order = $4, is_active = TRUE, updated_at = now() WHERE id = $5`,
    [label, perPerson, servingPack ? JSON.stringify(servingPack) : null, order, existing.rows[0].id]
  );
  return { id: existing.rows[0].id, created: false };
}

async function upsertEquipmentCategory({ key, label, order }) {
  const existing = await client.query('SELECT id FROM equipment_categories WHERE category_key = $1', [key]);
  if (existing.rows.length === 0) {
    const { rows } = await client.query(
      `INSERT INTO equipment_categories (category_key, label, display_order, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING id`,
      [key, label, order]
    );
    return { id: rows[0].id, created: true };
  }
  await client.query(
    `UPDATE equipment_categories SET label = $1, display_order = $2, is_active = TRUE, updated_at = now()
     WHERE id = $3`,
    [label, order, existing.rows[0].id]
  );
  return { id: existing.rows[0].id, created: false };
}

async function upsertCatalogItem(table, where, fields) {
  const existing = await client.query(
    `SELECT id, price_cents FROM ${table} WHERE ${where.clause}`,
    where.args,
  );
  if (existing.rows.length === 0) {
    const cols = Object.keys(fields);
    const vals = Object.values(fields);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await client.query(
      `INSERT INTO ${table} (${cols.join(', ')}, is_active)
       VALUES (${placeholders}, TRUE) RETURNING id`,
      vals,
    );
    return { id: rows[0].id, action: 'inserted' };
  }
  const row = existing.rows[0];
  if (row.price_cents !== fields.price_cents) {
    await client.query(
      `UPDATE ${table} SET price_cents = $1, unit = $2, display_order = $3,
        is_active = TRUE, updated_at = now() WHERE id = $4`,
      [fields.price_cents, fields.unit, fields.display_order, row.id]
    );
    return { id: row.id, action: 'updated', oldPrice: row.price_cents, newPrice: fields.price_cents };
  }
  // Price unchanged — still reactivate and bump order in case label/order changed
  await client.query(
    `UPDATE ${table} SET unit = $1, display_order = $2, is_active = TRUE, updated_at = now() WHERE id = $3`,
    [fields.unit, fields.display_order, row.id]
  );
  return { id: row.id, action: 'kept' };
}

const stats = {
  appetizer: { inserted: 0, updated: 0, kept: 0, deactivated: 0 },
  dessert:   { inserted: 0, updated: 0, kept: 0, deactivated: 0 },
  equipment: { inserted: 0, updated: 0, kept: 0, deactivated: 0 },
};

try {
  // ---- Appetizers ----
  console.log('\n=== Appetizers ===');
  const sectionOrder = Object.keys(appetizerKeyMap);
  const seenAppItemIds = new Set();
  for (const section of sectionOrder) {
    const rows = hors.filter((r) => r.section === section);
    if (rows.length === 0 && section !== 'Spreads') continue;

    const isSpreads = section === 'Spreads';
    const isCharcuterie = section === 'Charcuterie and More';
    const perPerson = isCharcuterie; // Charcuterie boards are per-person
    const servingPack = isSpreads
      ? {
          pricePerServingCents: Math.round((rows[0]?.price ?? 6.5) * 100),
          flavorsToPick: 3,
          description: "Pick 3 spreads to make up your trio, then choose how many servings you'd like.",
        }
      : null;

    const cat = await upsertAppetizerCategory({
      key: appetizerKeyMap[section],
      label: section === 'Mini skewers' ? 'Mini Skewers'
           : section === 'Vol au vents' ? 'Vol au Vents'
           : section === 'Simple fare' ? 'Simple Fare'
           : section,
      order: sectionOrder.indexOf(section) + 1,
      perPerson,
      servingPack,
    });

    // Special handling: Spreads category is modeled as a flavor picker,
    // not as price-per-item. Keep the existing flavor rows (price 0), don't
    // insert the Excel "Assorted spreads" line as a priced item.
    if (isSpreads) continue;

    let itemOrder = 1;
    for (const r of rows) {
      const result = await upsertCatalogItem('appetizer_items',
        { clause: 'category_id = $1 AND name = $2', args: [cat.id, r.item] },
        {
          category_id: cat.id,
          name: r.item,
          price_cents: Math.round(Number(r.price) * 100),
          unit: unitDb(r.unit),
          display_order: itemOrder++,
        });
      seenAppItemIds.add(result.id);
      stats.appetizer[result.action]++;
    }
  }

  // Deactivate appetizer items NOT in Excel (preserve flavor rows for Spreads)
  const spreadsCatResult = await client.query(
    "SELECT id FROM appetizer_categories WHERE category_key = 'spreads'"
  );
  const spreadsCatId = spreadsCatResult.rows[0]?.id;
  const appItemsAll = await client.query(
    `SELECT id, category_id FROM appetizer_items WHERE is_active = TRUE`
  );
  for (const row of appItemsAll.rows) {
    if (row.category_id === spreadsCatId) continue; // flavor rows survive
    if (!seenAppItemIds.has(row.id)) {
      await client.query(
        `UPDATE appetizer_items SET is_active = FALSE, updated_at = now() WHERE id = $1`,
        [row.id]
      );
      stats.appetizer.deactivated++;
    }
  }

  // ---- Desserts ----
  console.log('=== Desserts ===');
  const seenDessIds = new Set();
  let dOrder = 1;
  for (const r of desserts) {
    const result = await upsertCatalogItem('dessert_items',
      { clause: 'name = $1', args: [r.item] },
      {
        name: r.item,
        price_cents: Math.round(Number(r.price) * 100),
        unit: unitDb(r.unit),
        display_order: dOrder++,
      });
    seenDessIds.add(result.id);
    stats.dessert[result.action]++;
  }
  const dessAll = await client.query('SELECT id FROM dessert_items WHERE is_active = TRUE');
  for (const row of dessAll.rows) {
    if (!seenDessIds.has(row.id)) {
      await client.query(`UPDATE dessert_items SET is_active = FALSE, updated_at = now() WHERE id = $1`, [row.id]);
      stats.dessert.deactivated++;
    }
  }

  // ---- Equipment ----
  console.log('=== Equipment ===');
  const equipSectionOrder = Object.keys(equipmentKeyMap);
  const seenEqIds = new Set();

  // Special: rename the old "serving_ware" category to "dinnerware" if it
  // exists (keeps the same id, just updates the key/label).
  const oldServingWare = await client.query(
    "SELECT id FROM equipment_categories WHERE category_key = 'serving_ware'"
  );
  if (oldServingWare.rows.length) {
    await client.query(
      `UPDATE equipment_categories SET category_key = 'dinnerware', label = 'Dinnerware',
        updated_at = now() WHERE id = $1`,
      [oldServingWare.rows[0].id]
    );
  }

  for (const section of equipSectionOrder) {
    const rows = equipment.filter((r) => r.section === section);
    if (rows.length === 0) continue;
    const cat = await upsertEquipmentCategory({
      key: equipmentKeyMap[section],
      label: section === 'Bar equipment' ? 'Bar Equipment' : section,
      order: equipSectionOrder.indexOf(section) + 1,
    });

    let itemOrder = 1;
    for (const r of rows) {
      const result = await upsertCatalogItem('equipment_items',
        { clause: 'category_id = $1 AND name = $2', args: [cat.id, r.item] },
        {
          category_id: cat.id,
          name: r.item,
          price_cents: Math.round(Number(r.price) * 100),
          unit: unitDb(r.unit),
          display_order: itemOrder++,
        });
      seenEqIds.add(result.id);
      stats.equipment[result.action]++;
    }
  }

  const eqAll = await client.query('SELECT id FROM equipment_items WHERE is_active = TRUE');
  for (const row of eqAll.rows) {
    if (!seenEqIds.has(row.id)) {
      await client.query(`UPDATE equipment_items SET is_active = FALSE, updated_at = now() WHERE id = $1`, [row.id]);
      stats.equipment.deactivated++;
    }
  }

  // ---- Summary ----
  console.log('\n=== Summary ===');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`${k.padEnd(10)} inserted=${v.inserted}  updated=${v.updated}  kept=${v.kept}  deactivated=${v.deactivated}`);
  }

  console.log('\nSync complete.');
} catch (err) {
  console.error('Sync failed:', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
