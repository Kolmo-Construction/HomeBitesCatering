import { db } from "../db";
import {
  menus,
  recipes,
  recipeComponents,
  baseIngredients,
  ingredientPackSizes,
  inquiries,
  LABOR_RATE_PER_HOUR_CENTS,
  type Inquiry,
  type MenuCategoryItem,
  type IngredientPackSize,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import {
  calculateIngredientCost,
  convertUnit,
  convertToPurchaseUnits,
  normalizeUnit,
  areUnitsCompatible,
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
  // Pack-level purchasing plan, when pack sizes are defined on the ingredient.
  // Tells Mike exactly which packs to buy ("2 × 5 lb bag + 1 × 1 lb bag").
  packPlan?: {
    packs: Array<{
      packSizeId: number;
      label: string;
      packs: number;           // whole packs to purchase (≥ minOrderPacks)
      unitQuantity: number;    // quantity per pack
      unitUnit: string;
      totalQuantity: number;   // packs × unitQuantity (in unitUnit)
      pricePerPack: number;    // dollars
      totalPrice: number;      // dollars
      supplier: string | null;
      sku: string | null;
    }>;
    plannedTotalQuantity: number;   // sum of totalQuantity, in the anchor unit
    plannedTotalPrice: number;      // sum of totalPrice, in dollars
    anchorUnit: string;             // unit the plan is anchored to (usually purchaseUnit)
    overBuyQuantity: number;        // how much over the raw need we end up buying
  };
}

export interface ShoppingListResult {
  inquiryId: number;
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
  // Totals (all in dollars)
  totalEstimatedCost: number;           // ingredient cost only (what Mike will buy)
  totalLaborCost: number;                // labor cost from the resolved recipes at $35/hr
  totalLaborHours: number;               // total labor hours across all resolved recipes
  totalFullyLoadedCost: number;          // ingredients + labor (what the event "costs" to execute)
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
    laborHoursPerBatch: number;    // labor hours for one batch of this recipe
  }>;
}

interface CalculateOptions {
  portionMultiplier?: number;      // default depends on service style
}

// ============================================================================
// Pack planning
// ============================================================================

/**
 * Given how much of an ingredient the event needs, and a set of pack sizes
 * the ingredient is sold in, compute the cheapest combination of packs that
 * meets or exceeds the need.
 *
 * Strategy — greedy largest-pack-first with a single-small-pack top-up. This
 * is not globally optimal (classic unbounded knapsack) but catches the 95%
 * case: "we need 7 lb flour; buy 1× 5 lb bag + 2× 1 lb bag = 7 lb".
 *
 * All packs are assumed to be weight/volume compatible with the anchor unit.
 * Incompatible packs (different kind) are ignored.
 */
