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
  // Catalog tables — agent edits prices here
  appetizerCategories,
  appetizerItems,
  dessertItems,
  equipmentCategories,
  equipmentItemsTable,
  pricingConfig,
  // Tables the action tools write to / read from
  opportunities,
  communications,
  quotes,
  contracts,
  // Chat brain v2 — persistent thread + long-term chef memory
  chatMessages,
  chefMemory,
  // Raw lead intake (pre-inquiry)
  rawLeads,
} from "@shared/schema";
import { desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { sendEmail, sendEmailInBackground } from "./utils/email";
import { quoteSentEmail, contractSentCustomerEmail } from "./utils/emailTemplates";
import { calculateShoppingListForInquiry } from "./utils/shoppingList";
import { getRecipeCostBreakdown } from "./utils/menuMargin";
import { storage } from "./storage";
import {
  generateContractHtml,
  sendContractForSignature,
} from "./services/contractService";
import { getDepositPercent, getSiteConfig } from "./utils/siteConfig";
import { tastings, promoCodes } from "@shared/schema";

// Gate: pricing writes require admin role. Chef/user accounts can still read
// via list_catalog_items and get_pricing_config.
async function requireAdmin(userId: number | undefined): Promise<string | null> {
  if (!userId) return "Not authenticated.";
  const user = await storage.getUser(userId);
  if (!user) return "User not found.";
  if (user.role !== "admin") {
    return `Only admin users can change pricing. Your role is "${user.role}". Ask Mike to make the change.`;
  }
  return null;
}

// Primary: Gemini 2.0 Flash via Google's OpenAI-compatible endpoint (supports
// tool/function calling). Fallback chain: DeepSeek native → OpenRouter DeepSeek.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = "gemini-2.0-flash";
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

const geminiKey =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_AI_API_KEY?.trim() ||
  null;
const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() || readDeepseekKeyFile();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || null;

type ProviderConfig = { client: OpenAI; model: string; label: string };
const providers: ProviderConfig[] = [];
if (geminiKey) {
  providers.push({
    client: new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL }),
    model: GEMINI_MODEL,
    label: "gemini-2.0-flash",
  });
}
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
      name: "list_capabilities",
      description:
        "Return the full menu of what the agent can help with, grouped by topic (events, menu/recipes, ingredients, inquiries, catalog/pricing, follow-ups). Use this whenever the user asks things like 'what can you do', 'help', 'what can you help me with', 'capabilities', 'commands', 'menu', or any similar discovery question. Always call this tool rather than listing capabilities from memory — the list may have grown.",
      parameters: { type: "object", properties: {} },
    },
  },
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
  // ---- Catalog & pricing config ----
  {
    type: "function",
    function: {
      name: "list_catalog_items",
      description:
        "List all appetizer / dessert / equipment items with current prices. Use this before update_catalog_item_price to find the correct type+id for an item by name. Returns {type, id, name, category, priceDollars, unit, isActive}.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description:
              "Filter by catalog type: 'appetizer', 'dessert', or 'equipment'. Omit to return all.",
          },
          search: {
            type: "string",
            description:
              "Case-insensitive substring match on item name (e.g. 'lobster' matches 'Lobster Rolls').",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_catalog_item_price",
      description:
        "Change the price of a single appetizer / dessert / equipment item. Call list_catalog_items first to look up the id by name. Prices are in dollars (e.g. 6.50 for $6.50). Takes effect within 1 minute (cache TTL).",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["appetizer", "dessert", "equipment"],
          },
          id: { type: "number" },
          priceDollars: { type: "number", description: "New price in dollars, e.g. 6.50" },
        },
        required: ["type", "id", "priceDollars"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pricing_config",
      description:
        "Read the current pricing configuration (bartending rates, per-person add-ons, service-fee tiers, tax rate). Returns human-readable dollars/percentages.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_pricing_config",
      description:
        "Change one or more pricing-config rates. Pass only the fields you want to change. Dollar values (e.g. wetHirePerHour) are in dollars; percent values (e.g. taxRate, serviceFeeFullService) are in whole percent (20 for 20%); multipliers are decimals (1.5 for 1.5×). Takes effect within 1 minute (cache TTL).",
      parameters: {
        type: "object",
        properties: {
          wetHirePerHour: { type: "number", description: "Wet-hire bar rate in $/pp/hr" },
          dryHirePerHour: { type: "number", description: "Dry-hire bar rate in $/pp/hr" },
          liquorMultiplierWell: { type: "number", description: "e.g. 1.0" },
          liquorMultiplierMidShelf: { type: "number", description: "e.g. 1.25" },
          liquorMultiplierTopShelf: { type: "number", description: "e.g. 1.5" },
          nonAlcoholicPackage: { type: "number", description: "Non-alcoholic package $/pp" },
          coffeeTeaService: { type: "number", description: "Coffee/tea service $/pp" },
          tableWaterService: { type: "number", description: "Table water $/pp" },
          serviceFeeDropOff: { type: "number", description: "Drop-off service fee % (e.g. 0)" },
          serviceFeeStandard: { type: "number", description: "Standard buffet service fee % (e.g. 15)" },
          serviceFeeFullServiceNoSetup: { type: "number", description: "Full-service-no-setup % (e.g. 17.5)" },
          serviceFeeFullService: { type: "number", description: "Full-service % (e.g. 20)" },
          taxRate: { type: "number", description: "Tax rate % (e.g. 10.25)" },
          childDiscount: { type: "number", description: "Child-under-10 food discount % (e.g. 50 for half price)" },
        },
      },
    },
  },
  // ═══════════════════════════════════════════════════════════════════════
  // Lifecycle action tools — the agent can DO things, not just read them.
  // Most of these are multi-click workflows in the admin UI today.
  // ═══════════════════════════════════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "update_event",
      description:
        "Patch fields on an event. Use for 'bump guest count to 125', 'change event 47 date to Sat Sept 12', 'mark event in progress', 'add note about gluten-free table', 'update venue to The Sanctuary'. Accepts any subset of fields. Dates accepted as ISO-8601.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "number", description: "events.id" },
          status: { type: "string", enum: ["confirmed", "in_progress", "completed", "cancelled"] },
          eventDate: { type: "string", description: "ISO date (YYYY-MM-DD or full ISO)" },
          startTime: { type: "string", description: "ISO datetime" },
          endTime: { type: "string", description: "ISO datetime" },
          guestCount: { type: "number" },
          venue: { type: "string" },
          notes: { type: "string" },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_event_completed",
      description:
        "Flip an event to status=completed and stamp completedAt. Use for 'mark the Smith wedding done' or 'close out event 47'. Downstream cron then fires the review-request email. Destructive-ish — ask the chef to confirm for cancelled/future events.",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "number" },
        },
        required: ["eventId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_opportunity_status",
      description:
        "Move an opportunity through the pipeline (new, qualified, quoted, booked, lost, won, paused). Use for 'mark opp 23 booked', 'move the Johnson opp to qualified', 'this one's a loss'.",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "number" },
          status: {
            type: "string",
            enum: ["new", "qualified", "quoted", "booked", "won", "lost", "paused"],
          },
          reason: { type: "string", description: "Optional note appended to opportunity.notes" },
        },
        required: ["opportunityId", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pause_opportunity_drip",
      description:
        "Stop scheduled drip follow-ups for an opportunity. Use when the customer asked for time, went silent intentionally, or booked through another channel.",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "number" },
          reason: { type: "string", description: "Free-text reason (e.g. 'customer on vacation')" },
        },
        required: ["opportunityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resume_opportunity_drip",
      description:
        "Re-enable drip follow-ups on an opportunity that was previously paused.",
      parameters: {
        type: "object",
        properties: {
          opportunityId: { type: "number" },
        },
        required: ["opportunityId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_communication",
      description:
        "Record a phone call, SMS, email, or in-person chat on a client's / opportunity's / event's timeline. Use after Mike says 'called Sarah, she wants Sept 12' or 'texted the Smiths about the cake'. Does NOT send anything — just logs what already happened.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "number" },
          opportunityId: { type: "number" },
          eventId: { type: "number" },
          type: { type: "string", enum: ["call", "sms", "email", "in_person", "note"], description: "Default: note" },
          direction: { type: "string", enum: ["incoming", "outgoing", "internal"], description: "Default: outgoing" },
          subject: { type: "string" },
          body: { type: "string", description: "What happened — one or two sentences is fine" },
        },
        required: ["body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_quote_to_customer",
      description:
        "Mark a draft quote as sent, generate its public viewToken if missing, and email the link to the customer using the quote_sent template. Use when Mike says 'send quote 42 to the customer' — only call this for quotes currently in 'draft' status.",
      parameters: {
        type: "object",
        properties: {
          quoteId: { type: "number" },
        },
        required: ["quoteId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_contract",
      description:
        "Ensure a contract exists for an accepted quote, then trigger the BoldSign send. Use when Mike says 'send the contract for quote 42' after a customer accepted.",
      parameters: {
        type: "object",
        properties: {
          quoteId: { type: "number" },
        },
        required: ["quoteId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "promote_inquiry_to_opportunity",
      description:
        "For inquiries where auto-quote skipped (custom menu, high complexity, weird guest count, etc.), create the client + opportunity rows so Mike can draft a quote from the pipeline. Does NOT draft a quote itself — use create_quote_from_inquiry for that.",
      parameters: {
        type: "object",
        properties: {
          inquiryId: { type: "number" },
        },
        required: ["inquiryId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quote_from_inquiry",
      description:
        "Build a draft quote from an existing inquiry, bypassing the auto-quote AI gates. Use when Mike wants a draft for a custom/complex/large event the auto-quote skipped. Creates the client + opportunity if not already present. Quote is created in 'draft' status — Mike reviews then calls send_quote_to_customer.",
      parameters: {
        type: "object",
        properties: {
          inquiryId: { type: "number" },
          menuTheme: { type: "string", description: "Override the inquiry's menuTheme if needed" },
          menuTier: { type: "string", description: "Override tier (bronze/silver/gold/diamond)" },
        },
        required: ["inquiryId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_full_history",
      description:
        "Return all touchpoints for one client: inquiries, opportunities, quotes, events, communications — sorted by time. One prompt to replace 6+ page visits. Use for 'what have we done with Sarah Johnson?' or 'walk me through the Smith file'.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "number" },
          email: { type: "string", description: "Alternative lookup if clientId unknown" },
        },
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Raw-lead → inquiry conversion (the missing link before create_quote_from_inquiry)
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "convert_raw_lead_to_inquiry",
      description:
        "Promote a raw lead (an email/form intake that hasn't been qualified yet) into a structured inquiry that can be quoted. Idempotent — if this raw lead has already been promoted, returns the existing inquiry. Use this when the chef is on a /raw-leads/:id page and asks to draft a quote, or says 'convert this lead' / 'promote this'. After conversion, immediately call create_quote_from_inquiry with the returned inquiry.id to draft the quote in one go.",
      parameters: {
        type: "object",
        properties: {
          rawLeadId: { type: "number", description: "Id of the raw lead to promote." },
        },
        required: ["rawLeadId"],
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Reporting / analytics — the chef's "how are we doing?" panel
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "get_funnel_report",
      description:
        "Funnel snapshot: counts of opportunities by status, quotes by status, and events by status — current month + last month for comparison. Use for 'how's the pipeline looking', 'what's our funnel', 'show me this month vs last'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_revenue_summary",
      description:
        "Booked revenue (sum of accepted-quote totals, in dollars) over a period. Defaults to YTD. Use for 'how much have we booked', 'revenue this month', 'YTD numbers'.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["month", "quarter", "ytd", "all"],
            description: "Defaults to 'ytd'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_health",
      description:
        "Find deals that are stuck — open opportunities with no progress in N days, plus quotes that were sent but not viewed/accepted. Use for 'what's stalled', 'who haven't I followed up with', 'where are we leaving money on the table'.",
      parameters: {
        type: "object",
        properties: {
          stalledDays: { type: "number", description: "Days since last update to count as stalled. Default 14." },
        },
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Tastings — admin booking & lifecycle (no UI endpoint exists for these)
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "list_tastings",
      description:
        "List tastings, filterable by status and date window. Use for 'do we have tastings booked', 'who's coming in this week', 'show me upcoming tastings'.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "array",
            items: { type: "string", enum: ["scheduled", "completed", "cancelled", "no_show"] },
          },
          fromDate: { type: "string", description: "ISO date — only tastings on/after this date." },
          toDate: { type: "string", description: "ISO date — only tastings on/before this date." },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasting",
      description: "Full details for one tasting (contact info, payment, links).",
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
      name: "create_tasting",
      description:
        "Manually book a tasting (bypasses Cal.com / public form). Use when the chef booked a tasting via phone/email and wants it on the books. NOTE: this won't create a Cal.com event — for online-bookable tastings the customer should use the public booking form.",
      parameters: {
        type: "object",
        properties: {
          scheduledAt: { type: "string", description: "ISO datetime, e.g. '2026-05-12T18:00:00'." },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          guestCount: { type: "number", description: "Default 2." },
          opportunityId: { type: "number" },
          clientId: { type: "number" },
          quoteId: { type: "number" },
          notes: { type: "string" },
          totalPriceCents: { type: "number", description: "Default 12500 ($125)." },
        },
        required: ["scheduledAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_tasting",
      description:
        "Move a tasting to a new datetime. CAVEAT: if the tasting was booked via Cal.com (calBookingId set), this won't update the Cal.com event — only the agent's record. Tell the chef so they can update Cal.com manually.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          scheduledAt: { type: "string", description: "New ISO datetime." },
        },
        required: ["id", "scheduledAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_tasting",
      description:
        "Mark a tasting cancelled (or no_show after the fact). CAVEAT: doesn't cancel the Cal.com event if one is linked.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          reason: { type: "string" },
          status: { type: "string", enum: ["cancelled", "no_show"], description: "Default 'cancelled'." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_tasting_conflicts",
      description:
        "Check whether any other tasting is already scheduled in a window around a given datetime (default ±90 minutes). Use before creating or rescheduling.",
      parameters: {
        type: "object",
        properties: {
          scheduledAt: { type: "string", description: "ISO datetime to check around." },
          windowMinutes: { type: "number", description: "Default 90." },
        },
        required: ["scheduledAt"],
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Generic email send — not just quote/contract templates
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "send_customer_email",
      description:
        "Send a free-form email to a customer (any address). Auto-logs to the timeline. Use for venue coordination, follow-ups outside the quote/contract flow, or 'just email Sarah and ask if she's still interested'. Provide html (or text) and ideally clientId/opportunityId so it threads to the right record.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address." },
          subject: { type: "string" },
          html: { type: "string", description: "HTML body. If only `text` is provided, it'll be wrapped in <pre>." },
          text: { type: "string", description: "Plain-text body (used if html omitted)." },
          opportunityId: { type: "number" },
          clientId: { type: "number" },
        },
        required: ["to", "subject"],
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Promo codes
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "list_promo_codes",
      description: "Show all promo codes (with usage + validity).",
      parameters: {
        type: "object",
        properties: {
          activeOnly: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_promo_code",
      description:
        "Mint a new promo code. Code is uppercased and must be unique. Use for 'create a 10% referral code', 'spin up a holiday discount'.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Uppercased automatically." },
          discountPercent: { type: "number", description: "0–100." },
          description: { type: "string" },
          maxUses: { type: "number" },
          validFrom: { type: "string", description: "ISO date." },
          validUntil: { type: "string", description: "ISO date." },
        },
        required: ["code", "discountPercent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_promo_code_to_inquiry",
      description:
        "Attach a promo code to an inquiry (snapshots the discount % so it survives even if the code changes later).",
      parameters: {
        type: "object",
        properties: {
          inquiryId: { type: "number" },
          code: { type: "string", description: "Code (case-insensitive); will resolve to id." },
        },
        required: ["inquiryId", "code"],
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Quote update — narrow safe surface
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "update_quote",
      description:
        "Update internal-only fields on a quote (notes for now). Pricing, line items, totals, sent/accepted timestamps are NOT editable here — those need the admin UI to keep audit + customer-facing state correct.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          notes: { type: "string", description: "Internal notes (not shown to the customer)." },
        },
        required: ["id"],
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Unmatched communications inbox
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "list_unmatched_communications",
      description:
        "List incoming emails/SMS/etc that couldn't be auto-matched to a client or opportunity. Use for 'anything new in unmatched', 'who came in that we don't know'.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Long-term chef brain — facts the agent learned across sessions.
  // ---------------------------------------------------------------------------
  {
    type: "function",
    function: {
      name: "remember_fact",
      description:
        "Save a long-term fact about the chef, a client, a supplier, an ingredient, a recurring event, or a workflow preference — anything that should survive across sessions. Use proactively whenever the chef tells you something that will matter later (e.g. 'Sarah is allergic to nuts', 'we always under-order rice for groups over 50', 'Costco has been short on lamb the last 3 weeks'). Don't ask for permission — just save it and mention it briefly. Topics: client:<slug>, supplier:<name>, ingredient:<name>, recipe:<id>, ops, preference, schedule.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Bucket for recall, e.g. 'client:sarah-johnson', 'supplier:costco', 'ingredient:lamb', 'preference', 'ops'.",
          },
          fact: { type: "string", description: "Short, specific, useful sentence." },
          ref: {
            type: "object",
            description:
              "Optional structured pointer like {clientId: 12} or {recipeId: 47} so the fact surfaces when that entity is in view.",
          },
        },
        required: ["topic", "fact"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_facts",
      description:
        "Pull stored facts from the chef brain. Filter by topic prefix (e.g. 'client:' for all client facts), free-text search, or a structured ref. Use BEFORE answering questions about people, suppliers, recurring events, or preferences — anything where the chef expects you to remember.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Exact or prefix match (e.g. 'client:sarah-johnson' or 'client:')." },
          query: { type: "string", description: "Free-text substring on the fact body." },
          ref: { type: "object", description: "Match facts whose ref contains these keys/values." },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_facts",
      description:
        "Show the chef everything I currently remember (most-recently-used first). Use when they ask 'what do you remember', 'what do you know about X', or want to audit the brain.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget_fact",
      description:
        "Delete a stored fact by id. Use when the chef says it's wrong or no longer applies.",
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

interface ToolContext {
  userId: number;
}
type ToolHandler = (args: any, ctx?: ToolContext) => Promise<any>;

const toolHandlers: Record<string, ToolHandler> = {
  async list_capabilities() {
    return {
      intro:
        "Here's what I can help with. Ask me in plain English — you don't need to know the tool names.",
      topics: [
        {
          name: "Events & schedule",
          examples: [
            "what's on the schedule today?",
            "show me upcoming events",
            "what's happening this week?",
            "tell me about event 42",
            "what's the shopping list for the Smith wedding?",
            "give me the prep sheet for Friday's event",
          ],
        },
        {
          name: "Menus & recipes",
          examples: [
            "list our menus",
            "show me the Gold Taco Fiesta package",
            "find all recipes with chicken",
            "show me the recipe for Greek lemon potatoes",
            "what's in the Charcuterie grazing board?",
            "create a new menu called 'Summer Barbecue 2026'",
          ],
        },
        {
          name: "Base ingredients",
          examples: [
            "search ingredients for 'saffron'",
            "what's our cost on olive oil?",
            "which recipes use feta?",
            "add a new base ingredient (you'll need category, price, unit)",
          ],
        },
        {
          name: "Catalog & pricing (admin only for edits)",
          examples: [
            "show me the current tax rate",
            "what do we charge for wet-bar?",
            "find lobster rolls in the catalog",
            "change lobster rolls to $6.50",
            "set the top-shelf multiplier to 1.4",
            "raise the tax rate to 10.5%",
          ],
          note: "Reading catalog and pricing is open to anyone logged in. Changes require admin role.",
        },
        {
          name: "Follow-ups inbox",
          examples: [
            "what's in my follow-up inbox?",
            "draft a reply for item X",
            "mark item Y as handled",
          ],
        },
        {
          name: "Pipeline actions (update in one sentence)",
          examples: [
            "bump event 47's guest count to 125",
            "change event 47's date to Saturday Sept 12",
            "mark the Smith wedding as completed",
            "move opp 23 to booked — quote accepted verbally",
            "pause drip on opp 41 (customer's on vacation)",
            "log a call with Sarah — she confirmed Sept 12 for tasting",
            "send quote 42 to the customer",
            "promote inquiry 58 to an opportunity",
            "draft a quote for inquiry 58 at Silver Italian",
            "walk me through Sarah Johnson's full history",
          ],
        },
      ],
      tips: [
        "I have access to today's date, the full calendar, menus, recipes, ingredients, inquiries, and pricing — just ask.",
        "I'll tell you when I can't do something (e.g. deleting items or changing a customer's contract).",
        "For changes I do make, I'll echo the before/after so you can spot typos.",
      ],
    };
  },

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

    // --- Impact preview: which recipes use this, and which active opps/quotes
    // ride on those recipes? Surfaced inline so the chef sees blast radius
    // without needing a follow-up tool call.
    const usageRows = await db
      .select({
        recipeId: recipes.id,
        recipeName: recipes.name,
        recipeCategory: recipes.category,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
      })
      .from(recipeComponents)
      .innerJoin(recipes, eq(recipeComponents.recipeId, recipes.id))
      .where(eq(recipeComponents.baseIngredientId, ingredientId))
      .orderBy(asc(recipes.name))
      .limit(50);

    // Active commercial exposure: open opportunities + draft/sent quotes.
    let activeOpps = 0;
    let activeQuotes = 0;
    try {
      const [oppCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(opportunities)
        .where(
          inArray(
            opportunities.status,
            ["new", "contacted", "qualified", "proposal"] as any,
          ),
        );
      activeOpps = oppCount?.n ?? 0;
      const [qCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(quotes)
        .where(inArray(quotes.status, ["draft", "sent", "viewed"] as any));
      activeQuotes = qCount?.n ?? 0;
    } catch {
      // If status enums shift, leave counts at 0 rather than fail the price write.
    }

    const [updated] = await db
      .update(baseIngredients)
      .set({
        previousPurchasePrice: existing.currentPrice,
        purchasePrice: price.toFixed(2) as any,
        updatedAt: new Date(),
      })
      .where(eq(baseIngredients.id, ingredientId))
      .returning();

    const oldP = Number(existing.currentPrice ?? 0);
    const newP = Number(updated.purchasePrice ?? 0);
    const pctChange = oldP > 0 ? ((newP - oldP) / oldP) * 100 : null;

    return {
      id: updated.id,
      name: updated.name,
      oldPrice: existing.currentPrice,
      newPrice: updated.purchasePrice,
      changePct: pctChange != null ? Number(pctChange.toFixed(1)) : null,
      impact: {
        recipesAffected: usageRows.length,
        recipes: usageRows.slice(0, 20).map((r) => ({
          id: r.recipeId,
          name: r.recipeName,
          category: r.recipeCategory,
          usesPerBatch: `${r.quantity} ${r.unit}`,
          link: `/recipes/${r.recipeId}`,
        })),
        activeOpportunities: activeOpps,
        activeQuotes: activeQuotes,
        note:
          usageRows.length === 0
            ? "Not used in any recipe — no downstream impact."
            : `Updates ${usageRows.length} recipe${usageRows.length === 1 ? "" : "s"}; recompute costs on any active quotes you want repriced.`,
      },
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

  // ==========================================================================
  // Catalog & pricing-config handlers
  // ==========================================================================

  async list_catalog_items(args) {
    const type = (args?.type as string | undefined)?.toLowerCase();
    const search = ((args?.search as string | undefined) || "").toLowerCase().trim();
    const matches = (name: string) => !search || name.toLowerCase().includes(search);
    const out: any[] = [];

    if (!type || type === "appetizer") {
      const cats = await db.select().from(appetizerCategories);
      const catLabelById = new Map(cats.map((c) => [c.id, c.label]));
      const rows = await db.select().from(appetizerItems);
      for (const r of rows) {
        if (!matches(r.name)) continue;
        out.push({
          type: "appetizer",
          id: r.id,
          name: r.name,
          category: catLabelById.get(r.categoryId) || null,
          priceDollars: r.priceCents / 100,
          unit: r.unit,
          isActive: r.isActive,
        });
      }
    }
    if (!type || type === "dessert") {
      const rows = await db.select().from(dessertItems);
      for (const r of rows) {
        if (!matches(r.name)) continue;
        out.push({
          type: "dessert",
          id: r.id,
          name: r.name,
          category: null,
          priceDollars: r.priceCents / 100,
          unit: r.unit,
          isActive: r.isActive,
        });
      }
    }
    if (!type || type === "equipment") {
      const cats = await db.select().from(equipmentCategories);
      const catLabelById = new Map(cats.map((c) => [c.id, c.label]));
      const rows = await db.select().from(equipmentItemsTable);
      for (const r of rows) {
        if (!matches(r.name)) continue;
        out.push({
          type: "equipment",
          id: r.id,
          name: r.name,
          category: catLabelById.get(r.categoryId) || null,
          priceDollars: r.priceCents / 100,
          unit: r.unit,
          isActive: r.isActive,
        });
      }
    }
    return { count: out.length, items: out };
  },

  async update_catalog_item_price(args, ctx) {
    const authError = await requireAdmin(ctx?.userId);
    if (authError) return { error: authError };
    const type = String(args?.type || "").toLowerCase();
    const id = Number(args?.id);
    const priceDollars = Number(args?.priceDollars);
    if (!id || !Number.isFinite(priceDollars) || priceDollars < 0) {
      return { error: "type, id, and non-negative priceDollars are required." };
    }
    const priceCents = Math.round(priceDollars * 100);
    const now = new Date();
    let table: any;
    if (type === "appetizer") table = appetizerItems;
    else if (type === "dessert") table = dessertItems;
    else if (type === "equipment") table = equipmentItemsTable;
    else return { error: `Unknown type "${type}" — use appetizer / dessert / equipment.` };

    const rows = (await db
      .update(table)
      .set({ priceCents, updatedAt: now })
      .where(eq(table.id, id))
      .returning()) as any[];
    if (!rows[0]) return { error: `${type} item ${id} not found.` };
    return {
      ok: true,
      type,
      id: rows[0].id,
      name: rows[0].name,
      newPriceDollars: rows[0].priceCents / 100,
      note: "Propagates to the inquiry form and quote math within 1 minute.",
    };
  },

  async get_pricing_config() {
    const [row] = await db.select().from(pricingConfig).limit(1);
    if (!row) return { error: "Pricing config not seeded." };
    return {
      bartending: {
        wetHirePerHourDollars: row.wetHireRateCentsPerHour / 100,
        dryHirePerHourDollars: row.dryHireRateCentsPerHour / 100,
        liquorMultipliers: {
          well: row.liquorMultiplierWell / 100,
          midShelf: row.liquorMultiplierMidShelf / 100,
          topShelf: row.liquorMultiplierTopShelf / 100,
        },
      },
      perPersonAddOns: {
        nonAlcoholicPackageDollars: row.nonAlcoholicPackageCents / 100,
        coffeeTeaServiceDollars: row.coffeeTeaServiceCents / 100,
        tableWaterServiceDollars: row.tableWaterServiceCents / 100,
        // Glassware is priced per-item via the Equipment catalog now (beer,
        // wine, cocktail, flutes, etc.). Flat $/pp glassware was removed.
      },
      serviceFeesPercent: {
        dropOff: row.serviceFeeDropOffBps / 100,
        standard: row.serviceFeeStandardBps / 100,
        fullServiceNoSetup: row.serviceFeeFullServiceNoSetupBps / 100,
        fullService: row.serviceFeeFullServiceBps / 100,
      },
      taxRatePercent: row.taxRateBps / 100,
      childDiscountPercent: row.childDiscountBps / 100,
    };
  },

  async update_pricing_config(args, ctx) {
    const authError = await requireAdmin(ctx?.userId);
    if (authError) return { error: authError };
    const patch: Record<string, number> = {};
    const setDollars = (field: string, key: string) => {
      if (args?.[key] !== undefined && Number.isFinite(Number(args[key]))) {
        patch[field] = Math.round(Number(args[key]) * 100);
      }
    };
    const setMultiplier = (field: string, key: string) => {
      if (args?.[key] !== undefined && Number.isFinite(Number(args[key]))) {
        patch[field] = Math.round(Number(args[key]) * 100);
      }
    };
    const setPercent = (field: string, key: string) => {
      if (args?.[key] !== undefined && Number.isFinite(Number(args[key]))) {
        patch[field] = Math.round(Number(args[key]) * 100);
      }
    };
    setDollars("wetHireRateCentsPerHour", "wetHirePerHour");
    setDollars("dryHireRateCentsPerHour", "dryHirePerHour");
    setMultiplier("liquorMultiplierWell", "liquorMultiplierWell");
    setMultiplier("liquorMultiplierMidShelf", "liquorMultiplierMidShelf");
    setMultiplier("liquorMultiplierTopShelf", "liquorMultiplierTopShelf");
    setDollars("nonAlcoholicPackageCents", "nonAlcoholicPackage");
    setDollars("coffeeTeaServiceCents", "coffeeTeaService");
    setDollars("tableWaterServiceCents", "tableWaterService");
    setPercent("serviceFeeDropOffBps", "serviceFeeDropOff");
    setPercent("serviceFeeStandardBps", "serviceFeeStandard");
    setPercent("serviceFeeFullServiceNoSetupBps", "serviceFeeFullServiceNoSetup");
    setPercent("serviceFeeFullServiceBps", "serviceFeeFullService");
    setPercent("taxRateBps", "taxRate");
    setPercent("childDiscountBps", "childDiscount");

    if (Object.keys(patch).length === 0) {
      return { error: "No valid fields provided." };
    }
    const [existing] = await db.select().from(pricingConfig).limit(1);
    if (!existing) {
      const rows = (await db.insert(pricingConfig).values(patch as any).returning()) as any[];
      return { ok: true, created: true, updated: Object.keys(patch), row: rows[0] };
    }
    const rows = (await db
      .update(pricingConfig)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(pricingConfig.id, existing.id))
      .returning()) as any[];
    return {
      ok: true,
      updated: Object.keys(patch),
      note: "Propagates to the quote math within 1 minute.",
      row: rows[0],
    };
  },

  // ==========================================================================
  // Lifecycle action handlers
  // ==========================================================================

  async update_event(args, _ctx) {
    const id = Number(args?.eventId);
    if (!Number.isFinite(id)) return { error: "eventId required." };
    const patch: Record<string, any> = {};
    const copy = (k: string) => {
      if (args?.[k] !== undefined && args?.[k] !== null && args?.[k] !== "") {
        patch[k] = args[k];
      }
    };
    copy("status"); copy("venue"); copy("notes");
    if (typeof args?.guestCount === "number") patch.guestCount = args.guestCount;
    if (args?.eventDate) patch.eventDate = new Date(args.eventDate);
    if (args?.startTime) patch.startTime = new Date(args.startTime);
    if (args?.endTime) patch.endTime = new Date(args.endTime);
    if (Object.keys(patch).length === 0) return { error: "No fields provided to update." };
    const updated = await storage.updateEvent(id, patch as any);
    if (!updated) return { error: `Event ${id} not found.` };
    return {
      ok: true,
      id: updated.id,
      updated: Object.keys(patch),
      message: `Event #${id} updated: ${Object.keys(patch).join(", ")}.`,
      link: `/events/${id}`,
    };
  },

  async mark_event_completed(args, _ctx) {
    const id = Number(args?.eventId);
    if (!Number.isFinite(id)) return { error: "eventId required." };
    const [current] = await db.select().from(events).where(eq(events.id, id));
    if (!current) return { error: `Event ${id} not found.` };
    if (current.status === "completed") {
      return { ok: true, id, message: "Event was already marked completed." };
    }
    const now = new Date();
    const updated = await storage.updateEvent(id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    } as any);
    return {
      ok: true,
      id,
      message: `Event #${id} marked completed. Review-request email will fire via cron on the day after the event.`,
      link: `/events/${id}`,
    };
  },

  async update_opportunity_status(args, _ctx) {
    const id = Number(args?.opportunityId);
    const status = String(args?.status || "").trim();
    if (!Number.isFinite(id)) return { error: "opportunityId required." };
    if (!status) return { error: "status required." };
    const [existing] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id));
    if (!existing) return { error: `Opportunity ${id} not found.` };
    const now = new Date();
    const newNotes = args?.reason
      ? [existing.notes, `[${now.toISOString().slice(0, 10)}] Status → ${status}: ${args.reason}`]
          .filter(Boolean)
          .join("\n")
      : existing.notes;
    const [updated] = await db
      .update(opportunities)
      .set({
        status: status as any,
        statusChangedAt: now,
        updatedAt: now,
        ...(newNotes !== existing.notes ? { notes: newNotes } : {}),
      })
      .where(eq(opportunities.id, id))
      .returning();
    return {
      ok: true,
      id: updated.id,
      previousStatus: existing.status,
      status: updated.status,
      link: `/opportunities/${id}`,
    };
  },

  async pause_opportunity_drip(args, _ctx) {
    const id = Number(args?.opportunityId);
    if (!Number.isFinite(id)) return { error: "opportunityId required." };
    const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    if (!opp) return { error: `Opportunity ${id} not found.` };
    if (opp.followUpSequencePausedAt) {
      return { ok: true, id, message: `Drip was already paused for opp #${id}.` };
    }
    const now = new Date();
    await db
      .update(opportunities)
      .set({ followUpSequencePausedAt: now, updatedAt: now })
      .where(eq(opportunities.id, id));
    return {
      ok: true,
      id,
      reason: args?.reason ?? null,
      message: `Drip paused for opp #${id}.`,
      link: `/opportunities/${id}`,
    };
  },

  async resume_opportunity_drip(args, _ctx) {
    const id = Number(args?.opportunityId);
    if (!Number.isFinite(id)) return { error: "opportunityId required." };
    const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    if (!opp) return { error: `Opportunity ${id} not found.` };
    const now = new Date();
    await db
      .update(opportunities)
      .set({ followUpSequencePausedAt: null, updatedAt: now })
      .where(eq(opportunities.id, id));
    return {
      ok: true,
      id,
      message: `Drip resumed for opp #${id}.`,
      link: `/opportunities/${id}`,
    };
  },

  async log_communication(args, _ctx) {
    const body = String(args?.body || "").trim();
    if (!body) return { error: "body required." };
    const hasAnchor =
      args?.clientId || args?.opportunityId || args?.eventId;
    if (!hasAnchor) {
      return { error: "Provide clientId, opportunityId, or eventId to anchor the log." };
    }
    const now = new Date();
    const [row] = await db
      .insert(communications)
      .values({
        clientId: args?.clientId ?? null,
        opportunityId: args?.opportunityId ?? null,
        eventId: args?.eventId ?? null,
        type: args?.type || "note",
        direction: args?.direction || "outgoing",
        source: "chat_agent",
        timestamp: now,
        subject: (args?.subject ? String(args.subject) : null) as any,
        bodyRaw: body,
        bodySummary: body.slice(0, 280),
        metaData: { loggedViaAgent: true },
      } as any)
      .returning({ id: communications.id });
    return {
      ok: true,
      id: row?.id,
      message: `Logged ${args?.type || "note"} on the timeline.`,
    };
  },

  async send_quote_to_customer(args, _ctx) {
    const id = Number(args?.quoteId);
    if (!Number.isFinite(id)) return { error: "quoteId required." };
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    if (!quote) return { error: `Quote ${id} not found.` };
    if (quote.status !== "draft") {
      return {
        error: `Quote ${id} is in '${quote.status}' — only draft quotes can be sent. Tell Mike to check the quote page.`,
      };
    }
    const now = new Date();
    const viewToken = quote.viewToken || randomBytes(24).toString("base64url");
    const [updated] = await db
      .update(quotes)
      .set({
        status: "sent",
        sentAt: quote.sentAt ?? now,
        viewToken,
        updatedAt: now,
      })
      .where(eq(quotes.id, id))
      .returning();
    const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
    const baseUrl =
      process.env.HOMEBITES_PUBLIC_BASE_URL ||
      "https://homebitescatering-production.up.railway.app";
    const publicUrl = `${baseUrl}/quote/${viewToken}`;
    let emailSent = false;
    if (client?.email) {
      const template = quoteSentEmail({
        customerFirstName: client.firstName || "there",
        eventType: quote.eventType,
        eventDate: quote.eventDate,
        guestCount: quote.guestCount,
        publicQuoteUrl: publicUrl,
      });
      const result = await sendEmail({
        to: client.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        clientId: client.id,
        templateKey: "quote_sent",
      });
      emailSent = result.sent;
    }
    return {
      ok: true,
      id: updated.id,
      publicUrl,
      emailSent,
      emailRecipient: client?.email || null,
      message: emailSent
        ? `Quote #${id} sent to ${client?.email}.`
        : `Quote #${id} marked sent. Email was not delivered (no client email on file or email provider not configured).`,
      link: `/quotes/${id}`,
    };
  },

  async send_contract(args, _ctx) {
    const id = Number(args?.quoteId);
    if (!Number.isFinite(id)) return { error: "quoteId required." };
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    if (!quote) return { error: `Quote ${id} not found.` };
    if (quote.status !== "accepted") {
      return {
        error: `Quote ${id} hasn't been accepted yet (status='${quote.status}'). Contracts only go out after acceptance.`,
      };
    }
    const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
    if (!client?.email) return { error: `Client for quote ${id} has no email on file.` };

    // 1. Ensure (or create) the contract row.
    let [existing] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.quoteId, id));
    if (!existing) {
      const [ev] = await db.select().from(events).where(eq(events.quoteId, id));
      const [inserted] = await db
        .insert(contracts)
        .values({
          clientId: client.id,
          quoteId: quote.id,
          eventId: ev?.id ?? null,
          status: "draft",
          contractSnapshot: quote.proposal,
        } as any)
        .returning();
      existing = inserted;
    }
    if (existing.status === "sent" || existing.sentAt) {
      return {
        ok: true,
        id: existing.id,
        alreadySent: true,
        message: `Contract #${existing.id} was already sent for quote ${id}.`,
        link: `/quotes/${id}`,
      };
    }

    // 2. Generate HTML + send via BoldSign (or skip cleanly if unconfigured).
    const depositPercent = getDepositPercent();
    const html = generateContractHtml({
      clientName: `${client.firstName} ${client.lastName || ""}`.trim(),
      clientEmail: client.email,
      eventType: quote.eventType,
      eventDate: quote.eventDate,
      guestCount: quote.guestCount,
      venue: quote.venue,
      totalCents: quote.total,
      depositPercent,
      proposal: (quote.proposal as any) || null,
    });
    const site = getSiteConfig();
    const result = await sendContractForSignature({
      contractId: existing.id,
      title: `${site.businessName} — ${quote.eventType.replace(/_/g, " ")} Contract`,
      message: `Please review and sign your catering contract with ${site.businessName}.`,
      signerName: `${client.firstName} ${client.lastName || ""}`.trim() || "Client",
      signerEmail: client.email,
      documentHtml: html,
    });

    if (result.skipped) {
      await db
        .update(contracts)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(contracts.id, existing.id));
      return {
        ok: true,
        id: existing.id,
        skipped: true,
        message: `BOLDSIGN_API_KEY isn't set, so the contract was marked sent but no e-sign email went out. Configure BoldSign or send the HTML manually.`,
        link: `/quotes/${id}`,
      };
    }
    if (!result.sent) {
      return { error: result.error || "BoldSign send failed." };
    }

    await db
      .update(contracts)
      .set({
        status: "sent",
        sentAt: new Date(),
        providerDocId: result.providerDocId || null,
        signingUrl: result.signingUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(contracts.id, existing.id));

    // Customer-facing confirmation email (in addition to BoldSign's own).
    const tpl = contractSentCustomerEmail({
      customerFirstName: client.firstName || "there",
      eventType: quote.eventType,
      signingUrl: result.signingUrl ?? null,
    });
    sendEmailInBackground({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      clientId: client.id,
      opportunityId: quote.opportunityId,
      templateKey: "contract_sent_customer",
    });

    return {
      ok: true,
      id: existing.id,
      providerDocId: result.providerDocId,
      signingUrl: result.signingUrl,
      message: `Contract #${existing.id} sent to ${client.email} via BoldSign.`,
      link: `/quotes/${id}`,
    };
  },

  async promote_inquiry_to_opportunity(args, _ctx) {
    const id = Number(args?.inquiryId);
    if (!Number.isFinite(id)) return { error: "inquiryId required." };
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!inq) return { error: `Inquiry ${id} not found.` };
    if (inq.opportunityId) {
      return {
        ok: true,
        alreadyLinked: true,
        opportunityId: inq.opportunityId,
        message: `Inquiry already linked to opportunity #${inq.opportunityId}.`,
        link: `/opportunities/${inq.opportunityId}`,
      };
    }
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, inq.email), isNull(clients.deletedAt)))
      .limit(1);
    const billing: any = inq.billingAddress || {};
    const client =
      existingClient ??
      (
        await db
          .insert(clients)
          .values({
            firstName: inq.firstName,
            lastName: inq.lastName,
            email: inq.email,
            phone: inq.phone || undefined,
            company: inq.companyName || undefined,
            address: billing?.street || undefined,
            city: billing?.city || undefined,
            state: billing?.state || undefined,
            zip: billing?.zip || undefined,
            type: "prospect",
          })
          .returning()
      )[0];
    const [opp] = await db
      .insert(opportunities)
      .values({
        clientId: client.id,
        firstName: inq.firstName,
        lastName: inq.lastName,
        email: inq.email,
        phone: inq.phone || undefined,
        eventType: inq.eventType,
        eventDate: inq.eventDate,
        guestCount: inq.guestCount,
        venue: inq.venueName || undefined,
        notes: [
          inq.specialRequests,
          inq.menuTheme ? `Menu: ${inq.menuTheme} (${inq.menuTier ?? ""})` : null,
          `[Promoted from inquiry #${inq.id} via chat agent]`,
        ]
          .filter(Boolean)
          .join("\n"),
        status: "qualified",
        opportunitySource: inq.source || "website",
      } as any)
      .returning();
    await db
      .update(inquiries)
      .set({ opportunityId: opp.id, updatedAt: new Date() })
      .where(eq(inquiries.id, id));
    return {
      ok: true,
      clientId: client.id,
      opportunityId: opp.id,
      message: `Created opportunity #${opp.id} for ${inq.firstName} ${inq.lastName}.`,
      link: `/opportunities/${opp.id}`,
    };
  },

  async create_quote_from_inquiry(args, _ctx) {
    const id = Number(args?.inquiryId);
    if (!Number.isFinite(id)) return { error: "inquiryId required." };
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!inq) return { error: `Inquiry ${id} not found.` };
    if (inq.quoteId) {
      return {
        ok: true,
        alreadyDrafted: true,
        quoteId: inq.quoteId,
        message: `Inquiry already has quote #${inq.quoteId}.`,
        link: `/quotes/${inq.quoteId}`,
      };
    }
    // Ensure opportunity + client exist (reuse the promote logic inline).
    let clientId: number;
    let opportunityId: number;
    if (inq.opportunityId) {
      const [opp] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, inq.opportunityId));
      if (!opp) return { error: `Linked opportunity ${inq.opportunityId} missing.` };
      opportunityId = opp.id;
      clientId = opp.clientId!;
    } else {
      const promoted: any = await toolHandlers.promote_inquiry_to_opportunity(
        { inquiryId: id },
        _ctx,
      );
      if (promoted?.error) return promoted;
      clientId = promoted.clientId;
      opportunityId = promoted.opportunityId;
    }
    const menuTheme = args?.menuTheme || inq.menuTheme;
    const menuTier = args?.menuTier || inq.menuTier;
    const proposal: any = {
      firstName: inq.firstName,
      lastName: inq.lastName,
      eventType: inq.eventType,
      eventDate: inq.eventDate,
      guestCount: inq.guestCount,
      menuTheme,
      menuTier,
      serviceType: inq.serviceType,
      serviceStyle: inq.serviceStyle,
      specialRequests: inq.specialRequests,
    };
    const [draft] = await db
      .insert(quotes)
      .values({
        clientId,
        opportunityId,
        eventType: inq.eventType,
        eventDate: inq.eventDate,
        guestCount: inq.guestCount,
        venue: inq.venueName || null,
        menuTheme,
        menuTier,
        status: "draft",
        autoGenerated: false,
        proposal,
        subtotal: inq.estimatedSubtotalCents ?? 0,
        serviceFee: inq.estimatedServiceFeeCents ?? 0,
        tax: inq.estimatedTaxCents ?? 0,
        total: inq.estimatedTotalCents ?? 0,
        notes: `[Drafted from inquiry #${inq.id} via chat agent]`,
      } as any)
      .returning();
    await db
      .update(inquiries)
      .set({ quoteId: draft.id, updatedAt: new Date() })
      .where(eq(inquiries.id, id));
    return {
      ok: true,
      quoteId: draft.id,
      opportunityId,
      clientId,
      message: `Drafted quote #${draft.id}. Review it, then tell me to send it.`,
      link: `/quotes/${draft.id}`,
    };
  },

  async get_client_full_history(args, _ctx) {
    let clientId = Number(args?.clientId);
    if (!Number.isFinite(clientId) && args?.email) {
      const [row] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.email, String(args.email).toLowerCase()), isNull(clients.deletedAt)))
        .limit(1);
      if (!row) return { error: `No client found for email ${args.email}.` };
      clientId = row.id;
    }
    if (!Number.isFinite(clientId)) return { error: "clientId or email required." };
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return { error: `Client ${clientId} not found.` };
    // Inquiries don't have a direct clientId column — match by email (same
    // shape clients.email uses). Matches the admin's "everyone named X" view.
    const [inqRows, oppRows, quoteRows, eventRows, commRows, tastingRows] = await Promise.all([
      db
        .select()
        .from(inquiries)
        .where(sql`lower(${inquiries.email}) = ${String(client.email).toLowerCase()}`),
      db.select().from(opportunities).where(eq(opportunities.clientId, clientId)),
      db.select().from(quotes).where(eq(quotes.clientId, clientId)),
      db.select().from(events).where(eq(events.clientId, clientId)),
      db
        .select()
        .from(communications)
        .where(eq(communications.clientId, clientId))
        .orderBy(sql`${communications.timestamp} DESC`)
        .limit(25),
      db
        .select()
        .from(tastings)
        .where(eq(tastings.clientId, clientId))
        .orderBy(sql`${tastings.scheduledAt} DESC`),
    ]);
    return {
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`.trim(),
        email: client.email,
        phone: client.phone,
        company: client.company,
        type: client.type,
        link: `/clients/${client.id}`,
      },
      counts: {
        inquiries: inqRows.length,
        opportunities: oppRows.length,
        quotes: quoteRows.length,
        events: eventRows.length,
        tastings: tastingRows.length,
        communications: commRows.length,
      },
      tastings: tastingRows.map((t) => ({
        id: t.id,
        date: t.scheduledAt,
        guestCount: t.guestCount,
        status: t.status,
        paid: !!t.paidAt,
        link: `/tasting/${t.id}`,
      })),
      inquiries: inqRows.map((i) => ({
        id: i.id,
        date: i.submittedAt || i.createdAt,
        eventDate: i.eventDate,
        eventType: i.eventType,
        guestCount: i.guestCount,
        status: i.status,
        link: `/inquiries?id=${i.id}`,
      })),
      opportunities: oppRows.map((o) => ({
        id: o.id,
        eventDate: o.eventDate,
        eventType: o.eventType,
        status: o.status,
        link: `/opportunities/${o.id}`,
      })),
      quotes: quoteRows.map((q) => ({
        id: q.id,
        status: q.status,
        total: q.total ? `$${(q.total / 100).toFixed(2)}` : null,
        sentAt: q.sentAt,
        acceptedAt: q.acceptedAt,
        link: `/quotes/${q.id}`,
      })),
      events: eventRows.map((e) => ({
        id: e.id,
        date: e.eventDate,
        eventType: e.eventType,
        guestCount: e.guestCount,
        venue: e.venue,
        status: e.status,
        link: `/events/${e.id}`,
      })),
      recentCommunications: commRows.map((c) => ({
        id: c.id,
        when: c.timestamp,
        type: c.type,
        direction: c.direction,
        subject: c.subject,
        preview: c.bodySummary,
      })),
    };
  },

  // ---------------------------------------------------------------------------
  // Raw-lead → inquiry conversion
  // ---------------------------------------------------------------------------
  async convert_raw_lead_to_inquiry({ rawLeadId }) {
    const id = Number(rawLeadId);
    if (!Number.isFinite(id)) return { error: "rawLeadId required." };

    const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, id));
    if (!lead) return { error: `Raw lead ${id} not found.` };

    // Idempotent — if already promoted, return the existing inquiry.
    const existing = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.rawLeadId, id))
      .limit(1);
    if (existing.length > 0) {
      const i = existing[0];
      return {
        inquiry: {
          id: i.id,
          status: i.status,
          eventType: i.eventType,
          eventDate: i.eventDate,
          guestCount: i.guestCount,
          link: `/inquiries/${i.id}`,
        },
        alreadyExisted: true,
        message: `Raw lead #${id} was already promoted to inquiry #${i.id}.`,
      };
    }

    // Split prospect name into first/last (mirror the UI endpoint's logic).
    let firstName = "Unknown";
    let lastName = "Contact";
    if (lead.extractedProspectName) {
      const parts = lead.extractedProspectName.trim().split(/\s+/);
      if (parts[0]) firstName = parts[0];
      if (parts.length > 1) lastName = parts.slice(1).join(" ");
    }

    let eventDate: Date | null = null;
    if (lead.extractedEventDate) {
      const parsed = new Date(lead.extractedEventDate);
      if (!isNaN(parsed.getTime())) eventDate = parsed;
    }

    const [inquiry] = await db
      .insert(inquiries)
      .values({
        firstName,
        lastName,
        email: lead.extractedProspectEmail || "unknown@example.com",
        phone: lead.extractedProspectPhone || null,
        eventType: lead.extractedEventType || "other",
        eventDate,
        guestCount:
          lead.extractedGuestCount && lead.extractedGuestCount > 0
            ? lead.extractedGuestCount
            : 1,
        venueName: lead.extractedVenue || null,
        specialRequests: lead.extractedMessageSummary || lead.eventSummary || null,
        internalNotes: lead.notes || null,
        source: lead.leadSourcePlatform || lead.source || "promoted_from_lead",
        status: "draft",
        rawLeadId: lead.id,
      } as any)
      .returning();

    await db
      .update(rawLeads)
      .set({ status: "qualified", updatedAt: new Date() })
      .where(eq(rawLeads.id, id));

    return {
      inquiry: {
        id: inquiry.id,
        status: inquiry.status,
        eventType: inquiry.eventType,
        eventDate: inquiry.eventDate,
        guestCount: inquiry.guestCount,
        firstName: inquiry.firstName,
        lastName: inquiry.lastName,
        email: inquiry.email,
        link: `/inquiries/${inquiry.id}`,
      },
      alreadyExisted: false,
      message: `Promoted raw lead #${id} → inquiry #${inquiry.id}. Now call create_quote_from_inquiry with inquiryId=${inquiry.id} to draft the quote.`,
    };
  },

  // ---------------------------------------------------------------------------
  // Reporting / analytics
  // ---------------------------------------------------------------------------
  async get_funnel_report() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const groupBy = async (
      table: any,
      statusCol: any,
      dateCol: any,
      from: Date,
      to: Date | null,
    ) => {
      const conds: any[] = [gte(dateCol, from)];
      if (to) conds.push(lte(dateCol, to));
      const rows = await db
        .select({
          status: statusCol,
          n: sql<number>`count(*)::int`,
        })
        .from(table)
        .where(and(...conds))
        .groupBy(statusCol);
      const out: Record<string, number> = {};
      for (const r of rows) out[String(r.status)] = r.n;
      return out;
    };

    const [oppCur, oppPrev, qCur, qPrev, evCur, evPrev] = await Promise.all([
      groupBy(opportunities, opportunities.status, opportunities.createdAt, startOfMonth, null),
      groupBy(opportunities, opportunities.status, opportunities.createdAt, startOfLastMonth, endOfLastMonth),
      groupBy(quotes, quotes.status, quotes.createdAt, startOfMonth, null),
      groupBy(quotes, quotes.status, quotes.createdAt, startOfLastMonth, endOfLastMonth),
      groupBy(events, events.status, events.createdAt, startOfMonth, null),
      groupBy(events, events.status, events.createdAt, startOfLastMonth, endOfLastMonth),
    ]);

    return {
      thisMonth: { opportunities: oppCur, quotes: qCur, events: evCur },
      lastMonth: { opportunities: oppPrev, quotes: qPrev, events: evPrev },
      note: "Counts grouped by status, scoped to records created in each month.",
    };
  },

  async get_revenue_summary({ period = "ytd" } = {}) {
    const now = new Date();
    let from: Date | null = null;
    if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === "quarter") from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else if (period === "ytd") from = new Date(now.getFullYear(), 0, 1);
    // 'all' → from stays null

    const conds: any[] = [eq(quotes.status, "accepted" as any)];
    if (from) conds.push(gte(quotes.acceptedAt, from));

    const [agg] = await db
      .select({
        n: sql<number>`count(*)::int`,
        totalCents: sql<number>`coalesce(sum(${quotes.total}), 0)::bigint`,
      })
      .from(quotes)
      .where(and(...conds));

    const cents = Number(agg?.totalCents ?? 0);
    return {
      period,
      since: from ? from.toISOString().slice(0, 10) : "all-time",
      acceptedQuotes: agg?.n ?? 0,
      bookedRevenue: `$${(cents / 100).toFixed(2)}`,
      bookedRevenueCents: cents,
    };
  },

  async get_pipeline_health({ stalledDays = 14 } = {}) {
    const cutoff = new Date(Date.now() - Number(stalledDays) * 24 * 60 * 60 * 1000);

    const [stalledOpps, sentNotViewed, viewedNotAccepted] = await Promise.all([
      db
        .select({
          id: opportunities.id,
          status: opportunities.status,
          firstName: opportunities.firstName,
          lastName: opportunities.lastName,
          eventDate: opportunities.eventDate,
          updatedAt: opportunities.updatedAt,
        })
        .from(opportunities)
        .where(
          and(
            inArray(opportunities.status, ["new", "contacted", "qualified", "proposal"] as any),
            lte(opportunities.updatedAt, cutoff),
          ),
        )
        .orderBy(asc(opportunities.updatedAt))
        .limit(25),
      db
        .select({
          id: quotes.id,
          status: quotes.status,
          sentAt: quotes.sentAt,
          total: quotes.total,
        })
        .from(quotes)
        .where(and(eq(quotes.status, "sent" as any), lte(quotes.sentAt, cutoff)))
        .orderBy(asc(quotes.sentAt))
        .limit(25),
      db
        .select({
          id: quotes.id,
          status: quotes.status,
          viewedAt: quotes.viewedAt,
          total: quotes.total,
        })
        .from(quotes)
        .where(and(eq(quotes.status, "viewed" as any), lte(quotes.viewedAt, cutoff)))
        .orderBy(asc(quotes.viewedAt))
        .limit(25),
    ]);

    return {
      stalledDays: Number(stalledDays),
      stalledOpportunities: stalledOpps.map((o) => ({
        id: o.id,
        name: `${o.firstName} ${o.lastName}`.trim(),
        status: o.status,
        eventDate: o.eventDate,
        lastTouched: o.updatedAt,
        link: `/opportunities/${o.id}`,
      })),
      quotesSentNoOpen: sentNotViewed.map((q) => ({
        id: q.id,
        sentAt: q.sentAt,
        total: q.total ? `$${(q.total / 100).toFixed(2)}` : null,
        link: `/quotes/${q.id}`,
      })),
      quotesViewedNoAccept: viewedNotAccepted.map((q) => ({
        id: q.id,
        viewedAt: q.viewedAt,
        total: q.total ? `$${(q.total / 100).toFixed(2)}` : null,
        link: `/quotes/${q.id}`,
      })),
    };
  },

  // ---------------------------------------------------------------------------
  // Tastings
  // ---------------------------------------------------------------------------
  async list_tastings({ status, fromDate, toDate, limit = 25 } = {}) {
    const conds: any[] = [];
    if (Array.isArray(status) && status.length > 0) {
      conds.push(inArray(tastings.status, status as any));
    }
    if (fromDate) {
      const d = new Date(fromDate);
      if (!isNaN(d.getTime())) conds.push(gte(tastings.scheduledAt, d));
    }
    if (toDate) {
      const d = new Date(toDate);
      if (!isNaN(d.getTime())) conds.push(lte(tastings.scheduledAt, d));
    }
    const rows = await db
      .select()
      .from(tastings)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(asc(tastings.scheduledAt))
      .limit(Math.min(Number(limit) || 25, 100));
    return {
      count: rows.length,
      tastings: rows.map((t) => ({
        id: t.id,
        scheduledAt: t.scheduledAt,
        guestCount: t.guestCount,
        status: t.status,
        contact: [t.firstName, t.lastName].filter(Boolean).join(" ") || "—",
        email: t.email,
        phone: t.phone,
        paid: !!t.paidAt,
        opportunityId: t.opportunityId,
        clientId: t.clientId,
        link: `/tasting/${t.id}`,
      })),
    };
  },

  async get_tasting({ id }) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return { error: "id required." };
    const [row] = await db.select().from(tastings).where(eq(tastings.id, tid));
    if (!row) return { error: `Tasting ${tid} not found.` };
    return {
      id: row.id,
      scheduledAt: row.scheduledAt,
      guestCount: row.guestCount,
      status: row.status,
      contact: {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
      },
      pricing: {
        perGuestCents: row.pricePerGuestCents,
        totalCents: row.totalPriceCents,
      },
      payment: {
        paid: !!row.paidAt,
        paidAt: row.paidAt,
        squarePaymentLinkUrl: row.squarePaymentLinkUrl,
      },
      links: {
        opportunityId: row.opportunityId,
        clientId: row.clientId,
        quoteId: row.quoteId,
        calBookingId: row.calBookingId,
      },
      notes: row.notes,
      link: `/tasting/${row.id}`,
    };
  },

  async create_tasting(args) {
    if (!args?.scheduledAt) return { error: "scheduledAt required." };
    const when = new Date(args.scheduledAt);
    if (isNaN(when.getTime())) return { error: `Invalid scheduledAt: ${args.scheduledAt}` };
    const [row] = await db
      .insert(tastings)
      .values({
        scheduledAt: when,
        firstName: args.firstName ?? null,
        lastName: args.lastName ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        guestCount: Number(args.guestCount ?? 2),
        opportunityId: args.opportunityId ?? null,
        clientId: args.clientId ?? null,
        quoteId: args.quoteId ?? null,
        notes: args.notes ?? null,
        totalPriceCents: Number(args.totalPriceCents ?? 12500),
      } as any)
      .returning();
    return {
      id: row.id,
      scheduledAt: row.scheduledAt,
      message: `Tasting #${row.id} booked for ${when.toISOString().slice(0, 16).replace("T", " ")}.`,
      link: `/tasting/${row.id}`,
    };
  },

  async reschedule_tasting({ id, scheduledAt }) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return { error: "id required." };
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) return { error: `Invalid scheduledAt: ${scheduledAt}` };
    const [existing] = await db.select().from(tastings).where(eq(tastings.id, tid));
    if (!existing) return { error: `Tasting ${tid} not found.` };
    const [row] = await db
      .update(tastings)
      .set({ scheduledAt: when, updatedAt: new Date() })
      .where(eq(tastings.id, tid))
      .returning();
    return {
      id: row.id,
      from: existing.scheduledAt,
      to: row.scheduledAt,
      calCaveat: existing.calBookingId
        ? "This tasting was originally booked via Cal.com — the Cal.com event was NOT updated. Update it manually if needed."
        : null,
      link: `/tasting/${row.id}`,
    };
  },

  async cancel_tasting({ id, reason, status = "cancelled" }) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return { error: "id required." };
    const [existing] = await db.select().from(tastings).where(eq(tastings.id, tid));
    if (!existing) return { error: `Tasting ${tid} not found.` };
    const newStatus = status === "no_show" ? "no_show" : "cancelled";
    const noteSuffix = reason ? `\n[cancel reason: ${reason}]` : "";
    const [row] = await db
      .update(tastings)
      .set({
        status: newStatus as any,
        notes: existing.notes ? existing.notes + noteSuffix : noteSuffix.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(tastings.id, tid))
      .returning();
    return {
      id: row.id,
      status: row.status,
      calCaveat: existing.calBookingId
        ? "This tasting was originally booked via Cal.com — the Cal.com event was NOT cancelled. Cancel it manually if needed."
        : null,
      link: `/tasting/${row.id}`,
    };
  },

  async find_tasting_conflicts({ scheduledAt, windowMinutes = 90 }) {
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) return { error: `Invalid scheduledAt: ${scheduledAt}` };
    const w = Number(windowMinutes) || 90;
    const lo = new Date(when.getTime() - w * 60 * 1000);
    const hi = new Date(when.getTime() + w * 60 * 1000);
    const rows = await db
      .select({
        id: tastings.id,
        scheduledAt: tastings.scheduledAt,
        firstName: tastings.firstName,
        lastName: tastings.lastName,
        status: tastings.status,
      })
      .from(tastings)
      .where(
        and(
          inArray(tastings.status, ["scheduled"] as any),
          gte(tastings.scheduledAt, lo),
          lte(tastings.scheduledAt, hi),
        ),
      )
      .orderBy(asc(tastings.scheduledAt));
    return {
      window: `±${w} min around ${when.toISOString()}`,
      conflicts: rows.map((r) => ({
        id: r.id,
        when: r.scheduledAt,
        contact: [r.firstName, r.lastName].filter(Boolean).join(" ") || "—",
        link: `/tasting/${r.id}`,
      })),
      hasConflict: rows.length > 0,
    };
  },

  // ---------------------------------------------------------------------------
  // Generic email send
  // ---------------------------------------------------------------------------
  async send_customer_email({ to, subject, html, text, opportunityId, clientId }) {
    if (!to || !subject) return { error: "to and subject required." };
    if (!html && !text) return { error: "Provide html or text body." };
    const finalHtml =
      html ??
      `<pre style="font-family:inherit;white-space:pre-wrap;">${String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`;
    const result = await sendEmail({
      to,
      subject,
      html: finalHtml,
      text: text ?? undefined,
      clientId: clientId ? Number(clientId) : undefined,
      opportunityId: opportunityId ? Number(opportunityId) : undefined,
      templateKey: "agent_freeform",
    });
    if (result.skipped) {
      return {
        ok: false,
        skipped: true,
        message: "Email not sent — outbound mail is unconfigured (RESEND_API_KEY/SMTP missing). The message was not logged.",
      };
    }
    if (!result.sent) {
      return { ok: false, error: result.error || "Email send failed." };
    }
    return {
      ok: true,
      messageId: result.messageId,
      message: `Email sent to ${to}.`,
    };
  },

  // ---------------------------------------------------------------------------
  // Promo codes
  // ---------------------------------------------------------------------------
  async list_promo_codes({ activeOnly = false } = {}) {
    const conds: any[] = [];
    if (activeOnly) conds.push(eq(promoCodes.isActive, true));
    const rows = await db
      .select()
      .from(promoCodes)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(promoCodes.createdAt))
      .limit(100);
    const now = new Date();
    return {
      count: rows.length,
      codes: rows.map((r) => {
        const expired = r.validUntil ? new Date(r.validUntil) < now : false;
        const exhausted = r.maxUses != null && r.currentUses >= r.maxUses;
        return {
          id: r.id,
          code: r.code,
          discountPercent: Number(r.discountPercent),
          description: r.description,
          uses: `${r.currentUses}${r.maxUses ? ` / ${r.maxUses}` : ""}`,
          validFrom: r.validFrom,
          validUntil: r.validUntil,
          isActive: r.isActive,
          state: !r.isActive ? "disabled" : expired ? "expired" : exhausted ? "exhausted" : "live",
        };
      }),
    };
  },

  async create_promo_code({ code, discountPercent, description, maxUses, validFrom, validUntil }) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { error: "code required." };
    const pct = Number(discountPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { error: "discountPercent must be 0–100." };
    }
    const existing = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(eq(promoCodes.code, c))
      .limit(1);
    if (existing.length > 0) {
      return { error: `Promo code "${c}" already exists (id ${existing[0].id}).` };
    }
    const [row] = await db
      .insert(promoCodes)
      .values({
        code: c,
        discountPercent: pct.toFixed(2) as any,
        description: description ?? null,
        maxUses: maxUses ? Number(maxUses) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      } as any)
      .returning();
    return {
      id: row.id,
      code: row.code,
      discountPercent: Number(row.discountPercent),
      message: `Created promo code "${row.code}" — ${row.discountPercent}% off.`,
    };
  },

  async apply_promo_code_to_inquiry({ inquiryId, code }) {
    const iid = Number(inquiryId);
    if (!Number.isFinite(iid)) return { error: "inquiryId required." };
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { error: "code required." };
    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, c));
    if (!promo) return { error: `Promo code "${c}" not found.` };
    if (!promo.isActive) return { error: `Promo code "${c}" is disabled.` };
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return { error: `Promo code "${c}" expired on ${new Date(promo.validUntil).toISOString().slice(0, 10)}.` };
    }
    if (promo.maxUses != null && promo.currentUses >= promo.maxUses) {
      return { error: `Promo code "${c}" has hit its max uses (${promo.maxUses}).` };
    }
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, iid));
    if (!inq) return { error: `Inquiry ${iid} not found.` };
    await db
      .update(inquiries)
      .set({
        promoCodeId: promo.id,
        discountPercent: promo.discountPercent,
      })
      .where(eq(inquiries.id, iid));
    return {
      inquiryId: iid,
      promoCode: promo.code,
      discountPercent: Number(promo.discountPercent),
      message: `Applied "${promo.code}" (${promo.discountPercent}% off) to inquiry #${iid}.`,
      link: `/inquiries/${iid}`,
    };
  },

  // ---------------------------------------------------------------------------
  // Quote update — narrow safe surface
  // ---------------------------------------------------------------------------
  async update_quote({ id, notes }) {
    const qid = Number(id);
    if (!Number.isFinite(qid)) return { error: "id required." };
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, qid));
    if (!existing) return { error: `Quote ${qid} not found.` };
    const patch: any = { updatedAt: new Date() };
    if (typeof notes === "string") patch.notes = notes;
    if (Object.keys(patch).length === 1) {
      return { error: "Nothing to update — only `notes` is editable via this tool." };
    }
    const [row] = await db
      .update(quotes)
      .set(patch)
      .where(eq(quotes.id, qid))
      .returning();
    return {
      id: row.id,
      status: row.status,
      notes: row.notes,
      message: `Quote #${row.id} updated.`,
      link: `/quotes/${row.id}`,
    };
  },

  // ---------------------------------------------------------------------------
  // Unmatched comms inbox
  // ---------------------------------------------------------------------------
  async list_unmatched_communications({ limit = 25 } = {}) {
    const rows = await db
      .select({
        id: communications.id,
        timestamp: communications.timestamp,
        type: communications.type,
        direction: communications.direction,
        fromAddress: communications.fromAddress,
        subject: communications.subject,
        preview: communications.bodySummary,
      })
      .from(communications)
      .where(and(isNull(communications.clientId), isNull(communications.opportunityId)))
      .orderBy(sql`${communications.timestamp} DESC`)
      .limit(Math.min(Number(limit) || 25, 100));
    return {
      count: rows.length,
      items: rows.map((c) => ({
        id: c.id,
        when: c.timestamp,
        type: c.type,
        direction: c.direction,
        from: c.fromAddress,
        subject: c.subject,
        preview: c.preview,
      })),
    };
  },

  // ---------------------------------------------------------------------------
  // Long-term chef brain
  // ---------------------------------------------------------------------------
  async remember_fact({ topic, fact, ref }, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const t = String(topic || "").trim().toLowerCase();
    const f = String(fact || "").trim();
    if (!t || !f) return { error: "topic and fact are required." };

    // De-dupe: if we already have an essentially-identical fact under this
    // topic for this user, bump its lastUsedAt instead of inserting a near-dup.
    const existing = await db
      .select({ id: chefMemory.id, fact: chefMemory.fact })
      .from(chefMemory)
      .where(and(eq(chefMemory.userId, ctx.userId), eq(chefMemory.topic, t)));
    const dupe = existing.find(
      (e) => e.fact.trim().toLowerCase() === f.toLowerCase(),
    );
    if (dupe) {
      await db
        .update(chefMemory)
        .set({ lastUsedAt: new Date() })
        .where(eq(chefMemory.id, dupe.id));
      return { id: dupe.id, topic: t, fact: f, status: "already-remembered" };
    }

    const [row] = await db
      .insert(chefMemory)
      .values({
        userId: ctx.userId,
        topic: t,
        fact: f,
        ref: ref ?? null,
      })
      .returning();
    return { id: row.id, topic: row.topic, fact: row.fact, status: "saved" };
  },

  async recall_facts({ topic, query, ref, limit = 20 }, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const conds: any[] = [eq(chefMemory.userId, ctx.userId)];
    if (topic) {
      const t = String(topic).trim().toLowerCase();
      // Treat trailing ':' as a prefix query (e.g. "client:" → all clients).
      if (t.endsWith(":") || t.endsWith("*")) {
        conds.push(ilike(chefMemory.topic, `${t.replace(/[:*]$/, "")}%`));
      } else {
        conds.push(eq(chefMemory.topic, t));
      }
    }
    if (query) {
      conds.push(ilike(chefMemory.fact, `%${String(query)}%`));
    }
    if (ref && typeof ref === "object") {
      // Use jsonb containment so {clientId: 12} matches a richer ref.
      conds.push(sql`${chefMemory.ref} @> ${JSON.stringify(ref)}::jsonb`);
    }
    const rows = await db
      .select()
      .from(chefMemory)
      .where(and(...conds))
      .orderBy(desc(chefMemory.lastUsedAt))
      .limit(Math.min(Number(limit) || 20, 100));

    // Bump lastUsedAt + useCount for the rows we just surfaced.
    if (rows.length > 0) {
      await db
        .update(chefMemory)
        .set({ lastUsedAt: new Date(), useCount: sql`${chefMemory.useCount} + 1` })
        .where(inArray(chefMemory.id, rows.map((r) => r.id)));
    }

    return {
      count: rows.length,
      facts: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        fact: r.fact,
        ref: r.ref,
        rememberedAt: r.createdAt,
      })),
    };
  },

  async list_facts({ limit = 50 }, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const rows = await db
      .select()
      .from(chefMemory)
      .where(eq(chefMemory.userId, ctx.userId))
      .orderBy(desc(chefMemory.lastUsedAt))
      .limit(Math.min(Number(limit) || 50, 200));
    return {
      count: rows.length,
      facts: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        fact: r.fact,
        ref: r.ref,
        rememberedAt: r.createdAt,
        useCount: r.useCount,
      })),
    };
  },

  async forget_fact({ id }, ctx) {
    if (!ctx?.userId) return { error: "Not authenticated." };
    const memId = Number(id);
    if (!Number.isFinite(memId)) return { error: "id required." };
    const [row] = await db
      .select()
      .from(chefMemory)
      .where(and(eq(chefMemory.id, memId), eq(chefMemory.userId, ctx.userId)));
    if (!row) return { error: `Fact ${memId} not found (or not yours).` };
    await db.delete(chefMemory).where(eq(chefMemory.id, memId));
    return { id: memId, topic: row.topic, fact: row.fact, status: "forgotten" };
  },
};

