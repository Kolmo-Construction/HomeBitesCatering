/**
 * One-off: move the 10 Kebab Party "Kabobs …" items from category="side"
 * into category="protein". They're mains, not sides, and currently get
 * rendered in the wrong section of the inquiry form's menu picker.
 *
 * Usage:   tsx scripts/fix-kebab-kabob-category.ts
 *
 * Targets the Kebab Party menu (themeKey=kebab) specifically. Safe to
 * re-run; a second pass finds nothing to move.
 */
import { db } from "../server/db";
import { menus } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const [menu] = await db
    .select()
    .from(menus)
    .where(eq(menus.themeKey, "kebab"));
  if (!menu) {
    console.log("No Kebab Party menu found.");
    process.exit(0);
  }

  const cats = { ...((menu.categoryItems as any) || {}) } as Record<
    string,
    Array<{ id: string; name: string; [k: string]: any }>
  >;
  const side = cats.side || [];
  const protein = cats.protein || [];

  const isKabob = (n: string) =>
    /kabob|kebab/i.test(n || "");

  const toMove = side.filter((it) => isKabob(it.name));
  if (toMove.length === 0) {
    console.log("Nothing to move — no Kabobs found under side.");
    process.exit(0);
  }

  cats.side = side.filter((it) => !isKabob(it.name));
  cats.protein = [...protein, ...toMove];

  console.log(
    `Moving ${toMove.length} items from 'side' → 'protein' on menu #${menu.id} (${menu.name}):`,
  );
  for (const it of toMove) console.log(`  • ${it.name}`);

  await db
    .update(menus)
    .set({ categoryItems: cats as any, updatedAt: new Date() })
    .where(eq(menus.id, menu.id));

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
