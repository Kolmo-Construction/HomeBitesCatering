/**
 * One-off: re-point Kebab Party menu items at existing recipes after the
 * dedup (f28b13a) left 4 kept items pointing at recipe IDs that were
 * deleted at some earlier cleanup. Meanwhile 6 valid recipes became
 * orphaned with no menu-item reference.
 *
 * Strategy:
 *   1. Build the set of living recipe IDs.
 *   2. Build a name→id map of living recipes whose name matches kabob/kebab.
 *   3. For every menu item on menu #34 where recipeId is null OR points at a
 *      non-existent row, find a living recipe whose normalized name matches
 *      the item's normalized name and repoint to it.
 *
 * Idempotent: nothing to do after it runs cleanly.
 */
import { db } from "../server/db";
import { menus, recipes } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

type Item = { id: string; name: string; recipeId?: number | null; [k: string]: any };

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const allRecipes = await db
    .select({ id: recipes.id, name: recipes.name })
    .from(recipes);
  const livingIds = new Set(allRecipes.map((r) => r.id));
  const byNormName = new Map<string, number>();
  for (const r of allRecipes) {
    const key = normalize(r.name);
    if (!byNormName.has(key)) byNormName.set(key, r.id);
  }

  const [menu] = await db
    .select()
    .from(menus)
    .where(eq(menus.themeKey, "kebab"));
  if (!menu) {
    console.log("No Kebab Party menu.");
    process.exit(0);
  }

  const cats = { ...((menu.categoryItems as any) || {}) } as Record<string, Item[]>;
  let fixed = 0;
  let stillMissing: Array<{ id: string; name: string }> = [];

  for (const [catName, items] of Object.entries(cats)) {
    for (const it of items) {
      const hasValidRecipe = it.recipeId != null && livingIds.has(it.recipeId);
      if (hasValidRecipe) continue;
      const key = normalize(it.name);
      const match = byNormName.get(key);
      if (match) {
        const before = it.recipeId;
        it.recipeId = match;
        fixed++;
        console.log(
          `  ✓ [${catName}] ${it.id}  "${it.name}"  recipeId ${before ?? "null"} → ${match}`,
        );
      } else {
        stillMissing.push({ id: it.id, name: it.name });
      }
    }
  }

  if (fixed > 0) {
    await db
      .update(menus)
      .set({ categoryItems: cats as any, updatedAt: new Date() })
      .where(eq(menus.id, menu.id));
  }

  console.log(`\nRepointed ${fixed} menu item(s) to existing recipes.`);
  if (stillMissing.length > 0) {
    console.log(
      `\n${stillMissing.length} item(s) still have no matching recipe and will need one created:`,
    );
    for (const m of stillMissing) console.log(`  ${m.id}  ${m.name}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
