/**
 * Read-only audit: kabob/kebab recipes duplicated in the recipes table?
 */
import { db } from "../server/db";
import { recipes } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ id: recipes.id, name: recipes.name, category: recipes.category })
    .from(recipes)
    .where(sql`lower(${recipes.name}) LIKE '%kabob%' OR lower(${recipes.name}) LIKE '%kebab%'`)
    .orderBy(sql`lower(${recipes.name}), ${recipes.id}`);

  console.log(`All kabob/kebab recipes (${rows.length}):`);
  for (const r of rows) console.log(`  id=${r.id}  ${r.name}`);

  console.log(`\n— grouped by normalized name —`);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const dupes = [...groups.entries()].filter(([, v]) => v.length > 1);
  if (dupes.length === 0) {
    console.log("No exact-normalized-name duplicates found.");
  } else {
    for (const [, list] of dupes) {
      console.log(
        `  "${list[0].name.trim()}" appears ${list.length}x → ids ${list
          .map((r) => r.id)
          .join(", ")}`,
      );
    }
  }

  // Orphan check — recipes used by menu #34 that no longer have a menu item
  // pointing at them after the dedup.
  const { menus } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");
  const [menu] = await db.select().from(menus).where(eq(menus.themeKey, "kebab"));
  const referenced = new Set<number>();
  const cats = (menu?.categoryItems as any) || {};
  for (const items of Object.values(cats)) {
    for (const it of items as any[]) {
      if (it.recipeId) referenced.add(it.recipeId);
    }
  }
  const orphans = rows.filter((r) => !referenced.has(r.id));
  console.log(
    `\nRecipes with 'kabob'/'kebab' name that are NOT referenced by menu #34: ${orphans.length}`,
  );
  for (const o of orphans) console.log(`  id=${o.id}  ${o.name}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
