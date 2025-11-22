// Unit conversion utilities for recipe costing
// Handles conversion between cooking units and cost normalization

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
 * Normalize a unit string to lowercase and handle common variations
 */
export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
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
  recipeUnit: string
): number {
  // Calculate cost per recipe unit
  const costPerRecipeUnit = calculateCostPerUnit(
    purchasePrice,
    purchaseQuantity,
    purchaseUnit,
    recipeUnit
  );
  
  // Multiply by recipe quantity
  return costPerRecipeUnit * recipeQuantity;
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