// ============================================================================
// Route handler
// ============================================================================

const SYSTEM_PROMPT = `You are the HomeBites Kitchen Brain — a senior sous-chef + ops partner for the catering team. You think like someone who has worked here for years: you remember the people, the patterns, the suppliers, the things that go wrong.

Voice & style:
- Talk like a chef talks. Direct, specific, useful. No corporate hedging, no "I'd be happy to assist".
- Short, scannable answers. Bullets and compact tables beat paragraphs.
- Numbers, names, dates, and ids in every answer where they exist. Never invent — use a tool.
- Use markdown links for any id you mention: events [#42](/events/42), recipes /recipes/:id, ingredients /base-ingredients, quotes /quotes/:id, opportunities /opportunities/:id, clients /clients/:id.
- Format dates human-readably (e.g. "Sat Apr 25, 5:30 PM"). Money in dollars unless noted.

What you can do (just ask in plain English — call list_capabilities for the full list):
- Schedule & events: today's schedule, upcoming, prep sheets, shopping lists, update guest count / date / venue, mark complete.
- Menus & recipes: lookup, search by dietary, per-serving cost, ingredient gaps, create new.
- Ingredients: usage lookup, price changes (with auto blast-radius preview).
- Pipeline: full client file (incl. tastings), promote inquiries, draft quotes, send quotes, send contracts via BoldSign, log calls, pause drip.
- Raw leads: convert raw lead → inquiry → quote in one chain.
- Tastings: list, book, reschedule, cancel, find conflicts (heads-up: Cal.com bookings need manual sync on reschedule/cancel).
- Reporting: funnel snapshot, booked revenue by period, pipeline-health (stalled deals, sent-but-unviewed quotes).
- Promo codes: list, create, apply to inquiry.
- Email: free-form send to anyone (auto-logged to timeline).
- Update quote: notes only via agent (pricing/state requires admin UI).
- Unmatched comms inbox: list incoming messages we couldn't auto-link.
- Follow-ups inbox: list, draft replies, resolve.
- Catalog & pricing: read for anyone, edit if admin.

Memory — this is the part that makes you actually useful:
- You have long-term memory. Use remember_fact PROACTIVELY whenever the chef tells you something that will matter next week, next month, or for that specific person/supplier/recipe. Don't ask permission; just save it and mention it in one short line ("Got it — saved that Sarah is allergic to nuts.").
- Examples worth remembering: client preferences and allergies, supplier issues ("Costco short on lamb 3 weeks running"), recurring patterns ("we always under-order rice for groups over 50"), workflow notes ("Mike likes draft quotes Friday morning"), recipe tweaks the chef makes in his head.
- You'll see a "Recent kitchen brain" block at the start of each conversation with the most-relevant facts. Use them naturally — don't recite the whole list, just apply what fits.
- When the chef asks "what do you remember about X" or "what do you know about Sarah", call recall_facts (or list_facts for a full audit).
- If a fact turns out to be wrong, call forget_fact.

Behavior:
- Always call tools for live data. Never invent prices, ids, dates, or guest counts.
- For create/update/send/mark/log actions, confirm what you did with the id + link.
- For customer-facing or destructive actions (send_quote_to_customer, mark_event_completed, marking an opp lost/cancelled, changing a confirmed event's date), propose first and wait for the chef to confirm — unless they said "do it" / "go ahead" in the same turn.
- update_ingredient_price now returns its own blast-radius preview (recipes affected, active opps/quotes). Just show that to the chef after the change; you don't need a separate find_ingredient_usage round-trip.
- If a tool errors, say so plainly and suggest the next step.
- If the request is ambiguous, ask ONE clarifying question instead of guessing.
- When the chef opens chat on a specific page (event/recipe/quote/opportunity/client), you'll see a "Page context" block with that entity already loaded. Use it — don't refetch unless something looks stale.`;

