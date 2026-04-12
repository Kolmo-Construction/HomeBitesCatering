import { OpenAI } from 'openai';
import { db } from '../db';
import { baseIngredients } from '@shared/schema';
import { eq } from 'drizzle-orm';

const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://homebites.design',
    'X-Title': 'Home Bites Catering CMS',
  },
});

const DEEPSEEK_MODEL = 'deepseek/deepseek-chat-v3-0324:free';
const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free';
const CLAUDE_MODEL = 'anthropic/claude-3-haiku';

// ============================================================================
// Types
// ============================================================================

export interface DraftRecipeComponent {
  ingredientName: string;       // As returned by the AI
  matchedIngredientId: number | null;
  matchedIngredientName: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  quantity: number;
  unit: string;
  prepNotes?: string;
}

export interface DraftRecipe {
  name: string;
  description: string;
  category: string;              // appetizer, entree, side, dessert, sauce, etc.
  yieldAmount: number;           // e.g., 10 (makes 10 servings)
  yieldUnit: string;             // "serving", "portion"
  components: DraftRecipeComponent[];
  preparationSteps: Array<{
    stepNumber: number;
    title: string;
    instruction: string;
    duration?: number;
  }>;
  dietaryFlags: {
    allergenWarnings: string[];
    manualDesignations: string[];
  };
  // Metadata about the draft
  estimatedFoodCostCents: number;
  unmatchedIngredients: string[];  // items the AI suggested that we couldn't match
}

export interface GenerateDraftInput {
  itemName: string;                // e.g., "Chicken Parmigiana"
  category: string;                // menu category: protein, side, salad, pasta, etc.
  menuTheme?: string;              // e.g., "italy", "bbq", "greece"
  menuThemeName?: string;          // e.g., "A Taste of Italy" (for prompt context)
  yieldAmount?: number;            // Default: 10 servings
}

// ============================================================================
// Theme context descriptions — helps the AI produce cuisine-appropriate recipes
// ============================================================================

const THEME_DESCRIPTIONS: Record<string, string> = {
  taco_fiesta: "Mexican cuisine with bold flavors, fresh chilies, cilantro, lime, and traditional spices",
  bbq: "American BBQ with smoked meats, classic rubs, and hearty Southern-style sides",
  greece: "Mediterranean Greek cuisine with olive oil, lemon, oregano, feta, and fresh herbs",
  kebab: "Middle Eastern and Mediterranean grilled kebabs with aromatic spices (cumin, coriander, sumac)",
  italy: "Italian cuisine with olive oil, garlic, tomatoes, fresh herbs, and classic preparations",
  vegan: "Plant-based cooking with no animal products",
};

// ============================================================================
// Main function — generate a recipe draft
// ============================================================================

export async function generateRecipeDraft(
  input: GenerateDraftInput,
): Promise<DraftRecipe> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  // Load the full base_ingredients catalog so the AI can only pick from real data
  const allIngredients = await db.select().from(baseIngredients);

  // Build a compact ingredient list for the prompt
  // Format: "ID | Name | Category | Purchase Unit | Price"
  const ingredientList = allIngredients
    .map((ing) => `${ing.id}|${ing.name}|${ing.category}|${ing.purchaseUnit}`)
    .join("\n");

  const prompt = buildRecipePrompt(input, ingredientList);

  // Try model cascade: DeepSeek → Gemini → Claude
  let rawResponse: any = null;
  let lastError: any = null;

  for (const model of [DEEPSEEK_MODEL, GEMINI_MODEL, CLAUDE_MODEL]) {
    try {
      console.log(`Recipe AI: trying ${model} for "${input.itemName}"`);
      const response = await openRouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) continue;

      rawResponse = JSON.parse(content);
      console.log(`Recipe AI: successfully drafted "${input.itemName}" with ${model}`);
      break;
    } catch (err: any) {
      lastError = err;
      console.error(`Recipe AI: ${model} failed:`, err.message);
      continue;
    }
  }

  if (!rawResponse) {
    throw new Error(`All AI models failed to generate recipe: ${lastError?.message || "unknown"}`);
  }

  // Process the response — match ingredient IDs, calculate costs
  return processDraft(rawResponse, allIngredients, input);
}

