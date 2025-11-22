import { Router } from "express";
import { db } from "./db";
import { baseIngredients, recipeIngredients, insertBaseIngredientSchema, insertRecipeIngredientSchema } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { calculateIngredientCost } from "@shared/unitConversion";

const router = Router();

// ============================================
// BASE INGREDIENTS CRUD
// ============================================

// Get all base ingredients
router.get("/base-ingredients", async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = db.select().from(baseIngredients);
    
    // Filter by category if provided
    if (category && typeof category === 'string') {
      query = query.where(eq(baseIngredients.category, category));
    }
    
    // Search by name if provided
    if (search && typeof search === 'string') {
      query = query.where(sql`LOWER(${baseIngredients.name}) LIKE LOWER(${'%' + search + '%'})`);
    }
    
    query = query.orderBy(baseIngredients.category, baseIngredients.name);
    
    const ingredients = await query;
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
    
    const [newIngredient] = await db
      .insert(baseIngredients)
      .values({
        ...parsed.data,
        purchasePrice: parsed.data.purchasePrice.toString(),
        purchaseQuantity: parsed.data.purchaseQuantity.toString(),
      })
      .returning();
    
    return res.status(201).json(newIngredient);
  } catch (error) {
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
    
    const [updatedIngredient] = await db
      .update(baseIngredients)
      .set({ 
        ...parsed.data,
        purchasePrice: parsed.data.purchasePrice.toString(),
        purchaseQuantity: parsed.data.purchaseQuantity.toString(),
        updatedAt: new Date() 
      })
      .where(eq(baseIngredients.id, id))
      .returning();
    
    if (!updatedIngredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    
    return res.json(updatedIngredient);
  } catch (error) {
    console.error("Error updating base ingredient:", error);
    return res.status(500).json({ message: "Failed to update base ingredient" });
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
      const cost = calculateIngredientCost(
        parseFloat(item.ingredient.purchasePrice),
        parseFloat(item.ingredient.purchaseQuantity),
        item.ingredient.purchaseUnit,
        parseFloat(item.quantity),
        item.unit
      );
      
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
    const validatedIngredients = [];
    for (const ing of ingredients) {
      const validation = insertRecipeIngredientSchema.omit({ menuItemId: true }).safeParse(ing);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid ingredient data", 
          errors: validation.error.format() 
        });
      }
      validatedIngredients.push(validation.data);
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

export default router;
