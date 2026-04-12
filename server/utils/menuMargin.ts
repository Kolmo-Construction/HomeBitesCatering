import { db } from "../db";
import {
  menus,
  recipes,
  recipeComponents,
  baseIngredients,
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
): number {
  try {
    const price = typeof purchasePrice === "string" ? parseFloat(purchasePrice) : purchasePrice;
    const pqty = typeof purchaseQty === "string" ? parseFloat(purchaseQty) : purchaseQty;
    const rqty = typeof recipeQty === "string" ? parseFloat(recipeQty) : recipeQty;
    if (isNaN(price) || isNaN(pqty) || isNaN(rqty)) return 0;
    const result = calculateIngredientCost(price, pqty, purchaseUnit, rqty, recipeUnit);
    return isNaN(result) ? 0 : result;
  } catch {
    return 0;
  }
}

/**
 * Calculate the cost-per-serving for a single recipe based on its ingredients.
 */
async function getRecipeCostPerServing(recipeId: number): Promise<number> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
  if (!recipe) return 0;

  const components = await db
    .select({
      quantity: recipeComponents.quantity,
      unit: recipeComponents.unit,
      purchasePrice: baseIngredients.purchasePrice,
      purchaseQuantity: baseIngredients.purchaseQuantity,
      purchaseUnit: baseIngredients.purchaseUnit,
    })
    .from(recipeComponents)
    .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
    .where(eq(recipeComponents.recipeId, recipeId));

  let totalCost = 0;
  for (const comp of components) {
    totalCost += safeCalculateIngredientCost(
      comp.purchasePrice,
      comp.purchaseQuantity,
      comp.purchaseUnit,
      comp.quantity,
      comp.unit,
    );
  }

  const yieldAmount = parseFloat(recipe.yield || "1") || 1;
  return yieldAmount > 0 ? totalCost / yieldAmount : totalCost;
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
 * Uses the linked recipes (via categoryItems[].recipeId) to estimate actual cost.
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

  // For each tier, estimate food cost
  const results: TierMarginAnalysis[] = [];

  for (const tier of packages) {
    let totalCostPerPerson = 0;
    let linkedCount = 0;
    let unlinkedCount = 0;

    // For each category in the tier's selection limits
    for (const [category, limit] of Object.entries(tier.selectionLimits)) {
      const items = categoryItems[category] || [];
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