// ============================================================================
// Prompt builder
// ============================================================================

function buildRecipePrompt(input: GenerateDraftInput, ingredientList: string): string {
  const yieldAmount = input.yieldAmount ?? 10;
  const themeContext = input.menuTheme
    ? THEME_DESCRIPTIONS[input.menuTheme] || input.menuThemeName || ""
    : "";

  return `You are an expert catering chef at Home Bites Catering in Seattle, WA. Your task is to create a recipe that the kitchen staff will actually cook for catering events.

RECIPE REQUEST:
- Dish name: "${input.itemName}"
- Category: ${input.category}${themeContext ? `\n- Cuisine context: ${themeContext}` : ''}${input.menuThemeName ? `\n- Menu theme: ${input.menuThemeName}` : ''}
- Target yield: ${yieldAmount} servings

AVAILABLE INGREDIENTS (you MUST only use ingredients from this list — use the exact name given):
${ingredientList}

INSTRUCTIONS:
1. Create a realistic, well-proportioned catering recipe for "${input.itemName}"
2. ONLY use ingredients from the list above — do not invent or assume any ingredients
3. Scale quantities appropriately for ${yieldAmount} servings
4. Use the exact ingredient names shown in the list so they can be matched back to our inventory
5. Keep the recipe practical for a catering kitchen (not overly complex)
6. Include basic prep steps (3-6 steps maximum)

Return ONLY a JSON object in this exact format:
{
  "name": "${input.itemName}",
  "description": "A brief 1-2 sentence description of the dish",
  "category": "entree" | "appetizer" | "side" | "salad" | "dessert" | "sauce" | "soup",
  "yieldAmount": ${yieldAmount},
  "yieldUnit": "serving",
  "components": [
    {
      "ingredientName": "EXACT name from the list above",
      "quantity": number,
      "unit": "pound" | "ounce" | "cup" | "tablespoon" | "teaspoon" | "each" | "gallon" | "liter",
      "prepNotes": "optional: diced, minced, chopped, etc."
    }
  ],
  "preparationSteps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "instruction": "Clear cooking instruction",
      "duration": 10
    }
  ],
  "dietaryFlags": {
    "allergenWarnings": ["Contains Gluten", "Contains Dairy"],
    "manualDesignations": ["vegetarian"]
  }
}

Use only these allergenWarnings: "Contains Gluten", "Contains Nuts", "Contains Dairy", "Contains Egg", "Contains Soy", "Contains Shellfish", "Contains Sesame"
Use only these manualDesignations: "vegan", "vegetarian", "keto", "paleo", "low_carb", "low_sodium", "sugar_free", "organic", "kosher", "halal"

Be realistic with quantities. Example: a ${yieldAmount}-serving entree of chicken parmigiana would use about 3-4 pounds of chicken breast, not 1 ounce or 50 pounds.`;
}

// ============================================================================
// Response processing — match ingredient names to real IDs
// ============================================================================

interface BaseIngredientRow {
  id: number;
  name: string;
  category: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
}