const router = Router();

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.userId) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

// Cap how much history & how many tool rounds the agent gets per turn.
const MAX_TOOL_ROUNDS = 20;
const TOOL_RESULT_TRUNCATE = 60_000;
const MAX_HISTORY_TURNS = 60; // user+assistant pairs to rehydrate

// ----------------------------------------------------------------------------
// Helpers — persistence, memory injection, page-context priming
// ----------------------------------------------------------------------------

async function loadRecentTurns(
  userId: number,
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  if (!userId) return [];
  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        inArray(chatMessages.role, ["user", "assistant"] as any),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(MAX_HISTORY_TURNS * 2);
  return rows
    .reverse()
    .map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
}

async function persistMessage(
  userId: number,
  role: "user" | "assistant",
  content: string,
  pagePath?: string | null,
) {
  if (!userId || !content) return;
  await db.insert(chatMessages).values({
    userId,
    role,
    content,
    pagePath: pagePath ?? null,
  });
}

async function loadMemorySnippet(
  userId: number,
  pageRef?: Record<string, any> | null,
): Promise<string> {
  if (!userId) return "";
  // Two passes: facts tied to the entity in view, then top recent global facts.
  const tied = pageRef
    ? await db
        .select()
        .from(chefMemory)
        .where(
          and(
            eq(chefMemory.userId, userId),
            sql`${chefMemory.ref} @> ${JSON.stringify(pageRef)}::jsonb`,
          ),
        )
        .orderBy(desc(chefMemory.lastUsedAt))
        .limit(8)
    : [];
  const recent = await db
    .select()
    .from(chefMemory)
    .where(eq(chefMemory.userId, userId))
    .orderBy(desc(chefMemory.lastUsedAt))
    .limit(15);
  // Merge, dedupe by id, cap at 20.
  const seen = new Set<number>();
  const merged: typeof recent = [];
  for (const list of [tied, recent]) {
    for (const f of list) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      merged.push(f);
      if (merged.length >= 20) break;
    }
    if (merged.length >= 20) break;
  }
  if (merged.length === 0) return "";
  const lines = merged.map((f) => `  • [${f.topic}] ${f.fact}`);
  return `\n\nRecent kitchen brain (apply where relevant, don't recite):\n${lines.join("\n")}`;
}

