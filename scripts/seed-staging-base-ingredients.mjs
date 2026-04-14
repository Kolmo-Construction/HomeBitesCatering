// =============================================================================
// SEED: staging_base_ingredients table
// =============================================================================
// Creates a TEMPORARY staging table for Mike to audit suggested new base
// ingredients before they get promoted into base_ingredients. Source: the
// top-unmatched ingredient names from the recipesgen import analysis.
//
// WORKFLOW:
//   1. Run analyze-recipesgen-import.mjs first (produces recipesgen-analysis.json)
//   2. Run THIS script to create/populate staging_base_ingredients
//   3. Mike reviews the rows (SQL or future UI) and sets status to 'approved'
//      or 'rejected', editing any fields he wants
//   4. A promote script (built later) reads 'approved' rows and INSERTs into
//      base_ingredients for real
//   5. Drop staging_base_ingredients when the migration is complete
//
// The staging table is NOT in shared/schema.ts on purpose — it's meant to
// be temporary. Drop it with:
//     DROP TABLE IF EXISTS staging_base_ingredients;
//
// Usage:  node scripts/seed-staging-base-ingredients.mjs
// Env:    DATABASE_URL, OPENROUTER_API_KEY
// =============================================================================

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { OpenAI } from "openai";

config();
neonConfig.webSocketConstructor = ws;

const ANALYSIS_PATH = "scripts/recipesgen-analysis.json";
const CARDS_PATH = "scripts/recipesgen-cards.json";
const TOP_N = 50;

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY — needed for category/unit/price suggestions");
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 1. Load analysis data + known recipe names (for cross-ref filtering)
// -----------------------------------------------------------------------------
const analysis = JSON.parse(readFileSync(ANALYSIS_PATH, "utf-8"));
const cards = JSON.parse(readFileSync(CARDS_PATH, "utf-8"));

const recipeNameSet = new Set(
  cards
    .filter((c) => c.data && c.data.name)
    .map((c) => c.data.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()),
);

function looksLikeRecipe(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  return recipeNameSet.has(n);
}

// Obvious noise that should never become a base ingredient
function looksLikeJunk(name) {
  const n = name.toLowerCase().trim();
  if (!n) return true;
  if (n.length < 2) return true;
  if (/^(ingredients?|select|serve|protein|choice)\b/i.test(n)) return true;
  if (/:\s*$/.test(name)) return true;
  if (/\s(box|togo|rectangle)\s/.test(n)) return true;
  if (/^select\s+all/i.test(n)) return true;
  // "(60 ml) Vodka" etc — leading parenthetical is noise; dedup handled via normalize
  return false;
}

// Normalize so we dedupe obvious variants (Ice / ice / ice cubes)
function normKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Aggregate unmatched — merge simple variants, drop junk + recipe-name matches
const merged = new Map(); // key -> { name, count, recipes }
for (const u of analysis.topUnmatched) {
  if (looksLikeJunk(u.name)) continue;
  if (looksLikeRecipe(u.name)) continue;
  const key = normKey(u.name);
  if (!key) continue;
  const prev = merged.get(key);
  if (prev) {
    prev.count += u.count;
    for (const r of u.recipes) prev.recipes.add(r);
  } else {
    merged.set(key, { name: u.name.trim(), count: u.count, recipes: new Set(u.recipes) });
  }
}

const candidates = [...merged.values()]
  .sort((a, b) => b.count - a.count)
  .slice(0, TOP_N);

console.log(`Loaded ${analysis.topUnmatched.length} unmatched names, filtered & merged down to ${candidates.length} candidates.\n`);

// -----------------------------------------------------------------------------
// 2. AI-suggest category / purchase unit / price / dietary tags
// -----------------------------------------------------------------------------
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://homebites.design",
    "X-Title": "Home Bites Catering CMS - Staging Seed",
  },
});

const VALID_CATEGORIES = ["beverages", "dairy", "dry_goods", "meat", "produce", "seafood", "spices", "other"];
const VALID_PURCHASE_UNITS = ["each", "gallon", "kilogram", "liter", "ounce", "pound"];

