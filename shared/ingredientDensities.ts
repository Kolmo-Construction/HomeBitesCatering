// Ingredient density library — maps common catering ingredients to their
// volume-to-weight conversion defaults. Used to auto-populate
// `baseIngredients.unitConversions` so chefs can enter "2 cups flour" in a
// recipe and the shopping list correctly converts that to pounds (or the
// ingredient's purchase unit) without manual data entry per ingredient.
//
// Densities come from standard culinary references (USDA, King Arthur Baking,
// and Cook's Illustrated). They are approximations — packing and moisture vary
// — but are accurate enough for shopping-list rollups and cost quotes.

import { convertUnit, normalizeUnit } from "./unitConversion";

export interface IngredientDensity {
  /** Human-readable label for this density entry */
  label: string;
  /** Grams per US cup — set when the ingredient is measured volumetrically */
  gramsPerCup?: number;
  /** Grams per "each" — set when the ingredient is typically sold/counted individually */
  gramsEach?: number;
  /** Alternate names that should match this entry (lowercase) */
  aliases?: string[];
  /** Typical waste/trim factor (edible portion ÷ as-purchased), for Phase 3 */
  yieldPct?: number;
}

// Canonical density table. Keys are the primary match name (lowercase).
// Prefer anchoring to the most common catering form of the ingredient.
export const INGREDIENT_DENSITIES: Record<string, IngredientDensity> = {
  // ---------- FLOURS / STARCHES ----------
  "all-purpose flour": { label: "All-purpose flour", gramsPerCup: 125, aliases: ["ap flour", "plain flour", "white flour", "flour"] },
  "bread flour": { label: "Bread flour", gramsPerCup: 127 },
  "cake flour": { label: "Cake flour", gramsPerCup: 114 },
  "whole wheat flour": { label: "Whole wheat flour", gramsPerCup: 120, aliases: ["whole-wheat flour", "wholemeal flour"] },
  "almond flour": { label: "Almond flour", gramsPerCup: 96, aliases: ["almond meal"] },
  "cornmeal": { label: "Cornmeal", gramsPerCup: 140, aliases: ["polenta"] },
  "cornstarch": { label: "Cornstarch", gramsPerCup: 120, aliases: ["corn starch", "cornflour"] },
  "semolina": { label: "Semolina", gramsPerCup: 163 },

  // ---------- SUGARS / SWEETENERS ----------
  "granulated sugar": { label: "Granulated sugar", gramsPerCup: 200, aliases: ["white sugar", "sugar", "cane sugar"] },
  "brown sugar": { label: "Brown sugar (packed)", gramsPerCup: 220, aliases: ["light brown sugar", "dark brown sugar"] },
  "powdered sugar": { label: "Powdered sugar", gramsPerCup: 120, aliases: ["confectioners sugar", "icing sugar"] },
  "honey": { label: "Honey", gramsPerCup: 340 },
  "maple syrup": { label: "Maple syrup", gramsPerCup: 322 },
  "molasses": { label: "Molasses", gramsPerCup: 337 },
  "corn syrup": { label: "Corn syrup", gramsPerCup: 328 },
  "agave syrup": { label: "Agave syrup", gramsPerCup: 332, aliases: ["agave nectar"] },

  // ---------- GRAINS / PASTA ----------
  "white rice": { label: "White rice (dry)", gramsPerCup: 185, aliases: ["long grain rice", "jasmine rice", "basmati rice", "rice"] },
  "brown rice": { label: "Brown rice (dry)", gramsPerCup: 190 },
  "arborio rice": { label: "Arborio rice", gramsPerCup: 200 },
  "quinoa": { label: "Quinoa (dry)", gramsPerCup: 170 },
  "rolled oats": { label: "Rolled oats", gramsPerCup: 90, aliases: ["old-fashioned oats", "oats", "oatmeal"] },
  "steel cut oats": { label: "Steel-cut oats", gramsPerCup: 160 },
  "couscous": { label: "Couscous (dry)", gramsPerCup: 180 },
  "pasta": { label: "Pasta (dry, short)", gramsPerCup: 100, aliases: ["dry pasta", "penne", "rotini", "elbow macaroni"] },
  "breadcrumbs": { label: "Breadcrumbs", gramsPerCup: 108, aliases: ["bread crumbs"] },
  "panko": { label: "Panko", gramsPerCup: 50, aliases: ["panko breadcrumbs", "panko bread crumbs"] },

  // ---------- DAIRY ----------
  "whole milk": { label: "Whole milk", gramsPerCup: 240, aliases: ["milk", "2% milk", "skim milk", "1% milk"] },
  "heavy cream": { label: "Heavy cream", gramsPerCup: 238, aliases: ["heavy whipping cream", "whipping cream"] },
  "half and half": { label: "Half & half", gramsPerCup: 242, aliases: ["half-and-half"] },
  "buttermilk": { label: "Buttermilk", gramsPerCup: 242 },
  "yogurt": { label: "Yogurt (plain)", gramsPerCup: 245, aliases: ["plain yogurt"] },
  "greek yogurt": { label: "Greek yogurt", gramsPerCup: 245 },
  "sour cream": { label: "Sour cream", gramsPerCup: 240 },
  "butter": { label: "Butter", gramsPerCup: 227, aliases: ["unsalted butter", "salted butter"] },
  "cream cheese": { label: "Cream cheese", gramsPerCup: 225 },
  "ricotta": { label: "Ricotta cheese", gramsPerCup: 250, aliases: ["ricotta cheese"] },
  "parmesan": { label: "Parmesan (grated)", gramsPerCup: 90, aliases: ["parmesan cheese", "parmigiano", "grated parmesan"] },
  "cheddar": { label: "Cheddar (shredded)", gramsPerCup: 113, aliases: ["cheddar cheese", "shredded cheddar"] },
  "mozzarella": { label: "Mozzarella (shredded)", gramsPerCup: 113, aliases: ["mozzarella cheese", "shredded mozzarella"] },
  "feta": { label: "Feta (crumbled)", gramsPerCup: 150, aliases: ["feta cheese"] },

  // ---------- EGGS ----------
  "egg": { label: "Egg (large)", gramsEach: 50, gramsPerCup: 240, aliases: ["large egg", "whole egg", "eggs"] },
  "egg white": { label: "Egg white", gramsEach: 33, gramsPerCup: 243 },
  "egg yolk": { label: "Egg yolk", gramsEach: 18, gramsPerCup: 240 },

  // ---------- OILS / FATS ----------
  "olive oil": { label: "Olive oil", gramsPerCup: 216, aliases: ["extra virgin olive oil", "evoo"] },
  "vegetable oil": { label: "Vegetable oil", gramsPerCup: 218 },
  "canola oil": { label: "Canola oil", gramsPerCup: 218 },
  "sesame oil": { label: "Sesame oil", gramsPerCup: 216 },
  "coconut oil": { label: "Coconut oil", gramsPerCup: 218 },
  "avocado oil": { label: "Avocado oil", gramsPerCup: 216 },
  "shortening": { label: "Shortening", gramsPerCup: 205 },

  // ---------- LIQUIDS / CONDIMENTS ----------
  "water": { label: "Water", gramsPerCup: 237 },
  "white vinegar": { label: "White vinegar", gramsPerCup: 238, aliases: ["vinegar"] },
  "balsamic vinegar": { label: "Balsamic vinegar", gramsPerCup: 250 },
  "red wine vinegar": { label: "Red wine vinegar", gramsPerCup: 238 },
  "soy sauce": { label: "Soy sauce", gramsPerCup: 255, aliases: ["tamari", "shoyu"] },
  "fish sauce": { label: "Fish sauce", gramsPerCup: 260 },
  "ketchup": { label: "Ketchup", gramsPerCup: 245, aliases: ["catsup"] },
  "mustard": { label: "Mustard", gramsPerCup: 249, aliases: ["dijon mustard", "yellow mustard", "whole grain mustard"] },
  "mayonnaise": { label: "Mayonnaise", gramsPerCup: 220, aliases: ["mayo"] },
  "hot sauce": { label: "Hot sauce", gramsPerCup: 240 },
  "worcestershire sauce": { label: "Worcestershire", gramsPerCup: 240, aliases: ["worcestershire"] },
  "vanilla extract": { label: "Vanilla extract", gramsPerCup: 208 },
  "tomato paste": { label: "Tomato paste", gramsPerCup: 262 },
  "tomato sauce": { label: "Tomato sauce", gramsPerCup: 245 },
  "crushed tomatoes": { label: "Crushed tomatoes", gramsPerCup: 240 },
  "stock": { label: "Stock / broth", gramsPerCup: 240, aliases: ["chicken stock", "beef stock", "vegetable stock", "broth", "chicken broth", "beef broth", "vegetable broth"] },

  // ---------- NUTS / SEEDS ----------
  "almonds": { label: "Almonds (whole)", gramsPerCup: 143, aliases: ["whole almonds"] },
  "sliced almonds": { label: "Sliced almonds", gramsPerCup: 95 },
  "walnuts": { label: "Walnuts (chopped)", gramsPerCup: 120, aliases: ["chopped walnuts", "walnut halves"] },
  "pecans": { label: "Pecans (chopped)", gramsPerCup: 110, aliases: ["chopped pecans", "pecan halves"] },
  "cashews": { label: "Cashews", gramsPerCup: 137 },
  "peanuts": { label: "Peanuts", gramsPerCup: 146 },
  "pine nuts": { label: "Pine nuts", gramsPerCup: 135 },
  "sesame seeds": { label: "Sesame seeds", gramsPerCup: 144 },
  "chia seeds": { label: "Chia seeds", gramsPerCup: 170 },
  "sunflower seeds": { label: "Sunflower seeds", gramsPerCup: 140 },
  "pumpkin seeds": { label: "Pumpkin seeds", gramsPerCup: 129, aliases: ["pepitas"] },

  // ---------- LEAVENERS / BAKING AIDS ----------
  "baking powder": { label: "Baking powder", gramsPerCup: 220 },
  "baking soda": { label: "Baking soda", gramsPerCup: 220, aliases: ["bicarbonate of soda"] },
  "active dry yeast": { label: "Active dry yeast", gramsPerCup: 150, aliases: ["yeast", "instant yeast"] },
  "cocoa powder": { label: "Cocoa powder", gramsPerCup: 85, aliases: ["unsweetened cocoa powder"] },
  "chocolate chips": { label: "Chocolate chips", gramsPerCup: 170, aliases: ["semi-sweet chocolate chips", "dark chocolate chips"] },

  // ---------- SALT / SPICES ----------
  "table salt": { label: "Table salt", gramsPerCup: 292, aliases: ["salt", "fine salt"] },
  "kosher salt": { label: "Kosher salt", gramsPerCup: 240, aliases: ["diamond crystal kosher salt"] },
  "sea salt": { label: "Sea salt", gramsPerCup: 250 },
  "black pepper": { label: "Black pepper (ground)", gramsPerCup: 110, aliases: ["ground black pepper", "pepper"] },
  "cumin": { label: "Cumin (ground)", gramsPerCup: 100, aliases: ["ground cumin"] },
  "paprika": { label: "Paprika", gramsPerCup: 112, aliases: ["smoked paprika", "sweet paprika"] },
  "cinnamon": { label: "Cinnamon (ground)", gramsPerCup: 125, aliases: ["ground cinnamon"] },
  "oregano": { label: "Oregano (dried)", gramsPerCup: 48, aliases: ["dried oregano"] },
  "thyme": { label: "Thyme (dried)", gramsPerCup: 48, aliases: ["dried thyme"] },
  "basil": { label: "Basil (dried)", gramsPerCup: 62, aliases: ["dried basil"] },
  "garlic powder": { label: "Garlic powder", gramsPerCup: 150 },
  "onion powder": { label: "Onion powder", gramsPerCup: 115 },
  "chili powder": { label: "Chili powder", gramsPerCup: 130 },
  "curry powder": { label: "Curry powder", gramsPerCup: 95 },
  "nutmeg": { label: "Nutmeg (ground)", gramsPerCup: 105, aliases: ["ground nutmeg"] },
  "ginger": { label: "Ginger (ground)", gramsPerCup: 85, aliases: ["ground ginger"] },
  "turmeric": { label: "Turmeric (ground)", gramsPerCup: 135, aliases: ["ground turmeric"] },
  "red pepper flakes": { label: "Red pepper flakes", gramsPerCup: 53, aliases: ["crushed red pepper", "chili flakes"] },
  "bay leaves": { label: "Bay leaves", gramsEach: 0.2 },

  // ---------- PRODUCE (EACH) ----------
  "yellow onion": { label: "Yellow onion (medium)", gramsEach: 170, gramsPerCup: 160, yieldPct: 0.9, aliases: ["onion", "spanish onion"] },
  "red onion": { label: "Red onion (medium)", gramsEach: 170, gramsPerCup: 160, yieldPct: 0.9 },
  "shallot": { label: "Shallot", gramsEach: 30, gramsPerCup: 160 },
  "garlic clove": { label: "Garlic clove", gramsEach: 3, aliases: ["garlic cloves", "clove garlic"] },
  "garlic head": { label: "Head of garlic", gramsEach: 50, aliases: ["head garlic", "garlic bulb"] },
  "lemon": { label: "Lemon (medium)", gramsEach: 80, yieldPct: 0.45 },
  "lime": { label: "Lime (medium)", gramsEach: 60, yieldPct: 0.4 },
  "orange": { label: "Orange (medium)", gramsEach: 180, yieldPct: 0.55 },
  "apple": { label: "Apple (medium)", gramsEach: 180, yieldPct: 0.9 },
  "banana": { label: "Banana (medium)", gramsEach: 120, yieldPct: 0.65 },
  "potato": { label: "Potato (medium)", gramsEach: 200, yieldPct: 0.85, aliases: ["russet potato", "idaho potato"] },
  "sweet potato": { label: "Sweet potato (medium)", gramsEach: 230, yieldPct: 0.85 },
  "tomato": { label: "Tomato (medium)", gramsEach: 125, gramsPerCup: 180, yieldPct: 0.9, aliases: ["roma tomato", "beefsteak tomato"] },
  "cherry tomato": { label: "Cherry tomatoes", gramsPerCup: 150, aliases: ["grape tomatoes", "cherry tomatoes"] },
  "cucumber": { label: "Cucumber", gramsEach: 300, gramsPerCup: 120, yieldPct: 0.95 },
  "bell pepper": { label: "Bell pepper", gramsEach: 160, gramsPerCup: 150, yieldPct: 0.82, aliases: ["red bell pepper", "green bell pepper", "yellow bell pepper"] },
  "jalapeno": { label: "Jalapeño", gramsEach: 15, aliases: ["jalapeño", "jalapeno pepper"] },
  "carrot": { label: "Carrot (medium)", gramsEach: 60, gramsPerCup: 128, yieldPct: 0.85 },
  "celery stalk": { label: "Celery stalk", gramsEach: 40, gramsPerCup: 100, aliases: ["celery", "celery rib"] },
  "avocado": { label: "Avocado", gramsEach: 200, yieldPct: 0.73 },

  // ---------- PRODUCE (VOLUME, chopped / fresh) ----------
  "spinach": { label: "Spinach (fresh)", gramsPerCup: 30, aliases: ["baby spinach", "fresh spinach"] },
  "kale": { label: "Kale (chopped)", gramsPerCup: 67 },
  "arugula": { label: "Arugula", gramsPerCup: 20 },
  "lettuce": { label: "Lettuce (shredded)", gramsPerCup: 36, aliases: ["romaine lettuce", "iceberg lettuce", "mixed greens"] },
  "fresh herbs": { label: "Fresh herbs (chopped)", gramsPerCup: 40, aliases: ["fresh parsley", "fresh cilantro", "fresh basil", "parsley", "cilantro"] },
  "mushrooms": { label: "Mushrooms (sliced)", gramsPerCup: 70, aliases: ["button mushrooms", "cremini mushrooms", "sliced mushrooms"] },
  "corn kernels": { label: "Corn kernels", gramsPerCup: 165, aliases: ["frozen corn", "sweet corn"] },
  "peas": { label: "Peas", gramsPerCup: 145, aliases: ["green peas", "frozen peas"] },
  "green beans": { label: "Green beans", gramsPerCup: 110, aliases: ["string beans"] },
  "broccoli": { label: "Broccoli florets", gramsPerCup: 91, aliases: ["broccoli florets"] },
  "cauliflower": { label: "Cauliflower florets", gramsPerCup: 107, aliases: ["cauliflower florets"] },

  // ---------- BEANS / LEGUMES ----------
  "black beans": { label: "Black beans (cooked)", gramsPerCup: 172 },
  "chickpeas": { label: "Chickpeas (cooked)", gramsPerCup: 164, aliases: ["garbanzo beans"] },
  "kidney beans": { label: "Kidney beans (cooked)", gramsPerCup: 177 },
  "lentils": { label: "Lentils (dry)", gramsPerCup: 192 },

  // ---------- MEATS / SEAFOOD (each references where applicable) ----------
  "chicken breast": { label: "Chicken breast (boneless)", gramsEach: 227, yieldPct: 1.0, aliases: ["boneless chicken breast", "chicken breasts"] },
  "chicken thigh": { label: "Chicken thigh (boneless)", gramsEach: 110, aliases: ["boneless chicken thigh"] },
  "chicken wing": { label: "Chicken wing", gramsEach: 90 },
  "whole chicken": { label: "Whole chicken", gramsEach: 1800, yieldPct: 0.6 },
  "shrimp": { label: "Shrimp (peeled)", gramsEach: 15, aliases: ["prawns"] },
  "bacon slice": { label: "Bacon slice", gramsEach: 15, aliases: ["bacon strip"] },
};

