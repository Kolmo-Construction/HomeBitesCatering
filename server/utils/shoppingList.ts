import { db } from "../db";
import {
  menus,
  recipes,
  recipeComponents,
  baseIngredients,
  quoteRequests,
  type QuoteRequest,
  type MenuCategoryItem,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import {
  calculateIngredientCost,
  convertUnit,
  normalizeUnit,
} from "@shared/unitConversion";

// ============================================================================
// Types
// ============================================================================

export interface ShoppingListLine {
  baseIngredientId: number;
  name: string;
  category: string;               // meat, seafood, produce, dairy, dry_goods, spices, oils, beverages, other
  totalQuantity: number;          // in purchase units (what Mike actually buys)
  purchaseUnit: string;
  estimatedCost: number;          // dollars, rounded to 2 decimal places
  supplier: string | null;
  sku: string | null;
  usedInRecipes: string[];        // names of the recipes that contribute to this ingredient
  // Raw recipe-unit total for debugging
  rawTotalQuantityByUnit: Record<string, number>;
}

export interface ShoppingListResult {
  quoteRequestId: number;
  eventSummary: {
    eventType: string;
    eventDate: string | null;
    guestCount: number;
    venueName: string | null;
    menuThemeName: string | null;
    menuTierName: string | null;
  };
  portionMultiplier: number;       // how many portions per guest were assumed (1.0 default)
  // Grouped by ingredient category
  groupedByCategory: Record<string, ShoppingListLine[]>;
  // Flat list for export
  allLines: ShoppingListLine[];
  // Totals
  totalEstimatedCost: number;      // dollars
  totalLineCount: number;
  // Transparency: what WASN'T included
  unlinkedItems: Array<{
    category: string;
    itemName: string;
    reason: string;
  }>;
  // Recipes resolved (for display)
  resolvedRecipes: Array<{
    recipeId: number;
    recipeName: string;
    scaledBy: number;              // how many batches we're cooking
  }>;
}

interface CalculateOptions {
  portionMultiplier?: number;      // default depends on service style
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Calculate the aggregated shopping list for a quote request.
 *
 * Walks through every selected menu item, looks up its recipe (if linked),
 * scales the recipe by guest count, and aggregates all ingredients across
 * all selected items. Groups by ingredient category for shopping convenience.
 */
export async function calculateShoppingListForQuoteRequest(
  quoteRequestId: number,
  options: CalculateOptions = {},
): Promise<ShoppingListResult | null> {
  // Load the quote request
  const [quote] = await db
    .select()
    .from(quoteRequests)
    .where(eq(quoteRequests.id, quoteRequestId));

  if (!quote) return null;

  return calculateShoppingList(quote, options);
}

/**
 * Core calculation — takes a quote request object and computes the list.
 */
export async function calculateShoppingList(
  quote: QuoteRequest,
  options: CalculateOptions = {},
): Promise<ShoppingListResult> {
  const guestCount = quote.guestCount || 0;

  // Default portion multiplier based on service style
  // Buffet: guests typically sample multiple options — each item needs ~0.7 portions per guest
  // Family style / plated: ~1 portion per guest (split between the options selected)
  // Cocktail: 0.5 per guest (smaller portions)
  const defaultMultiplier = inferDefaultMultiplier(quote);
  const portionMultiplier = options.portionMultiplier ?? defaultMultiplier;

  // Load the menu (for category items metadata)
  let menu: typeof menus.$inferSelect | null = null;
  let menuName: string | null = null;
  let tierName: string | null = null;

  if (quote.menuTheme) {
    const [menuRow] = await db
      .select()
      .from(menus)
      .where(eq(menus.themeKey, quote.menuTheme));
    if (menuRow) {
      menu = menuRow;
      menuName = menuRow.name;
      const packages = (menuRow.packages as any[]) || [];
      const tier = packages.find((p) => p.tierKey === quote.menuTier);
      if (tier) tierName = tier.tierName;
    }
  }

  // Extract all selected items and figure out which have linked recipes
  const selections = (quote.menuSelections as any[]) || [];
  const categoryItems = (menu?.categoryItems as Record<string, MenuCategoryItem[]>) || {};

  const unlinkedItems: ShoppingListResult["unlinkedItems"] = [];
  const recipeRefs: Array<{
    recipeId: number;
    itemName: string;
    portionsNeeded: number;
    servingsPerGuest: number;
  }> = [];

  for (const sel of selections) {
    const items = categoryItems[sel.category] || [];
    const match = items.find(
      (i) => i.id === sel.itemId || i.name === sel.name,
    );

    if (!match) {
      unlinkedItems.push({
        category: sel.category,
        itemName: sel.name,
        reason: "Item not found in menu catalog",
      });
      continue;
    }

    if (!match.recipeId) {
      unlinkedItems.push({
        category: sel.category,
        itemName: match.name,
        reason: "Not linked to a recipe yet — link in Menu Package Editor",
      });
      continue;
    }

    // Calculate portions needed for this item
    const portionsNeeded = Math.ceil(guestCount * portionMultiplier);
    recipeRefs.push({
      recipeId: match.recipeId,
      itemName: match.name,
      portionsNeeded,
      servingsPerGuest: portionMultiplier,
    });
  }

  // If no recipes to resolve, return empty result
  if (recipeRefs.length === 0) {
    return {
      quoteRequestId: quote.id,
      eventSummary: {
        eventType: quote.eventType,
        eventDate: quote.eventDate ? quote.eventDate.toISOString() : null,
        guestCount,
        venueName: quote.venueName,
        menuThemeName: menuName,
        menuTierName: tierName,
      },
      portionMultiplier,
      groupedByCategory: {},
      allLines: [],
      totalEstimatedCost: 0,
      totalLineCount: 0,
      unlinkedItems,
      resolvedRecipes: [],
    };
  }

  // Batch fetch all recipes
  const uniqueRecipeIds = Array.from(new Set(recipeRefs.map((r) => r.recipeId)));
  const recipeRows = await db
    .select()
    .from(recipes)
    .where(inArray(recipes.id, uniqueRecipeIds));

  // Batch fetch all recipe components with base ingredient details
  const componentRows = await db
    .select({
      recipeId: recipeComponents.recipeId,
      quantity: recipeComponents.quantity,
      unit: recipeComponents.unit,
      baseIngredientId: recipeComponents.baseIngredientId,
      baseIngredient: baseIngredients,
    })
    .from(recipeComponents)
    .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
    .where(inArray(recipeComponents.recipeId, uniqueRecipeIds));

  // Group components by recipe ID
  const componentsByRecipe = new Map<number, typeof componentRows>();
  for (const comp of componentRows) {
    if (!componentsByRecipe.has(comp.recipeId)) {
      componentsByRecipe.set(comp.recipeId, []);
    }
    componentsByRecipe.get(comp.recipeId)!.push(comp);
  }

  // Aggregate ingredients across all recipes
  // Key: baseIngredientId
  // Value: accumulated state
  interface Accumulator {
    baseIngredientId: number;
    name: string;
    category: string;
    purchasePrice: number;
    purchaseQuantity: number;
    purchaseUnit: string;
    supplier: string | null;
    sku: string | null;
    // Sum quantities per recipe unit (we convert to purchase unit at the end)
    quantityByUnit: Map<string, number>;
    usedInRecipes: Set<string>;
  }

  const accumulator = new Map<number, Accumulator>();
  const resolvedRecipes: ShoppingListResult["resolvedRecipes"] = [];

  for (const ref of recipeRefs) {
    const recipe = recipeRows.find((r) => r.id === ref.recipeId);
    if (!recipe) {
      unlinkedItems.push({
        category: "unknown",
        itemName: ref.itemName,
        reason: `Recipe ID ${ref.recipeId} not found`,
      });
      continue;
    }

    const yieldAmount = parseFloat(recipe.yield || "1") || 1;
    const batches = yieldAmount > 0 ? ref.portionsNeeded / yieldAmount : 0;

    resolvedRecipes.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      scaledBy: batches,
    });

    const components = componentsByRecipe.get(recipe.id) || [];

    for (const comp of components) {
      const recipeQty = parseFloat(String(comp.quantity)) * batches;
      const unit = normalizeUnit(comp.unit);
      const ing = comp.baseIngredient;

      let acc = accumulator.get(comp.baseIngredientId);
      if (!acc) {
        acc = {
          baseIngredientId: comp.baseIngredientId,
          name: ing.name,
          category: ing.category,
          purchasePrice: parseFloat(ing.purchasePrice) || 0,
          purchaseQuantity: parseFloat(String(ing.purchaseQuantity)) || 1,
          purchaseUnit: ing.purchaseUnit,
          supplier: ing.supplier,
          sku: ing.sku,
          quantityByUnit: new Map(),
          usedInRecipes: new Set(),
        };
        accumulator.set(comp.baseIngredientId, acc);
      }

      // Accumulate quantity by recipe unit
      const currentQty = acc.quantityByUnit.get(unit) || 0;
      acc.quantityByUnit.set(unit, currentQty + recipeQty);
      acc.usedInRecipes.add(recipe.name);
    }
  }

  // Build the final shopping list lines
  const allLines: ShoppingListLine[] = [];

  for (const acc of Array.from(accumulator.values())) {
    // Convert all accumulated quantities to the purchase unit
    let totalInPurchaseUnit = 0;
    const rawTotalByUnit: Record<string, number> = {};

    for (const [unit, qty] of Array.from(acc.quantityByUnit.entries())) {
      rawTotalByUnit[unit] = qty;
      try {
        const converted = convertUnit(qty, unit, acc.purchaseUnit);
        totalInPurchaseUnit += converted;
      } catch {
        // Can't convert — assume the recipe unit matches purchase unit or skip
        if (normalizeUnit(unit) === normalizeUnit(acc.purchaseUnit)) {
          totalInPurchaseUnit += qty;
        }
        // Otherwise, the mismatch is a data issue; we still record the raw qty
      }
    }

    // Estimate cost: sum of ingredient costs across all recipe uses
    let estimatedCost = 0;
    for (const [unit, qty] of Array.from(acc.quantityByUnit.entries())) {
      try {
        estimatedCost += calculateIngredientCost(
          acc.purchasePrice,
          acc.purchaseQuantity,
          acc.purchaseUnit,
          qty,
          unit,
        );
      } catch {
        // Fallback: assume unit matches
        estimatedCost += acc.purchasePrice * (qty / acc.purchaseQuantity);
      }
    }

    allLines.push({
      baseIngredientId: acc.baseIngredientId,
      name: acc.name,
      category: acc.category,
      totalQuantity: Math.round(totalInPurchaseUnit * 100) / 100,
      purchaseUnit: acc.purchaseUnit,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      supplier: acc.supplier,
      sku: acc.sku,
      usedInRecipes: Array.from(acc.usedInRecipes),
      rawTotalQuantityByUnit: rawTotalByUnit,
    });
  }

  // Sort alphabetically within each category for consistency
  allLines.sort((a, b) => a.name.localeCompare(b.name));

  // Group by ingredient category
  const groupedByCategory: Record<string, ShoppingListLine[]> = {};
  for (const line of allLines) {
    const cat = line.category || "other";
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(line);
  }

  // Totals
  const totalEstimatedCost = allLines.reduce(
    (sum, line) => sum + line.estimatedCost,
    0,
  );

  return {
    quoteRequestId: quote.id,
    eventSummary: {
      eventType: quote.eventType,
      eventDate: quote.eventDate ? quote.eventDate.toISOString() : null,
      guestCount,
      venueName: quote.venueName,
      menuThemeName: menuName,
      menuTierName: tierName,
    },
    portionMultiplier,
    groupedByCategory,
    allLines,
    totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
    totalLineCount: allLines.length,
    unlinkedItems,
    resolvedRecipes,
  };
}

/**
 * Infer a reasonable default portion multiplier based on service style.
 * Buffets need less per item because guests sample multiple options;
 * plated meals need more precise portioning.
 */
function inferDefaultMultiplier(quote: QuoteRequest): number {
  const selectionCount = ((quote.menuSelections as any[]) || []).length;

  switch (quote.serviceType) {
    case "buffet":
      // Buffet with many options — guests sample, don't eat a full portion of each
      if (selectionCount >= 4) return 0.6;
      if (selectionCount >= 2) return 0.8;
      return 1.0;
    case "family_style":
      return 0.7;
    case "plated":
      // Plated meal — typically 1 protein per guest, so split by number of protein options
      return selectionCount > 0 ? 1 / Math.min(selectionCount, 4) : 1;
    case "cocktail_party":
      return 0.5;
    default:
      return 1.0;
  }
}
