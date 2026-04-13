import { Router } from "express";
import { db } from "./db";
import {
  baseIngredients,
  recipeIngredients,
  recipes,
  recipeComponents,
  menus,
  events,
  insertBaseIngredientSchema,
  insertRecipeIngredientSchema,
  insertRecipeSchema,
  insertRecipeComponentSchema,
  InsertRecipeComponent,
  DIETARY_TAGS,
  ALLERGEN_CONTAINS_TAGS,
  LIFESTYLE_TAGS,
  RecipeDietaryFlags,
  LABOR_RATE_PER_HOUR_CENTS,
  MenuRecipeItem,
  MenuCategoryItem,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, ne, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { calculateIngredientCost } from "@shared/unitConversion";
import { ObjectStorageService } from "./objectStorage";

const router = Router();

// ============================================
// DIETARY FLAGS AGGREGATION HELPER
// ============================================

/**
 * Compute allergen warnings for a recipe based on its ingredient components.
 * Only ALLERGEN_TAGS are auto-computed (gluten, nuts, dairy, etc.).
 * If ANY ingredient lacks an allergen-free tag, the recipe gets a warning.
 * Lifestyle tags (keto, vegan, etc.) require manual designation.
 */
async function computeRecipeAllergenWarnings(recipeId: number, tx?: typeof db): Promise<string[]> {
  const database = tx || db;
  
  // Get all ingredient IDs for this recipe
  const components = await database
    .select({ baseIngredientId: recipeComponents.baseIngredientId })
    .from(recipeComponents)
    .where(eq(recipeComponents.recipeId, recipeId));
  
  if (components.length === 0) {
    return []; // No ingredients = no allergen warnings
  }
  
  // Get dietary tags for all ingredients
  const ingredientIds = components.map(c => c.baseIngredientId);
  const ingredients = await database
    .select({ 
      id: baseIngredients.id, 
      dietaryTags: baseIngredients.dietaryTags 
    })
    .from(baseIngredients)
    .where(inArray(baseIngredients.id, ingredientIds));
  
  const allergenWarnings = new Set<string>();
  
  // For each ingredient, check if it has any allergen CONTAINS tags
  for (const ing of ingredients) {
    const tags = (ing.dietaryTags as string[]) || [];
    for (const tag of tags) {
      // Check if this tag is an allergen contains tag
      const allergenTag = ALLERGEN_CONTAINS_TAGS.find(a => a.value === tag);
      if (allergenTag) {
        // Add the warning label (e.g., "Contains Gluten")
        allergenWarnings.add(allergenTag.warning);
      }
    }
  }
  
  return Array.from(allergenWarnings);
}

/**
 * Update the dietary flags for a specific recipe.
 * Preserves manual designations while updating allergen warnings.
 */
async function updateRecipeDietaryFlags(recipeId: number, tx?: typeof db): Promise<RecipeDietaryFlags> {
  const database = tx || db;
  
  // Get current recipe to preserve manual designations
  const [currentRecipe] = await database
    .select({ dietaryFlags: recipes.dietaryFlags })
    .from(recipes)
    .where(eq(recipes.id, recipeId));
  
  const existingFlags = (currentRecipe?.dietaryFlags as RecipeDietaryFlags) || { allergenWarnings: [], manualDesignations: [] };
  const allergenWarnings = await computeRecipeAllergenWarnings(recipeId, tx);
  
  const updatedFlags: RecipeDietaryFlags = {
    allergenWarnings,
    manualDesignations: existingFlags.manualDesignations || []
  };
  
  await database
    .update(recipes)
    .set({ dietaryFlags: updatedFlags })
    .where(eq(recipes.id, recipeId));
  
  return updatedFlags;
}

/**
 * Update dietary flags for all recipes that use a specific ingredient
 */
async function updateRecipesForIngredient(ingredientId: number): Promise<void> {
  // Find all recipes that use this ingredient
  const affectedRecipes = await db
    .select({ recipeId: recipeComponents.recipeId })
    .from(recipeComponents)
    .where(eq(recipeComponents.baseIngredientId, ingredientId));
  
  // Update dietary flags for each affected recipe
  for (const recipe of affectedRecipes) {
    await updateRecipeDietaryFlags(recipe.recipeId);
  }
}

// ============================================
// BASE INGREDIENTS CRUD
// ============================================

// Get all base ingredients
router.get("/base-ingredients", async (req, res) => {
  try {
    const { category, search } = req.query;

    // Build filter conditions
    const conditions = [];
    if (category && typeof category === "string") {
      conditions.push(eq(baseIngredients.category, category));
    }
    if (search && typeof search === "string") {
      conditions.push(
        sql`LOWER(${baseIngredients.name}) LIKE LOWER(${"%" + search + "%"})`,
      );
    }

    const ingredients = await db
      .select()
      .from(baseIngredients)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(baseIngredients.category, baseIngredients.name);

    return res.json(ingredients);
  } catch (error) {
    console.error("Error fetching base ingredients:", error);
    return res.status(500).json({ message: "Failed to fetch base ingredients" });
  }
});

// Get a single base ingredient by ID
router.get("/base-ingredients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ingredient ID" });
    }
    
    const [ingredient] = await db
      .select()
      .from(baseIngredients)
      .where(eq(baseIngredients.id, id));
    
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    
    return res.json(ingredient);
  } catch (error) {
    console.error("Error fetching base ingredient:", error);
    return res.status(500).json({ message: "Failed to fetch base ingredient" });
  }
});

