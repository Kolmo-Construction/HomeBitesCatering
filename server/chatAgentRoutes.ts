import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./db";
import { and, eq, gte, ilike, isNull, asc, inArray, lte, sql } from "drizzle-orm";
import {
  events,
  menus,
  menuItems,
  baseIngredients,
  recipes,
  recipeComponents,
  clients,
  inquiries,
  ingredientPackSizes,
  insertMenuItemSchema,
  insertMenuSchema,
  insertBaseIngredientSchema,
  type MenuRecipeItem,
} from "@shared/schema";
import { calculateShoppingListForInquiry } from "./utils/shoppingList";
import { getRecipeCostBreakdown } from "./utils/menuMargin";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEEPSEEK_MODEL = "deepseek-chat";
const OPENROUTER_MODEL = "deepseek/deepseek-chat-v3.1";

function readDeepseekKeyFile(): string | null {
  try {
    const filePath = resolve(process.cwd(), ".Deepseek");
    const raw = readFileSync(filePath, "utf-8").trim();
    if (!raw) return null;
    const envMatch = raw.match(/^(?:DEEPSEEK_API_KEY|DEEPSEEK_KEY)\s*=\s*(.+)$/m);
    if (envMatch) return envMatch[1].trim().replace(/^["']|["']$/g, "");
    return raw;
  } catch {
    return null;
  }
}

const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() || readDeepseekKeyFile();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || null;

type ProviderConfig = { client: OpenAI; model: string; label: string };
const providers: ProviderConfig[] = [];
if (deepseekKey) {
  providers.push({
    client: new OpenAI({ apiKey: deepseekKey, baseURL: DEEPSEEK_BASE_URL }),
    model: DEEPSEEK_MODEL,
    label: "deepseek-native",
  });
}
if (openRouterKey) {
  providers.push({
    client: new OpenAI({
      apiKey: openRouterKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": "https://homebites.design",
        "X-Title": "Home Bites Catering CMS",
      },
    }),
    model: OPENROUTER_MODEL,
    label: "openrouter-deepseek",
  });
}

// ============================================================================
// Tools
// ============================================================================

const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_upcoming_events",
      description:
        "List upcoming confirmed events (future event_date). Returns id, date, event type, guest count, venue, client name.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max rows (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "today_schedule",
      description: "List events happening today.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_details",
      description: "Get full details for a single event by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_menus",
      description: "List all menus with id, name, type, event type, description.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_menu_details",
      description: "Get a menu by id, including packages and category items.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_menu_items",
      description: "List menu items. Optional category filter (appetizer, entree, side, dessert, beverage) and name search.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          search: { type: "string", description: "Case-insensitive name match" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_base_ingredients",
      description: "List base ingredients. Optional search by name and category filter.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          category: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ingredient_details",
      description: "Full details for a base ingredient by id: price, unit, supplier, dietary tags, yield.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recipes",
      description: "List recipes. Optional name search and category filter.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          category: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recipe_details",
      description: "Full recipe details by id, including components (ingredients) and preparation steps.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_everything",
      description: "Global search across menus, menu items, ingredients, recipes for a query string.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_menu",
      description:
        "Create a new menu. Required: name, type (standard|custom|seasonal), eventType (wedding|corporate|birthday|other). Returns the new id.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["standard", "custom", "seasonal"] },
          eventType: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "type", "eventType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_menu_item",
      description: "Create a new menu item. Required: name, category. Optional: description, price.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", description: "appetizer, entree, side, dessert, beverage" },
          description: { type: "string" },
          price: { type: "number" },
        },
        required: ["name", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_base_ingredient",
      description:
        "Create a new base ingredient. Required: name, category, purchasePrice, purchaseUnit. Optional: supplier, notes.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", description: "meat, produce, dairy, spices, dry_goods, seafood, beverages, etc." },
          purchasePrice: { type: "number" },
          purchaseUnit: { type: "string", description: "pound, ounce, gallon, each, dozen, case, etc." },
          purchaseQuantity: { type: "number", description: "Default 1" },
          supplier: { type: "string" },
          notes: { type: "string" },
        },
        required: ["name", "category", "purchasePrice", "purchaseUnit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recipe_shopping_list",
      description: "For a given recipe id, return the required base ingredients with quantities and estimated cost.",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_events_this_week",
      description: "Events happening in the next 7 days (from today). Compact list with date, time, event type, guest count, venue, client.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_shopping_list",
      description:
        "Aggregated shopping list for one event — sums all recipe ingredients scaled by guest count. Requires the event to be linked to an inquiry (quoteId). Returns grouped ingredients with quantities and estimated cost.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "number" },
          portionMultiplier: { type: "number", description: "Optional override for portion size (default inferred from service style)" },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_prep_sheet",
      description:
        "Prep summary for an event: event info + every recipe on the attached menu with estimated servings to cook based on guest count. Works even if the event is not linked to a full inquiry.",
      parameters: {
        type: "object",
        properties: { eventId: { type: "number" } },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_ingredient_usage",
      description:
        "Find every recipe that uses a given ingredient, by ingredient id or name (case-insensitive partial match). Use this before changing prices, substituting, or discontinuing an ingredient.",
      parameters: {
        type: "object",
        properties: {
          ingredientId: { type: "number" },
          name: { type: "string", description: "Partial name match, e.g., 'chicken', 'beef'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_ingredient_price",
      description:
        "Update the purchase price of a base ingredient. Stores the previous price for tracking. Use this when a supplier price changes.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          newPrice: { type: "number", description: "New purchase price in dollars" },
        },
        required: ["id", "newPrice"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_recipes_by_dietary",
      description:
        "Find recipes that match dietary requirements. Tags: vegan, vegetarian, gluten_free, dairy_free, nut_free, kosher, halal, keto, paleo.",
      parameters: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
            description: "One or more dietary tags that must ALL be satisfied (manual designations).",
          },
          limit: { type: "number" },
        },
        required: ["tags"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_recipe_ingredient_gaps",
      description:
        "For a recipe, flag components whose base ingredient is missing real purchase data: zero/missing price, no supplier, no pack sizes, or no unit conversion when the recipe unit differs from the purchase unit. Use this before cooking to know which ingredients still need sourcing info.",
      parameters: {
        type: "object",
        properties: { id: { type: "number", description: "Recipe id" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recipe_cost",
      description:
        "Get per-serving ingredient cost, labor cost, and total cost (in dollars) for a recipe. Optionally scale by a number of servings.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          servings: { type: "number", description: "If provided, total cost is multiplied by this count." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_followups",
      description:
        "Return the admin's follow-up inbox — everything waiting on Mike. Supports filters by urgency (P0/P1/P2/P3) and type. Use this to answer 'what's on my plate?', 'who should I call back first?', 'anything overdue?'.",
      parameters: {
        type: "object",
        properties: {
          urgency: {
            type: "array",
            items: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
            description: "Subset of urgency tiers to include (omit for all).",
          },
          limit: { type: "number", description: "Cap rows returned (default 20)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_followup_reply",
      description:
        "Given a follow-up item key (returned by list_followups), generate a draft reply tailored to the item type. Returns the suggested reply text and subject for Mike to review. Does NOT send.",
      parameters: {
        type: "object",
        properties: {
          itemKey: { type: "string", description: "Item key like 'change_request_open:47' or 'quote_unviewed:12'." },
          tone: {
            type: "string",
            enum: ["friendly", "brief", "formal"],
            description: "Optional tone override (default: friendly).",
          },
        },
        required: ["itemKey"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_followup",
      description:
        "Mark a follow-up item as handled / dismissed. Use this after Mike confirms the item is addressed. Changes state to dismissed for the calling admin user.",
      parameters: {
        type: "object",
        properties: {
          itemKey: { type: "string" },
        },
        required: ["itemKey"],
      },
    },
  },
];

// ============================================================================
// Tool handlers
// ============================================================================

interface ToolContext {
  userId: number;
}
type ToolHandler = (args: any, ctx?: ToolContext) => Promise<any>;

const toolHandlers: Record<string, ToolHandler> = {
  async list_upcoming_events({ limit = 10 }) {
    const now = new Date();
    const rows = await db
      .select({
        id: events.id,
        eventDate: events.eventDate,
        startTime: events.startTime,
        eventType: events.eventType,
        guestCount: events.guestCount,
        venue: events.venue,
        status: events.status,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .where(and(gte(events.eventDate, now), isNull(events.deletedAt)))
      .orderBy(asc(events.eventDate))
      .limit(Math.min(Number(limit) || 10, 50));
    return rows.map((r) => ({
      ...r,
      clientName: [r.clientFirstName, r.clientLastName].filter(Boolean).join(" ") || null,
    }));
  },

  async today_schedule() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const rows = await db
      .select({
        id: events.id,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        guestCount: events.guestCount,
        venue: events.venue,
        notes: events.notes,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .where(and(gte(events.eventDate, start), isNull(events.deletedAt)))
      .orderBy(asc(events.startTime));
    return rows
      .filter((r) => r.startTime && new Date(r.startTime) < end)
      .map((r) => ({
        ...r,
        clientName: [r.clientFirstName, r.clientLastName].filter(Boolean).join(" ") || null,
      }));
  },

  async get_event_details({ id }) {
    const [row] = await db
      .select()
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .leftJoin(menus, eq(events.menuId, menus.id))
      .where(eq(events.id, Number(id)));
    if (!row) return { error: `Event ${id} not found` };
    return {
      event: row.events,
      client: row.clients
        ? {
            id: row.clients.id,
            name: [row.clients.firstName, row.clients.lastName].filter(Boolean).join(" "),
            email: row.clients.email,
          }
        : null,
      menu: row.menus ? { id: row.menus.id, name: row.menus.name, type: row.menus.type } : null,
    };
  },

  async list_menus() {
    return await db
      .select({
        id: menus.id,
        name: menus.name,
        type: menus.type,
        eventType: menus.eventType,
        description: menus.description,
      })
      .from(menus)
      .orderBy(asc(menus.displayOrder), asc(menus.name));
  },

  async get_menu_details({ id }) {
    const [row] = await db.select().from(menus).where(eq(menus.id, Number(id)));
    if (!row) return { error: `Menu ${id} not found` };
    return row;
  },

  async list_menu_items({ category, search, limit = 25 }) {
    const conditions: any[] = [];
    if (category) conditions.push(eq(menuItems.category, String(category)));
    if (search) conditions.push(ilike(menuItems.name, `%${search}%`));
    const query = db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        category: menuItems.category,
        price: menuItems.price,
        description: menuItems.description,
      })
      .from(menuItems);
    const rows = await (conditions.length
      ? query.where(and(...conditions))
      : query
    )
      .orderBy(asc(menuItems.name))
      .limit(Math.min(Number(limit) || 25, 100));
    return rows;
  },

  async list_base_ingredients({ search, category, limit = 25 }) {
    const conditions: any[] = [];
    if (category) conditions.push(eq(baseIngredients.category, String(category)));
    if (search) conditions.push(ilike(baseIngredients.name, `%${search}%`));
    const query = db
      .select({
        id: baseIngredients.id,
        name: baseIngredients.name,
        category: baseIngredients.category,
        purchasePrice: baseIngredients.purchasePrice,
        purchaseUnit: baseIngredients.purchaseUnit,
        supplier: baseIngredients.supplier,
      })
      .from(baseIngredients);
    const rows = await (conditions.length
      ? query.where(and(...conditions))
      : query
    )
      .orderBy(asc(baseIngredients.name))
      .limit(Math.min(Number(limit) || 25, 100));
    return rows;
  },

  async get_ingredient_details({ id }) {
    const [row] = await db.select().from(baseIngredients).where(eq(baseIngredients.id, Number(id)));
    if (!row) return { error: `Ingredient ${id} not found` };
    return row;
  },

  async list_recipes({ search, category, limit = 25 }) {
    const conditions: any[] = [];
    if (category) conditions.push(eq(recipes.category, String(category)));
    if (search) conditions.push(ilike(recipes.name, `%${search}%`));
    const query = db
      .select({
        id: recipes.id,
        name: recipes.name,
        category: recipes.category,
        yield: recipes.yield,
        yieldUnit: recipes.yieldUnit,
      })
      .from(recipes);
    const rows = await (conditions.length
      ? query.where(and(...conditions))
      : query
    )
      .orderBy(asc(recipes.name))
      .limit(Math.min(Number(limit) || 25, 100));
    return rows;
  },

  async get_recipe_details({ id }) {
    const recipeId = Number(id);
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) return { error: `Recipe ${id} not found` };
    const components = await db
      .select({
        id: recipeComponents.id,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        prepNotes: recipeComponents.prepNotes,
        ingredientId: baseIngredients.id,
        ingredientName: baseIngredients.name,
      })
      .from(recipeComponents)
      .leftJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(eq(recipeComponents.recipeId, recipeId));
    return { recipe, components };
  },

  async search_everything({ query }) {
    const q = `%${query}%`;
    const [menusFound, itemsFound, ingsFound, recipesFound] = await Promise.all([
      db
        .select({ id: menus.id, name: menus.name })
        .from(menus)
        .where(ilike(menus.name, q))
        .limit(5),
      db
        .select({ id: menuItems.id, name: menuItems.name, category: menuItems.category })
        .from(menuItems)
        .where(ilike(menuItems.name, q))
        .limit(5),
      db
        .select({ id: baseIngredients.id, name: baseIngredients.name })
        .from(baseIngredients)
        .where(ilike(baseIngredients.name, q))
        .limit(5),
      db
        .select({ id: recipes.id, name: recipes.name })
        .from(recipes)
        .where(ilike(recipes.name, q))
        .limit(5),
    ]);
    return {
      menus: menusFound,
      menuItems: itemsFound,
      ingredients: ingsFound,
      recipes: recipesFound,
    };
  },

  async create_menu(args) {
    const parsed = insertMenuSchema.parse({
      name: args.name,
      type: args.type,
      eventType: args.eventType,
      description: args.description ?? null,
      recipes: [],
    });
    const [row] = await db.insert(menus).values(parsed as any).returning();
    return { id: row.id, name: row.name };
  },

  async create_menu_item(args) {
    const id = `mi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const parsed = insertMenuItemSchema.parse({
      name: args.name,
      category: args.category,
      description: args.description ?? null,
      price: args.price ?? null,
    });
    const [row] = await db
      .insert(menuItems)
      .values({ id, ...(parsed as any) })
      .returning();
    return { id: row.id, name: row.name, category: row.category };
  },

  async create_base_ingredient(args) {
    const parsed = insertBaseIngredientSchema.parse({
      name: args.name,
      category: args.category,
      purchasePrice: args.purchasePrice,
      purchaseUnit: args.purchaseUnit,
      purchaseQuantity: args.purchaseQuantity ?? 1,
      supplier: args.supplier ?? null,
      notes: args.notes ?? null,
    });
    const [row] = await db.insert(baseIngredients).values(parsed as any).returning();
    return { id: row.id, name: row.name };
  },

  async get_recipe_shopping_list({ id }) {
    const recipeId = Number(id);
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) return { error: `Recipe ${id} not found` };
    const components = await db
      .select({
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        ingredientName: baseIngredients.name,
        purchasePrice: baseIngredients.purchasePrice,
        purchaseUnit: baseIngredients.purchaseUnit,
        purchaseQuantity: baseIngredients.purchaseQuantity,
      })
      .from(recipeComponents)
      .leftJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(eq(recipeComponents.recipeId, recipeId));
    return {
      recipe: { id: recipe.id, name: recipe.name, yield: recipe.yield, yieldUnit: recipe.yieldUnit },
      items: components,
      link: `/recipes/${recipe.id}`,
      note: "Quantities are in recipe units. Pricing reflects per-purchase-unit cost — conversion between recipe and purchase units may require unit conversion factors.",
    };
  },

  async list_events_this_week() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const rows = await db
      .select({
        id: events.id,
        eventDate: events.eventDate,
        startTime: events.startTime,
        eventType: events.eventType,
        guestCount: events.guestCount,
        venue: events.venue,
        status: events.status,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .where(
        and(
          gte(events.eventDate, start),
          lte(events.eventDate, end),
          isNull(events.deletedAt),
        ),
      )
      .orderBy(asc(events.eventDate));
    return rows.map((r) => ({
      ...r,
      clientName: [r.clientFirstName, r.clientLastName].filter(Boolean).join(" ") || null,
      link: `/events/${r.id}`,
    }));
  },

  async get_event_shopping_list({ eventId, portionMultiplier }) {
    const [event] = await db.select().from(events).where(eq(events.id, Number(eventId)));
    if (!event) return { error: `Event ${eventId} not found` };
    if (!event.quoteId) {
      return {
        error:
          "Event is not linked to a quote, so no structured menu selections exist. Try get_event_prep_sheet instead for a recipe-level summary.",
      };
    }
    const [inquiry] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.quoteId, event.quoteId));
    if (!inquiry) {
      return {
        error:
          "No originating inquiry found for this event — structured shopping list needs the inquiry record.",
      };
    }
    const list = await calculateShoppingListForInquiry(inquiry.id, {
      portionMultiplier: portionMultiplier ? Number(portionMultiplier) : undefined,
    });
    if (!list) return { error: "Could not compute shopping list." };
    // Trim to keep the tool result compact.
    return {
      eventId: event.id,
      eventSummary: list.eventSummary,
      portionMultiplier: list.portionMultiplier,
      totalEstimatedCostUSD: list.totalEstimatedCost,
      totalLaborHours: list.totalLaborHours,
      totalFullyLoadedCostUSD: list.totalFullyLoadedCost,
      lineCount: list.totalLineCount,
      lines: list.allLines.slice(0, 60).map((l) => ({
        ingredient: l.name,
        category: l.category,
        quantity: l.totalQuantity,
        unit: l.purchaseUnit,
        supplier: l.supplier,
        estimatedCostUSD: l.estimatedCost,
      })),
      unlinkedItems: list.unlinkedItems,
      link: `/events/${event.id}`,
    };
  },

  async get_event_prep_sheet({ eventId }) {
    const [event] = await db
      .select()
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .leftJoin(menus, eq(events.menuId, menus.id))
      .where(eq(events.id, Number(eventId)));
    if (!event) return { error: `Event ${eventId} not found` };

    const menu = event.menus;
    let recipeDetails: Array<{
      id: number;
      name: string;
      category: string | null;
      yield: number;
      yieldUnit: string | null;
      batchesNeeded: number;
      laborHours: number;
    }> = [];

    if (menu) {
      const menuRecipes = (menu.recipes as MenuRecipeItem[]) || [];
      const recipeIds = menuRecipes.map((r) => r.recipeId).filter(Boolean);
      if (recipeIds.length > 0) {
        const rows = await db
          .select()
          .from(recipes)
          .where(inArray(recipes.id, recipeIds));
        const guest = event.events.guestCount || 0;
        recipeDetails = rows.map((r) => {
          const yieldAmount = parseFloat(r.yield || "1") || 1;
          const batches = yieldAmount > 0 ? Math.ceil(guest / yieldAmount) : 0;
          return {
            id: r.id,
            name: r.name,
            category: r.category,
            yield: yieldAmount,
            yieldUnit: r.yieldUnit,
            batchesNeeded: batches,
            laborHours: parseFloat(String(r.laborHours || "0")) || 0,
          };
        });
      }
    }

    return {
      event: {
        id: event.events.id,
        eventDate: event.events.eventDate,
        startTime: event.events.startTime,
        eventType: event.events.eventType,
        guestCount: event.events.guestCount,
        venue: event.events.venue,
        status: event.events.status,
      },
      client: event.clients
        ? {
            name: [event.clients.firstName, event.clients.lastName].filter(Boolean).join(" "),
            email: event.clients.email,
            phone: event.clients.phone,
          }
        : null,
      menu: menu ? { id: menu.id, name: menu.name } : null,
      recipes: recipeDetails,
      totalLaborHours: recipeDetails.reduce((s, r) => s + r.laborHours * r.batchesNeeded, 0),
      link: `/events/${event.events.id}`,
    };
  },

  async find_ingredient_usage({ ingredientId, name }) {
    let ingredientIds: number[] = [];
    let matched: Array<{ id: number; name: string }> = [];
    if (ingredientId) {
      const [row] = await db
        .select({ id: baseIngredients.id, name: baseIngredients.name })
        .from(baseIngredients)
        .where(eq(baseIngredients.id, Number(ingredientId)));
      if (row) {
        ingredientIds = [row.id];
        matched = [row];
      }
    } else if (name) {
      const rows = await db
        .select({ id: baseIngredients.id, name: baseIngredients.name })
        .from(baseIngredients)
        .where(ilike(baseIngredients.name, `%${name}%`))
        .limit(10);
      ingredientIds = rows.map((r) => r.id);
      matched = rows;
    } else {
      return { error: "Provide ingredientId or name." };
    }
    if (ingredientIds.length === 0) return { error: "No matching ingredient." };

    const usages = await db
      .select({
        ingredientId: recipeComponents.baseIngredientId,
        recipeId: recipes.id,
        recipeName: recipes.name,
        recipeCategory: recipes.category,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
      })
      .from(recipeComponents)
      .innerJoin(recipes, eq(recipeComponents.recipeId, recipes.id))
      .where(inArray(recipeComponents.baseIngredientId, ingredientIds))
      .orderBy(asc(recipes.name))
      .limit(50);

    return {
      matchedIngredients: matched,
      usages: usages.map((u) => ({
        ...u,
        link: `/recipes/${u.recipeId}`,
      })),
    };
  },

  async update_ingredient_price({ id, newPrice }) {
    const ingredientId = Number(id);
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "newPrice must be a non-negative number." };
    }
    const [existing] = await db
      .select({
        id: baseIngredients.id,
        name: baseIngredients.name,
        currentPrice: baseIngredients.purchasePrice,
      })
      .from(baseIngredients)
      .where(eq(baseIngredients.id, ingredientId));
    if (!existing) return { error: `Ingredient ${ingredientId} not found.` };

    const [updated] = await db
      .update(baseIngredients)
      .set({
        previousPurchasePrice: existing.currentPrice,
        purchasePrice: price.toFixed(2) as any,
        updatedAt: new Date(),
      })
      .where(eq(baseIngredients.id, ingredientId))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      oldPrice: existing.currentPrice,
      newPrice: updated.purchasePrice,
      link: `/base-ingredients`,
    };
  },

  async search_recipes_by_dietary({ tags, limit = 20 }) {
    const list: string[] = Array.isArray(tags) ? tags.map(String) : [];
    if (list.length === 0) return { error: "Provide at least one tag." };
    // Match if recipes.dietaryFlags.manualDesignations @> tags (jsonb containment)
    const rows = await db
      .select({
        id: recipes.id,
        name: recipes.name,
        category: recipes.category,
        dietaryFlags: recipes.dietaryFlags,
      })
      .from(recipes)
      .where(
        sql`(${recipes.dietaryFlags} -> 'manualDesignations') @> ${JSON.stringify(list)}::jsonb`,
      )
      .orderBy(asc(recipes.name))
      .limit(Math.min(Number(limit) || 20, 100));
    return {
      tags: list,
      count: rows.length,
      recipes: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        link: `/recipes/${r.id}`,
      })),
    };
  },

  async check_recipe_ingredient_gaps({ id }) {
    const recipeId = Number(id);
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) return { error: `Recipe ${id} not found.` };

    const components = await db
      .select({
        componentId: recipeComponents.id,
        recipeQuantity: recipeComponents.quantity,
        recipeUnit: recipeComponents.unit,
        ingredientId: baseIngredients.id,
        ingredientName: baseIngredients.name,
        purchasePrice: baseIngredients.purchasePrice,
        purchaseUnit: baseIngredients.purchaseUnit,
        supplier: baseIngredients.supplier,
        sku: baseIngredients.sku,
        unitConversions: baseIngredients.unitConversions,
        yieldPct: baseIngredients.yieldPct,
      })
      .from(recipeComponents)
      .innerJoin(baseIngredients, eq(recipeComponents.baseIngredientId, baseIngredients.id))
      .where(eq(recipeComponents.recipeId, recipeId));

    // Load pack sizes for all involved ingredients in one query.
    const ingredientIds = components.map((c) => c.ingredientId);
    const packs =
      ingredientIds.length > 0
        ? await db
            .select({
              baseIngredientId: ingredientPackSizes.baseIngredientId,
              id: ingredientPackSizes.id,
            })
            .from(ingredientPackSizes)
            .where(inArray(ingredientPackSizes.baseIngredientId, ingredientIds))
        : [];
    const packCount = new Map<number, number>();
    for (const p of packs) packCount.set(p.baseIngredientId, (packCount.get(p.baseIngredientId) || 0) + 1);

    const gaps: Array<{
      ingredientId: number;
      ingredientName: string;
      issues: string[];
      link: string;
    }> = [];

    for (const c of components) {
      const issues: string[] = [];
      const priceNum = parseFloat(String(c.purchasePrice ?? "0"));
      if (!priceNum || priceNum <= 0) issues.push("no purchase price");
      if (!c.supplier) issues.push("no supplier");
      if (!c.sku) issues.push("no SKU");
      if ((packCount.get(c.ingredientId) || 0) === 0) issues.push("no pack sizes defined");
      // Unit mismatch without a conversion factor means cost/shopping math will fail.
      if (
        c.recipeUnit &&
        c.purchaseUnit &&
        c.recipeUnit.toLowerCase() !== c.purchaseUnit.toLowerCase()
      ) {
        const conv = (c.unitConversions || {}) as Record<string, number>;
        if (!conv || !conv[c.recipeUnit]) {
          // Only flag if units are likely incompatible kinds. We conservatively
          // flag all mismatches; the chef can decide.
          issues.push(`no "${c.recipeUnit} → ${c.purchaseUnit}" conversion`);
        }
      }
      if (!c.yieldPct) issues.push("no yield/trim % (waste not modeled)");

      if (issues.length > 0) {
        gaps.push({
          ingredientId: c.ingredientId,
          ingredientName: c.ingredientName,
          issues,
          link: `/base-ingredients`,
        });
      }
    }

    return {
      recipeId,
      recipeName: recipe.name,
      totalComponents: components.length,
      gapCount: gaps.length,
      gaps,
      link: `/recipes/${recipeId}`,
      note:
        gaps.length === 0
          ? "All ingredients have price, supplier, SKU, pack sizes, and unit handling set."
          : "Filling these in will make the shopping list and cost math reliable.",
    };
  },

  async get_recipe_cost({ id, servings }) {
    const breakdown = await getRecipeCostBreakdown(Number(id));
    if (!breakdown) return { error: `Recipe ${id} not found.` };
    const scale = servings ? Number(servings) : 1;
    const totalPerServingCents = breakdown.totalCostCents;
    return {
      recipeId: breakdown.recipeId,
      recipeName: breakdown.recipeName,
      yield: breakdown.yieldAmount,
      yieldUnit: breakdown.yieldUnit,
      laborHoursPerBatch: breakdown.laborHours,
      perServing: {
        ingredientCostUSD: breakdown.ingredientCostCents / 100,
        laborCostUSD: breakdown.laborCostCents / 100,
        totalCostUSD: totalPerServingCents / 100,
      },
      ...(servings
        ? {
            scaledFor: scale,
            scaledTotalCostUSD: (totalPerServingCents * scale) / 100,
          }
        : {}),
      link: `/recipes/${breakdown.recipeId}`,
    };
  },

  async list_followups(args, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated for follow-up lookup." };
    const { listFollowUps } = await import("./services/followUps");
    const urgency = Array.isArray(args?.urgency) && args.urgency.length > 0 ? args.urgency : undefined;
    const limit = typeof args?.limit === "number" ? args.limit : 20;
    const result = await listFollowUps({ userId: ctx.userId, urgency });
    return {
      counts: result.counts,
      items: result.items.slice(0, Math.min(limit, 50)).map((i) => ({
        key: i.key,
        type: i.type,
        urgency: i.urgency,
        title: i.title,
        subtitle: i.subtitle,
        ageHours: Math.round(i.ageSeconds / 3600),
        link: i.links.primary,
      })),
      note:
        result.counts.total === 0
          ? "Inbox zero — nothing needs Mike right now."
          : `${result.counts.p0} urgent · ${result.counts.p1} this week · ${result.counts.p2 + result.counts.p3} low priority.`,
    };
  },

  async draft_followup_reply(args, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const { listFollowUps } = await import("./services/followUps");
    const { items } = await listFollowUps({ userId: ctx.userId });
    const target = items.find((i) => i.key === args?.itemKey);
    if (!target) return { error: `Item ${args?.itemKey} not found in the open inbox.` };
    const tone = (args?.tone as string) || "friendly";
    // Return a structured draft; the agent will phrase it in natural language.
    // Keep this deterministic rather than inventing details — the agent can
    // personalize in its final reply based on the returned fields.
    const draftByType: Record<string, { subject: string; body: string }> = {
      change_request_open: {
        subject: "We got your change request",
        body: `Thanks for sending this over — we've noted the change and will confirm once we've updated the event details. If anything else comes up, reply to this and we'll take care of it.`,
      },
      quote_unviewed: {
        subject: "Just making sure you got our proposal",
        body: `Checking in — we sent over the proposal a few days ago and I want to make sure it landed. Happy to walk you through it on a quick call if easier.`,
      },
      quote_viewed_no_action: {
        subject: "Any questions on the proposal?",
        body: `Wanted to check in on the proposal. Happy to tweak anything, swap menu items, or hop on a quick call to run through details.`,
      },
      info_requested: {
        subject: "Let's hop on a call",
        body: `Thanks for flagging you'd like more info. I'm available [TIME] or [TIME] — would either of those work, or is a different time better for you?`,
      },
      contract_unsigned: {
        subject: "Contract ready for signature",
        body: `Just a reminder — the contract is still waiting on your signature. Once it's signed we can lock in your date. Let me know if you have any questions.`,
      },
      deposit_overdue: {
        subject: "Deposit invoice",
        body: `Sending over the payment link for your deposit — once that comes through, your date is officially locked in and we'll kick off prep planning.`,
      },
      balance_due_window: {
        subject: "Final balance for your event",
        body: `We're a few days out — here's the link for your final balance. Once paid we're all set for the big day.`,
      },
      review_not_requested: {
        subject: "How was your event?",
        body: `Hope your event went beautifully. If you enjoyed working with us, we'd love a quick review — it genuinely helps a small business like ours. [REVIEW_LINK]`,
      },
      lost_lead_nurture: {
        subject: "Thinking about you",
        body: `Circling back — if your plans have shifted or you're ready to revisit, just reply and I can pull something together in a day. Otherwise, all good. Hope you're well.`,
      },
    };
    const draft = draftByType[target.type] || {
      subject: "Quick follow-up",
      body: `Hi [NAME], just following up on this. Let me know if you need anything from our side.`,
    };
    const toneAdjust =
      tone === "brief"
        ? " (keep reply to 1-2 sentences)"
        : tone === "formal"
          ? " (use formal register)"
          : " (friendly and direct)";
    return {
      itemKey: target.key,
      type: target.type,
      title: target.title,
      subtitle: target.subtitle,
      suggestedSubject: draft.subject,
      suggestedBody: draft.body + toneAdjust,
      link: target.links.primary,
      note: "Review and personalize before sending — this is a starting point, not a final draft.",
    };
  },

  async resolve_followup(args, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const { listFollowUps, dismissItem } = await import("./services/followUps");
    const { items } = await listFollowUps({ userId: ctx.userId });
    const target = items.find((i) => i.key === args?.itemKey);
    if (!target) return { error: `Item ${args?.itemKey} not found or already resolved.` };
    await dismissItem(ctx.userId, target.key, target.sourceAge);
    return {
      ok: true,
      itemKey: target.key,
      message: `Dismissed "${target.title}". It will re-appear if the underlying record changes.`,
    };
  },
};

// ============================================================================
// Route handler
// ============================================================================

const SYSTEM_PROMPT = `You are HomeBites Kitchen Assistant, an AI for the chef at a catering company.

You can:
- Look up events (today, this week, any upcoming), menus, menu items, ingredients, and recipes.
- Build an event shopping list or prep sheet for a specific event.
- Find which recipes use a given ingredient (critical before price changes or substitutions).
- Update an ingredient's purchase price.
- Search recipes by dietary tags (vegan, gluten_free, etc).
- Get per-serving and scaled recipe cost (ingredient + labor).
- Create new menus, menu items, and base ingredients.
- **Manage Mike's follow-up inbox** — list pending items (list_followups), draft replies
  (draft_followup_reply), and dismiss handled items (resolve_followup). Use these when
  the chef asks "what do I need to follow up on?", "who am I behind on?", "what's
  urgent today?", or similar.

Rules:
- Always call the appropriate tool for live data; never invent prices, ids, or dates.
- Keep answers short and scannable. Prefer bullet lists or compact tables.
- When a tool result includes a "link" field, render ids as markdown links — e.g. "Event [#42](/events/42) · Sat Apr 25, 5:30 PM". Do the same for recipes (/recipes/:id) and base ingredients (/base-ingredients).
- Format dates human-readably (e.g. "Sat Apr 25, 5:30 PM"). Money values are dollars unless noted.
- For create_*, update_*, confirm what you just did and include the id + link.
- Before calling update_ingredient_price, prefer to first show the chef find_ingredient_usage results so they know the downstream impact — unless they've already asked to just change it.
- If a tool returns an error, tell the chef plainly and suggest the next step.
- If the request is ambiguous (e.g. "create a menu" with no name), ask one clarifying question instead of guessing.`;

const router = Router();

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.userId) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  if (providers.length === 0) {
    return res.status(503).json({
      error:
        "No LLM provider configured. Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY, or place a .Deepseek file at the repo root.",
    });
  }

  const schema = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    message?: string;
    context?: { currentPath?: string };
  };

  if (!schema || (!schema.message && !schema.messages)) {
    return res.status(400).json({ error: "message or messages required" });
  }

  // Build the conversation with a live context note appended to the system prompt.
  const contextLine = schema.context?.currentPath
    ? `\n\nContext: the chef is currently on the page "${schema.context.currentPath}". If their question refers to "this event/recipe/ingredient", try to resolve ids from that path first.`
    : "";
  const todayLine = `\n\nToday's date is ${new Date().toISOString().slice(0, 10)} (server time).`;
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + todayLine + contextLine },
  ];
  if (schema.messages) {
    for (const m of schema.messages) {
      if (m.role === "user" || m.role === "assistant") {
        history.push({ role: m.role, content: m.content });
      }
    }
  }
  if (schema.message) {
    history.push({ role: "user", content: schema.message });
  }

  const toolCtx: ToolContext = { userId: (req.session as any)?.userId ?? 0 };
  const toolLog: Array<{ name: string; args: any; resultPreview: string }> = [];
  const MAX_TOOL_ROUNDS = 6;

  try {
    let finalContent = "";
    let usedProvider = providers[0].label;

    for (const provider of providers) {
      try {
        let messages = [...history];
        let done = false;
        for (let round = 0; round < MAX_TOOL_ROUNDS && !done; round++) {
          const completion = await provider.client.chat.completions.create({
            model: provider.model,
            messages,
            tools: toolDefs,
            tool_choice: "auto",
            temperature: 0.2,
          });

          const choice = completion.choices[0];
          const msg = choice.message;
          messages.push(msg);

          if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const call of msg.tool_calls) {
              const name = call.function.name;
              let args: any = {};
              try {
                args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
              } catch {
                args = {};
              }
              const handler = toolHandlers[name];
              let result: any;
              if (!handler) {
                result = { error: `Unknown tool ${name}` };
              } else {
                try {
                  result = await handler(args, toolCtx);
                } catch (err: any) {
                  result = { error: err?.message || String(err) };
                }
              }
              const serialized = JSON.stringify(result);
              toolLog.push({
                name,
                args,
                resultPreview: serialized.length > 200 ? serialized.slice(0, 200) + "…" : serialized,
              });
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: serialized.length > 12000 ? serialized.slice(0, 12000) + "…(truncated)" : serialized,
              });
            }
          } else {
            finalContent = msg.content ?? "";
            done = true;
          }
        }

        if (!done) {
          finalContent = "I ran out of steps while handling that. Try rephrasing or narrowing the request.";
        }
        usedProvider = provider.label;
        return res.json({ reply: finalContent, provider: usedProvider, toolCalls: toolLog });
      } catch (err: any) {
        console.warn(`[chat-agent] provider ${provider.label} failed:`, err?.message || err);
        // try next provider
      }
    }

    return res.status(502).json({ error: "All LLM providers failed" });
  } catch (err: any) {
    console.error("[chat-agent] fatal:", err);
    return res.status(500).json({ error: err?.message || "Chat agent error" });
  }
});

