// Seeds the catalog tables (appetizer_categories, appetizer_items,
// dessert_items, equipment_categories, equipment_items, pricing_config)
// from the values that used to be hardcoded in client/src/pages/Inquire.tsx
// and server/utils/quotePricing.ts.
//
// Idempotent: rows are matched by stable keys (category_key, name) so it can
// be re-run safely. New items get inserted; existing rows are NOT modified
// (admins may have tweaked prices through the UI).
//
// Run with: node scripts/seed-catalog.mjs

import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// --- Appetizers ---
const appetizerCategories = [
  { key: 'tea_sandwiches', label: 'Tea Sandwiches', perPerson: false, servingPack: null, order: 1, items: [
    { name: 'Caprese', priceCents: 195, unit: 'per_piece' },
    { name: 'Chicken Cranberry', priceCents: 200, unit: 'per_piece' },
    { name: 'Gravlax', priceCents: 275, unit: 'per_piece' },
    { name: 'Crab Salad', priceCents: 300, unit: 'per_piece' },
  ]},
  { key: 'shooters', label: 'Shooters', perPerson: false, servingPack: null, order: 2, items: [
    { name: 'Chicken Satay', priceCents: 245, unit: 'per_piece' },
    { name: 'Greek Village', priceCents: 225, unit: 'per_piece' },
    { name: 'Gazpacho w/ Shrimp', priceCents: 275, unit: 'per_piece' },
    { name: 'Bloody Mary w/ Lobster', priceCents: 475, unit: 'per_piece' },
  ]},
  { key: 'mini_skewers', label: 'Mini Skewers', perPerson: false, servingPack: null, order: 3, items: [
    { name: 'Korean BBQ Pork Belly', priceCents: 275, unit: 'per_piece' },
    { name: 'Chicken Teriyaki', priceCents: 275, unit: 'per_piece' },
    { name: 'Mediterranean Shrimp', priceCents: 275, unit: 'per_piece' },
    { name: 'Caprese', priceCents: 225, unit: 'per_piece' },
  ]},
  { key: 'canapes', label: 'Canapes', perPerson: false, servingPack: null, order: 4, items: [
    { name: 'Watermelon Radish', priceCents: 150, unit: 'per_piece' },
    { name: 'French Onion Tartlets', priceCents: 275, unit: 'per_piece' },
    { name: 'Crostini Goat Cheese', priceCents: 195, unit: 'per_piece' },
    { name: 'Focaccia Pizza Bites', priceCents: 275, unit: 'per_piece' },
  ]},
  { key: 'vol_au_vents', label: 'Vol au Vents', perPerson: false, servingPack: null, order: 5, items: [
    { name: 'Gravlax Cream Cheese', priceCents: 300, unit: 'per_piece' },
    { name: 'Spinach Feta Leek', priceCents: 300, unit: 'per_piece' },
    { name: 'Melted Brie Cranberry', priceCents: 350, unit: 'per_piece' },
    { name: 'Tuna Tartare', priceCents: 375, unit: 'per_piece' },
  ]},
  { key: 'simple_fare', label: 'Simple Fare', perPerson: false, servingPack: null, order: 6, items: [
    { name: 'Loaded Potato Skins', priceCents: 195, unit: 'per_piece' },
    { name: 'Stuffed Mushrooms', priceCents: 225, unit: 'per_piece' },
    { name: 'Chicken Wings', priceCents: 265, unit: 'per_piece' },
    { name: 'Lobster Rolls', priceCents: 750, unit: 'per_piece' },
  ]},
  { key: 'charcuterie', label: 'Charcuterie', perPerson: true, servingPack: null, order: 7, items: [
    { name: 'Cheese & Fruit', priceCents: 1000, unit: 'per_person' },
    { name: 'Meat Cheese Fruit', priceCents: 1200, unit: 'per_person' },
    { name: 'Mexican', priceCents: 1300, unit: 'per_person' },
    { name: 'Mediterranean', priceCents: 1400, unit: 'per_person' },
    { name: 'Premium', priceCents: 1800, unit: 'per_person' },
  ]},
  { key: 'spreads', label: 'Spreads', perPerson: false, servingPack: {
    pricePerServingCents: 650,
    flavorsToPick: 3,
    description: "Pick 3 spreads to make up your trio, then choose how many servings you'd like.",
  }, order: 8, items: [
    { name: 'Tzatziki', priceCents: 0, unit: 'flavor' },
    { name: 'Hummus', priceCents: 0, unit: 'flavor' },
    { name: 'Baba Ghanoush', priceCents: 0, unit: 'flavor' },
    { name: 'Spicy Feta', priceCents: 0, unit: 'flavor' },
  ]},
];

const desserts = [
  { name: 'Petit Fours', priceCents: 295, order: 1 },
  { name: 'Macaroons', priceCents: 275, order: 2 },
  { name: 'Cheesecake', priceCents: 575, order: 3 },
  { name: 'Baklava', priceCents: 525, order: 4 },
  { name: 'Cannolis', priceCents: 475, order: 5 },
  { name: 'Tiramisu Cups', priceCents: 575, order: 6 },
];