// Helper function to normalize SKU (trim, convert empty to null)
function normalizeSku(sku: string | null | undefined): string | null {
  if (!sku) return null;
  const trimmed = sku.trim();
  return trimmed === '' ? null : trimmed;
}

// Helper function to check for duplicate SKU
async function checkDuplicateSku(sku: string | null, excludeId?: number): Promise<boolean> {
  if (!sku) return false; // NULL SKUs are allowed
  
  const existing = await db
    .select({ id: baseIngredients.id })
    .from(baseIngredients)
    .where(sql`LOWER(${baseIngredients.sku}) = LOWER(${sku})`)
    .limit(1);
  
  if (existing.length === 0) return false;
  if (excludeId && existing[0].id === excludeId) return false;
  return true;
}

// Create a new base ingredient
router.post("/base-ingredients", async (req, res) => {
  try {
    const parsed = insertBaseIngredientSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid ingredient data", 
        errors: parsed.error.format() 
      });
    }
    
    // Normalize SKU
    const normalizedSku = normalizeSku(parsed.data.sku);
    
    // Check for duplicate SKU
    if (normalizedSku && await checkDuplicateSku(normalizedSku)) {
      return res.status(409).json({ 
        message: "An ingredient with this SKU already exists",
        field: "sku"
      });
    }
    
    const [newIngredient] = await db
      .insert(baseIngredients)
      .values({
        ...parsed.data,
        sku: normalizedSku,
        purchasePrice: parsed.data.purchasePrice.toString(),
        purchaseQuantity: parsed.data.purchaseQuantity.toString(),
        previousPurchasePrice: parsed.data.purchasePrice.toString(),
      })
      .returning();
    
    return res.status(201).json(newIngredient);
  } catch (error: any) {
    // Handle unique constraint violation from database
    if (error?.code === '23505' && error?.constraint?.includes('sku')) {
      return res.status(409).json({ 
        message: "An ingredient with this SKU already exists",
        field: "sku"
      });
    }
    console.error("Error creating base ingredient:", error);
    return res.status(500).json({ message: "Failed to create base ingredient" });
  }
});

// Update a base ingredient
router.put("/base-ingredients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ingredient ID" });
    }
    
    const parsed = insertBaseIngredientSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid ingredient data", 
        errors: parsed.error.format() 
      });
    }
    
    // Normalize SKU
    const normalizedSku = normalizeSku(parsed.data.sku);
    
    // Check for duplicate SKU (excluding current ingredient)
    if (normalizedSku && await checkDuplicateSku(normalizedSku, id)) {
      return res.status(409).json({ 
        message: "An ingredient with this SKU already exists",
        field: "sku"
      });
    }
    
    // Fetch existing ingredient to save its current price as previous price
    const [existingIngredient] = await db
      .select()
      .from(baseIngredients)
      .where(eq(baseIngredients.id, id));
    
    if (!existingIngredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    
    // Prepare update data with previous price
    const updateData: any = {
      ...parsed.data,
      sku: normalizedSku,
      purchasePrice: parsed.data.purchasePrice.toString(),
      purchaseQuantity: parsed.data.purchaseQuantity.toString(),
      updatedAt: new Date()
    };
    
    // Save old price as previous price if current price is not zero
    const currentPrice = parseFloat(existingIngredient.purchasePrice);
    if (currentPrice > 0) {
      updateData.previousPurchasePrice = existingIngredient.purchasePrice;
    }
    
    const [updatedIngredient] = await db
      .update(baseIngredients)
      .set(updateData)
      .where(eq(baseIngredients.id, id))
      .returning();
    
    // If dietary tags changed, update all recipes that use this ingredient
    const oldTags = (existingIngredient.dietaryTags as string[]) || [];
    const newTags = (parsed.data.dietaryTags as string[]) || [];
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());
    
    if (tagsChanged) {
      await updateRecipesForIngredient(id);
    }
    
    return res.json(updatedIngredient);
  } catch (error: any) {
    // Handle unique constraint violation from database
    if (error?.code === '23505' && error?.constraint?.includes('sku')) {
      return res.status(409).json({ 
        message: "An ingredient with this SKU already exists",
        field: "sku"
      });
    }
    console.error("Error updating base ingredient:", error);
    return res.status(500).json({ message: "Failed to update base ingredient" });
  }
});

// Save/update a custom unit conversion on a base ingredient.
// Body: { recipeUnit: string, purchaseUnitFactor: number }
// Meaning: "1 recipeUnit = purchaseUnitFactor purchaseUnits"
// Example: POST .../42/unit-conversion  { recipeUnit: "cup", purchaseUnitFactor: 0.15 }
// → adds/replaces { "cup": 0.15 } on ingredient #42's unitConversions map.
router.post("/base-ingredients/:id/unit-conversion", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ingredient ID" });

    const { recipeUnit, purchaseUnitFactor } = req.body;
    if (typeof recipeUnit !== "string" || !recipeUnit.trim()) {
      return res.status(400).json({ message: "recipeUnit is required" });
    }
    const factor = parseFloat(purchaseUnitFactor);
    if (isNaN(factor) || factor <= 0) {
      return res.status(400).json({ message: "purchaseUnitFactor must be a positive number" });
    }

    // Fetch existing conversions
    const [existing] = await db
      .select()
      .from(baseIngredients)
      .where(eq(baseIngredients.id, id));
    if (!existing) return res.status(404).json({ message: "Ingredient not found" });

    const current = (existing.unitConversions as Record<string, number>) || {};
    const updated = { ...current, [recipeUnit.toLowerCase().trim()]: factor };

    const [result] = await db
      .update(baseIngredients)
      .set({ unitConversions: updated as any, updatedAt: new Date() })
      .where(eq(baseIngredients.id, id))
      .returning();

    return res.json(result);
  } catch (error) {
    console.error("Error saving unit conversion:", error);
    return res.status(500).json({ message: "Failed to save unit conversion" });
  }
});

