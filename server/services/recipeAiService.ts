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
  laborHours: number;            // estimated hours to prepare the full yield
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
  estimatedLaborCostCents: number;
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
  let lastRawContent: string | null = null;

  for (const model of [DEEPSEEK_MODEL, GEMINI_MODEL, CLAUDE_MODEL]) {
    try {
      console.log(`Recipe AI: trying ${model} for "${input.itemName}"`);
      const response = await openRouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.4,
        // Note: response_format is a hint — free-tier models often ignore it
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) continue;
      lastRawContent = content;

      // Try to parse with progressive cleanup strategies
      const parsed = robustJsonParse(content);
      if (parsed) {
        rawResponse = parsed;
        console.log(`Recipe AI: successfully drafted "${input.itemName}" with ${model}`);
        break;
      }

      // If parse failed, log the problematic content (truncated) and try next model
      console.error(
        `Recipe AI: ${model} returned unparseable JSON (first 500 chars): ${content.substring(0, 500)}`,
      );
      lastError = new Error(`${model} returned malformed JSON that couldn't be repaired`);
    } catch (err: any) {
      lastError = err;
      console.error(`Recipe AI: ${model} failed:`, err.message);
      continue;
    }
  }

  if (!rawResponse) {
    console.error("Recipe AI: all models failed. Last raw content:", lastRawContent?.substring(0, 1000));
    throw new Error(
      `Could not generate recipe — AI models returned malformed responses. ` +
        `This sometimes happens with free-tier models. Please try again in a moment. ` +
        `(Details: ${lastError?.message || "unknown"})`,
    );
  }

  // Process the response — match ingredient IDs, calculate costs
  return processDraft(rawResponse, allIngredients, input);
}

// ============================================================================
// Robust JSON parser — handles common LLM output issues
// ============================================================================

/**
 * Parse JSON from an LLM response, applying progressive cleanup strategies.
 * Handles:
 *   - Markdown code fences (```json ... ``` or ``` ... ```)
 *   - Leading/trailing text around the JSON object
 *   - Trailing commas before } or ]
 *   - Unescaped newlines inside string values
 *   - Smart quotes (converted to straight quotes)
 *   - Truncated JSON (as long as the top-level object is closed)
 */
function robustJsonParse(raw: string): any | null {
  if (!raw) return null;

  // Strategy 1: direct parse
  try {
    return JSON.parse(raw);
  } catch {}

  // Strategy 2: strip markdown code fences
  let cleaned = raw.trim();
  const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/;
  const fenceMatch = cleaned.match(fenceRegex);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Strategy 3: extract the first balanced JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Strategy 4: apply syntactic cleanup
  //   - Remove trailing commas before } or ]
  //   - Replace smart quotes with straight quotes
  //   - Escape bare newlines inside strings (best-effort)
  let fixed = cleaned
    // Smart quotes → straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Remove trailing commas (,\s*} or ,\s*])
    .replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(fixed);
  } catch {}

  // Strategy 5: escape unescaped newlines and tabs inside string literals
  // This is a best-effort pass; we walk the string and track whether we're
  // inside a quoted value, then replace raw newlines with \n.
  try {
    fixed = escapeControlCharsInStrings(fixed);
    return JSON.parse(fixed);
  } catch {}

  // Strategy 6: try to close any dangling array/object if the response was truncated
  try {
    const balanced = balanceBrackets(fixed);
    return JSON.parse(balanced);
  } catch {}

  return null;
}

/**
 * Walk the string and escape raw newlines/tabs inside string literals.
 * This is imperfect but handles the common case where an LLM forgets to escape
 * multi-line string values.
 */
function escapeControlCharsInStrings(s: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      // Replace raw control chars with their escape sequences
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        out += "\\r";
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
    }
  }

  return out;
}

/**
 * Best-effort bracket balancer — if the JSON was truncated, append closing
 * brackets to make it parseable. Handles arrays and objects, but not strings.
 */
function balanceBrackets(s: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
    }
  }

  let result = s;
  // If we ended mid-string, close it
  if (inString) result += '"';
  // Close any unclosed brackets in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    result += open === "{" ? "}" : "]";
  }
  return result;
}

// ============================================================================
// Prompt builder
// ============================================================================

function buildRecipePrompt(input: GenerateDraftInput, ingredientList: string): string {
  const yieldAmount = input.yieldAmount ?? 10;
  const themeContext = input.menuTheme
    ? THEME_DESCRIPTIONS[input.menuTheme] || input.menuThemeName || ""
    : "";

  return `You are an expert catering chef at Home Bites Catering in Seattle. Create a recipe for the kitchen team.

DISH: ${input.itemName}
CATEGORY: ${input.category}${themeContext ? `\nCUISINE: ${themeContext}` : ''}${input.menuThemeName ? `\nMENU: ${input.menuThemeName}` : ''}
YIELD: ${yieldAmount} servings

AVAILABLE INGREDIENTS (use ONLY these, copy the exact name):
${ingredientList}

OUTPUT RULES — CRITICAL:
1. Respond with ONLY a JSON object. No markdown fences. No text before or after. No code blocks.
2. All strings must use double quotes and escape any internal quotes with backslash.
3. Do not include trailing commas.
4. Keep the description to one short sentence. Keep instructions to one line each.
5. Scale quantities realistically for ${yieldAmount} servings (e.g., 3-4 lb chicken for 10 people, not 1 oz or 50 lb).
6. Only use ingredients from the list above. Use the exact name.
7. Keep to 6-12 ingredients and 3-5 prep steps maximum.

Return this JSON structure:
{"name":"${input.itemName}","description":"short description","category":"entree","yieldAmount":${yieldAmount},"yieldUnit":"serving","laborHours":1.5,"components":[{"ingredientName":"exact name from list","quantity":1.5,"unit":"pound","prepNotes":"diced"}],"preparationSteps":[{"stepNumber":1,"title":"Prep","instruction":"short instruction","duration":10}],"dietaryFlags":{"allergenWarnings":["Contains Gluten"],"manualDesignations":["vegetarian"]}}

laborHours: realistic total kitchen hours to prep AND cook this recipe for ${yieldAmount} servings at $35/hour labor rate. Examples: a simple salad = 0.5 hours, braised short ribs = 4 hours, a quick sauté = 0.75 hours.

Valid categories: appetizer, entree, side, salad, dessert, sauce, soup, beverage
Valid units: pound, ounce, gram, kilogram, cup, tablespoon, teaspoon, each, gallon, liter, milliliter
Valid allergenWarnings: "Contains Gluten", "Contains Nuts", "Contains Dairy", "Contains Egg", "Contains Soy", "Contains Shellfish", "Contains Sesame"
Valid manualDesignations: vegan, vegetarian, keto, paleo, low_carb, low_sodium, sugar_free, organic, kosher, halal`;
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

  // Labor hours — fall back to 1 hour if AI didn't provide a reasonable value
  const aiLaborHours = parseFloat(raw.laborHours);
  const laborHours = isNaN(aiLaborHours) || aiLaborHours < 0 ? 1 : Math.min(aiLaborHours, 20);
  const LABOR_RATE_CENTS = 3500; // $35/hour
  const estimatedLaborCostCents = Math.round(laborHours * LABOR_RATE_CENTS);

  return {
    name: raw.name || input.itemName,
    description: raw.description || "",
    category: raw.category || input.category || "entree",
    yieldAmount: parseFloat(raw.yieldAmount) || input.yieldAmount || 10,
    yieldUnit: raw.yieldUnit || "serving",
    laborHours,
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
    estimatedLaborCostCents,
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
