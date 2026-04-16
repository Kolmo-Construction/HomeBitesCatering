/**
 * Import "Taste of Italy" recipes from the master spreadsheet.
 *
 * Reads the Excel file, groups rows by recipe, matches or creates
 * base_ingredients, then creates each recipe with components and
 * preparation steps via the running API server.
 *
 * Usage:  npx tsx scripts/import-taste-of-italy.ts
 * Requires the dev server to be running (npm run dev).
 */

import XLSX from "xlsx";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Unit normalisation ──────────────────────────────────────────────
const UNIT_MAP: Record<string, string> = {
  lbs: "pound",
  lb: "pound",
  quarts: "quart",
  quart: "quart",
  cups: "cup",
  cup: "cup",
  tbsp: "tablespoon",
  tsp: "teaspoon",
  each: "each",
  heads: "each",
  sprigs: "each",
  lemons: "each",
  cloves: "each",
  "or cloves": "each",
  gallon: "gallon",
  gallons: "gallon",
  slices: "each",
  leaves: "each",
  stalk: "each",
  "1.5l": "liter",
};

function normaliseUnit(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return UNIT_MAP[lower] || lower;
}

// ── Quantity parsing ────────────────────────────────────────────────
// "3-4" → 3.5 (average), "pinch" → 0.125, "—" → null
function parseQuantity(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "—" || s === "-" || s === "") return null;
  if (s.toLowerCase() === "pinch") return 0.125;
  if (s.includes("-")) {
    const [lo, hi] = s.split("-").map(Number);
    if (!isNaN(lo) && !isNaN(hi)) return (lo + hi) / 2;
    if (!isNaN(lo)) return lo;
    return null;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── Process-only rows (not real ingredients) ────────────────────────
const PROCESS_KEYWORDS = [
  "assemble",
  "bake",
  "broil",
  "combine",
  "sear",
  "oven finish",
  "sauce finish",
];
function isProcessRow(ingredient: string): boolean {
  return PROCESS_KEYWORDS.includes(ingredient.trim().toLowerCase());
}

// ── Ingredient name → purchase unit guess ───────────────────────────
function guessPurchaseUnit(name: string, unit: string): string {
  const n = name.toLowerCase();
  if (n.includes("wine") || n.includes("vinegar") || n.includes("oil"))
    return "liter";
  if (n.includes("stock") || n.includes("cream") || n.includes("milk"))
    return "gallon";
  if (unit === "each") return "each";
  return "pound";
}

// ── Fuzzy ingredient matching ───────────────────────────────────────
interface BaseIngredient {
  id: number;
  name: string;
  purchase_unit: string;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatch(
  name: string,
  existing: BaseIngredient[]
): BaseIngredient | null {
  const norm = normalise(name);

  // Exact normalised match
  const exact = existing.find((e) => normalise(e.name) === norm);
  if (exact) return exact;

  // Contains match (shorter name contained in longer)
  const contains = existing.find((e) => {
    const en = normalise(e.name);
    return en.includes(norm) || norm.includes(en);
  });
  if (contains) return contains;

  return null;
}

// ── Spreadsheet row type ────────────────────────────────────────────
interface SheetRow {
  Menu: string;
  "Recipe Name": string;
  "Recipe Yield": number;
  Category: string;
  Ingredient: string;
  Quantity: string | number;
  Unit: string;
  "Prep Step #": number;
  "Prep Step Title": string;
  "Prep Description": string;
  "Labor Minutes": number;
  Notes?: string;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const filePath = "/Users/pascalmatta/Downloads/taste_of_italy_master_sheet.xlsx";
  const wb = XLSX.readFile(filePath);
  const rows: SheetRow[] = XLSX.utils.sheet_to_json(wb.Sheets["Master Recipes"]);

  console.log(`Read ${rows.length} rows from spreadsheet\n`);

  // Load existing base ingredients
  const { rows: existingIngredients } = await pool.query<BaseIngredient>(
    "SELECT id, name, purchase_unit FROM base_ingredients ORDER BY name"
  );
  console.log(`Found ${existingIngredients.length} existing base ingredients`);

  // Load existing recipes to skip duplicates
  const { rows: existingRecipes } = await pool.query<{ name: string }>(
    "SELECT name FROM recipes"
  );
  const existingRecipeNames = new Set(
    existingRecipes.map((r) => normalise(r.name))
  );

  // Group rows by recipe name
  const recipeMap = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const name = row["Recipe Name"];
    if (!recipeMap.has(name)) recipeMap.set(name, []);
    recipeMap.get(name)!.push(row);
  }

  console.log(`Found ${recipeMap.size} recipes to process\n`);

  let created = 0;
  let skipped = 0;

  for (const [recipeName, recipeRows] of recipeMap) {
    // Skip if already exists
    if (existingRecipeNames.has(normalise(recipeName))) {
      console.log(`SKIP  "${recipeName}" — already exists`);
      skipped++;
      continue;
    }

    const yieldVal = recipeRows[0]["Recipe Yield"] || 1;

    // ── Build preparation steps ─────────────────────────────────
    const stepMap = new Map<
      number,
      { title: string; instruction: string; duration: number }
    >();
    for (const row of recipeRows) {
      const stepNum = row["Prep Step #"];
      if (stepNum && !stepMap.has(stepNum)) {
        stepMap.set(stepNum, {
          title: row["Prep Step Title"] || `Step ${stepNum}`,
          instruction: row["Prep Description"] || "",
          duration: row["Labor Minutes"] || 0,
        });
      }
    }

    const preparationSteps = [...stepMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([num, step]) => ({
        stepNumber: num,
        title: step.title,
        instruction: step.instruction,
        duration: step.duration || undefined,
      }));

    // Total labor in hours
    const totalLaborMinutes = preparationSteps.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );
    const laborHours = +(totalLaborMinutes / 60).toFixed(2);

    // ── Build components (ingredients) ──────────────────────────
    const components: Array<{
      baseIngredientId: number;
      quantity: number;
      unit: string;
      prepNotes: string | null;
    }> = [];

    for (const row of recipeRows) {
      const ingName = (row.Ingredient || "").trim();
      if (!ingName || isProcessRow(ingName)) continue;

      const qty = parseQuantity(row.Quantity);
      const rawUnit = (row.Unit || "").trim();
      if (qty === null || rawUnit === "—" || rawUnit === "") {
        // This is a "to taste" / process row — skip as component
        continue;
      }

      const unit = normaliseUnit(rawUnit);

      // Find or create base ingredient
      let match = findMatch(ingName, existingIngredients);
      if (!match) {
        // Create new base ingredient with placeholder price
        const purchaseUnit = guessPurchaseUnit(ingName, unit);
        const { rows: inserted } = await pool.query(
          `INSERT INTO base_ingredients (name, category, purchase_price, purchase_unit, purchase_quantity)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, purchase_unit`,
          [ingName, row.Category?.toLowerCase() || "other", "0.00", purchaseUnit, "1"]
        );
        match = inserted[0] as BaseIngredient;
        existingIngredients.push(match); // cache it
        console.log(`  NEW ingredient: "${ingName}" → #${match.id} (${purchaseUnit})`);
      }

      components.push({
        baseIngredientId: match.id,
        quantity: qty,
        unit,
        prepNotes: row.Category || null,
      });
    }

    // ── Create recipe via direct DB insert (same as API logic) ──
    const { rows: newRecipes } = await pool.query(
      `INSERT INTO recipes (name, description, category, yield, yield_unit, labor_hours, notes, preparation_steps, dietary_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        recipeName,
        `${recipeName} — Taste of Italy menu, yields ${yieldVal} servings`,
        "entree",
        String(yieldVal),
        "serving",
        String(laborHours),
        `Imported from Taste of Italy master sheet`,
        JSON.stringify(preparationSteps),
        JSON.stringify({ allergenWarnings: [], manualDesignations: [] }),
      ]
    );

    const recipeId = newRecipes[0].id;

    // Insert components
    if (components.length > 0) {
      const placeholders: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const comp of components) {
        placeholders.push(
          `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`
        );
        values.push(
          recipeId,
          comp.baseIngredientId,
          String(comp.quantity),
          comp.unit,
          comp.prepNotes
        );
        idx += 5;
      }

      await pool.query(
        `INSERT INTO recipe_components (recipe_id, base_ingredient_id, quantity, unit, prep_notes)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    console.log(
      `CREATED "${recipeName}" → recipe #${recipeId} (${components.length} ingredients, ${preparationSteps.length} steps, ${laborHours}h labor)`
    );
    created++;
  }

  console.log(
    `\nDone! Created ${created} recipes, skipped ${skipped} duplicates.`
  );
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