const systemPrompt = `You are a professional catering ingredient buyer. Given a list of ingredient names, return metadata for bulk purchasing.

For each ingredient, suggest:
- category: one of ${VALID_CATEGORIES.join(", ")}
- purchaseUnit: one of ${VALID_PURCHASE_UNITS.join(", ")} — the unit the ingredient is typically bought in at wholesale
- purchaseQuantity: the typical bulk quantity (e.g., 1 for "1 pound", 5 for "5 pound case")
- estimatedPricePerUnit: realistic US wholesale price in USD for that purchase quantity. Err toward restaurant-supply / Sysco / Costco-type pricing, not retail grocery.
- dietaryTags: array of applicable tags from: contains_gluten, contains_nuts, contains_dairy, contains_egg, contains_soy, contains_shellfish, contains_sesame, vegan, vegetarian, organic, non_gmo, kosher, halal. Only include tags you are confident apply.
- reasoning: one short sentence explaining your choices (especially if you are unsure)

Respond with a single JSON object: {"ingredients":[{"name":"...","category":"...","purchaseUnit":"...","purchaseQuantity":1,"estimatedPricePerUnit":0.00,"dietaryTags":[],"reasoning":"..."}]}

IMPORTANT:
- If an ingredient is actually a compound recipe or ambiguous (e.g., "harissa aioli", "mike's sauce"), set category to "other" and explain in reasoning.
- Prices should be realistic. A pound of kosher salt is ~$1, a pound of saffron is ~$200.
- Never invent categories or units outside the allowed lists.`;

// Cascade of models in order of preference. Claude Haiku 4.5 is the most
// reliable; DeepSeek V3.2 is a cheap fallback if Haiku rate-limits or fails.
const MODEL_CASCADE = [
  "anthropic/claude-haiku-4.5",
  "deepseek/deepseek-chat-v3-0324",
  "google/gemini-2.5-flash-lite",
];