const equipmentCategories = [
  { key: 'linens', label: 'Linens', order: 1, items: [
    { name: 'Napkins', priceCents: 50, unit: 'each' },
    { name: 'Buffet Runners', priceCents: 2200, unit: 'each' },
    { name: '90" Tablecloths', priceCents: 2700, unit: 'each' },
  ]},
  { key: 'serving_ware', label: 'Serving Ware', order: 2, items: [
    { name: 'Biodegradable Set', priceCents: 225, unit: 'per_person' },
    { name: 'Premium Disposable', priceCents: 500, unit: 'per_person' },
    { name: 'China/Silverware', priceCents: 825, unit: 'per_person' },
  ]},
  { key: 'furniture', label: 'Furniture', order: 3, items: [
    { name: '8ft Rectangle Table', priceCents: 2700, unit: 'each' },
    { name: '6ft Rectangle Table', priceCents: 2400, unit: 'each' },
    { name: 'Round Table 60"', priceCents: 3000, unit: 'each' },
    { name: 'Folding Chairs', priceCents: 800, unit: 'each' },
  ]},
];

try {
  // --- Appetizers ---
  let catCount = 0, itemCount = 0;
  for (const cat of appetizerCategories) {
    const existing = await client.query(
      'SELECT id FROM appetizer_categories WHERE category_key = $1',
      [cat.key]
    );
    let categoryId;
    if (existing.rows.length === 0) {
      const { rows } = await client.query(
        `INSERT INTO appetizer_categories
          (category_key, label, per_person, serving_pack, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id`,
        [cat.key, cat.label, cat.perPerson, cat.servingPack ? JSON.stringify(cat.servingPack) : null, cat.order]
      );
      categoryId = rows[0].id;
      catCount++;
    } else {
      categoryId = existing.rows[0].id;
    }

    for (const item of cat.items) {
      const itemExists = await client.query(
        'SELECT id FROM appetizer_items WHERE category_id = $1 AND name = $2',
        [categoryId, item.name]
      );
      if (itemExists.rows.length === 0) {
        await client.query(
          `INSERT INTO appetizer_items
            (category_id, name, price_cents, unit, display_order, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [categoryId, item.name, item.priceCents, item.unit, cat.items.indexOf(item) + 1]
        );
        itemCount++;
      }
    }
  }
  console.log(`✓ Appetizers: ${catCount} new categories, ${itemCount} new items`);

  // --- Desserts ---
  let dessertCount = 0;
  for (const d of desserts) {
    const exists = await client.query(
      'SELECT id FROM dessert_items WHERE name = $1',
      [d.name]
    );
    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO dessert_items (name, price_cents, unit, display_order, is_active)
         VALUES ($1, $2, 'per_piece', $3, TRUE)`,
        [d.name, d.priceCents, d.order]
      );
      dessertCount++;
    }
  }
  console.log(`✓ Desserts: ${dessertCount} new items`);

  // --- Equipment ---
  let eqCatCount = 0, eqItemCount = 0;
  for (const cat of equipmentCategories) {
    const existing = await client.query(
      'SELECT id FROM equipment_categories WHERE category_key = $1',
      [cat.key]
    );
    let categoryId;
    if (existing.rows.length === 0) {
      const { rows } = await client.query(
        `INSERT INTO equipment_categories
          (category_key, label, display_order, is_active)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id`,
        [cat.key, cat.label, cat.order]
      );
      categoryId = rows[0].id;
      eqCatCount++;
    } else {
      categoryId = existing.rows[0].id;
    }

    for (const item of cat.items) {
      const itemExists = await client.query(
        'SELECT id FROM equipment_items WHERE category_id = $1 AND name = $2',
        [categoryId, item.name]
      );
      if (itemExists.rows.length === 0) {
        await client.query(
          `INSERT INTO equipment_items
            (category_id, name, price_cents, unit, display_order, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)`,
          [categoryId, item.name, item.priceCents, item.unit, cat.items.indexOf(item) + 1]
        );
        eqItemCount++;
      }
    }
  }
  console.log(`✓ Equipment: ${eqCatCount} new categories, ${eqItemCount} new items`);

  // --- Pricing config (single-row) ---
  const configExists = await client.query('SELECT id FROM pricing_config LIMIT 1');
  if (configExists.rows.length === 0) {
    // All columns have defaults; just insert an empty row.
    await client.query(`INSERT INTO pricing_config DEFAULT VALUES`);
    console.log(`✓ Pricing config: inserted default row`);
  } else {
    console.log(`✓ Pricing config: row already exists — not overwriting (edit via admin UI)`);
  }

  console.log('\nCatalog seed complete.');
} catch (err) {
  console.error('Seed failed:', err);
  process.exitCode = 1;
} finally {
  await client.end();
}
