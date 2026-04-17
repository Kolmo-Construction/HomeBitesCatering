/**
 * Generalized recipe importer.
 *
 * Reads one or more Excel workbooks with the standard 13-column layout
 * (Menu, Recipe Name, Recipe Yield, Category, Ingredient, Quantity, Unit,
 * Prep Step #, Prep Step Title, Prep Description, Labor Minutes, Notes, Tips),
 * processes every sheet in each workbook, groups rows by recipe, matches or
 * creates base_ingredients, and inserts recipes + recipe_components + prep
 * steps directly via the DB pool.
 *
 * Usage:
 *   npx tsx scripts/import-recipes.ts <file1.xlsx> [file2.xlsx ...]
 *   npx tsx scripts/import-recipes.ts /Users/pascalmatta/Downloads/recipes/*.xlsx
 *   npx tsx scripts/import-recipes.ts --dir /Users/pascalmatta/Downloads/recipes
 */

import XLSX from "xlsx";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Unit normalisation ──────────────────────────────────────────────
const UNIT_MAP: Record<string, string> = {
  lbs: "pound",
  lb: "pound",
  pound: "pound",
  pounds: "pound",
  oz: "ounce",
  ounce: "ounce",
  ounces: "ounce",
  quarts: "quart",
  quart: "quart",
  qt: "quart",
  cups: "cup",
  cup: "cup",
  tbsp: "tablespoon",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tsp: "teaspoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  each: "each",
  heads: "each",
  head: "each",
  sprigs: "each",
  sprig: "each",
  lemons: "each",
  cloves: "each",
  clove: "each",
  "or cloves": "each",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  slices: "each",
  leaves: "each",
  stalk: "each",
  stalks: "each",
  "1.5l": "liter",
  l: "liter",
  liter: "liter",
  liters: "liter",
  ml: "milliliter",
  g: "gram",
  gram: "gram",
  grams: "gram",
  kg: "kilogram",
};

function normaliseUnit(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return UNIT_MAP[lower] || lower;
}

// ── Quantity parsing ────────────────────────────────────────────────
function parseQuantity(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "—" || s === "-" || s === "") return null;
  if (s.toLowerCase() === "pinch") return 0.125;
  if (s.toLowerCase() === "to taste") return null;
  if (s.includes("-") && !s.startsWith("-")) {
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
  "roast",
  "simmer",
  "fry",
  "grill",
  "smoke",
  "rest",
  "chill",
  "serve",
];
function isProcessRow(ingredient: string): boolean {
  return PROCESS_KEYWORDS.includes(ingredient.trim().toLowerCase());
}

// ── Category inference from Menu column ─────────────────────────────
function inferRecipeCategory(menu: string, sheetName: string): string {
  const s = `${menu} ${sheetName}`.toLowerCase();
  if (s.includes("salad")) return "salad";
  if (s.includes("side")) return "side";
  if (s.includes("dessert")) return "dessert";
  if (s.includes("appetizer") || s.includes("starter")) return "appetizer";
  if (s.includes("sauce") || s.includes("dressing")) return "sauce";
  if (s.includes("salsa")) return "sauce";
  if (s.includes("beverage") || s.includes("drink")) return "beverage";
  if (s.includes("entree") || s.includes("entrée") || s.includes("main")) return "entree";
  // Master sheets with bare menu name (e.g. "Taste of Italy") are typically entrees
  return "entree";
}

// ── Ingredient name → purchase unit guess ───────────────────────────
function guessPurchaseUnit(name: string, unit: string): string {
  const n = name.toLowerCase();
  if (n.includes("wine") || n.includes("vinegar") || n.includes("oil"))
    return "liter";
  if (n.includes("stock") || n.includes("cream") || n.includes("milk") || n.includes("broth"))
    return "gallon";
  if (unit === "each") return "each";
  if (unit === "liter" || unit === "milliliter") return "liter";
  if (unit === "gallon" || unit === "quart" || unit === "cup") return "gallon";
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

function findMatch(name: string, existing: BaseIngredient[]): BaseIngredient | null {
  const norm = normalise(name);
  const exact = existing.find((e) => normalise(e.name) === norm);
  if (exact) return exact;
  const contains = existing.find((e) => {
    const en = normalise(e.name);
    return en.includes(norm) || norm.includes(en);
  });
  if (contains) return contains;
  return null;
}

// ── Spreadsheet row type ────────────────────────────────────────────
interface SheetRow {
  Menu?: string;
  "Recipe Name"?: string;
  "Recipe Yield"?: number;
  Category?: string;
  Ingredient?: string;
  Quantity?: string | number;
  Unit?: string;
  "Prep Step #"?: number;
  "Prep Step Title"?: string;
  "Prep Description"?: string;
  "Labor Minutes"?: number;
  Notes?: string;
  Tips?: string;
}

// ── CLI arg parsing ─────────────────────────────────────────────────
function resolveInputFiles(): string[] {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/import-recipes.ts <file.xlsx> [...]");
    console.error("   or: npx tsx scripts/import-recipes.ts --dir <directory>");
    process.exit(1);
  }
  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir") {
      const dir = args[++i];
      for (const f of fs.readdirSync(dir)) {
        if (f.toLowerCase().endsWith(".xlsx")) files.push(path.join(dir, f));
      }
    } else {
      files.push(args[i]);
    }
  }
  return files;
}