async function batchSuggest(names) {
  const userPrompt = "Provide metadata for these ingredients:\n" + names.map((n, i) => `${i + 1}. ${n}`).join("\n");

  let lastErr = null;
  for (const model of MODEL_CASCADE) {
    try {
      const resp = await openRouter.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = resp.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      return { ingredients: parsed.ingredients || [], modelUsed: model };
    } catch (err) {
      console.warn(`    ${model} failed: ${err.message}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error("All models in cascade failed");
}

// Batch in groups of 15 for safety (free-tier context + reliability)
const BATCH_SIZE = 15;
const batches = [];
for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
  batches.push(candidates.slice(i, i + BATCH_SIZE));
}

console.log(`Calling AI to suggest metadata for ${candidates.length} ingredients in ${batches.length} batches...\n`);

const enriched = [];
const failedBatches = [];
for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi];
  const names = batch.map((c) => c.name);
  console.log(`  Batch ${bi + 1}/${batches.length} (${names.length} items)...`);
  try {
    const { ingredients: suggestions, modelUsed } = await batchSuggest(names);
    console.log(`    OK via ${modelUsed}`);
    for (const cand of batch) {
      const sug = suggestions.find((s) => s.name && normKey(s.name) === normKey(cand.name));
      if (sug) {
        enriched.push({
          ...cand,
          suggestedCategory: VALID_CATEGORIES.includes(sug.category) ? sug.category : "other",
          suggestedPurchaseUnit: VALID_PURCHASE_UNITS.includes(sug.purchaseUnit) ? sug.purchaseUnit : "pound",
          suggestedPurchaseQuantity: Number(sug.purchaseQuantity) || 1,
          suggestedPrice: Number(sug.estimatedPricePerUnit) || 0,
          suggestedDietaryTags: Array.isArray(sug.dietaryTags) ? sug.dietaryTags : [],
          aiReasoning: sug.reasoning || null,
        });
      } else {
        console.warn(`    ! AI returned no match for "${cand.name}" — skipping`);
      }
    }
  } catch (err) {
    console.warn(`  Batch ${bi + 1} failed entirely:`, err.message);
    failedBatches.push(bi + 1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}

if (failedBatches.length === batches.length) {
  console.error(`\nAll ${batches.length} batches failed — aborting before touching the DB.`);
  process.exit(1);
}
if (failedBatches.length > 0) {
  console.warn(`\n${failedBatches.length} batches failed. Only ${enriched.length} candidates will be inserted.`);
}

console.log(`\nEnriched ${enriched.length} candidates.\n`);

// -----------------------------------------------------------------------------
// 3. Create the staging table if it doesn't exist
// -----------------------------------------------------------------------------
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS staging_base_ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    suggested_category TEXT NOT NULL,
    suggested_purchase_unit TEXT NOT NULL,
    suggested_purchase_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    suggested_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    suggested_dietary_tags JSONB NOT NULL DEFAULT '[]',
    ai_reasoning TEXT,
    reference_count INTEGER NOT NULL DEFAULT 0,
    sample_recipes TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    approved_as_id INTEGER REFERENCES base_ingredients(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'recipesgen-import',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT staging_base_ingredients_status_check
      CHECK (status IN ('pending','approved','rejected','modified','promoted'))
  );

  COMMENT ON TABLE staging_base_ingredients IS
    'TEMPORARY: review queue for new base ingredients from recipesgen import. Drop when migration is complete.';

  CREATE UNIQUE INDEX IF NOT EXISTS staging_base_ingredients_name_source_idx
    ON staging_base_ingredients (LOWER(name), source);
`);

console.log("Staging table ready.\n");

// -----------------------------------------------------------------------------
// 4. Insert enriched candidates (idempotent — ON CONFLICT skips existing)
// -----------------------------------------------------------------------------
let inserted = 0;
let skipped = 0;
for (const e of enriched) {
  try {
    const sampleRecipes = [...e.recipes].slice(0, 5);
    const result = await pool.query(
      `INSERT INTO staging_base_ingredients
        (name, suggested_category, suggested_purchase_unit, suggested_purchase_quantity,
         suggested_price, suggested_dietary_tags, ai_reasoning, reference_count, sample_recipes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (LOWER(name), source) DO NOTHING
       RETURNING id`,
      [
        e.name,
        e.suggestedCategory,
        e.suggestedPurchaseUnit,
        e.suggestedPurchaseQuantity,
        e.suggestedPrice,
        JSON.stringify(e.suggestedDietaryTags),
        e.aiReasoning,
        e.count,
        sampleRecipes,
      ],
    );
    if (result.rows.length > 0) inserted++;
    else skipped++;
  } catch (err) {
    console.warn(`  Failed to insert "${e.name}":`, err.message);
  }
}

await pool.end();

console.log(`Inserted ${inserted} new rows, skipped ${skipped} duplicates.\n`);

// -----------------------------------------------------------------------------
// 5. Review instructions for Mike
// -----------------------------------------------------------------------------
console.log("=".repeat(72));
console.log("HOW MIKE CAN REVIEW");
console.log("=".repeat(72));
console.log(`
Query the staging table to see pending suggestions:

  SELECT id, name, suggested_category, suggested_purchase_unit,
         suggested_price, reference_count, ai_reasoning
  FROM staging_base_ingredients
  WHERE status = 'pending'
  ORDER BY reference_count DESC;

To approve a row:
  UPDATE staging_base_ingredients SET status = 'approved' WHERE id = ?;

To reject:
  UPDATE staging_base_ingredients SET status = 'rejected',
    reviewer_notes = 'reason...' WHERE id = ?;

To edit values before approving (example):
  UPDATE staging_base_ingredients
  SET suggested_price = 2.50,
      suggested_purchase_unit = 'pound',
      status = 'modified'
  WHERE id = ?;

Later we'll run a promote script that reads status IN ('approved','modified')
and INSERTs those rows into base_ingredients for real.

To drop the staging table once the migration is complete:
  DROP TABLE staging_base_ingredients;
`);
