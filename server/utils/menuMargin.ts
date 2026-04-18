import { db } from "../db";
import {
  menus,
  recipes,
  recipeComponents,
  baseIngredients,
  LABOR_RATE_PER_HOUR_CENTS,
  type MenuCategoryItem,
  type MenuPackageTier,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { calculateIngredientCost } from "@shared/unitConversion";

/**
 * Safe cost calculation wrapper — handles parsing and NaN defense.
 */
function safeCalculateIngredientCost(
  purchasePrice: string | number,
  purchaseQty: string | number,
  purchaseUnit: string,
  recipeQty: string | number,
  recipeUnit: string,
  customConversions?: Record<string, number> | null,
): number {
  try {
    const price = typeof purchasePrice === "string" ? parseFloat(purchasePrice) : purchasePrice;
    const pqty = typeof purchaseQty === "string" ? parseFloat(purchaseQty) : purchaseQty;
    const rqty = typeof recipeQty === "string" ? parseFloat(recipeQty) : recipeQty;
    if (isNaN(price) || isNaN(pqty) || isNaN(rqty)) return 0;
    const result = calculateIngredientCost(
      price,
      pqty,
      purchaseUnit,
      rqty,
      recipeUnit,
      customConversions || undefined,
    );
    return isNaN(result) ? 0 : result;
  } catch {
    return 0;
  }
}

export interface RecipeCostBreakdown {
  recipeId: number;
  recipeName: string;
  yieldAmount: number;
  yieldUnit: string;
  laborHours: number;
  // Per-serving values, all in cents
  ingredientCostCents: number;
  laborCostCents: number;
  totalCostCents: number;
}

/**
 * Calculate the cost-per-serving for a single recipe based on its ingredients.
 * Returns a full breakdown (ingredient vs labor) for drill-down display.
 */
async function getRecipeCostBreakdown(
  recipeId: number,
): Promise<RecipeCostBreakdown | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  if (!recipe) return null;

  const components = await db
    .select({
      quantity: recipeComponents.quantity,
      unit: recipeComponents.unit,
      purchasePrice: baseIngredients.purchasePrice,
      purchaseQuantity: baseIngredients.purchaseQuantity,
      purchaseUnit: baseIngredients.purchaseUnit,
      unitConversions: baseIngredients.unitConversions,
    })
    .from(recipeComponents)
    .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
    .where(eq(recipeComponents.recipeId, recipeId));

  let ingredientCostTotal = 0;
  for (const comp of components) {
    ingredientCostTotal += safeCalculateIngredientCost(
      comp.purchasePrice,
      comp.purchaseQuantity,
      comp.purchaseUnit,
      comp.quantity,
      comp.unit,
      comp.unitConversions as Record<string, number> | null,
    );
  }

  const laborHours = parseFloat(String(recipe.laborHours || "0")) || 0;
  const laborCostTotal = (laborHours * LABOR_RATE_PER_HOUR_CENTS) / 100;
  const yieldAmount = parseFloat(recipe.yield || "1") || 1;
  const perServing = yieldAmount > 0 ? 1 / yieldAmount : 1;

  const ingredientCostCents = Math.round(ingredientCostTotal * perServing * 100);
  const laborCostCents = Math.round(laborCostTotal * perServing * 100);

  return {
    recipeId,
    recipeName: recipe.name,
    yieldAmount,
    yieldUnit: recipe.yieldUnit || "serving",
    laborHours,
    ingredientCostCents,
    laborCostCents,
    totalCostCents: ingredientCostCents + laborCostCents,
  };
}

async function getRecipeCostPerServing(recipeId: number): Promise<number> {
  const breakdown = await getRecipeCostBreakdown(recipeId);
  return breakdown ? breakdown.totalCostCents / 100 : 0;
}

/**
 * Returns true if the item is available in the given tier. Items with no
 * `availableInTiers` (or an empty array) are considered available in ALL
 * tiers — this is the backwards-compatible default for legacy menu data.
 */
export function isItemAvailableInTier(
  item: MenuCategoryItem,
  tierKey: string,
): boolean {
  const tiers = item.availableInTiers;
  if (!tiers || tiers.length === 0) return true;
  return tiers.includes(tierKey);
}

