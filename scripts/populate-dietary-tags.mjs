/**
 * Populate dietary_tags on base_ingredients based on category + name pattern matching.
 *
 * Strategy:
 *  1. Use category as the primary signal (produce = vegan, meat = not vegetarian, etc.)
 *  2. Use name patterns to detect specific allergens (dairy, eggs, nuts, soy, gluten, sesame, shellfish)
 *  3. Only apply tags we're confident about — when in doubt, leave blank
 *
 * Allergen tags (from @shared/schema DIETARY_TAGS):
 *   contains_gluten, contains_nuts, contains_dairy, contains_egg,
 *   contains_soy, contains_shellfish, contains_sesame
 *
 * Positive dietary tags:
 *   vegan, vegetarian, organic, non_gmo, kosher, halal
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ============================================================================
// Pattern matchers
// ============================================================================

// Substring match (for words that rarely appear inside other words)
const containsAny = (name, patterns) => {
  const n = name.toLowerCase();
  return patterns.some((p) => n.includes(p.toLowerCase()));
};

// Word-boundary match (for words that commonly appear inside other words, e.g. "roll")
const containsWord = (name, patterns) => {
  const n = name.toLowerCase();
  return patterns.some((p) => {
    const pattern = p.toLowerCase();
    // Use word boundaries — match whole words only
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    return regex.test(n);
  });
};

// Dairy indicators
const DAIRY_PATTERNS = [
  "cheese", "mozzarella", "parmesan", "feta", "ricotta", "gouda", "manchego",
  "burrata", "mascarpone", "cotija", "gorgonzola", "brie", "camembert",
  "cheddar", "swiss", "provolone", "pepper jack", "cream cheese", "goat cheese",
  "halloumi",
  "butter", "milk", "cream", "yogurt", "buttermilk", "half and half",
  "sour cream", "heavy cream", "whipped cream", "ghee",
];

// Egg indicators — be careful not to match "eggplant"
const EGG_PATTERNS = ["egg", "eggs", "egg yolk", "egg white", "mayonnaise", "mayo", "aioli"];
const EGGPLANT_EXCLUSIONS = ["eggplant", "eggplants"];

// Nut indicators
const NUT_PATTERNS = [
  "almond", "almonds", "peanut", "peanuts", "cashew", "cashews",
  "walnut", "walnuts", "pecan", "pecans", "hazelnut", "hazelnuts",
  "pistachio", "pistachios", "macadamia", "brazil nut", "pine nut",
  "pesto", // usually contains pine nuts
  "nut butter", "nutella",
];

// Sesame indicators
const SESAME_PATTERNS = ["sesame", "tahini", "hummus"];

// Soy indicators
const SOY_PATTERNS = [
  "soy", "tofu", "edamame", "miso", "tempeh", "soy sauce", "tamari",
  "hoisin", "teriyaki",
];

// Shellfish indicators
const SHELLFISH_PATTERNS = [
  "shrimp", "prawn", "prawns", "lobster", "crab", "oyster", "oysters",
  "clam", "clams", "mussel", "mussels", "scallop", "scallops", "crayfish",
  "langoustine", "octopus", "squid", "calamari",
];

// Fish indicators — not an allergen tag in our schema but used to detect
// non-vegetarian items that may have landed in "other" or non-seafood categories
const FISH_PATTERNS = [
  "fish", "salmon", "tuna", "cod", "halibut", "trout", "anchov",
  "sardine", "mackerel", "branzino", "swordfish", "bass", "snapper",
  "flounder", "sole", "mahi", "tilapia", "gravlax", "smoked fish",
];

// Gluten indicators — wheat-based products
// Note: "roll" and "bun" removed — too ambiguous (chuck roll, etc.)
// Bread items are caught by "bread" pattern instead
const GLUTEN_PATTERNS = [
  "flour", "wheat", "bread", "baguette", "ciabatta", "focaccia",
  "pasta", "spaghetti", "penne", "fettuccine", "lasagna", "macaroni",
  "noodle", "noodles", "elbow pasta", "bow tie", "ravioli", "orzo",
  "couscous", "bulgur", "farro", "barley", "rye", "seitan",
  "cracker", "crackers", "breadcrumb", "breadcrumbs", "panko",
  "tortilla", "pita", "naan", "bagel", "muffin",
  "cornbread", // contains flour typically
  "chow mein", "ramen",
];
// Exclusions for gluten (rice-based or naturally GF items)
const GLUTEN_EXCLUSIONS = [
  "corn tortilla", "rice flour", "rice noodle", "almond flour",
  "coconut flour", "chickpea flour", "gluten free", "gluten-free",
];

// ============================================================================
// Category-level dietary rules
// ============================================================================

/**
 * Return the list of dietary tags for an ingredient based on its category and name.
 */