// ============================================================================
// Matching
// ============================================================================

/**
 * Find the best density entry for a given ingredient name.
 *
 * Matching strategy, in order:
 *   1. Exact match on the normalized name
 *   2. Exact match on any alias
 *   3. Longest-substring match against keys/aliases (fuzzy)
 *
 * Returns null if nothing matches with confidence.
 */
export function findDensityForIngredient(
  name: string,
  _category?: string,
): (IngredientDensity & { matchKey: string }) | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (!n) return null;

  // 1. Exact key match
  if (INGREDIENT_DENSITIES[n]) {
    return { ...INGREDIENT_DENSITIES[n], matchKey: n };
  }

  // 2. Exact alias match
  for (const [key, d] of Object.entries(INGREDIENT_DENSITIES)) {
    if (d.aliases?.some((a) => a.toLowerCase() === n)) {
      return { ...d, matchKey: key };
    }
  }

  // 3. Whole-word fuzzy match — find the longest key/alias that appears in
  // the name as a whole word (optionally with a plural suffix). This catches
  // "Organic All-Purpose Flour" → "all-purpose flour" but correctly rejects
  // "Pepperoni" as a match for "pepper".
  let best: { score: number; key: string; entry: IngredientDensity } | null =
    null;
  for (const [key, d] of Object.entries(INGREDIENT_DENSITIES)) {
    const candidates = [key, ...(d.aliases ?? [])];
    for (const c of candidates) {
      const cLower = c.toLowerCase();
      let score = 0;
      if (n === cLower) {
        score = cLower.length * 2;
      } else if (matchesAsWholeWord(cLower, n)) {
        // "organic butter" contains "butter" at a word boundary
        score = cLower.length;
      } else if (n.length >= 4 && matchesAsWholeWord(n, cLower)) {
        // "almond" matches "almonds" (user typed a shorter form of the key)
        score = n.length * 0.9;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { score, key, entry: d };
      }
    }
  }

  if (best && best.score >= 4) {
    return { ...best.entry, matchKey: best.key };
  }
  return null;
}