export interface TierMarginAnalysis {
  tierKey: string;
  tierName: string;
  pricePerPersonCents: number;
  // Food cost per person (weighted average across linked items, per category)
  estimatedFoodCostCents: number;
  // Food cost as a percentage of tier price
  foodCostPercent: number;
  // Profit margin per person in cents
  marginPerPersonCents: number;
  // Status based on food cost percentage
  status: "excellent" | "healthy" | "tight" | "unhealthy";
  // Items that are linked to recipes (for transparency)
  linkedItemCount: number;
  // Items that are NOT linked to recipes (so cost is estimated as $0)
  unlinkedItemCount: number;
}

/**
 * Calculate food cost and margin for each tier of a menu.
 * Uses the linked recipes (via categoryItems[].recipeId) to quote actual cost.
 */
export async function calculateMenuMargin(menuId: number): Promise<TierMarginAnalysis[]> {
  const [menu] = await db.select().from(menus).where(eq(menus.id, menuId));
  if (!menu) return [];

  const packages = (menu.packages as MenuPackageTier[]) || [];
  const categoryItems = (menu.categoryItems as Record<string, MenuCategoryItem[]>) || {};

  // Collect all recipe IDs from linked category items
  const recipeIds = new Set<number>();
  for (const items of Object.values(categoryItems)) {
    for (const item of items) {
      if (item.recipeId) recipeIds.add(item.recipeId);
    }
  }

  // Batch fetch all recipe costs
  const recipeCosts = new Map<number, number>();
  for (const rid of Array.from(recipeIds)) {
    recipeCosts.set(rid, await getRecipeCostPerServing(rid));
  }

  // For each tier, quote food cost
  const results: TierMarginAnalysis[] = [];

  for (const tier of packages) {
    let totalCostPerPerson = 0;
    let linkedCount = 0;
    let unlinkedCount = 0;

    // For each category in the tier's selection limits
    for (const [category, limit] of Object.entries(tier.selectionLimits)) {
      const allItems = categoryItems[category] || [];
      // Only consider items that are actually available in this tier
      const items = allItems.filter((it) => isItemAvailableInTier(it, tier.tierKey));
      if (items.length === 0) continue;

      // Average cost of items in this category (assuming customer picks a mix)
      let categoryCostSum = 0;
      let categoryItemsConsidered = 0;

      for (const item of items) {
        if (item.recipeId && recipeCosts.has(item.recipeId)) {
          categoryCostSum += recipeCosts.get(item.recipeId) || 0;
          categoryItemsConsidered++;
          linkedCount++;
        } else {
          unlinkedCount++;
        }
      }

      // Use the average cost, multiplied by how many items the tier allows
      if (categoryItemsConsidered > 0) {
        const avgCost = categoryCostSum / categoryItemsConsidered;
        totalCostPerPerson += avgCost * limit;
      }
    }

    const estimatedFoodCostCents = Math.round(totalCostPerPerson * 100);
    const foodCostPercent =
      tier.pricePerPersonCents > 0
        ? (estimatedFoodCostCents / tier.pricePerPersonCents) * 100
        : 0;
    const marginPerPersonCents = tier.pricePerPersonCents - estimatedFoodCostCents;

    let status: TierMarginAnalysis["status"] = "excellent";
    if (foodCostPercent > 40) status = "unhealthy";
    else if (foodCostPercent > 32) status = "tight";
    else if (foodCostPercent > 25) status = "healthy";

    results.push({
      tierKey: tier.tierKey,
      tierName: tier.tierName,
      pricePerPersonCents: tier.pricePerPersonCents,
      estimatedFoodCostCents,
      foodCostPercent,
      marginPerPersonCents,
      status,
      linkedItemCount: linkedCount,
      unlinkedItemCount: unlinkedCount,
    });
  }

  return results;
}

// ============================================
// DETAIL / DRILL-DOWN
// ============================================

export interface MarginItemDetail {
  itemId: string;
  itemName: string;
  recipeId: number | null;
  linked: boolean;
  // per-serving, all in cents; null for unlinked items
  ingredientCostCents: number | null;
  laborCostCents: number | null;
  laborHours: number | null;
  totalCostCents: number | null;
  yieldAmount: number | null;
  yieldUnit: string | null;
  upchargeCents: number;
}

export interface MarginCategoryDetail {
  category: string;
  selectionLimit: number;
  itemCount: number;
  linkedCount: number;
  unlinkedCount: number;
  averageItemCostCents: number; // avg across linked items only, per serving
  contributionCents: number;    // averageItemCostCents × selectionLimit
  items: MarginItemDetail[];
}

export interface TierMarginDetail extends TierMarginAnalysis {
  menuId: number;
  menuName: string;
  laborRateCentsPerHour: number;
  categories: MarginCategoryDetail[];
}