function determineTags(name, category) {
  const tags = new Set();
  const nameL = name.toLowerCase();

  // ============== Category-based positive tags ==============
  if (category === "produce") {
    tags.add("vegan");
    tags.add("vegetarian");
  } else if (category === "spices") {
    tags.add("vegan");
    tags.add("vegetarian");
  } else if (category === "meat") {
    // Don't add vegan or vegetarian
  } else if (category === "seafood") {
    // Don't add vegan or vegetarian
  } else if (category === "dairy") {
    // Most dairy is vegetarian (not vegan). Eggs are vegetarian.
    tags.add("vegetarian");
    // Special case: tofu is in dairy category sometimes
    if (nameL.includes("tofu")) {
      tags.add("vegan");
    }
  } else if (category === "dry_goods") {
    // Default vegan/vegetarian for dry goods (rice, beans, flour, etc.)
    // unless it's obviously animal-based (rare in dry goods)
    tags.add("vegan");
    tags.add("vegetarian");
  } else if (category === "beverages") {
    // Most beverages are vegan/vegetarian (water, soda, juice)
    tags.add("vegan");
    tags.add("vegetarian");
  } else if (category === "other") {
    // "other" is the bucket for canned goods and condiments & sauces
    // Most are vegan/vegetarian; we'll let pattern matching catch exceptions below
    tags.add("vegan");
    tags.add("vegetarian");
  }

  // ============== Allergen detection (name-based) ==============

  // Dairy detection
  if (containsAny(name, DAIRY_PATTERNS)) {
    tags.add("contains_dairy");
    // If it's in a non-dairy category but has dairy, it's not vegan but still vegetarian
    tags.add("vegetarian");
    tags.delete("vegan");
  }

  // Egg detection (with eggplant exclusion)
  const isEggplant = EGGPLANT_EXCLUSIONS.some((e) => nameL.includes(e));
  if (!isEggplant && containsAny(name, EGG_PATTERNS)) {
    tags.add("contains_egg");
    tags.add("vegetarian");
    tags.delete("vegan");
  }

  // Nut detection
  if (containsAny(name, NUT_PATTERNS)) {
    tags.add("contains_nuts");
  }

  // Sesame detection
  if (containsAny(name, SESAME_PATTERNS)) {
    tags.add("contains_sesame");
  }

  // Soy detection
  if (containsAny(name, SOY_PATTERNS)) {
    tags.add("contains_soy");
  }

  // Shellfish detection
  if (containsAny(name, SHELLFISH_PATTERNS)) {
    tags.add("contains_shellfish");
    // Shellfish is not vegan/vegetarian
    tags.delete("vegan");
    tags.delete("vegetarian");
  }

  // Fish detection — not an allergen tag, but removes vegan/vegetarian
  // (This catches items like "Anchovies in Olive Oil" that landed in "other" category)
  if (containsAny(name, FISH_PATTERNS)) {
    tags.delete("vegan");
    tags.delete("vegetarian");
  }

  // Gluten detection — uses word-boundary matching to avoid false positives
  // (e.g., "roll" shouldn't match "Chuck Roll")
  const hasGlutenExclusion = GLUTEN_EXCLUSIONS.some((e) => nameL.includes(e));
  if (!hasGlutenExclusion && containsWord(name, GLUTEN_PATTERNS)) {
    tags.add("contains_gluten");
  }

  // Meat/seafood override — never tag as vegan/vegetarian
  if (category === "meat" || category === "seafood") {
    tags.delete("vegan");
    tags.delete("vegetarian");
  }

  return Array.from(tags).sort();
}

// ============================================================================
// Main execution
// ============================================================================

try {
  const { rows: ingredients } = await client.query(
    "SELECT id, name, category, dietary_tags FROM base_ingredients ORDER BY category, name",
  );

  console.log(`Processing ${ingredients.length} ingredients...\n`);

  let updated = 0;
  let skipped = 0;
  const byCategory = {};
  const sampleByCategory = {};

  // Always update — even empty arrays — to clear any stale/incorrect prior values.
  // The UPDATE is unconditional so previous runs that tagged things wrong get fixed.
  for (const ing of ingredients) {
    const newTags = determineTags(ing.name, ing.category);

    // Store sample for display
    if (!byCategory[ing.category]) byCategory[ing.category] = 0;
    byCategory[ing.category]++;
    if (!sampleByCategory[ing.category]) sampleByCategory[ing.category] = [];
    if (sampleByCategory[ing.category].length < 3) {
      sampleByCategory[ing.category].push({ name: ing.name, tags: newTags });
    }

    await client.query(
      "UPDATE base_ingredients SET dietary_tags = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(newTags), ing.id],
    );
    if (newTags.length === 0) {
      skipped++;
    } else {
      updated++;
    }
  }

  console.log(`✓ Updated ${updated} ingredients`);
  console.log(`  Skipped ${skipped} (no confident tag rules matched)`);
  console.log("");

  console.log("Updates by category:");
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${count}`);
    for (const sample of sampleByCategory[cat]) {
      console.log(`    • ${sample.name} → [${sample.tags.join(", ")}]`);
    }
  }
} catch (err) {
  console.error("Failed:", err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  await client.end();
}
