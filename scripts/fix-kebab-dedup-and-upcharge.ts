/**
 * One-off:
 *   1. Dedupe the Greek-style Kabobs on menu #34 (Kebab Party). The prior
 *      side→protein move left pairs like "Kabobs Lamb- Greek Style" +
 *      "Kabobs Lamb - Greek Style" (differing only by spacing around the
 *      dash). Keep the first occurrence of each normalized name.
 *   2. Add a +$2.00 upcharge (upchargeCents=200) to the remaining
 *      "Kabobs Pork Tenderloin - Greek Style" entry — matches the pricing
 *      treatment of Lamb Kofta / Adana Kabobs.
 *
 * Idempotent: re-running after a clean state finds no duplicates and won't
 * change the Pork Tenderloin upcharge if it already equals 200.
 */
import { db } from "../server/db";
import { menus } from "../shared/schema";
import { eq } from "drizzle-orm";

type Item = {
  id: string;
  name: string;
  upchargeCents?: number;
  [k: string]: any;
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const [menu] = await db
    .select()
    .from(menus)
    .where(eq(menus.themeKey, "kebab"));
  if (!menu) {
    console.log("No Kebab Party menu found.");
    process.exit(0);
  }

  const cats = { ...((menu.categoryItems as any) || {}) } as Record<string, Item[]>;
  const protein = [...(cats.protein || [])];

  // Dedupe by normalized name — first wins. Only collapse within Kabob-family
  // items so we don't accidentally dedupe unrelated products.
  const seen = new Set<string>();
  const kept: Item[] = [];
  let removed = 0;
  for (const it of protein) {
    const isKabob = /kabob|kebab/i.test(it.name);
    if (!isKabob) {
      kept.push(it);
      continue;
    }
    const key = normalize(it.name);
    if (seen.has(key)) {
      console.log(`  ✗ drop dup: ${it.id}  ${it.name}`);
      removed++;
      continue;
    }
    seen.add(key);
    kept.push(it);
  }

  // Add $2 upcharge to Pork Tenderloin.
  let upcharged = 0;
  for (const it of kept) {
    if (/pork\s*tenderloin/i.test(it.name) && /kabob/i.test(it.name)) {
      if (it.upchargeCents !== 200) {
        console.log(`  + $2 upcharge on ${it.id}  ${it.name}`);
        it.upchargeCents = 200;
        upcharged++;
      }
    }
  }

  cats.protein = kept;

  await db
    .update(menus)
    .set({ categoryItems: cats as any, updatedAt: new Date() })
    .where(eq(menus.id, menu.id));

  console.log(`\nDone. Removed ${removed} duplicate(s), added $2 upcharge on ${upcharged} item(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
