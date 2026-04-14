// Unit conversion utilities for recipe costing
// Handles conversion between cooking units and cost normalization

// ---------------------------------------------------------------------------
// Canonical unit catalog
// ---------------------------------------------------------------------------
// All units in the app are mapped to one of these canonical forms. This lets
// us detect typos ("tbls" → "tablespoon") and keeps the conversion logic
// small: we only need to understand the canonical set.
//
// Kind:
//   "weight" — can cross-convert with other weights
//   "volume" — can cross-convert with other volumes
//   "count"  — opaque (each/dozen/case/pack) — needs a density or pack-size
//              entry to cross into weight/volume
export type UnitKind = "weight" | "volume" | "count";

export interface CanonicalUnit {
  key: string;             // canonical name (singular, lowercase)
  kind: UnitKind;
  label: string;           // display label
  aliases: string[];       // accepted typed variants — all lowercase
}

export const CANONICAL_UNITS: CanonicalUnit[] = [
  // Weight
  { key: "pound",     kind: "weight", label: "Pound (lb)",     aliases: ["lb", "lbs", "pound", "pounds", "#"] },
  { key: "ounce",     kind: "weight", label: "Ounce (oz)",     aliases: ["oz", "ounce", "ounces"] },
  { key: "kilogram",  kind: "weight", label: "Kilogram (kg)",  aliases: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"] },
  { key: "gram",      kind: "weight", label: "Gram (g)",       aliases: ["g", "gr", "gram", "grams"] },

  // Volume
  { key: "gallon",      kind: "volume", label: "Gallon (gal)",      aliases: ["gal", "gals", "gallon", "gallons"] },
  { key: "quart",       kind: "volume", label: "Quart (qt)",        aliases: ["qt", "qts", "quart", "quarts"] },
  { key: "pint",        kind: "volume", label: "Pint (pt)",         aliases: ["pt", "pts", "pint", "pints"] },
  { key: "cup",         kind: "volume", label: "Cup",               aliases: ["c", "cup", "cups"] },
  { key: "fluid ounce", kind: "volume", label: "Fluid ounce (fl oz)", aliases: ["fl oz", "floz", "fluid ounce", "fluid ounces", "fl. oz", "fl.oz"] },
  { key: "tablespoon",  kind: "volume", label: "Tablespoon (tbsp)", aliases: ["tbsp", "tbs", "tbl", "tbls", "tablespoon", "tablespoons", "t"] },
  { key: "teaspoon",    kind: "volume", label: "Teaspoon (tsp)",    aliases: ["tsp", "tsps", "teaspoon", "teaspoons"] },
  { key: "liter",       kind: "volume", label: "Liter (L)",         aliases: ["l", "ltr", "liter", "liters", "litre", "litres"] },
  { key: "milliliter",  kind: "volume", label: "Milliliter (ml)",   aliases: ["ml", "mls", "milliliter", "milliliters", "millilitre", "millilitres"] },

  // Count (opaque — need density or pack-size to convert into weight/volume)
  { key: "each",   kind: "count", label: "Each",    aliases: ["ea", "each", "piece", "pieces", "pc", "pcs", "unit", "units"] },
  { key: "dozen",  kind: "count", label: "Dozen",   aliases: ["doz", "dozen", "dz"] },
  { key: "case",   kind: "count", label: "Case",    aliases: ["case", "cs"] },
  { key: "pack",   kind: "count", label: "Pack",    aliases: ["pack", "pk", "package", "packages"] },
  { key: "bag",    kind: "count", label: "Bag",     aliases: ["bag", "bags"] },
  { key: "bottle", kind: "count", label: "Bottle",  aliases: ["bottle", "bottles", "btl"] },
];

// Aliased lookup table (built once). Maps any known alias → canonical key.
const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const u of CANONICAL_UNITS) {
    out[u.key] = u.key;
    for (const a of u.aliases) out[a.toLowerCase()] = u.key;
  }
  return out;
})();

/**
 * Canonicalize a unit string to its preferred form. Handles common typos and
 * abbreviations. Returns the input unchanged if no canonical match is found
 * (we stay permissive to avoid breaking historical data).
 */