/**
 * Return true when `needle` appears in `haystack` as a standalone word,
 * optionally followed by a common plural suffix ("s", "es", or "ies").
 *
 * Rejects mid-word matches — "pepper" in "pepperoni" returns false, while
 * "pepper" in "black pepper" returns true.
 */
function matchesAsWholeWord(needle: string, haystack: string): boolean {
  if (!needle || !haystack) return false;
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return false;
    // Must start at a word boundary
    const prevOk = idx === 0 || !/[a-z0-9]/i.test(haystack[idx - 1]);
    if (!prevOk) {
      from = idx + 1;
      continue;
    }
    // Allow a trailing plural suffix, then require a word boundary
    const tailStart = idx + needle.length;
    const tail2 = haystack.slice(tailStart, tailStart + 3).toLowerCase();
    let endAt = tailStart;
    if (tail2.startsWith("ies")) endAt = tailStart + 3;
    else if (tail2.startsWith("es")) endAt = tailStart + 2;
    else if (tail2.startsWith("s")) endAt = tailStart + 1;
    const nextOk =
      endAt >= haystack.length || !/[a-z0-9]/i.test(haystack[endAt]);
    if (nextOk) return true;
    from = idx + 1;
  }
}

// ============================================================================
// Conversion generation
// ============================================================================