// ── Process a single sheet ──────────────────────────────────────────
async function processSheet(
  rows: SheetRow[],
  sheetName: string,
  sourceLabel: string,
  existingIngredients: BaseIngredient[],
  existingRecipeNames: Set<string>
): Promise<{ created: number; skipped: number }> {
  const recipeMap = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const name = row["Recipe Name"];
    if (!name) continue;
    if (!recipeMap.has(name)) recipeMap.set(name, []);
    recipeMap.get(name)!.push(row);
  }

  let created = 0;
  let skipped = 0;

  for (const [recipeName, recipeRows] of recipeMap) {
    if (existingRecipeNames.has(normalise(recipeName))) {
      console.log(`  SKIP  "${recipeName}" — already exists`);
      skipped++;
      continue;
    }

    const first = recipeRows[0];
    const menu = first.Menu || sheetName;
    const yieldVal = first["Recipe Yield"] || 1;
    const category = inferRecipeCategory(menu, sheetName);

    // Preparation steps (dedupe by step #)
    const stepMap = new Map<number, { title: string; instruction: string; duration: number }>();
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

    const totalLaborMinutes = preparationSteps.reduce((sum, s) => sum + (s.duration || 0), 0);
    const laborHours = +(totalLaborMinutes / 60).toFixed(2);

    // Collect unique tips as notes
    const tipsSet = new Set<string>();
    for (const row of recipeRows) {
      if (row.Tips) tipsSet.add(String(row.Tips).trim());
    }
    const notes = [
      `Imported from ${sourceLabel}`,
      ...(tipsSet.size > 0 ? [`Tips: ${[...tipsSet].join(" | ")}`] : []),
    ].join("\n");

    // Components
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
      if (qty === null || rawUnit === "—" || rawUnit === "") continue;
      const unit = normaliseUnit(rawUnit);

      let match = findMatch(ingName, existingIngredients);
      if (!match) {
        const purchaseUnit = guessPurchaseUnit(ingName, unit);
        const { rows: inserted } = await pool.query(
          `INSERT INTO base_ingredients (name, category, purchase_price, purchase_unit, purchase_quantity)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name, purchase_unit`,
          [ingName, (row.Category || "other").toLowerCase(), "0.00", purchaseUnit, "1"]
        );
        match = inserted[0] as BaseIngredient;
        existingIngredients.push(match);
        console.log(`    NEW ingredient: "${ingName}" → #${match.id} (${purchaseUnit})`);
      }

      components.push({
        baseIngredientId: match.id,
        quantity: qty,
        unit,
        prepNotes: row.Category || null,
      });
    }

    // Insert recipe
    const { rows: newRecipes } = await pool.query(
      `INSERT INTO recipes (name, description, category, yield, yield_unit, labor_hours, notes, preparation_steps, dietary_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        recipeName,
        `${recipeName} — ${menu}, yields ${yieldVal} servings`,
        category,
        String(yieldVal),
        "serving",
        String(laborHours),
        notes,
        JSON.stringify(preparationSteps),
        JSON.stringify({ allergenWarnings: [], manualDesignations: [] }),
      ]
    );
    const recipeId = newRecipes[0].id;

    if (components.length > 0) {
      const placeholders: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const comp of components) {
        placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
        values.push(recipeId, comp.baseIngredientId, String(comp.quantity), comp.unit, comp.prepNotes);
        idx += 5;
      }
      await pool.query(
        `INSERT INTO recipe_components (recipe_id, base_ingredient_id, quantity, unit, prep_notes)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    existingRecipeNames.add(normalise(recipeName));
    console.log(
      `  CREATED "${recipeName}" [${category}] → #${recipeId} (${components.length} ing, ${preparationSteps.length} steps, ${laborHours}h)`
    );
    created++;
  }

  return { created, skipped };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const files = resolveInputFiles();
  console.log(`Importing ${files.length} workbook(s)\n`);

  const { rows: existingIngredients } = await pool.query<BaseIngredient>(
    "SELECT id, name, purchase_unit FROM base_ingredients ORDER BY name"
  );
  console.log(`Loaded ${existingIngredients.length} existing base ingredients`);

  const { rows: existingRecipes } = await pool.query<{ name: string }>(
    "SELECT name FROM recipes"
  );
  const existingRecipeNames = new Set(existingRecipes.map((r) => normalise(r.name)));
  console.log(`Loaded ${existingRecipeNames.size} existing recipes\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const basename = path.basename(file);
    console.log(`━━━ ${basename} ━━━`);
    const wb = XLSX.readFile(file);
    for (const sheetName of wb.SheetNames) {
      const rows: SheetRow[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
      if (rows.length === 0) continue;
      console.log(`  Sheet: ${sheetName} (${rows.length} rows)`);
      const { created, skipped } = await processSheet(
        rows,
        sheetName,
        basename,
        existingIngredients,
        existingRecipeNames
      );
      totalCreated += created;
      totalSkipped += skipped;
    }
    console.log();
  }

  console.log(`\n━━━ Summary ━━━`);
  console.log(`Created: ${totalCreated} recipes`);
  console.log(`Skipped: ${totalSkipped} duplicates`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