export function canonicalizeUnit(unit: string): string {
  if (!unit) return unit;
  const n = unit.toLowerCase().trim().replace(/[.]/g, "");
  if (ALIAS_TO_CANONICAL[n]) return ALIAS_TO_CANONICAL[n];
  // Try removing trailing "s" for naive plurals
  if (n.endsWith("s") && ALIAS_TO_CANONICAL[n.slice(0, -1)]) {
    return ALIAS_TO_CANONICAL[n.slice(0, -1)];
  }
  return n;
}

/** Classify a unit. Returns "count" for unknown inputs (opaque). */
export function unitKind(unit: string): UnitKind {
  const c = canonicalizeUnit(unit);
  const found = CANONICAL_UNITS.find((u) => u.key === c);
  return found?.kind ?? "count";
}


// Weight conversion factors (all to grams)
const WEIGHT_TO_GRAMS: Record<string, number> = {
  // Metric
  'gram': 1,
  'g': 1,
  'kilogram': 1000,
  'kg': 1000,
  
  // Imperial/US
  'ounce': 28.3495,
  'oz': 28.3495,
  'pound': 453.592,
  'lb': 453.592,
  'lbs': 453.592,
};

// Volume conversion factors (all to milliliters)
const VOLUME_TO_ML: Record<string, number> = {
  // Metric
  'milliliter': 1,
  'ml': 1,
  'liter': 1000,
  'l': 1000,
  
  // US
  'teaspoon': 4.92892,
  'tsp': 4.92892,
  'tablespoon': 14.7868,
  'tbsp': 14.7868,
  'fluid ounce': 29.5735,
  'fl oz': 29.5735,
  'cup': 236.588,
  'pint': 473.176,
  'pt': 473.176,
  'quart': 946.353,
  'qt': 946.353,
  'gallon': 3785.41,
  'gal': 3785.41,
};

// Count-based units (no conversion needed, just for reference)
const COUNT_UNITS = ['each', 'ea', 'dozen', 'doz', 'case'];

/**
 * Normalize a unit string to lowercase, trim, and resolve common typos and
 * abbreviations to their canonical form (e.g. "Tbls" → "tablespoon",
 * "LB" → "pound"). Keeping the canonicalizer here means every downstream
 * caller — cost math, shopping list, recipe builder — gets typo tolerance
 * for free.
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return unit;
  return canonicalizeUnit(unit);
}

/**
 * Determine if two units are compatible (same measurement type)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const u1 = normalizeUnit(unit1);
  const u2 = normalizeUnit(unit2);
  
  // Same unit is always compatible
  if (u1 === u2) return true;
  
  // Check if both are weight units
  if (u1 in WEIGHT_TO_GRAMS && u2 in WEIGHT_TO_GRAMS) return true;
  
  // Check if both are volume units
  if (u1 in VOLUME_TO_ML && u2 in VOLUME_TO_ML) return true;
  
  // Count units are only compatible with themselves
  return false;
}

/**
 * Convert a quantity from one unit to another
 * Returns the converted quantity or throws an error if units are incompatible
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  // No conversion needed
  if (from === to) return quantity;
  
  // Weight conversion
  if (from in WEIGHT_TO_GRAMS && to in WEIGHT_TO_GRAMS) {
    const grams = quantity * WEIGHT_TO_GRAMS[from];
    return grams / WEIGHT_TO_GRAMS[to];
  }
  
  // Volume conversion
  if (from in VOLUME_TO_ML && to in VOLUME_TO_ML) {
    const ml = quantity * VOLUME_TO_ML[from];
    return ml / VOLUME_TO_ML[to];
  }
  
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit} - incompatible units`);
}

/**
 * Calculate the cost per unit for an ingredient
 * 
 * Example: 
 * - Buy butter at $4.99/pound
 * - Returns cost per ounce: $4.99/16 = $0.31/oz
 * 
 * @param purchasePrice - The price paid (e.g., $4.99)
 * @param purchaseQuantity - The quantity purchased (e.g., 1)
 * @param purchaseUnit - The unit purchased in (e.g., "pound")
 * @param targetUnit - The unit to calculate cost per (e.g., "ounce")
 * @returns Cost per target unit
 */