/**
 * Given a density entry and the ingredient's purchase unit, generate a
 * `unitConversions` map that can be stored on baseIngredients.unitConversions.
 *
 * The map expresses "1 recipeUnit = N purchaseUnits", which is exactly the
 * shape expected by `convertToPurchaseUnits()` in unitConversion.ts.
 *
 * Example — for flour purchased in "pound" with gramsPerCup = 125:
 *   { cup: 0.276, tablespoon: 0.0172, teaspoon: 0.00574 }
 */
export function generateUnitConversions(
  density: IngredientDensity,
  purchaseUnit: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  const pu = normalizeUnit(purchaseUnit);

  // Volumetric recipe units we want to support when gramsPerCup is defined
  const VOLUMETRIC_RECIPE_UNITS = [
    "cup",
    "tablespoon",
    "teaspoon",
    "fluid ounce",
    "pint",
    "quart",
    "gallon",
    "liter",
    "milliliter",
  ];

  // Weight recipe units we also pre-populate (so chefs can enter grams/oz and
  // have it resolve against any purchase unit without the built-in weight path)
  const WEIGHT_RECIPE_UNITS = ["gram", "kilogram", "ounce", "pound"];

  if (typeof density.gramsPerCup === "number" && density.gramsPerCup > 0) {
    for (const recipeUnit of VOLUMETRIC_RECIPE_UNITS) {
      try {
        // 1 recipeUnit → how many cups
        const cups = convertUnit(1, recipeUnit, "cup");
        const grams = cups * density.gramsPerCup;
        // grams → purchase unit (only works if purchase unit is a weight)
        const factor = convertUnit(grams, "gram", pu);
        if (Number.isFinite(factor) && factor > 0) {
          out[recipeUnit] = roundFactor(factor);
        }
      } catch {
        // Purchase unit isn't a weight (e.g. "each") — volumetric conversions
        // can't be expressed without a pack size. Skip.
      }
    }
  }

  // For weight recipe units: if the purchase unit is also a weight, the
  // built-in weight↔weight converter already handles this. We only need custom
  // entries when the purchase unit is something else (e.g. "each" with
  // gramsEach set).
  if (typeof density.gramsEach === "number" && density.gramsEach > 0) {
    // 1 each = gramsEach grams → convert to purchase unit
    try {
      const factor = convertUnit(density.gramsEach, "gram", pu);
      if (Number.isFinite(factor) && factor > 0) {
        out["each"] = roundFactor(factor);
      }
    } catch {
      // Purchase unit isn't a weight — "each" is only meaningful if purchase
      // unit is also "each" (in which case 1:1 is handled already).
    }

    // Also enable weight-based recipe units → purchase "each":
    // e.g., recipe asks for "1 pound chicken breast" but we buy "each" — so
    //   1 pound = 453.592 / gramsEach each.
    if (pu === "each" || pu === "ea") {
      for (const recipeUnit of WEIGHT_RECIPE_UNITS) {
        try {
          const gramsInOne = convertUnit(1, recipeUnit, "gram");
          const eaches = gramsInOne / density.gramsEach;
          if (Number.isFinite(eaches) && eaches > 0) {
            out[recipeUnit] = roundFactor(eaches);
          }
        } catch {
          /* ignore */
        }
      }
      // And volumetric recipe units → purchase "each" via gramsPerCup
      if (typeof density.gramsPerCup === "number" && density.gramsPerCup > 0) {
        for (const recipeUnit of VOLUMETRIC_RECIPE_UNITS) {
          try {
            const cups = convertUnit(1, recipeUnit, "cup");
            const grams = cups * density.gramsPerCup;
            const eaches = grams / density.gramsEach;
            if (Number.isFinite(eaches) && eaches > 0) {
              out[recipeUnit] = roundFactor(eaches);
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  return out;
}

/**
 * Merge auto-generated conversions with any existing custom conversions.
 * User-set entries always win.
 */
export function mergeConversions(
  existing: Record<string, number> | null | undefined,
  generated: Record<string, number>,
): Record<string, number> {
  const merged = { ...generated };
  if (existing) {
    for (const [k, v] of Object.entries(existing)) {
      if (typeof v === "number" && v > 0) merged[k] = v;
    }
  }
  return merged;
}

/**
 * Convenience: lookup and generate in one step.
 * Returns an empty object if no density match is found.
 */
export function suggestConversionsForIngredient(
  name: string,
  purchaseUnit: string,
  category?: string,
): { conversions: Record<string, number>; matched: string | null } {
  const density = findDensityForIngredient(name, category);
  if (!density) return { conversions: {}, matched: null };
  return {
    conversions: generateUnitConversions(density, purchaseUnit),
    matched: density.matchKey,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

function roundFactor(n: number): number {
  if (!Number.isFinite(n) || n === 0) return 0;
  // Keep ~5 significant digits to avoid floating point noise in the DB
  const abs = Math.abs(n);
  const sigFigs = 5;
  const digits = sigFigs - Math.floor(Math.log10(abs)) - 1;
  const clamped = Math.max(0, Math.min(8, digits));
  return parseFloat(n.toFixed(clamped));
}
