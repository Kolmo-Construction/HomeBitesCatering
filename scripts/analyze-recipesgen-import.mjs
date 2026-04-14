// =============================================================================
// Analyze the recipesgen-cards.json export against HomeBites base_ingredients.
// Read-only: touches the DB only to SELECT base_ingredients.
//
// Output: a report of import readiness + top unmatched ingredient names.
//
// Usage:  node scripts/analyze-recipesgen-import.mjs
// Requires: DATABASE_URL in .env  and  scripts/recipesgen-cards.json
// =============================================================================

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config();
neonConfig.webSocketConstructor = ws;

const CARDS_PATH = "scripts/recipesgen-cards.json";

// -----------------------------------------------------------------------------
// 1. Load data
// -----------------------------------------------------------------------------
const cards = JSON.parse(readFileSync(CARDS_PATH, "utf-8"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows: baseIngredients } = await pool.query(
  "SELECT id, name, category, purchase_unit FROM base_ingredients ORDER BY name",
);
await pool.end();

console.log(`Loaded ${cards.length} cards and ${baseIngredients.length} base ingredients.\n`);

// -----------------------------------------------------------------------------
// 2. Normalization + token-overlap fuzzy matcher
// -----------------------------------------------------------------------------
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "for", "to", "with",
  "fresh", "raw", "ground", "whole", "organic", "dried", "chopped",
  "diced", "minced", "sliced", "jar", "can", "bag", "lbs", "lb", "oz",
  "pound", "cup", "cups", "tbsp", "tsp", "tablespoon", "teaspoon",
  "gallon", "quart", "pint", "gram", "kg", "kilogram", "ounce", "each",
  "extra", "virgin", "large", "small", "medium", "packed", "loosely",
]);

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/[,().\[\]]/g, " ")
    .replace(/[–—-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return normalize(s)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t) && t.length > 1);
}

// Token overlap similarity: intersection / min(set size)
// Using min (not union) is forgiving when one side is more descriptive
function similarity(aTokens, bTokens) {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const bSet = new Set(bTokens);
  const overlap = aTokens.filter((t) => bSet.has(t)).length;
  return overlap / Math.min(aTokens.length, bTokens.length);
}

const baseIndex = baseIngredients.map((bi) => ({
  id: bi.id,
  name: bi.name,
  tokens: tokens(bi.name),
}));

function matchIngredient(name) {
  const needle = tokens(name);
  if (needle.length === 0) return { confidence: "none", match: null, score: 0 };

  // Exact normalized match first
  const needleNorm = normalize(name);
  const exact = baseIndex.find((bi) => normalize(bi.name) === needleNorm);
  if (exact) return { confidence: "exact", match: exact, score: 1 };

  // Best token-overlap
  let best = null;
  let bestScore = 0;
  for (const bi of baseIndex) {
    const s = similarity(needle, bi.tokens);
    if (s > bestScore) {
      bestScore = s;
      best = bi;
    }
  }

  if (bestScore >= 0.75) return { confidence: "high", match: best, score: bestScore };
  if (bestScore >= 0.5) return { confidence: "medium", match: best, score: bestScore };
  return { confidence: "none", match: null, score: bestScore };
}

// -----------------------------------------------------------------------------
// 3. Extract ingredient names from each card
// -----------------------------------------------------------------------------
// Prefer parsedIngredients (structured). Fall back to parsing raw ings strings
// via a simple qty+unit prefix strip.
function stripQtyPrefix(line) {
  // Strip leading quantity patterns: "1", "1/2", "1 1/2", "½", "1.5"
  // Strip common units: cup, cups, tbsp, tsp, lb, lbs, oz, gallon, qt, pound
  const UNITS = "cups?|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|ounces?|oz|gallons?|quarts?|qt|pints?|grams?|g|kilograms?|kg|liters?|l|milliliters?|ml|each|pieces?|cloves?|sprigs?|cans?|jars?|bunch(?:es)?|heads?|sticks?|slices?";
  const cleaned = line
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
  // qty + unit
  const re = new RegExp(
    `^\\s*(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞])\\s*(?:${UNITS})?\\s+`,
    "i",
  );
  return cleaned.replace(re, "").trim();
}