// Detect entity ids from the URL the chef is currently on so we can preload
// the relevant record into the prompt without burning a tool round.
function parsePageRef(pagePath?: string | null): {
  ref: Record<string, any> | null;
  kind: string | null;
  id: number | null;
} {
  if (!pagePath) return { ref: null, kind: null, id: null };
  const patterns: Array<[RegExp, string, string]> = [
    [/\/events\/(\d+)/, "event", "eventId"],
    [/\/recipes\/(\d+)/, "recipe", "recipeId"],
    [/\/quotes\/(\d+)/, "quote", "quoteId"],
    [/\/opportunities\/(\d+)/, "opportunity", "opportunityId"],
    [/\/clients\/(\d+)/, "client", "clientId"],
    [/\/raw-leads\/(\d+)/, "rawLead", "rawLeadId"],
    [/\/inquiries\/(\d+)/, "inquiry", "inquiryId"],
    [/\/leads\/(\d+)/, "inquiry", "inquiryId"],
    [/\/menus\/(\d+)/, "menu", "menuId"],
  ];
  for (const [rx, kind, key] of patterns) {
    const m = pagePath.match(rx);
    if (m) {
      const id = Number(m[1]);
      return { ref: { [key]: id }, kind, id };
    }
  }
  return { ref: null, kind: null, id: null };
}