export function calculateCostPerUnit(
  purchasePrice: number,
  purchaseQuantity: number,
  purchaseUnit: string,
  targetUnit: string
): number {
  // If units are the same, simple division
  if (normalizeUnit(purchaseUnit) === normalizeUnit(targetUnit)) {
    return purchasePrice / purchaseQuantity;
  }
  
  // Convert purchase quantity to target unit
  const quantityInTargetUnit = convertUnit(
    purchaseQuantity,
    purchaseUnit,
    targetUnit
  );
  
  return purchasePrice / quantityInTargetUnit;
}

/**
 * Calculate the cost of a recipe ingredient based on the base ingredient's purchase info
 * 
 * Example:
 * - Buy potatoes at $2.49/pound (purchasePrice=2.49, purchaseQuantity=1, purchaseUnit="pound")
 * - Recipe uses 0.2 pounds (recipeQuantity=0.2, recipeUnit="pound")
 * - Cost = $2.49 * 0.2 = $0.50
 * 
 * @param purchasePrice - Price of the base ingredient as purchased
 * @param purchaseQuantity - Quantity of the base ingredient as purchased
 * @param purchaseUnit - Unit of the base ingredient as purchased
 * @param recipeQuantity - Quantity used in the recipe
 * @param recipeUnit - Unit used in the recipe
 * @returns Total cost for this ingredient in the recipe
 */
export function calculateIngredientCost(
  purchasePrice: number,
  purchaseQuantity: number,
  purchaseUnit: string,
  recipeQuantity: number,
  recipeUnit: string,
  customConversions?: Record<string, number>,
  yieldPct?: number | null,
): number {
  const recipeQtyInPurchaseUnits = convertToPurchaseUnits(
    recipeQuantity,
    recipeUnit,
    purchaseUnit,
    customConversions,
    yieldPct,
  );
  // Cost per purchase unit × how many purchase units we need
  const costPerPurchaseUnit = purchasePrice / purchaseQuantity;
  return costPerPurchaseUnit * recipeQtyInPurchaseUnits;
}

/**
 * Convert a recipe quantity into purchase units.
 *
 * Uses three strategies in order:
 *   1. If recipeUnit === purchaseUnit → no conversion needed
 *   2. If units are compatible (both weight or both volume) → use built-in converter
 *   3. If a custom conversion is provided (customConversions[recipeUnit]) → use it
 *      The value in the map means "1 recipeUnit = N purchaseUnits".
 *
 * When `yieldPct` is set (edible ÷ as-purchased), the result is divided by it
 * so the caller learns how much to *buy*, not how much goes into the pot.
 * e.g. recipe calls for 1 lb diced onion, yieldPct=0.9 → we need to buy ~1.11 lb.
 *
 * Throws when no strategy applies.
 */
export function convertToPurchaseUnits(
  recipeQuantity: number,
  recipeUnit: string,
  purchaseUnit: string,
  customConversions?: Record<string, number>,
  yieldPct?: number | null,
): number {
  const from = normalizeUnit(recipeUnit);
  const to = normalizeUnit(purchaseUnit);

  let converted: number;

  // Same unit — no conversion
  if (from === to) {
    converted = recipeQuantity;
  } else if (areUnitsCompatible(from, to)) {
    // Built-in compatible conversion (weight↔weight, volume↔volume)
    converted = convertUnit(recipeQuantity, from, to);
  } else {
    // Custom conversion stored on the ingredient (volume→weight, each→weight, etc.)
    // Look up by the raw recipe unit first, then the normalized form
    const factor =
      customConversions?.[recipeUnit] ?? customConversions?.[from];
    if (typeof factor === "number" && factor > 0) {
      converted = recipeQuantity * factor;
    } else {
      throw new Error(
        `Cannot convert ${recipeUnit} → ${purchaseUnit}: incompatible unit types and no custom conversion defined. ` +
          `Add a conversion on the base ingredient (e.g., "1 cup = 0.15 kg") to fix this.`,
      );
    }
  }

  // Apply yield adjustment last — we need more raw to end up with `converted`
  // after trim/prep loss.
  if (typeof yieldPct === "number" && yieldPct > 0 && yieldPct < 1) {
    converted = converted / yieldPct;
  }

  return converted;
}

/**
 * Get all supported units by category
 */
export function getSupportedUnits() {
  return {
    weight: Object.keys(WEIGHT_TO_GRAMS),
    volume: Object.keys(VOLUME_TO_ML),
    count: COUNT_UNITS,
  };
}

/**
 * Format a price as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
