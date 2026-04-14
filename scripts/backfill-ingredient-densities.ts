/**
 * Backfill unit conversions on existing base ingredients from the density
 * library. Idempotent — ingredients that already have any unitConversions set
 * are left untouched.
 *
 * Run with:
 *   npx tsx scripts/backfill-ingredient-densities.ts          # dry run
 *   npx tsx scripts/backfill-ingredient-densities.ts --apply  # write changes
 *
 * Requires DATABASE_URL in the environment.
 */
import "dotenv/config";
import pg from "pg";
import {
  suggestConversionsForIngredient,
  findDensityForIngredient,
} from "../shared/ingredientDensities";

const { Client } = pg;

async function main() {
  const dryRun = !process.argv.includes("--apply");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<{
      id: number;
      name: string;
      category: string;
      purchase_unit: string;
      unit_conversions: Record<string, number> | null;
      yield_pct: string | null;
    }>(
      `SELECT id, name, category, purchase_unit, unit_conversions, yield_pct
         FROM base_ingredients
         ORDER BY name`,
    );

    let convUpdated = 0;
    let convSkipped = 0;
    let yieldUpdated = 0;
    let unmatched = 0;
    const matches: Array<{ id: number; name: string; matched: string }> = [];
    const misses: string[] = [];

    for (const row of rows) {
      const density = findDensityForIngredient(row.name, row.category);
      if (!density) {
        unmatched++;
        misses.push(row.name);
        continue;
      }

      const existing = row.unit_conversions ?? {};
      const hasExistingConv = Object.keys(existing).length > 0;
      const shouldBackfillYield =
        row.yield_pct == null &&
        density.yieldPct != null &&
        density.yieldPct > 0 &&
        density.yieldPct < 1;

      // Case A — already has conversions AND yield is already set: nothing to do.
      if (hasExistingConv && !shouldBackfillYield) {
        convSkipped++;
        continue;
      }

      let didSomething = false;

      if (!hasExistingConv) {
        const { conversions } = suggestConversionsForIngredient(
          row.name,
          row.purchase_unit,
          row.category,
        );
        if (Object.keys(conversions).length > 0) {
          if (!dryRun) {
            await client.query(
              `UPDATE base_ingredients
                  SET unit_conversions = $1::jsonb,
                      updated_at = NOW()
                WHERE id = $2`,
              [JSON.stringify(conversions), row.id],
            );
          }
          convUpdated++;
          didSomething = true;
        }
      }

      if (shouldBackfillYield) {
        if (!dryRun) {
          await client.query(
            `UPDATE base_ingredients
                SET yield_pct = $1,
                    updated_at = NOW()
              WHERE id = $2`,
            [String(density.yieldPct), row.id],
          );
        }
        yieldUpdated++;
        didSomething = true;
      }

      if (didSomething) {
        matches.push({ id: row.id, name: row.name, matched: density.matchKey });
      } else {
        convSkipped++;
      }
    }

    console.log("");
    console.log(`Scanned:   ${rows.length}`);
    console.log(
      `Conversions updated: ${convUpdated}${dryRun ? " (dry run — no writes)" : ""}`,
    );
    console.log(`Yield updated:       ${yieldUpdated}${dryRun ? " (dry run)" : ""}`);
    console.log(`Skipped (already set): ${convSkipped}`);
    console.log(`Unmatched:           ${unmatched}`);
    console.log("");
    if (matches.length > 0) {
      console.log("Sample matches:");
      for (const m of matches.slice(0, 20)) {
        console.log(`  #${m.id}  ${m.name}  →  ${m.matched}`);
      }
    }
    if (misses.length > 0) {
      console.log("");
      console.log("Unmatched ingredients (first 30):");
      for (const name of misses.slice(0, 30)) {
        console.log(`  - ${name}`);
      }
    }
    if (dryRun) {
      console.log("");
      console.log("Run with --apply to persist changes.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