async function buildPageContext(pagePath?: string | null): Promise<string> {
  const { kind, id } = parsePageRef(pagePath);
  if (!kind || !id) {
    // Hint for common list pages so the agent reaches for the right tool.
    if (pagePath?.startsWith("/follow-ups")) {
      return `\n\nPage context: chef is on the follow-ups inbox. Default to list_followups when they ask "what's next" or "what's on my plate".`;
    }
    if (pagePath?.startsWith("/unmatched")) {
      return `\n\nPage context: chef is on the unmatched-communications triage view. Use list_unmatched_communications when they ask about pending unmatched emails.`;
    }
    if (pagePath?.startsWith("/users")) {
      return `\n\nPage context: chef is on the team/users page. Admin-only — be careful with any user-related actions.`;
    }
    if (pagePath?.startsWith("/calendar")) {
      return `\n\nPage context: chef is on the calendar. Default to list_events_this_week or today_schedule when they ask "what's coming up".`;
    }
    if (pagePath?.startsWith("/reports") || pagePath?.startsWith("/dashboard")) {
      return `\n\nPage context: chef is on the reports/dashboard view. Reach for get_funnel_report, get_revenue_summary, or get_pipeline_health when they ask about performance.`;
    }
    if (pagePath?.startsWith("/tasting")) {
      return `\n\nPage context: chef is on a tastings page. Default to list_tastings when they ask "who's coming in" or "do we have tastings booked".`;
    }
    return pagePath
      ? `\n\nPage context: chef is on "${pagePath}".`
      : "";
  }
  try {
    if (kind === "event") {
      const [row] = await db.select().from(events).where(eq(events.id, id));
      if (!row) return `\n\nPage context: /events/${id} (not found).`;
      return `\n\nPage context — Event [#${row.id}](/events/${row.id}): ${row.eventType ?? "event"} on ${row.eventDate?.toISOString?.().slice(0, 10) ?? "?"} for ${row.guestCount ?? "?"} guests, status=${row.status}, venue=${row.venue ?? "—"}, menu=${row.menuId ?? "—"}.`;
    }
    if (kind === "recipe") {
      const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
      if (!row) return `\n\nPage context: /recipes/${id} (not found).`;
      return `\n\nPage context — Recipe [#${row.id}](/recipes/${row.id}) "${row.name}", category=${row.category ?? "—"}, servings=${(row as any).servings ?? "—"}.`;
    }
    if (kind === "quote") {
      const [row] = await db.select().from(quotes).where(eq(quotes.id, id));
      if (!row) return `\n\nPage context: /quotes/${id} (not found).`;
      return `\n\nPage context — Quote [#${row.id}](/quotes/${row.id}), status=${row.status}, opportunityId=${row.opportunityId ?? "—"}, total=${(row as any).total ?? "?"}.`;
    }
    if (kind === "opportunity") {
      const [row] = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, id));
      if (!row) return `\n\nPage context: /opportunities/${id} (not found).`;
      return `\n\nPage context — Opportunity [#${row.id}](/opportunities/${row.id}), status=${row.status}, clientId=${(row as any).clientId ?? "—"}, eventDate=${row.eventDate?.toISOString?.().slice(0, 10) ?? "—"}.`;
    }
    if (kind === "client") {
      const [row] = await db.select().from(clients).where(eq(clients.id, id));
      if (!row) return `\n\nPage context: /clients/${id} (not found).`;
      const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "—";
      return `\n\nPage context — Client [#${row.id}](/clients/${row.id}) ${fullName} <${row.email ?? "—"}>, type=${(row as any).clientType ?? "—"}.`;
    }
    if (kind === "rawLead") {
      const [row] = await db.select().from(rawLeads).where(eq(rawLeads.id, id));
      if (!row) return `\n\nPage context: /raw-leads/${id} (not found).`;
      // Look up the linked inquiry (if any) so the agent can chain to a quote.
      const linkedInquiries = await db
        .select({
          id: inquiries.id,
          status: inquiries.status,
          eventType: inquiries.eventType,
          eventDate: inquiries.eventDate,
          guestCount: inquiries.guestCount,
        })
        .from(inquiries)
        .where(eq(inquiries.rawLeadId, id))
        .limit(5);
      const lines = [
        `\n\nPage context — Raw lead [#${row.id}](/raw-leads/${row.id}):`,
        `  source=${row.source ?? "—"}, status=${row.status}, received=${row.receivedAt?.toISOString?.().slice(0, 10) ?? "—"}`,
        `  prospect: ${row.extractedProspectName ?? "—"} <${row.extractedProspectEmail ?? "—"}> ${row.extractedProspectPhone ? `· ${row.extractedProspectPhone}` : ""}`,
        `  event: ${row.extractedEventType ?? "?"} on ${row.extractedEventDate ?? "?"}, ${row.extractedGuestCount ?? "?"} guests, venue=${row.extractedVenue ?? "—"}`,
        `  AI quality=${row.aiOverallLeadQuality ?? "—"}, urgency=${row.aiUrgencyScore ?? "—"}, suggested next step: ${row.aiSuggestedNextStep ?? "—"}`,
        `  summary: ${row.extractedMessageSummary ?? row.eventSummary ?? "—"}`,
        `  linked opportunity: ${row.createdOpportunityId ? `[#${row.createdOpportunityId}](/opportunities/${row.createdOpportunityId})` : "none yet"}`,
        `  linked inquiries: ${linkedInquiries.length === 0 ? "none yet" : linkedInquiries.map((i) => `[#${i.id}](/inquiries/${i.id}) (${i.status})`).join(", ")}`,
      ];
      // Workflow hint so the agent knows the chain instead of asking for ids.
      const hasInquiry = linkedInquiries.length > 0;
      const hasOpp = !!row.createdOpportunityId;
      lines.push(
        hasInquiry
          ? `  → To draft a quote, call create_quote_from_inquiry with inquiryId=${linkedInquiries[0].id}.`
          : `  → No inquiry yet. To draft a quote in one go: call convert_raw_lead_to_inquiry with rawLeadId=${row.id} (idempotent), then call create_quote_from_inquiry with the returned inquiry.id. If the chef just says "create a quote", do both calls back-to-back and confirm the result.`,
      );
      return lines.join("\n");
    }
    if (kind === "menu") {
      const [row] = await db.select().from(menus).where(eq(menus.id, id));
      if (!row) return `\n\nPage context: /menus/${id} (not found).`;
      return `\n\nPage context — Menu [#${row.id}](/menus/${row.id}) "${row.name}", theme=${(row as any).theme ?? "—"}, tier=${(row as any).tier ?? "—"}.`;
    }
    if (kind === "inquiry") {
      const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id));
      if (!row) return `\n\nPage context: inquiry/lead ${id} (not found).`;
      const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "—";
      const eventDateStr = row.eventDate
        ? new Date(row.eventDate as any).toISOString().slice(0, 10)
        : "?";
      return `\n\nPage context — Inquiry [#${row.id}](/inquiries/${row.id}): ${row.eventType ?? "?"} on ${eventDateStr} for ${row.guestCount ?? "?"} guests, status=${row.status}, menuTheme=${row.menuTheme ?? "—"}, menuTier=${row.menuTier ?? "—"}, contact=${fullName} <${row.email ?? "—"}> ${row.phone ? `· ${row.phone}` : ""}. To draft a quote from this, call create_quote_from_inquiry with inquiryId=${row.id}.`;
    }
  } catch (err: any) {
    return `\n\nPage context: ${pagePath} (failed to load: ${err?.message || "error"}).`;
  }
  return "";
}