/**
 * Full drill-down for a single tier: every selection category with every
 * item's ingredient/labor cost breakdown. Used by the dashboard detail dialog.
 */
export async function calculateMenuMarginDetail(
  menuId: number,
  tierKey: string,
): Promise<TierMarginDetail | null> {
  const [menu] = await db.select().from(menus).where(eq(menus.id, menuId));
  if (!menu) return null;

  const packages = (menu.packages as MenuPackageTier[]) || [];
  const tier = packages.find((t) => t.tierKey === tierKey);
  if (!tier) return null;

  const categoryItems = (menu.categoryItems as Record<string, MenuCategoryItem[]>) || {};

  // Collect and batch-fetch every recipe referenced by this tier's categories
  // (only items actually available in this tier — see isItemAvailableInTier)
  const recipeIds = new Set<number>();
  for (const category of Object.keys(tier.selectionLimits)) {
    const items = (categoryItems[category] || []).filter((it) =>
      isItemAvailableInTier(it, tier.tierKey),
    );
    for (const item of items) {
      if (item.recipeId) recipeIds.add(item.recipeId);
    }
  }

  const breakdowns = new Map<number, RecipeCostBreakdown>();
  for (const rid of Array.from(recipeIds)) {
    const bd = await getRecipeCostBreakdown(rid);
    if (bd) breakdowns.set(rid, bd);
  }

  const categories: MarginCategoryDetail[] = [];
  let totalCostPerPersonCents = 0;
  let totalLinked = 0;
  let totalUnlinked = 0;

  for (const [category, limit] of Object.entries(tier.selectionLimits)) {
    const items = (categoryItems[category] || []).filter((it) =>
      isItemAvailableInTier(it, tier.tierKey),
    );
    const itemDetails: MarginItemDetail[] = [];
    let linkedSum = 0;
    let linkedCount = 0;
    let unlinkedCount = 0;

    for (const item of items) {
      const bd = item.recipeId ? breakdowns.get(item.recipeId) : undefined;
      if (bd) {
        itemDetails.push({
          itemId: item.id,
          itemName: item.name,
          recipeId: item.recipeId ?? null,
          linked: true,
          ingredientCostCents: bd.ingredientCostCents,
          laborCostCents: bd.laborCostCents,
          laborHours: bd.laborHours,
          totalCostCents: bd.totalCostCents,
          yieldAmount: bd.yieldAmount,
          yieldUnit: bd.yieldUnit,
          upchargeCents: item.upchargeCents ?? 0,
        });
        linkedSum += bd.totalCostCents;
        linkedCount++;
      } else {
        itemDetails.push({
          itemId: item.id,
          itemName: item.name,
          recipeId: item.recipeId ?? null,
          linked: false,
          ingredientCostCents: null,
          laborCostCents: null,
          laborHours: null,
          totalCostCents: null,
          yieldAmount: null,
          yieldUnit: null,
          upchargeCents: item.upchargeCents ?? 0,
        });
        unlinkedCount++;
      }
    }

    const averageItemCostCents =
      linkedCount > 0 ? Math.round(linkedSum / linkedCount) : 0;
    const contributionCents = averageItemCostCents * limit;
    totalCostPerPersonCents += contributionCents;
    totalLinked += linkedCount;
    totalUnlinked += unlinkedCount;

    categories.push({
      category,
      selectionLimit: limit,
      itemCount: items.length,
      linkedCount,
      unlinkedCount,
      averageItemCostCents,
      contributionCents,
      items: itemDetails,
    });
  }

  const estimatedFoodCostCents = totalCostPerPersonCents;
  const foodCostPercent =
    tier.pricePerPersonCents > 0
      ? (estimatedFoodCostCents / tier.pricePerPersonCents) * 100
      : 0;
  const marginPerPersonCents = tier.pricePerPersonCents - estimatedFoodCostCents;

  let status: TierMarginAnalysis["status"] = "excellent";
  if (foodCostPercent > 40) status = "unhealthy";
  else if (foodCostPercent > 32) status = "tight";
  else if (foodCostPercent > 25) status = "healthy";

  return {
    menuId,
    menuName: menu.name,
    laborRateCentsPerHour: LABOR_RATE_PER_HOUR_CENTS,
    tierKey: tier.tierKey,
    tierName: tier.tierName,
    pricePerPersonCents: tier.pricePerPersonCents,
    estimatedFoodCostCents,
    foodCostPercent,
    marginPerPersonCents,
    status,
    linkedItemCount: totalLinked,
    unlinkedItemCount: totalUnlinked,
    categories,
  };
}