export function planPacks(
  neededQuantity: number,
  anchorUnit: string,
  packs: IngredientPackSize[],
  customConversions: Record<string, number> | null,
): NonNullable<ShoppingListLine["packPlan"]> | undefined {
  if (neededQuantity <= 0 || packs.length === 0) return undefined;

  // Convert every pack's unit to the anchor unit so the math is uniform.
  // Incompatible packs are skipped (they can't fulfill a need expressed in the
  // anchor unit).
  const normalized = packs
    .map((p) => {
      const qty = parseFloat(String(p.quantity)) || 0;
      const price = parseFloat(String(p.price)) || 0;
      if (qty <= 0) return null;
      let quantityInAnchor: number;
      try {
        quantityInAnchor = convertToPurchaseUnits(
          qty,
          p.unit,
          anchorUnit,
          customConversions || undefined,
        );
      } catch {
        return null;
      }
      if (!Number.isFinite(quantityInAnchor) || quantityInAnchor <= 0) return null;
      return {
        pack: p,
        quantityPerPack: qty,
        quantityInAnchor,
        pricePerPack: price,
        pricePerAnchorUnit: price / quantityInAnchor,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (normalized.length === 0) return undefined;

  // Sort largest-first so greedy peels off bulk packs first
  normalized.sort((a, b) => b.quantityInAnchor - a.quantityInAnchor);

  let remaining = neededQuantity;
  const chosen = new Map<number, { entry: typeof normalized[number]; count: number }>();

  // Greedy: take as many of the largest pack as fit, then descend to smaller
  // packs. Skip packs whose single unit exceeds remaining unless it's the
  // smallest pack — that's the "top up" step.
  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    if (n.quantityInAnchor > remaining) continue;
    const whole = Math.floor(remaining / n.quantityInAnchor);
    if (whole <= 0) continue;
    const minOrder = Math.max(1, n.pack.minOrderPacks || 1);
    const count = Math.max(whole, minOrder);
    chosen.set(n.pack.id, { entry: n, count });
    remaining -= count * n.quantityInAnchor;
    if (remaining <= 0.0001) break;
  }

  // If we still have a leftover need, top up with the smallest available pack.
  if (remaining > 0.0001) {
    const smallest = normalized[normalized.length - 1];
    const minOrder = Math.max(1, smallest.pack.minOrderPacks || 1);
    const topupCount = Math.max(
      minOrder,
      Math.ceil(remaining / smallest.quantityInAnchor),
    );
    const prev = chosen.get(smallest.pack.id);
    if (prev) {
      prev.count += topupCount;
    } else {
      chosen.set(smallest.pack.id, { entry: smallest, count: topupCount });
    }
    remaining -= topupCount * smallest.quantityInAnchor;
  }

  const packLines: NonNullable<ShoppingListLine["packPlan"]>["packs"] = [];
  let plannedTotalQuantity = 0;
  let plannedTotalPrice = 0;

  for (const { entry, count } of Array.from(chosen.values())) {
    const totalQ = count * entry.quantityInAnchor;
    const totalP = count * entry.pricePerPack;
    plannedTotalQuantity += totalQ;
    plannedTotalPrice += totalP;
    packLines.push({
      packSizeId: entry.pack.id,
      label: entry.pack.label,
      packs: count,
      unitQuantity: entry.quantityPerPack,
      unitUnit: entry.pack.unit,
      totalQuantity: Math.round(totalQ * 100) / 100,
      pricePerPack: Math.round(entry.pricePerPack * 100) / 100,
      totalPrice: Math.round(totalP * 100) / 100,
      supplier: entry.pack.supplier,
      sku: entry.pack.sku,
    });
  }

  return {
    packs: packLines,
    plannedTotalQuantity: Math.round(plannedTotalQuantity * 100) / 100,
    plannedTotalPrice: Math.round(plannedTotalPrice * 100) / 100,
    anchorUnit,
    overBuyQuantity:
      Math.round((plannedTotalQuantity - neededQuantity) * 100) / 100,
  };
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
export async function calculateShoppingListForInquiry(
  inquiryId: number,
  options: CalculateOptions = {},
): Promise<ShoppingListResult | null> {
  // Load the quote request
  const [quote] = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId));

  if (!quote) return null;

  return calculateShoppingList(quote, options);
}

/**
 * Core calculation — takes a quote request object and computes the list.
 */
export async function calculateShoppingList(
  quote: Inquiry,
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
      inquiryId: quote.id,
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
      totalLaborCost: 0,
      totalLaborHours: 0,
      totalFullyLoadedCost: 0,
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

  // Batch fetch all pack sizes for the ingredients in the shopping list
  const uniqueIngredientIds = Array.from(
    new Set(componentRows.map((c) => c.baseIngredientId)),
  );
  const packSizeRows: IngredientPackSize[] = uniqueIngredientIds.length
    ? await db
        .select()
        .from(ingredientPackSizes)
        .where(inArray(ingredientPackSizes.baseIngredientId, uniqueIngredientIds))
    : [];
  const packsByIngredient = new Map<number, IngredientPackSize[]>();
  for (const p of packSizeRows) {
    if (!packsByIngredient.has(p.baseIngredientId)) {
      packsByIngredient.set(p.baseIngredientId, []);
    }
    packsByIngredient.get(p.baseIngredientId)!.push(p);
  }

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
    unitConversions: Record<string, number> | null;
    yieldPct: number | null;
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
      laborHoursPerBatch: parseFloat(String(recipe.laborHours || "0")) || 0,
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
          unitConversions: (ing.unitConversions as Record<string, number>) || null,
          yieldPct:
            ing.yieldPct != null ? parseFloat(String(ing.yieldPct)) : null,
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
        const converted = convertToPurchaseUnits(
          qty,
          unit,
          acc.purchaseUnit,
          acc.unitConversions || undefined,
          acc.yieldPct,
        );
        totalInPurchaseUnit += converted;
      } catch {
        // Can't convert — leave raw qty unmapped
      }
    }

    // Quote cost: sum of ingredient costs across all recipe uses
    let estimatedCost = 0;
    for (const [unit, qty] of Array.from(acc.quantityByUnit.entries())) {
      try {
        estimatedCost += calculateIngredientCost(
          acc.purchasePrice,
          acc.purchaseQuantity,
          acc.purchaseUnit,
          qty,
          unit,
          acc.unitConversions || undefined,
          acc.yieldPct,
        );
      } catch {
        // Fallback: assume unit matches
        estimatedCost += acc.purchasePrice * (qty / acc.purchaseQuantity);
      }
    }

    // If pack sizes are defined for this ingredient, plan out the actual
    // purchase (which packs, how many, at what total cost). When a plan is
    // computed, its totalPrice overrides the naive per-unit cost quote —
    // it's the real out-of-pocket number for the event.
    const packs = packsByIngredient.get(acc.baseIngredientId) || [];
    let packPlan: ShoppingListLine["packPlan"];
    let finalEstimatedCost = estimatedCost;
    if (packs.length > 0 && totalInPurchaseUnit > 0) {
      packPlan = planPacks(
        totalInPurchaseUnit,
        acc.purchaseUnit,
        packs,
        acc.unitConversions,
      );
      if (packPlan && packPlan.plannedTotalPrice > 0) {
        finalEstimatedCost = packPlan.plannedTotalPrice;
      }
    }

    allLines.push({
      baseIngredientId: acc.baseIngredientId,
      name: acc.name,
      category: acc.category,
      totalQuantity: Math.round(totalInPurchaseUnit * 100) / 100,
      purchaseUnit: acc.purchaseUnit,
      estimatedCost: Math.round(finalEstimatedCost * 100) / 100,
      supplier: acc.supplier,
      sku: acc.sku,
      usedInRecipes: Array.from(acc.usedInRecipes),
      rawTotalQuantityByUnit: rawTotalByUnit,
      packPlan,
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

  // Ingredient cost total
  const totalEstimatedCost = allLines.reduce(
    (sum, line) => sum + line.estimatedCost,
    0,
  );

  // Labor totals — sum (laborHoursPerBatch × scaledBy) across resolved recipes
  const totalLaborHours = resolvedRecipes.reduce(
    (sum, r) => sum + r.laborHoursPerBatch * r.scaledBy,
    0,
  );
  const totalLaborCost = (totalLaborHours * LABOR_RATE_PER_HOUR_CENTS) / 100;
  const totalFullyLoadedCost = totalEstimatedCost + totalLaborCost;

  return {
    inquiryId: quote.id,
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
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalLaborHours: Math.round(totalLaborHours * 100) / 100,
    totalFullyLoadedCost: Math.round(totalFullyLoadedCost * 100) / 100,
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
function inferDefaultMultiplier(quote: Inquiry): number {
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