async function buildSystemMessage(
  userId: number,
  pagePath?: string | null,
): Promise<string> {
  const todayLine = `\n\nToday's date is ${new Date().toISOString().slice(0, 10)} (server time).`;
  const { ref } = parsePageRef(pagePath);
  const [pageCtx, memSnippet] = await Promise.all([
    buildPageContext(pagePath),
    loadMemorySnippet(userId, ref),
  ]);
  return SYSTEM_PROMPT + todayLine + pageCtx + memSnippet;
}

router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  if (providers.length === 0) {
    return res.status(503).json({
      error:
        "No LLM provider configured. Set GEMINI_API_KEY (primary) or DEEPSEEK_API_KEY / OPENROUTER_API_KEY as fallback.",
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

  const userId: number = (req.session as any)?.userId ?? 0;
  const pagePath = schema.context?.currentPath ?? null;

  // Server is the source of truth for conversation history. The client may
  // still send a `messages` array (older widgets), but we prefer the DB.
  const systemContent = await buildSystemMessage(userId, pagePath);
  const dbHistory = await loadRecentTurns(userId);
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...dbHistory,
  ];

  // If the client sent a fresh `message`, append it & persist.
  // (When a client only sends `messages`, treat the last user one as the new turn.)
  let newUserMessage = schema.message?.trim() || "";
  if (!newUserMessage && schema.messages?.length) {
    const last = schema.messages[schema.messages.length - 1];
    if (last?.role === "user") newUserMessage = last.content?.trim() || "";
  }
  if (newUserMessage) {
    history.push({ role: "user", content: newUserMessage });
    await persistMessage(userId, "user", newUserMessage, pagePath);
  }

  const toolCtx: ToolContext = { userId };
  const toolLog: Array<{ name: string; args: any; resultPreview: string }> = [];

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
                content:
                  serialized.length > TOOL_RESULT_TRUNCATE
                    ? serialized.slice(0, TOOL_RESULT_TRUNCATE) + "…(truncated)"
                    : serialized,
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
        if (finalContent) {
          await persistMessage(userId, "assistant", finalContent, pagePath);
        }
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

  const userId: number = (req.session as any)?.userId ?? 0;
  const pagePath = schema.context?.currentPath ?? null;

  const systemContent = await buildSystemMessage(userId, pagePath);
  const dbHistory = await loadRecentTurns(userId);
  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...dbHistory,
  ];

  let newUserMessage = schema.message?.trim() || "";
  if (!newUserMessage && schema.messages?.length) {
    const last = schema.messages[schema.messages.length - 1];
    if (last?.role === "user") newUserMessage = last.content?.trim() || "";
  }
  if (newUserMessage) {
    history.push({ role: "user", content: newUserMessage });
    await persistMessage(userId, "user", newUserMessage, pagePath);
  }

  const toolCtx: ToolContext = { userId };
  const toolLog: Array<{ name: string; args: any; resultPreview: string }> = [];

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
                  serialized.length > TOOL_RESULT_TRUNCATE
                    ? serialized.slice(0, TOOL_RESULT_TRUNCATE) + "…(truncated)"
                    : serialized,
              });
            }
          } else {
            // Pure-text response — we already streamed chunks above.
            // Persist the assembled assistant text so the next turn sees it.
            if (textBuffer.trim()) {
              await persistMessage(userId, "assistant", textBuffer, pagePath);
            }
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

// Persistent thread — load this user's recent chat history.
router.get("/history", isAuthenticated, async (req: Request, res: Response) => {
  const userId: number = (req.session as any)?.userId ?? 0;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const limitParam = Number(req.query.limit ?? MAX_HISTORY_TURNS * 2);
  const limit = Math.min(Math.max(limitParam, 1), 200);
  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      pagePath: chatMessages.pagePath,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        inArray(chatMessages.role, ["user", "assistant"] as any),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  res.json({ messages: rows.reverse() });
});

router.delete("/history", isAuthenticated, async (req: Request, res: Response) => {
  const userId: number = (req.session as any)?.userId ?? 0;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  res.json({ ok: true });
});

// Long-term chef brain — list / delete facts for the chef's audit panel.
router.get("/memory", isAuthenticated, async (req: Request, res: Response) => {
  const userId: number = (req.session as any)?.userId ?? 0;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const rows = await db
    .select()
    .from(chefMemory)
    .where(eq(chefMemory.userId, userId))
    .orderBy(desc(chefMemory.lastUsedAt))
    .limit(200);
  res.json({ facts: rows });
});

router.delete("/memory/:id", isAuthenticated, async (req: Request, res: Response) => {
  const userId: number = (req.session as any)?.userId ?? 0;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  await db
    .delete(chefMemory)
    .where(and(eq(chefMemory.id, id), eq(chefMemory.userId, userId)));
  res.json({ ok: true });
});

export default router;
