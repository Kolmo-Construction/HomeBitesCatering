// Dedup base ingredients - keeps the one with a SKU (or highest ID), deletes the rest
const API_BASE = 'http://localhost:3002/api/ingredients';

const resp = await fetch(`${API_BASE}/base-ingredients`);
const items = await resp.json();

// Group by normalized name
const byName = {};
for (const item of items) {
  const key = item.name.toLowerCase().trim().replace(/[–—-]+/g, '-').replace(/\s+/g, ' ');
  if (!byName[key]) byName[key] = [];
  byName[key].push(item);
}

const dupes = Object.entries(byName).filter(([k, v]) => v.length > 1);
console.log(`Found ${dupes.length} duplicate groups across ${items.length} total ingredients\n`);

let deleted = 0;
let skippedInUse = 0;
let errors = 0;

for (const [name, group] of dupes) {
  // Keep the one with SKU (prefer highest ID = freshest import), or highest ID
  const withSku = group.filter(g => g.sku && g.sku.trim());
  let keep;
  if (withSku.length > 0) {
    keep = withSku.reduce((a, b) => a.id > b.id ? a : b);
  } else {
    keep = group.reduce((a, b) => a.id > b.id ? a : b);
  }

  const toDelete = group.filter(g => g.id !== keep.id);

  for (const dup of toDelete) {
    try {
      const delResp = await fetch(`${API_BASE}/base-ingredients/${dup.id}`, { method: 'DELETE' });
      if (delResp.ok) {
        deleted++;
      } else {
        const body = await delResp.json();
        if (body.message && body.message.includes('used in')) {
          // This duplicate is referenced in a recipe - can't delete
          skippedInUse++;
          console.log(`  KEPT (in use): id=${dup.id} "${dup.name}" - ${body.message}`);
        } else {
          errors++;
          console.log(`  ERROR: id=${dup.id} "${dup.name}" - ${body.message}`);
        }
      }
    } catch (err) {
      errors++;
      console.log(`  ERROR: id=${dup.id} "${dup.name}" - ${err.message}`);
    }
  }
}

// Verify final count
const finalResp = await fetch(`${API_BASE}/base-ingredients`);
const finalItems = await finalResp.json();

console.log(`\n========== DEDUP COMPLETE ==========`);
console.log(`Deleted: ${deleted}`);
console.log(`Kept (in use by recipes): ${skippedInUse}`);
console.log(`Errors: ${errors}`);
console.log(`Final ingredient count: ${finalItems.length}`);