function processDraft(
  raw: any,
  allIngredients: BaseIngredientRow[],
  input: GenerateDraftInput,
): DraftRecipe {
  const rawComponents = Array.isArray(raw.components) ? raw.components : [];
  const components: DraftRecipeComponent[] = [];
  const unmatchedIngredients: string[] = [];

  // Calculate food cost as we go
  let totalCostCents = 0;

  for (const comp of rawComponents) {
    const match = matchIngredient(comp.ingredientName, allIngredients);
    const component: DraftRecipeComponent = {
      ingredientName: comp.ingredientName,
      matchedIngredientId: match?.id ?? null,
      matchedIngredientName: match?.name ?? null,
      matchConfidence: match ? match.confidence : "none",
      quantity: parseFloat(comp.quantity) || 0,
      unit: (comp.unit || "each").toLowerCase(),
      prepNotes: comp.prepNotes || undefined,
    };
    components.push(component);

    if (!match) {
      unmatchedIngredients.push(comp.ingredientName);
    } else {
      // Rough cost estimate (simple version — full conversion happens server-side on save)
      const price = parseFloat(match.purchasePrice) || 0;
      const purchaseQty = parseFloat(match.purchaseQuantity) || 1;
      const recipeQty = parseFloat(comp.quantity) || 0;
      // Best-effort cost: assume units match; real cost calc happens on save
      if (match.purchaseUnit.toLowerCase() === (comp.unit || "").toLowerCase()) {
        totalCostCents += Math.round((price / purchaseQty) * recipeQty * 100);
      } else {
        // Fall back to proportional estimate
        totalCostCents += Math.round((price / purchaseQty) * recipeQty * 100);
      }
    }
  }

  return {
    name: raw.name || input.itemName,
    description: raw.description || "",
    category: raw.category || input.category || "entree",
    yieldAmount: parseFloat(raw.yieldAmount) || input.yieldAmount || 10,
    yieldUnit: raw.yieldUnit || "serving",
    components,
    preparationSteps: Array.isArray(raw.preparationSteps) ? raw.preparationSteps : [],
    dietaryFlags: {
      allergenWarnings: Array.isArray(raw.dietaryFlags?.allergenWarnings)
        ? raw.dietaryFlags.allergenWarnings
        : [],
      manualDesignations: Array.isArray(raw.dietaryFlags?.manualDesignations)
        ? raw.dietaryFlags.manualDesignations
        : [],
    },
    estimatedFoodCostCents: totalCostCents,
    unmatchedIngredients,
  };
}

// ============================================================================
// Ingredient fuzzy matcher
// ============================================================================

interface IngredientMatch {
  id: number;
  name: string;
  category: string;
  purchasePrice: string;
  purchaseQuantity: string;
  purchaseUnit: string;
  confidence: "exact" | "fuzzy";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1);
}

/**
 * Fuzzy match an AI-generated ingredient name to a real base_ingredient row.
 * Strategy:
 *   1. Exact normalized match
 *   2. Token overlap scoring (best score wins if ≥ 50%)
 */
function matchIngredient(
  name: string,
  ingredients: BaseIngredientRow[],
): IngredientMatch | null {
  if (!name) return null;
  const target = normalize(name);
  const targetTokens = new Set(tokens(name));

  // 1. Exact match
  const exact = ingredients.find((ing) => normalize(ing.name) === target);
  if (exact) {
    return { ...exact, confidence: "exact" };
  }

  // 2. Contains match (either direction)
  const contains = ingredients.find((ing) => {
    const n = normalize(ing.name);
    return n.includes(target) || target.includes(n);
  });
  if (contains) {
    return { ...contains, confidence: "fuzzy" };
  }

  // 3. Token overlap scoring
  let bestMatch: BaseIngredientRow | null = null;
  let bestScore = 0;

  for (const ing of ingredients) {
    const ingTokens = new Set(tokens(ing.name));
    if (ingTokens.size === 0) continue;

    let shared = 0;
    for (const t of Array.from(targetTokens)) {
      if (ingTokens.has(t)) shared++;
    }

    // Score = shared / min(target tokens, ingredient tokens)
    // This gives high scores for short targets matching longer names
    const score = shared / Math.min(targetTokens.size, ingTokens.size);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ing;
    }
  }

  // Require at least 50% overlap
  if (bestMatch && bestScore >= 0.5) {
    return { ...bestMatch, confidence: "fuzzy" };
  }

  return null;
}
