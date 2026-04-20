/**
 * Audit: for every menu × category × item, report whether the item has a
 * recipeId link. Read-only.
 */
import { db } from "../server/db";
import { menus, recipes } from "../shared/schema";

async function main() {
  const allMenus = await db.select().from(menus);
  const allRecipes = await db.select().from(recipes);
  const recipeIds = new Set(allRecipes.map((r) => r.id));

  let total = 0;
  let linked = 0;
  let unlinkedSamples: Array<{ menu: string; cat: string; name: string }> = [];
  let brokenLinks: Array<{ menu: string; cat: string; name: string; recipeId: number }> = [];
  const byMenu: Record<
    string,
    { total: number; linked: number; byCat: Record<string, { total: number; linked: number }> }
  > = {};

  for (const menu of allMenus) {
    const cats = (menu.categoryItems as Record<string, any[]>) || {};
    byMenu[menu.name] = { total: 0, linked: 0, byCat: {} };

    for (const [cat, items] of Object.entries(cats)) {
      byMenu[menu.name].byCat[cat] ||= { total: 0, linked: 0 };
      for (const item of items || []) {
        total++;
        byMenu[menu.name].total++;
        byMenu[menu.name].byCat[cat].total++;
        if (item.recipeId) {
          if (recipeIds.has(item.recipeId)) {
            linked++;
            byMenu[menu.name].linked++;
            byMenu[menu.name].byCat[cat].linked++;
          } else {
            brokenLinks.push({
              menu: menu.name,
              cat,
              name: item.name,
              recipeId: item.recipeId,
            });
          }
        } else {
          unlinkedSamples.push({ menu: menu.name, cat, name: item.name });
        }
      }
    }
  }

  console.log(`\n=== Menu category items: recipe-link audit ===`);
  console.log(`Total items across all menus: ${total}`);
  console.log(`  Linked (valid recipeId): ${linked}`);
  console.log(`  Unlinked (no recipeId): ${unlinkedSamples.length}`);
  console.log(`  Broken (recipeId doesn't exist): ${brokenLinks.length}`);

  console.log(`\n=== Per menu ===`);
  for (const [name, m] of Object.entries(byMenu)) {
    const pct = m.total ? Math.round((m.linked / m.total) * 100) : 100;
    console.log(`\n${name}: ${m.linked}/${m.total} (${pct}%)`);
    for (const [cat, c] of Object.entries(m.byCat)) {
      const cpct = c.total ? Math.round((c.linked / c.total) * 100) : 100;
      console.log(`  ${cat}: ${c.linked}/${c.total} (${cpct}%)`);
    }
  }

  if (unlinkedSamples.length) {
    console.log(`\n=== Unlinked items (first 30) ===`);
    for (const s of unlinkedSamples.slice(0, 30)) {
      console.log(`  [${s.menu}] ${s.cat} → ${s.name}`);
    }
  }
  if (brokenLinks.length) {
    console.log(`\n=== Broken links ===`);
    for (const s of brokenLinks) {
      console.log(`  [${s.menu}] ${s.cat} → ${s.name}  (recipeId=${s.recipeId})`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
