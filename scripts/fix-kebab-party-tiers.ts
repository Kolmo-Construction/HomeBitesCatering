/**
 * One-off: update Kebab Party package tier descriptions + selection limits to
 * the corrected "What's Included" spec.
 *
 *   Bronze  $35  3 proteins, 2 sides, 1 salad
 *   Silver  $39  4 proteins, 3 sides, 2 salads
 *   Gold    $49  4 proteins, 4 sides, 3 salads, spreads selection, pita bread
 *   Diamond $63  5 proteins, 4 sides, 3 salads, spreads selection, meze platter, pita bread
 *
 * Keeps existing spread counts for Gold (5) and Diamond (6) since the spec
 * said "spreads selection" without a number. Pita Bread / Meze Platter go
 * into the `included` array as always-included extras.
 *
 * Idempotent: re-running after a clean state is a no-op.
 */
import { db } from "../server/db";
import { menus } from "../shared/schema";
import type { MenuPackageTier } from "../shared/schema";
import { eq } from "drizzle-orm";

const TARGETS: Record<string, Partial<MenuPackageTier>> = {
  bronze: {
    description: "3 proteins, 2 sides, 1 salad",
    selectionLimits: { protein: 3, side: 2, salad: 1 },
    included: [],
  },
  silver: {
    description: "4 proteins, 3 sides, 2 salads",
    selectionLimits: { protein: 4, side: 3, salad: 2 },
    included: [],
  },
  gold: {
    description: "4 proteins, 4 sides, 3 salads, 3 spreads, pita bread",
    selectionLimits: { protein: 4, side: 4, salad: 3, spread: 3 },
    included: ["Pita Bread"],
  },
  diamond: {
    description: "5 proteins, 4 sides, 3 salads, 3 spreads, meze platter, pita bread",
    selectionLimits: { protein: 5, side: 4, salad: 3, spread: 3 },
    included: ["Pita Bread", "Meze Platter"],
  },
};

async function main() {
  const [menu] = await db.select().from(menus).where(eq(menus.themeKey, "kebab"));
  if (!menu) {
    console.log("No Kebab Party menu found.");
    process.exit(0);
  }

  const packages = [...((menu.packages as MenuPackageTier[]) || [])];
  let changed = 0;

  for (const pkg of packages) {
    const target = TARGETS[pkg.tierKey];
    if (!target) continue;
    const stable = (v: any) =>
      JSON.stringify(v, Object.keys(v || {}).sort());
    const before = {
      description: pkg.description,
      selectionLimits: stable(pkg.selectionLimits),
      included: stable(pkg.included ?? []),
    };
    pkg.description = target.description!;
    pkg.selectionLimits = target.selectionLimits!;
    pkg.included = target.included!;
    const after = {
      description: pkg.description,
      selectionLimits: stable(pkg.selectionLimits),
      included: stable(pkg.included),
    };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      console.log(`  ~ ${pkg.tierKey}: ${pkg.description}`);
      changed++;
    }
  }

  if (changed === 0) {
    console.log("Already up to date. No changes.");
    process.exit(0);
  }

  await db
    .update(menus)
    .set({ packages: packages as any, updatedAt: new Date() })
    .where(eq(menus.id, menu.id));

  console.log(`\nDone. Updated ${changed} tier(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
