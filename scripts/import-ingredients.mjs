import fs from 'fs';

// Category mapping (CSV value → app category)
const CATEGORY_MAPPING = {
  "meat & poultry": "meat",
  "seafood": "seafood",
  "produce": "produce",
  "dairy & eggs": "dairy",
  "grains & pasta": "dry_goods",
  "baking & dry goods": "dry_goods",
  "bread & pastries": "dry_goods",
  "canned": "other",
  "condiments & sauces": "other",
  "condiments & sauces,": "other",
  "spices": "spices",
  "beverages": "beverages",
  "frozen": "other",
  "base recipe": "other",
  "other": "other",
};

// Unit mapping
const UNIT_MAPPING = {
  "pound": "pound",
  "ounce": "ounce",
  "gallon": "gallon",
  "liter": "liter",
  "kilogram": "kilogram",
  "each": "each",
  "fl oz": "ounce",
  "#10 can": "each",
};

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const lines = [];

  // Split into lines respecting quoted newlines
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip \r
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  // Parse each line into fields
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    rows.push(fields);
  }

  return rows;
}

const csvPath = '/Users/pascalmatta/Downloads/Home Bites Master Ingredient_pricelist - Sheet1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const allRows = parseCSV(csvContent);

// First row is headers
const headers = allRows[0];
console.log('Headers:', headers.slice(0, 11).join(' | '));
console.log(`Total data rows: ${allRows.length - 1}`);

const ingredients = [];
const skipped = [];

for (let i = 1; i < allRows.length; i++) {
  const row = allRows[i];
  const name = (row[0] || '').trim();
  const categoryRaw = (row[1] || '').trim().toLowerCase().replace(/,\s*$/, '');
  const purchasePriceStr = (row[2] || '').replace(/[$,\s]/g, '');
  // row[3] = Pack Size (not used directly)
  const purchaseUnitRaw = (row[4] || '').trim().toLowerCase();
  const purchaseQuantityStr = (row[5] || '').replace(/[$,\s]/g, '');
  const supplier = (row[7] || '').trim();
  const sku = (row[8] || '').trim();

  // Skip empty rows
  if (!name) {
    continue;
  }

  // Map category
  const category = CATEGORY_MAPPING[categoryRaw] || 'other';

  // Parse price
  const purchasePrice = parseFloat(purchasePriceStr);
  if (isNaN(purchasePrice) || purchasePrice <= 0) {
    skipped.push({ row: i + 1, name, reason: `invalid price: "${row[2]}"` });
    continue;
  }

  // Parse quantity
  let purchaseQuantity = parseFloat(purchaseQuantityStr);
  if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
    purchaseQuantity = 1;
  }

  // Map unit
  const purchaseUnit = UNIT_MAPPING[purchaseUnitRaw] || purchaseUnitRaw || 'each';
  if (!purchaseUnit) {
    skipped.push({ row: i + 1, name, reason: 'no unit' });
    continue;
  }

  ingredients.push({
    name,
    category,
    purchasePrice,
    purchaseUnit,
    purchaseQuantity,
    supplier: supplier || undefined,
    sku: sku || undefined,
  });
}

console.log(`\nValid ingredients to import: ${ingredients.length}`);
console.log(`Skipped rows: ${skipped.length}`);
if (skipped.length > 0) {
  console.log('\nSkipped details:');
  skipped.forEach(s => console.log(`  Row ${s.row}: "${s.name}" - ${s.reason}`));
}

// Send to batch import API in chunks of 50
const CHUNK_SIZE = 50;
const API_URL = 'http://localhost:3002/api/ingredients/base-ingredients/batch-import';

let totalImported = 0;
let totalFailed = 0;
let allErrors = [];

for (let i = 0; i < ingredients.length; i += CHUNK_SIZE) {
  const chunk = ingredients.slice(i, i + CHUNK_SIZE);
  const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
  const totalChunks = Math.ceil(ingredients.length / CHUNK_SIZE);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: chunk }),
    });

    const result = await response.json();

    if (response.ok) {
      totalImported += result.imported || 0;
      totalFailed += result.failed || 0;
      if (result.errors) {
        allErrors.push(...result.errors);
      }
      console.log(`Chunk ${chunkNum}/${totalChunks}: imported ${result.imported}, failed ${result.failed || 0}`);
    } else {
      console.error(`Chunk ${chunkNum}/${totalChunks} failed: ${result.message}`);
      totalFailed += chunk.length;
    }
  } catch (err) {
    console.error(`Chunk ${chunkNum}/${totalChunks} error: ${err.message}`);
    totalFailed += chunk.length;
  }
}

console.log(`\n========== IMPORT COMPLETE ==========`);
console.log(`Total imported: ${totalImported}`);
console.log(`Total failed: ${totalFailed}`);
if (allErrors.length > 0) {
  console.log(`\nFailed rows (first 30):`);
  allErrors.slice(0, 30).forEach(e => {
    const name = e.data?.name || 'unknown';
    const errMsg = e.errors?.sku || JSON.stringify(e.errors).substring(0, 100);
    console.log(`  Row ${e.row}: "${name}" - ${errMsg}`);
  });
  if (allErrors.length > 30) {
    console.log(`  ... and ${allErrors.length - 30} more`);
  }
}