function extractIngredients(card) {
  const out = [];
  // Prefer parsedIngredients when present
  if (Array.isArray(card.parsedIngredients) && card.parsedIngredients.length > 0) {
    for (const p of card.parsedIngredients) {
      if (p && p.name) out.push({ source: "parsed", raw: p.original || p.name, name: p.name });
    }
    return out;
  }
  // Fall back to raw ings arrays
  for (const group of card.ings || []) {
    for (const line of group.data || []) {
      const name = stripQtyPrefix(line);
      if (name) out.push({ source: "raw", raw: line, name });
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// 4. Run matching across all cards
// -----------------------------------------------------------------------------
const recipeReports = [];
const unmatchedCounts = new Map(); // name -> { count, recipes: Set<string> }
const lowConfidenceCounts = new Map();

for (const c of cards) {
  if (!c.data || !c.data.name) continue;
  const ings = extractIngredients(c.data);
  const matches = ings.map((ing) => ({
    ...ing,
    match: matchIngredient(ing.name),
  }));
  const total = matches.length;
  const exact = matches.filter((m) => m.match.confidence === "exact").length;
  const high = matches.filter((m) => m.match.confidence === "high").length;
  const medium = matches.filter((m) => m.match.confidence === "medium").length;
  const none = matches.filter((m) => m.match.confidence === "none").length;
  const matchedHighQuality = exact + high;
  const ratio = total > 0 ? matchedHighQuality / total : 0;

  recipeReports.push({
    id: c.id,
    name: c.data.name,
    hasParsed: Array.isArray(c.data.parsedIngredients) && c.data.parsedIngredients.length > 0,
    total,
    exact,
    high,
    medium,
    none,
    ratio,
    matches,
  });

  for (const m of matches) {
    if (m.match.confidence === "none") {
      const key = normalize(m.name);
      if (!key) continue;
      const prev = unmatchedCounts.get(key) || { name: m.name, count: 0, recipes: new Set() };
      prev.count++;
      prev.recipes.add(c.data.name);
      unmatchedCounts.set(key, prev);
    } else if (m.match.confidence === "medium") {
      const key = normalize(m.name);
      const prev = lowConfidenceCounts.get(key) || {
        name: m.name,
        count: 0,
        suggestedMatch: m.match.match?.name,
        suggestedScore: m.match.score,
      };
      prev.count++;
      lowConfidenceCounts.set(key, prev);
    }
  }
}

// -----------------------------------------------------------------------------
// 5. Report
// -----------------------------------------------------------------------------
const totalRecipes = recipeReports.length;
const totalIngLines = recipeReports.reduce((s, r) => s + r.total, 0);
const totalExact = recipeReports.reduce((s, r) => s + r.exact, 0);
const totalHigh = recipeReports.reduce((s, r) => s + r.high, 0);
const totalMedium = recipeReports.reduce((s, r) => s + r.medium, 0);
const totalNone = recipeReports.reduce((s, r) => s + r.none, 0);

const fullyMapped = recipeReports.filter((r) => r.total > 0 && r.ratio === 1).length;
const over80 = recipeReports.filter((r) => r.ratio >= 0.8 && r.ratio < 1).length;
const over50 = recipeReports.filter((r) => r.ratio >= 0.5 && r.ratio < 0.8).length;
const under50 = recipeReports.filter((r) => r.total > 0 && r.ratio < 0.5).length;
const noIngs = recipeReports.filter((r) => r.total === 0).length;

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║                   IMPORT READINESS REPORT                    ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log(`Recipes analyzed:                ${totalRecipes}`);
console.log(`Total ingredient references:     ${totalIngLines}`);
console.log(`  Exact matches:                 ${totalExact}  (${((totalExact / totalIngLines) * 100).toFixed(1)}%)`);
console.log(`  High-confidence fuzzy:         ${totalHigh}  (${((totalHigh / totalIngLines) * 100).toFixed(1)}%)`);
console.log(`  Medium-confidence (review):    ${totalMedium}  (${((totalMedium / totalIngLines) * 100).toFixed(1)}%)`);
console.log(`  Unmatched:                     ${totalNone}  (${((totalNone / totalIngLines) * 100).toFixed(1)}%)\n`);

console.log("--- Recipe readiness distribution ---");
console.log(`100% mapped (import-ready):      ${fullyMapped}`);
console.log(`80-99% mapped (near-ready):      ${over80}`);
console.log(`50-79% mapped (partial):         ${over50}`);
console.log(`< 50% mapped (needs work):       ${under50}`);
console.log(`0 ingredients found:             ${noIngs}\n`);

// -----------------------------------------------------------------------------
// Top unmatched ingredients — the highest-leverage gaps
// -----------------------------------------------------------------------------
const topUnmatched = [...unmatchedCounts.values()]
  .sort((a, b) => b.count - a.count)
  .slice(0, 50);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  TOP 50 UNMATCHED INGREDIENTS (create these first)            ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");
console.log("  #  count  ingredient");
console.log("  -  -----  ----------");
topUnmatched.forEach((u, i) => {
  const num = String(i + 1).padStart(3);
  const count = String(u.count).padStart(5);
  console.log(`${num}  ${count}  ${u.name}`);
});
const stillMatters = [...unmatchedCounts.values()].reduce((s, u) => s + u.count, 0);
console.log(`\n  (${unmatchedCounts.size} unique unmatched names across ${stillMatters} references)\n`);

// -----------------------------------------------------------------------------
// Medium-confidence matches — human verification candidates
// -----------------------------------------------------------------------------
const topMedium = [...lowConfidenceCounts.values()]
  .sort((a, b) => b.count - a.count)
  .slice(0, 20);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  TOP 20 MEDIUM-CONFIDENCE MATCHES (verify these)              ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");
console.log("  count  recipesgen name  →  HomeBites base ingredient (score)");
console.log("  -----  ---------------     --------------------------------");
topMedium.forEach((u) => {
  const count = String(u.count).padStart(5);
  const score = u.suggestedScore.toFixed(2);
  console.log(`  ${count}  ${u.name.slice(0, 40).padEnd(40)} → ${u.suggestedMatch || "(none)"} (${score})`);
});

// -----------------------------------------------------------------------------
// Flag recipes with 0 ingredients found — these had parsing issues
// -----------------------------------------------------------------------------
const brokenRecipes = recipeReports.filter((r) => r.total === 0);
if (brokenRecipes.length > 0) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  RECIPES WITH 0 INGREDIENTS PARSED                            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  brokenRecipes.slice(0, 20).forEach((r) => console.log(`  - ${r.name}`));
  if (brokenRecipes.length > 20) console.log(`  ... and ${brokenRecipes.length - 20} more`);
}

// -----------------------------------------------------------------------------
// Write detailed per-recipe report to JSON for later consumption
// -----------------------------------------------------------------------------
const detailPath = "scripts/recipesgen-analysis.json";
const { writeFileSync } = await import("node:fs");
writeFileSync(
  detailPath,
  JSON.stringify(
    {
      summary: {
        totalRecipes,
        totalIngLines,
        totalExact,
        totalHigh,
        totalMedium,
        totalNone,
        fullyMapped,
        over80,
        over50,
        under50,
      },
      topUnmatched: topUnmatched.map((u) => ({ name: u.name, count: u.count, recipes: [...u.recipes] })),
      recipes: recipeReports,
    },
    null,
    2,
  ),
);
console.log(`\nDetailed report written to ${detailPath}`);