// =============================================================================
// Streaming endpoint — Server-Sent Events
// =============================================================================
//
// Event types emitted:
//   event: tool_call   data: { name, args }
//   event: tool_result data: { name, resultPreview }
//   event: chunk       data: { text }        (text delta)
//   event: done        data: { provider, toolCalls }
//   event: error       data: { message }
//
// Client reads the stream and appends `chunk.text` to the assistant bubble,
// updates tool log on tool_call/tool_result, and closes on done/error.

function sseWrite(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  // @ts-expect-error — response-compression may expose flush()
  if (typeof res.flush === "function") (res as any).flush();
}

router.post("/stream", isAuthenticated, async (req: Request, res: Response) => {
  if (providers.length === 0) {
    return res.status(503).json({
      error: "No LLM provider configured.",
    });
  }

  const schema = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    message?: string;
    context?: { currentPath?: string };
  };

  if (!schema || (!schema.message && !schema.messages)) {
    return res.status(400).json({ error: "message or messages required" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders?.();

  const contextLine = schema.context?.currentPath
    ? `\n\nContext: the chef is currently on the page "${schema.context.currentPath}". If their question refers to "this event/recipe/ingredient", try to resolve ids from that path first.`
    : "";
  const todayLine = `\n\nToday's date is ${new Date().toISOString().slice(0, 10)} (server time).`;
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + todayLine + contextLine },
  ];
  if (schema.messages) {
    for (const m of schema.messages) {
      if (m.role === "user" || m.role === "assistant") {
        history.push({ role: m.role, content: m.content });
      }
    }
  }
  if (schema.message) history.push({ role: "user", content: schema.message });

  const toolCtx: ToolContext = { userId: (req.session as any)?.userId ?? 0 };
  const toolLog: Array<{ name: string; args: any; resultPreview: string }> = [];
  const MAX_TOOL_ROUNDS = 6;

  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
  });

  try {
    for (const provider of providers) {
      try {
        let messages = [...history];
        let finished = false;

        for (let round = 0; round < MAX_TOOL_ROUNDS && !finished && !clientClosed; round++) {
          const stream = await provider.client.chat.completions.create({
            model: provider.model,
            messages,
            tools: toolDefs,
            tool_choice: "auto",
            temperature: 0.2,
            stream: true,
          });

          // Accumulators for this round
          let textBuffer = "";
          const toolCallBuffers: Record<
            number,
            { id?: string; name: string; arguments: string }
          > = {};

          for await (const part of stream) {
            if (clientClosed) break;
            const delta = part.choices?.[0]?.delta as any;
            if (!delta) continue;

            if (typeof delta.content === "string" && delta.content.length > 0) {
              textBuffer += delta.content;
              sseWrite(res, "chunk", { text: delta.content });
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallBuffers[idx]) {
                  toolCallBuffers[idx] = { id: tc.id, name: "", arguments: "" };
                }
                if (tc.id) toolCallBuffers[idx].id = tc.id;
                if (tc.function?.name) toolCallBuffers[idx].name += tc.function.name;
                if (typeof tc.function?.arguments === "string") {
                  toolCallBuffers[idx].arguments += tc.function.arguments;
                }
              }
            }
          }

          const toolCalls = Object.keys(toolCallBuffers)
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .map((idx) => toolCallBuffers[idx]);

          if (toolCalls.length > 0) {
            // Record the assistant tool-call message in history so tool results
            // can link back to it.
            messages.push({
              role: "assistant",
              content: textBuffer || null,
              tool_calls: toolCalls.map((t) => ({
                id: t.id || `call_${Math.random().toString(36).slice(2, 10)}`,
                type: "function" as const,
                function: { name: t.name, arguments: t.arguments },
              })),
            } as any);

            for (const t of toolCalls) {
              let args: any = {};
              try {
                args = t.arguments ? JSON.parse(t.arguments) : {};
              } catch {
                args = {};
              }
              sseWrite(res, "tool_call", { name: t.name, args });

              const handler = toolHandlers[t.name];
              let result: any;
              if (!handler) {
                result = { error: `Unknown tool ${t.name}` };
              } else {
                try {
                  result = await handler(args, toolCtx);
                } catch (err: any) {
                  result = { error: err?.message || String(err) };
                }
              }
              const serialized = JSON.stringify(result);
              const preview =
                serialized.length > 200 ? serialized.slice(0, 200) + "…" : serialized;
              toolLog.push({ name: t.name, args, resultPreview: preview });
              sseWrite(res, "tool_result", { name: t.name, resultPreview: preview });

              messages.push({
                role: "tool",
                tool_call_id: t.id || "",
                content:
                  serialized.length > 12000
                    ? serialized.slice(0, 12000) + "…(truncated)"
                    : serialized,
              });
            }
          } else {
            // Pure-text response — we already streamed chunks above.
            finished = true;
          }
        }

        if (!finished && !clientClosed) {
          sseWrite(res, "chunk", {
            text: "\n\n(stopped — ran out of tool rounds)",
          });
        }

        sseWrite(res, "done", { provider: provider.label, toolCalls: toolLog });
        res.end();
        return;
      } catch (err: any) {
        console.warn(`[chat-agent stream] provider ${provider.label} failed:`, err?.message || err);
        // try next provider
      }
    }

    sseWrite(res, "error", { message: "All LLM providers failed" });
    res.end();
  } catch (err: any) {
    console.error("[chat-agent stream] fatal:", err);
    sseWrite(res, "error", { message: err?.message || "Chat agent error" });
    res.end();
  }
});

router.get("/status", (_req, res) => {
  res.json({
    available: providers.length > 0,
    providers: providers.map((p) => p.label),
    toolCount: toolDefs.length,
  });
});

export default router;