// Delete a base ingredient
router.delete("/base-ingredients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ingredient ID" });
    }
    
    // Check if ingredient is used in any recipes
    const recipeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.baseIngredientId, id));
    
    if (recipeCount[0].count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete ingredient - it is used in ${recipeCount[0].count} recipe(s)` 
      });
    }
    
    const [deletedIngredient] = await db
      .delete(baseIngredients)
      .where(eq(baseIngredients.id, id))
      .returning();
    
    if (!deletedIngredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    
    return res.json({ message: "Ingredient deleted successfully" });
  } catch (error) {
    console.error("Error deleting base ingredient:", error);
    return res.status(500).json({ message: "Failed to delete base ingredient" });
  }
});

// Batch import base ingredients
router.post("/base-ingredients/batch-import", async (req, res) => {
  try {
    const { ingredients } = req.body;
    
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: "Invalid ingredients data - expected array" });
    }
    
    const validIngredients: any[] = [];
    const errors: any[] = [];
    const seenSkus = new Set<string>(); // Track SKUs within this batch
    
    // Validate each ingredient
    for (let i = 0; i < ingredients.length; i++) {
      const parsed = insertBaseIngredientSchema.safeParse(ingredients[i]);
      
      if (parsed.success) {
        // Normalize SKU
        const normalizedSku = normalizeSku(parsed.data.sku);
        
        // Check for duplicate SKU within this batch
        if (normalizedSku) {
          const skuLower = normalizedSku.toLowerCase();
          if (seenSkus.has(skuLower)) {
            errors.push({
              row: i + 1,
              data: ingredients[i],
              errors: { sku: "Duplicate SKU in import batch" }
            });
            continue;
          }
          seenSkus.add(skuLower);
          
          // Check for existing SKU in database
          if (await checkDuplicateSku(normalizedSku)) {
            errors.push({
              row: i + 1,
              data: ingredients[i],
              errors: { sku: "SKU already exists in database" }
            });
            continue;
          }
        }
        
        validIngredients.push({
          ...parsed.data,
          sku: normalizedSku,
          purchasePrice: parsed.data.purchasePrice.toString(),
          purchaseQuantity: parsed.data.purchaseQuantity.toString(),
          previousPurchasePrice: parsed.data.purchasePrice.toString(),
        });
      } else {
        errors.push({
          row: i + 1,
          data: ingredients[i],
          errors: parsed.error.format()
        });
      }
    }
    
    // Insert valid ingredients
    let insertedIngredients: any[] = [];
    if (validIngredients.length > 0) {
      insertedIngredients = await db
        .insert(baseIngredients)
        .values(validIngredients)
        .returning();
    }
    
    return res.status(200).json({
      success: true,
      imported: insertedIngredients.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    // Handle unique constraint violation from database
    if (error?.code === '23505' && error?.constraint?.includes('sku')) {
      return res.status(409).json({ 
        message: "One or more SKUs already exist in the database",
        field: "sku"
      });
    }
    console.error("Error batch importing base ingredients:", error);
    return res.status(500).json({ message: "Failed to batch import base ingredients" });
  }
});

// ============================================
// RECIPE INGREDIENTS CRUD
// ============================================

// Get recipe ingredients for a menu item (with full base ingredient details)
router.get("/menu-items/:menuItemId/recipe", async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    // Validate menuItemId
    if (!menuItemId) {
      return res.status(400).json({ message: "Invalid menu item ID" });
    }
    
    const recipe = await db
      .select({
        id: recipeIngredients.id,
        menuItemId: recipeIngredients.menuItemId,
        baseIngredientId: recipeIngredients.baseIngredientId,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        prepNotes: recipeIngredients.prepNotes,
        baseIngredient: baseIngredients,  // Changed from 'ingredient' to 'baseIngredient' to match frontend expectations
      })
      .from(recipeIngredients)
      .innerJoin(baseIngredients, eq(recipeIngredients.baseIngredientId, baseIngredients.id))
      .where(eq(recipeIngredients.menuItemId, menuItemId));
    
    // Calculate cost for each ingredient
    const recipeWithCosts = recipe.map((item: any) => {
      let cost = 0;
      try {
        cost = calculateIngredientCost(
          parseFloat(item.baseIngredient.purchasePrice),
          parseFloat(item.baseIngredient.purchaseQuantity),
          item.baseIngredient.purchaseUnit,
          parseFloat(item.quantity),
          item.unit,
          (item.baseIngredient.unitConversions as Record<string, number> | undefined) || undefined,
        );
      } catch (err) {
        console.warn("Ingredient cost conversion failed:", err);
      }

      return {
        ...item,
        calculatedCost: cost,
      };
    });
    
    // Calculate total recipe cost
    const totalCost = recipeWithCosts.reduce((sum: number, item: any) => sum + item.calculatedCost, 0);
    
    return res.json({
      ingredients: recipeWithCosts,
      totalCost,
    });
  } catch (error) {
    console.error("Error fetching recipe ingredients:", error);
    return res.status(500).json({ message: "Failed to fetch recipe ingredients" });
  }
});

// Add an ingredient to a menu item's recipe
router.post("/menu-items/:menuItemId/recipe", async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    const parsed = insertRecipeIngredientSchema.safeParse({
      ...req.body,
      menuItemId,
    });
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid recipe ingredient data", 
        errors: parsed.error.format() 
      });
    }
    
    const [newRecipeIngredient] = await db
      .insert(recipeIngredients)
      .values({
        ...parsed.data,
        quantity: parsed.data.quantity.toString(),
      })
      .returning();
    
    return res.status(201).json(newRecipeIngredient);
  } catch (error) {
    console.error("Error adding recipe ingredient:", error);
    return res.status(500).json({ message: "Failed to add recipe ingredient" });
  }
});

// Update a recipe ingredient
router.put("/recipe-ingredients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ingredient ID" });
    }
    
    const parsed = insertRecipeIngredientSchema.partial().safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid recipe ingredient data", 
        errors: parsed.error.format() 
      });
    }
    
    // Prepare update object with proper type conversions
    const updateData: any = { ...parsed.data, updatedAt: new Date() };
    if (updateData.quantity !== undefined) {
      updateData.quantity = updateData.quantity.toString();
    }
    
    const [updatedRecipeIngredient] = await db
      .update(recipeIngredients)
      .set(updateData)
      .where(eq(recipeIngredients.id, id))
      .returning();
    
    if (!updatedRecipeIngredient) {
      return res.status(404).json({ message: "Recipe ingredient not found" });
    }
    
    return res.json(updatedRecipeIngredient);
  } catch (error) {
    console.error("Error updating recipe ingredient:", error);
    return res.status(500).json({ message: "Failed to update recipe ingredient" });
  }
});

// Update all recipe ingredients for a menu item (atomic transaction)
router.put("/menu-items/:menuItemId/recipe", async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { ingredients } = req.body;
    
    if (!menuItemId) {
      return res.status(400).json({ message: "Invalid menu item ID" });
    }
    
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ message: "Ingredients must be an array" });
    }
    
    // Validate each ingredient before processing
    type ValidatedIngredient = {
      baseIngredientId: number;
      quantity: number;
      unit: string;
      prepNotes?: string | null;
    };
    const validatedIngredients: ValidatedIngredient[] = [];
    for (const ing of ingredients) {
      const validation = insertRecipeIngredientSchema.omit({ menuItemId: true }).safeParse(ing);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid ingredient data",
          errors: validation.error.format(),
        });
      }
      validatedIngredients.push(validation.data as ValidatedIngredient);
    }
    
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Delete all existing recipe ingredients for this menu item
      await tx
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.menuItemId, menuItemId));
      
      // Step 2: Insert all new recipe ingredients
      if (validatedIngredients.length > 0) {
        const ingredientsToInsert = validatedIngredients.map((ing) => ({
          menuItemId,
          baseIngredientId: ing.baseIngredientId,
          quantity: ing.quantity.toString(),
          unit: ing.unit,
          prepNotes: ing.prepNotes || null,
        }));
        
        await tx.insert(recipeIngredients).values(ingredientsToInsert);
      }
      
      return { success: true, count: validatedIngredients.length };
    });
    
    return res.json({ 
      message: "Recipe updated successfully",
      ingredientCount: result.count 
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return res.status(500).json({ message: "Failed to update recipe" });
  }
});

// Delete a single recipe ingredient
router.delete("/recipe-ingredients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ingredient ID" });
    }
    
    const [deletedRecipeIngredient] = await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.id, id))
      .returning();
    
    if (!deletedRecipeIngredient) {
      return res.status(404).json({ message: "Recipe ingredient not found" });
    }
    
    return res.json({ message: "Recipe ingredient deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe ingredient:", error);
    return res.status(500).json({ message: "Failed to delete recipe ingredient" });
  }
});

// ============================================
// STANDALONE RECIPES CRUD
// ============================================

// Helper function to safely calculate ingredient cost
function safeCalculateIngredientCost(
  purchasePrice: string,
  purchaseQuantity: string,
  purchaseUnit: string,
  recipeQuantity: string,
  recipeUnit: string,
  customConversions?: Record<string, number> | null,
): number {
  const price = parseFloat(purchasePrice);
  const purchaseQty = parseFloat(purchaseQuantity);
  const recipeQty = parseFloat(recipeQuantity);

  if (isNaN(price) || isNaN(purchaseQty) || isNaN(recipeQty) || purchaseQty <= 0 || recipeQty <= 0) {
    return 0;
  }

  try {
    return calculateIngredientCost(
      price,
      purchaseQty,
      purchaseUnit,
      recipeQty,
      recipeUnit,
      customConversions || undefined,
    );
  } catch (error) {
    console.warn(`Unit conversion failed from ${recipeUnit} to ${purchaseUnit}:`, error);
    return 0;
  }
}

// ============================================
// RECIPE DASHBOARD STATS
// ============================================
// Aggregate signals that help the catering operator understand recipe-book
// health: which recipes are actually used on menus, which ones are feeding
// upcoming events, dietary coverage, and labor-hour leaders. Placed before
// `/recipes/:id` so Express matches the literal path first.
router.get("/recipes/dashboard-stats", async (_req, res) => {
  try {
    const [allRecipes, allMenus] = await Promise.all([
      db.select({
        id: recipes.id,
        name: recipes.name,
        laborHours: recipes.laborHours,
        dietaryFlags: recipes.dietaryFlags,
      }).from(recipes),
      db.select({
        id: menus.id,
        name: menus.name,
        recipes: menus.recipes,
        categoryItems: menus.categoryItems,
      }).from(menus),
    ]);

    const totalRecipes = allRecipes.length;

    // ---- 1. MENU LINKAGE HEALTH ----
    // Count how many times each recipe is referenced across menus.recipes[]
    // and menus.categoryItems[*].recipeId. Recipes with zero references are
    // orphaned (dead weight in the book).
    const recipeMenuCounts = new Map<number, number>();
    for (const menu of allMenus) {
      const seenInThisMenu = new Set<number>();
      const recipeItems = (menu.recipes as MenuRecipeItem[] | null) || [];
      for (const item of recipeItems) {
        if (typeof item?.recipeId === "number") seenInThisMenu.add(item.recipeId);
      }
      const categoryItemsMap = (menu.categoryItems as Record<string, MenuCategoryItem[]> | null) || {};
      for (const items of Object.values(categoryItemsMap)) {
        for (const item of items || []) {
          if (typeof item?.recipeId === "number") seenInThisMenu.add(item.recipeId);
        }
      }
      seenInThisMenu.forEach(rid => {
        recipeMenuCounts.set(rid, (recipeMenuCounts.get(rid) || 0) + 1);
      });
    }

    const recipeNameById = new Map<number, string>();
    for (const r of allRecipes) recipeNameById.set(r.id, r.name);

    const linkedRecipes = allRecipes.filter(r => (recipeMenuCounts.get(r.id) || 0) > 0).length;
    const orphanCount = totalRecipes - linkedRecipes;

    const topUsed = Array.from(recipeMenuCounts.entries())
      .filter(([rid]) => recipeNameById.has(rid))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rid, menuCount]) => ({
        id: rid,
        name: recipeNameById.get(rid)!,
        menuCount,
      }));

    // ---- 2. UPCOMING EVENT EXPOSURE ----
    // Events booked in the next 30 days that aren't cancelled. Tells the
    // operator which recipes are about to hit the kitchen — these are the
    // ones whose cost & prep data need to be right RIGHT NOW.
    const now = new Date();
    const windowDays = 30;
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const upcomingEventRows = await db.select({
      id: events.id,
      eventDate: events.eventDate,
      menuId: events.menuId,
    })
      .from(events)
      .where(and(
        gte(events.eventDate, now),
        lte(events.eventDate, windowEnd),
        ne(events.status, "cancelled"),
      ))
      .orderBy(events.eventDate);

    const menuRecipesById = new Map<number, Set<number>>();
    for (const menu of allMenus) {
      const set = new Set<number>();
      const recipeItems = (menu.recipes as MenuRecipeItem[] | null) || [];
      for (const item of recipeItems) {
        if (typeof item?.recipeId === "number") set.add(item.recipeId);
      }
      const categoryItemsMap = (menu.categoryItems as Record<string, MenuCategoryItem[]> | null) || {};
      for (const items of Object.values(categoryItemsMap)) {
        for (const item of items || []) {
          if (typeof item?.recipeId === "number") set.add(item.recipeId);
        }
      }
      menuRecipesById.set(menu.id, set);
    }

    const upcomingRecipeIds = new Set<number>();
    for (const ev of upcomingEventRows) {
      if (ev.menuId == null) continue;
      const set = menuRecipesById.get(ev.menuId);
      if (!set) continue;
      set.forEach(rid => upcomingRecipeIds.add(rid));
    }

    const nextEventDate = upcomingEventRows[0]?.eventDate ?? null;

    const upcomingEvents = {
      windowDays,
      eventCount: upcomingEventRows.length,
      recipeCount: upcomingRecipeIds.size,
      nextEventDate: nextEventDate instanceof Date ? nextEventDate.toISOString() : nextEventDate,
    };

    // ---- 3. DIETARY COVERAGE ----
    // How many recipes are certified for each lifestyle tag (vegan, GF,
    // kosher, halal, etc.). The scariest number is `uncertified` — recipes
    // with no manual designation at all, which also creates liability when
    // planning for guests with restrictions.
    const byTag = LIFESTYLE_TAGS.map(tag => ({
      tag: tag.value as string,
      label: tag.label,
      count: 0,
    }));
    const tagIndex = new Map<string, number>(byTag.map((t, i) => [t.tag, i] as const));

    let uncertified = 0;
    for (const r of allRecipes) {
      const flags = (r.dietaryFlags as RecipeDietaryFlags | null) || { allergenWarnings: [], manualDesignations: [] };
      const designations = flags.manualDesignations || [];
      if (designations.length === 0) uncertified++;
      for (const d of designations) {
        const idx = tagIndex.get(d);
        if (idx !== undefined) byTag[idx].count++;
      }
    }

    const dietaryCoverage = {
      total: totalRecipes,
      uncertified,
      byTag,
    };

    // ---- 4. LABOR-HOUR LEADERS ----
    // Top 3 most labor-intensive recipes. When scaling for a 200-guest event,
    // these are the ones that dictate kitchen staffing.
    const laborRanked = allRecipes
      .map(r => ({
        id: r.id,
        name: r.name,
        laborHours: parseFloat(String(r.laborHours || "0")) || 0,
      }))
      .filter(r => r.laborHours > 0)
      .sort((a, b) => b.laborHours - a.laborHours);

    const totalLaborHours = laborRanked.reduce((sum, r) => sum + r.laborHours, 0);
    const laborLeaders = {
      totalHours: totalLaborHours,
      recipesWithLabor: laborRanked.length,
      top: laborRanked.slice(0, 3).map(r => ({
        id: r.id,
        name: r.name,
        laborHours: r.laborHours,
        laborCost: (r.laborHours * LABOR_RATE_PER_HOUR_CENTS) / 100,
      })),
    };

    return res.json({
      menuLinkage: {
        totalRecipes,
        linkedRecipes,
        orphanCount,
        topUsed,
      },
      upcomingEvents,
      dietaryCoverage,
      laborLeaders,
    });
  } catch (error) {
    console.error("Error fetching recipe dashboard stats:", error);
    return res.status(500).json({ message: "Failed to fetch recipe dashboard stats" });
  }
});

// Get all recipes with their total cost
router.get("/recipes", async (req, res) => {
  try {
    const { category, search } = req.query;
    
    // Build filter conditions with proper typing
    const conditions: (ReturnType<typeof eq> | ReturnType<typeof sql>)[] = [];
    
    if (category && typeof category === 'string' && category !== 'all') {
      conditions.push(eq(recipes.category, category));
    }
    
    if (search && typeof search === 'string') {
      conditions.push(sql`LOWER(${recipes.name}) LIKE LOWER(${'%' + search + '%'})`);
    }
    
    // Get all recipes with combined filters
    const allRecipes = conditions.length > 0
      ? await db.select().from(recipes).where(and(...conditions)).orderBy(recipes.name)
      : await db.select().from(recipes).orderBy(recipes.name);
    
    if (allRecipes.length === 0) {
      return res.json([]);
    }
    
    // Get all components for all recipes in a single query
    const recipeIds = allRecipes.map(r => r.id);
    const allComponents = await db
      .select({
        id: recipeComponents.id,
        recipeId: recipeComponents.recipeId,
        baseIngredientId: recipeComponents.baseIngredientId,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        prepNotes: recipeComponents.prepNotes,
        baseIngredient: baseIngredients,
      })
      .from(recipeComponents)
      .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(inArray(recipeComponents.recipeId, recipeIds));
    
    // Group components by recipe ID
    const componentsByRecipeId = new Map<number, typeof allComponents>();
    for (const comp of allComponents) {
      if (!componentsByRecipeId.has(comp.recipeId)) {
        componentsByRecipeId.set(comp.recipeId, []);
      }
      componentsByRecipeId.get(comp.recipeId)!.push(comp);
    }
    
    // Calculate costs for each recipe
    const recipesWithCosts = allRecipes.map((recipe) => {
      const components = componentsByRecipeId.get(recipe.id) || [];

      // Food cost from ingredients
      let ingredientCost = 0;
      for (const comp of components) {
        const cost = safeCalculateIngredientCost(
          comp.baseIngredient.purchasePrice,
          comp.baseIngredient.purchaseQuantity,
          comp.baseIngredient.purchaseUnit,
          comp.quantity,
          comp.unit,
          comp.baseIngredient.unitConversions as Record<string, number> | null,
        );
        ingredientCost += cost;
      }

      // Labor cost: laborHours × $35/hour (LABOR_RATE_PER_HOUR_CENTS in dollars)
      const laborHours = parseFloat(String(recipe.laborHours || "0")) || 0;
      const laborCost = (laborHours * LABOR_RATE_PER_HOUR_CENTS) / 100;

      const totalCost = ingredientCost + laborCost;

      // Calculate cost per serving
      const yieldAmount = parseFloat(recipe.yield || "1") || 1;
      const costPerServing = yieldAmount > 0 ? totalCost / yieldAmount : totalCost;

      return {
        ...recipe,
        totalCost,
        ingredientCost,
        laborCost,
        costPerServing,
        ingredientCount: components.length,
      };
    });
    
    return res.json(recipesWithCosts);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return res.status(500).json({ message: "Failed to fetch recipes" });
  }
});

// Get a single recipe with components and costs
router.get("/recipes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id));
    
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    // Get recipe components with base ingredient details
    const components = await db
      .select({
        id: recipeComponents.id,
        recipeId: recipeComponents.recipeId,
        baseIngredientId: recipeComponents.baseIngredientId,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        prepNotes: recipeComponents.prepNotes,
        baseIngredient: baseIngredients,
      })
      .from(recipeComponents)
      .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(eq(recipeComponents.recipeId, id));
    
    // Calculate costs for each component using safe calculation
    let ingredientCost = 0;
    const componentsWithCosts = components.map((comp) => {
      const cost = safeCalculateIngredientCost(
        comp.baseIngredient.purchasePrice,
        comp.baseIngredient.purchaseQuantity,
        comp.baseIngredient.purchaseUnit,
        comp.quantity,
        comp.unit,
        comp.baseIngredient.unitConversions as Record<string, number> | null,
      );
      ingredientCost += cost;

      return {
        ...comp,
        calculatedCost: cost,
      };
    });

    // Labor cost
    const laborHours = parseFloat(String(recipe.laborHours || "0")) || 0;
    const laborCost = (laborHours * LABOR_RATE_PER_HOUR_CENTS) / 100;
    const totalCost = ingredientCost + laborCost;

    // Calculate cost per serving
    const yieldAmount = parseFloat(recipe.yield || "1") || 1;
    const costPerServing = yieldAmount > 0 ? totalCost / yieldAmount : totalCost;

    return res.json({
      ...recipe,
      components: componentsWithCosts,
      totalCost,
      ingredientCost,
      laborCost,
      costPerServing,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return res.status(500).json({ message: "Failed to fetch recipe" });
  }
});

// Generate a recipe draft using AI (does NOT save — returns preview for review)
// POST /api/ingredients/recipes/ai-draft
// Body: { itemName, category, menuTheme?, menuThemeName?, yieldAmount? }
router.post("/recipes/ai-draft", async (req, res) => {
  try {
    const { itemName, category, menuTheme, menuThemeName, yieldAmount } = req.body;

    if (!itemName || typeof itemName !== "string") {
      return res.status(400).json({ message: "itemName is required" });
    }

    const { generateRecipeDraft } = await import("./services/recipeAiService");
    const draft = await generateRecipeDraft({
      itemName,
      category: category || "entree",
      menuTheme,
      menuThemeName,
      yieldAmount: yieldAmount ? parseInt(yieldAmount) : undefined,
    });

    return res.json(draft);
  } catch (error: any) {
    console.error("Error generating AI recipe draft:", error);
    return res.status(500).json({
      message: error?.message || "Failed to generate recipe draft",
    });
  }
});

// Create a new recipe
router.post("/recipes", async (req, res) => {
  try {
    const { components, ...recipeData } = req.body;
    
    const parsed = insertRecipeSchema.safeParse(recipeData);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid recipe data", 
        errors: parsed.error.format() 
      });
    }
    
    // Use transaction to create recipe and components atomically
    const result = await db.transaction(async (tx) => {
      // Create the recipe
      const [newRecipe] = await tx
        .insert(recipes)
        .values({
          ...parsed.data,
          yield: parsed.data.yield?.toString() || "1",
          laborHours: parsed.data.laborHours?.toString() || "0",
        })
        .returning();
      
      // Insert components if provided
      if (Array.isArray(components) && components.length > 0) {
        const validComponents = [];
        for (const comp of components) {
          const compParsed = insertRecipeComponentSchema.omit({ recipeId: true }).safeParse(comp);
          if (compParsed.success) {
            validComponents.push({
              recipeId: newRecipe.id,
              baseIngredientId: compParsed.data.baseIngredientId,
              quantity: compParsed.data.quantity.toString(),
              unit: compParsed.data.unit,
              prepNotes: compParsed.data.prepNotes || null,
            });
          }
        }
        
        if (validComponents.length > 0) {
          await tx.insert(recipeComponents).values(validComponents);
        }
      }
      
      return newRecipe;
    });
    
    // Compute and update dietary flags after transaction completes
    if (Array.isArray(components) && components.length > 0) {
      await updateRecipeDietaryFlags(result.id);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating recipe:", error);
    return res.status(500).json({ message: "Failed to create recipe" });
  }
});

// Update a recipe
router.put("/recipes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const { components, ...recipeData } = req.body;
    
    const parsed = insertRecipeSchema.partial().safeParse(recipeData);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        message: "Invalid recipe data", 
        errors: parsed.error.format() 
      });
    }
    
    // Use transaction to update recipe and components atomically
    const result = await db.transaction(async (tx) => {
      // Update recipe data
      const updateData: any = { ...parsed.data, updatedAt: new Date() };
      if (updateData.yield !== undefined) {
        updateData.yield = updateData.yield.toString();
      }
      if (updateData.laborHours !== undefined) {
        updateData.laborHours = updateData.laborHours.toString();
      }
      
      const [updatedRecipe] = await tx
        .update(recipes)
        .set(updateData)
        .where(eq(recipes.id, id))
        .returning();
      
      if (!updatedRecipe) {
        throw new Error("Recipe not found");
      }
      
      // Update components if provided
      if (Array.isArray(components)) {
        // Delete existing components
        await tx.delete(recipeComponents).where(eq(recipeComponents.recipeId, id));
        
        // Insert new components
        if (components.length > 0) {
          const validComponents = [];
          for (const comp of components) {
            const compParsed = insertRecipeComponentSchema.omit({ recipeId: true }).safeParse(comp);
            if (compParsed.success) {
              validComponents.push({
                recipeId: id,
                baseIngredientId: compParsed.data.baseIngredientId,
                quantity: compParsed.data.quantity.toString(),
                unit: compParsed.data.unit,
                prepNotes: compParsed.data.prepNotes || null,
              });
            }
          }
          
          if (validComponents.length > 0) {
            await tx.insert(recipeComponents).values(validComponents);
          }
        }
      }
      
      return updatedRecipe;
    });
    
    // Recompute dietary flags after components update
    if (Array.isArray(components)) {
      await updateRecipeDietaryFlags(id);
    }
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error updating recipe:", error);
    if (error.message === "Recipe not found") {
      return res.status(404).json({ message: "Recipe not found" });
    }
    return res.status(500).json({ message: "Failed to update recipe" });
  }
});

// Delete a recipe (components are deleted via cascade)
router.delete("/recipes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const [deletedRecipe] = await db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning();
    
    if (!deletedRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    return res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return res.status(500).json({ message: "Failed to delete recipe" });
  }
});

// Update manual dietary designations for a recipe
router.patch("/recipes/:id/dietary", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const { manualDesignations } = req.body;
    
    if (!Array.isArray(manualDesignations)) {
      return res.status(400).json({ message: "manualDesignations must be an array" });
    }
    
    // Get current recipe
    const [currentRecipe] = await db
      .select({ dietaryFlags: recipes.dietaryFlags })
      .from(recipes)
      .where(eq(recipes.id, id));
    
    if (!currentRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    const existingFlags = (currentRecipe.dietaryFlags as RecipeDietaryFlags) || { allergenWarnings: [], manualDesignations: [] };
    
    const updatedFlags: RecipeDietaryFlags = {
      allergenWarnings: existingFlags.allergenWarnings || [],
      manualDesignations
    };
    
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ dietaryFlags: updatedFlags, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    
    return res.json(updatedRecipe);
  } catch (error) {
    console.error("Error updating recipe dietary designations:", error);
    return res.status(500).json({ message: "Failed to update dietary designations" });
  }
});

// Get recipe components for a specific recipe
router.get("/recipes/:recipeId/components", async (req, res) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    
    if (isNaN(recipeId)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const components = await db
      .select({
        id: recipeComponents.id,
        recipeId: recipeComponents.recipeId,
        baseIngredientId: recipeComponents.baseIngredientId,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        prepNotes: recipeComponents.prepNotes,
        baseIngredient: baseIngredients,
      })
      .from(recipeComponents)
      .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(eq(recipeComponents.recipeId, recipeId));
    
    // Calculate costs using safe calculation
    let totalCost = 0;
    const componentsWithCosts = components.map((comp) => {
      const cost = safeCalculateIngredientCost(
        comp.baseIngredient.purchasePrice,
        comp.baseIngredient.purchaseQuantity,
        comp.baseIngredient.purchaseUnit,
        comp.quantity,
        comp.unit,
        comp.baseIngredient.unitConversions as Record<string, number> | null,
      );
      totalCost += cost;

      return {
        ...comp,
        calculatedCost: cost,
      };
    });

    return res.json({
      components: componentsWithCosts,
      totalCost,
    });
  } catch (error) {
    console.error("Error fetching recipe components:", error);
    return res.status(500).json({ message: "Failed to fetch recipe components" });
  }
});

// Update recipe components (batch sync)
router.put("/recipes/:recipeId/components", async (req, res) => {
  try {
    const recipeId = parseInt(req.params.recipeId);
    const { components } = req.body;
    
    if (isNaN(recipeId)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    if (!Array.isArray(components)) {
      return res.status(400).json({ message: "Components must be an array" });
    }
    
    // Validate each component before processing
    type ComponentWithoutRecipeId = Omit<InsertRecipeComponent, 'recipeId'>;
    const validatedComponents: ComponentWithoutRecipeId[] = [];
    for (const comp of components) {
      const validation = insertRecipeComponentSchema.omit({ recipeId: true }).safeParse(comp);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid component data", 
          errors: validation.error.format() 
        });
      }
      validatedComponents.push(validation.data as ComponentWithoutRecipeId);
    }
    
    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Delete all existing components for this recipe
      await tx.delete(recipeComponents).where(eq(recipeComponents.recipeId, recipeId));
      
      // Insert all new components
      if (validatedComponents.length > 0) {
        const componentsToInsert = validatedComponents.map((comp) => ({
          recipeId,
          baseIngredientId: comp.baseIngredientId,
          quantity: comp.quantity.toString(),
          unit: comp.unit,
          prepNotes: comp.prepNotes || null,
        }));
        
        await tx.insert(recipeComponents).values(componentsToInsert);
      }
      
      return { success: true, count: validatedComponents.length };
    });
    
    return res.json({ 
      message: "Recipe components updated successfully",
      componentCount: result.count 
    });
  } catch (error) {
    console.error("Error updating recipe components:", error);
    return res.status(500).json({ message: "Failed to update recipe components" });
  }
});

// ============================================
// RECIPE IMAGE UPLOAD
// ============================================

// Get upload URL for recipe images
router.post("/recipes/upload-url", async (req, res) => {
  try {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    return res.json({ uploadURL });
  } catch (error) {
    console.error("Error getting upload URL:", error);
    return res.status(500).json({ message: "Failed to get upload URL" });
  }
});

// Update recipe images after upload
router.post("/recipes/:id/images", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }
    
    // Get the current recipe
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id));
    
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    // Normalize the image URL path
    const objectStorageService = new ObjectStorageService();
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(imageUrl);
    
    // Add the image to the recipe's images array
    const currentImages = recipe.images || [];
    const updatedImages = [...currentImages, normalizedPath];
    
    // Update the recipe
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ 
        images: updatedImages,
        updatedAt: new Date() 
      })
      .where(eq(recipes.id, id))
      .returning();
    
    return res.json({ 
      message: "Image added successfully",
      images: updatedRecipe.images
    });
  } catch (error) {
    console.error("Error adding recipe image:", error);
    return res.status(500).json({ message: "Failed to add recipe image" });
  }
});

// Remove a recipe image
router.delete("/recipes/:id/images", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recipe ID" });
    }
    
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }
    
    // Get the current recipe
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id));
    
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    // Remove the image from the array
    const currentImages = recipe.images || [];
    const updatedImages = currentImages.filter(img => img !== imageUrl);
    
    // Update the recipe
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ 
        images: updatedImages,
        updatedAt: new Date() 
      })
      .where(eq(recipes.id, id))
      .returning();
    
    return res.json({ 
      message: "Image removed successfully",
      images: updatedRecipe.images
    });
  } catch (error) {
    console.error("Error removing recipe image:", error);
    return res.status(500).json({ message: "Failed to remove recipe image" });
  }
});

export default router;
