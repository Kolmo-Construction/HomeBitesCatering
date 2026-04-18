import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./db";
import { and, eq, gte, ilike, isNull, asc } from "drizzle-orm";
import {
  events,
  menus,
  menuItems,
  baseIngredients,
  recipes,
  recipeComponents,
  clients,
  insertMenuItemSchema,
  insertMenuSchema,
  insertBaseIngredientSchema,
} from "@shared/schema";

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
];

// ============================================================================
// Tool handlers
// ============================================================================

type ToolHandler = (args: any) => Promise<any>;

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
      note: "Quantities are in recipe units. Pricing reflects per-purchase-unit cost — conversion between recipe and purchase units may require unit conversion factors.",
    };
  },
};

// ============================================================================
// Route handler
// ============================================================================

const SYSTEM_PROMPT = `You are HomeBites Kitchen Assistant, a helpful AI for the chef at a catering company.
You help the chef look up events, menus, menu items, ingredients, and recipes, and you can create new menus, menu items, and base ingredients when asked.

Rules:
- Always call the appropriate tool to fetch live data; do not invent prices, ids, or dates.
- Keep answers short and scannable. Use bullet lists or compact tables.
- When listing events, format dates human-readably (e.g. "Sat Apr 25, 5:30 PM").
- Money values are dollars unless otherwise noted.
- For create_* operations, confirm what you just created and include its id.
- If a tool returns an error, tell the chef plainly and suggest the next step.
- If the user's request is ambiguous (e.g. "create a menu" with no name), ask one clarifying question instead of guessing.`;

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
  };

  if (!schema || (!schema.message && !schema.messages)) {
    return res.status(400).json({ error: "message or messages required" });
  }

  // Build the conversation
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
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
                  result = await handler(args);
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

router.get("/status", (_req, res) => {
  res.json({
    available: providers.length > 0,
    providers: providers.map((p) => p.label),
    toolCount: toolDefs.length,
  });
});

export default router;
