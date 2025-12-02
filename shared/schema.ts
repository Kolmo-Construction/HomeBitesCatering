import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, pgEnum, numeric, unique, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Event types enum for menu categorization
export const eventTypeEnum = pgEnum("event_type", [
  "wedding", 
  "corporate", 
  "birthday", 
  "anniversary", 
  "graduation", 
  "holiday_party", 
  "fundraiser", 
  "conference", 
  "workshop", 
  "reunion", 
  "celebration", 
  "other"
]);

// Nutritional range interface for structured nutrition data
export interface NutritionalRange {
  min: number;
  max: number;
  unit: string;
}

// Define the structure for additional_dietary_metadata JSONB field
export interface AdditionalDietaryMetadata {
  dietary_flags_list?: string[];       // e.g., ["HIGH_PROTEIN", "LOW_CARB", "VEGAN"] (from DietaryFlag type)
  allergen_alert_list?: string[];      // e.g., ["CONTAINS_SOY", "MAY_CONTAIN_NUTS"] (from AllergenAlert type)
  nutritional_highlights?: {
    calories?: NutritionalRange;       // e.g., { min: 380, max: 420, unit: "kcal" }
    protein?: NutritionalRange;        // e.g., { min: 32, max: 38, unit: "g" }
    fat?: NutritionalRange;            // e.g., { min: 18, max: 22, unit: "g" }
    carbs?: NutritionalRange;          // e.g., { min: 8, max: 12, unit: "g" }
    fiber?: NutritionalRange;          // e.g., { min: 2, max: 3, unit: "g" }
    sodium?: NutritionalRange;         // e.g., { min: 800, max: 1200, unit: "mg" }
    sugar?: NutritionalRange;          // e.g., { min: 5, max: 8, unit: "g" }
  };
  key_preparation_notes?: string;      // e.g., "Pan-seared, contains white wine"
  suitable_for_diet_preferences?: string[]; // e.g., ["KETO", "MEDITERRANEAN"] (from DietPreferenceCategory type)
  guidance_for_customer_short?: string; // A concise tip, e.g., "Great choice for a light, healthy meal."
  available_lot_sizes?: number[];      // e.g., [24, 48, 72] - available quantity options for catering orders
}

// Nutritional range schema for structured nutrition data
const nutritionalRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  unit: z.string(),
});

// Zod schema for validating additional_dietary_metadata
export const additionalDietaryMetadataSchema = z.object({
  dietary_flags_list: z.array(z.string()).optional(),
  allergen_alert_list: z.array(z.string()).optional(),
  nutritional_highlights: z.object({
    calories: nutritionalRangeSchema.optional(),
    protein: nutritionalRangeSchema.optional(),
    fat: nutritionalRangeSchema.optional(),
    carbs: nutritionalRangeSchema.optional(),
    fiber: nutritionalRangeSchema.optional(),
    sodium: nutritionalRangeSchema.optional(),
    sugar: nutritionalRangeSchema.optional(),
  }).optional(),
  key_preparation_notes: z.string().optional(),
  suitable_for_diet_preferences: z.array(z.string()).optional(),
  guidance_for_customer_short: z.string().optional(),
  available_lot_sizes: z.array(z.number()).optional(),
}).optional();

// Define the structure for menus.items JSONB field
export interface MenuPackageStructure {
  theme_key: string;                    // e.g., "taste_of_italy_wedding"
  package_id: string;                   // e.g., "italy_wedding_bronze"
  package_name: string;                 // e.g., "Bronze Celebration Package"
  package_price_per_person: number;     // e.g., 32.00
  package_description: string;          // Full package description
  min_guest_count?: number;             // e.g., 50
  customizable?: boolean;               // For bespoke/custom packages
  categories: MenuPackageCategory[];    // Array of category definitions
}

export interface MenuPackageCategory {
  category_key: string;                 // e.g., "mains", "sides", "pasta"
  display_title: string;               // e.g., "Exquisite Italian Mains"
  description?: string;                 // Category description
  available_item_ids: string[];         // String IDs from menu_items table
  selection_limit: number;              // How many items can be selected from this category
  upcharge_info?: {                     // For items with additional costs
    [item_id: string]: number;          // item_id -> upcharge amount
  };
}

// Zod schema for validating menus.items JSONB structure
export const menuPackageStructureSchema = z.object({
  theme_key: z.string(),
  package_id: z.string(),
  package_name: z.string(),
  package_price_per_person: z.number(),
  package_description: z.string(),
  min_guest_count: z.number().optional(),
  customizable: z.boolean().optional(),
  categories: z.array(z.object({
    category_key: z.string(),
    display_title: z.string(),
    description: z.string().optional(),
    available_item_ids: z.array(z.string()),
    selection_limit: z.number(),
    upcharge_info: z.record(z.string(), z.number()).optional(),
  })),
});

// User and authentication tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").default("staff").notNull(), // admin, staff, kitchen, client
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

// Priority enum for opportunities
export const opportunityPriorityEnum = pgEnum("opportunity_priority", ['hot', 'high', 'medium', 'low']);

// Opportunities (forward reference to clients handled later)
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  eventType: text("event_type").notNull(),
  eventDate: timestamp("event_date"),
  guestCount: integer("guest_count"),
  venue: text("venue"),
  notes: text("notes"),
  status: text("status").default("new").notNull(), // new, contacted, qualified, proposal, booked, archived
  opportunitySource: text("opportunity_source"), // website, referral, google, social, etc.
  priority: opportunityPriorityEnum("priority").default('medium'), // NEW FIELD for prioritizing opportunities
  assignedTo: integer("assigned_to").references(() => users.id),
  clientId: integer("client_id"), // Will be set as foreign key after clients table is defined
  // Fields for future extensions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities, {
  eventDate: z.string().nullable().transform(date => date ? new Date(date) : null),
  priority: z.enum(opportunityPriorityEnum.enumValues).optional(), // Make it optional on creation, defaults to 'medium'
  opportunitySource: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  clientId: true
});

// Menu Items
export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // appetizer, entree, side, dessert, beverage
  price: numeric("price", { precision: 10, scale: 2 }), // stored as decimal, nullable for items without price
  upcharge: numeric("upcharge", { precision: 10, scale: 2 }), // additional cost for package add-ons
  ingredients: text("ingredients"), // General list of ingredients
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isDairyFree: boolean("is_dairy_free").default(false),
  isNutFree: boolean("is_nut_free").default(false),
  image: text("image"),

  // NEW COLUMN for richer, yet selective, dietary metadata
  additional_dietary_metadata: jsonb("additional_dietary_metadata"), // Changed from additionalDietaryMetadata for snake_case convention

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems, {
  additional_dietary_metadata: additionalDietaryMetadataSchema,
  price: z.coerce.number().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Menus (collection of menu items)
export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // standard, custom, seasonal
  eventType: eventTypeEnum("event_type").default("other").notNull(), // wedding, corporate, birthday, etc.
  items: jsonb("items").notNull(), // array of menu item IDs with quantities
  isPubliclyVisible: boolean("is_publicly_visible").default(true),
  displayOnCustomerForm: boolean("display_on_customer_form").default(false).notNull(), // NEW FIELD
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for simple menu items array (id and quantity)
const simpleMenuItemsSchema = z.array(z.object({
  id: z.union([z.string(), z.number()]), // Support both string and number IDs
  quantity: z.number().default(1), // Default quantity to 1 for form_builder menus
  type: z.string().optional() // Allow type field for categorization
}));

export const insertMenuSchema = createInsertSchema(menus, {
  items: simpleMenuItemsSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// The proper way to handle circular references in Drizzle is to declare both tables
// without circular foreign keys first, then use the relations API instead of trying to
// add the reference after the fact. We'll keep it simple in this case by just documenting
// that opportunities.clientId refers to clients.id.

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Estimates/Proposals
export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  eventDate: timestamp("event_date"),
  eventType: text("event_type").notNull(),
  guestCount: integer("guest_count"),
  venue: text("venue"),
  // Address fields for Washington Tax Rates API
  venueAddress: text("venue_address"), // Street address for venue
  venueCity: text("venue_city"), // City for venue
  venueState: text("venue_state"), // State for venue (always WA)
  venueZip: text("venue_zip"), // ZIP code for venue
  taxRate: doublePrecision("tax_rate"), // Stored tax rate from API
  // Legacy field - kept for backward compatibility
  zipCode: text("zip_code"),
  menuId: integer("menu_id").references(() => menus.id),
  items: jsonb("items"), // JSON of custom items if not using a standard menu
  additionalServices: jsonb("additional_services"), // JSON of additional services
  subtotal: integer("subtotal").notNull(), // stored in cents
  tax: integer("tax").notNull(), // stored in cents
  total: integer("total").notNull(), // stored in cents
  status: text("status").default("draft").notNull(), // draft, sent, viewed, accepted, declined
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEstimateSchema = createInsertSchema(estimates, {
  // Ensure proper handling of dates
  eventDate: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  viewedAt: z.coerce.date().nullable(),
  acceptedAt: z.coerce.date().nullable(),
  declinedAt: z.coerce.date().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Events (confirmed bookings)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  estimateId: integer("estimate_id").references(() => estimates.id),
  eventDate: timestamp("event_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  eventType: text("event_type").notNull(),
  guestCount: integer("guest_count").notNull(),
  venue: text("venue").notNull(),
  menuId: integer("menu_id").references(() => menus.id),
  status: text("status").default("confirmed").notNull(), // confirmed, in-progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- NEW: Contact Identifiers Table ---
export const identifierTypeEnum = pgEnum("identifier_type", ["email", "phone"]);

export const contactIdentifiers = pgTable("contact_identifiers", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'cascade' }), // Link to opportunity
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }), // Link to client
  type: identifierTypeEnum("type").notNull(), // 'email' or 'phone'
  value: text("value").notNull(), // The actual email address or phone number
  isPrimary: boolean("is_primary").default(false).notNull(),
  source: text("source"), // How this identifier was added (e.g., 'lead_form', 'email_sync', 'manual_entry')
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactIdentifierSchema = createInsertSchema(contactIdentifiers).omit({
  id: true,
  createdAt: true,
});

// --- NEW: Communications/Interactions Table ---
export const communicationTypeEnum = pgEnum("communication_type", ["email", "call", "sms", "note", "meeting"]);
export const communicationDirectionEnum = pgEnum("communication_direction", ["incoming", "outgoing", "internal"]);

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'set null' }), // Link to opportunity
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }), // Link to client
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }), // User who created/logged this, or involved internal user
  type: communicationTypeEnum("type").notNull(),
  direction: communicationDirectionEnum("direction").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(), // When the actual communication happened
  source: text("source"), // e.g., 'gmail_sync', 'twilio_sync', 'manual_entry', 'system_generated'
  externalId: text("external_id"), // Unique ID from the external system (e.g., email Message-ID, call SID)
  gmailThreadId: text("gmail_thread_id"), // Gmail thread ID for grouping conversation
  gmailMessageId: text("gmail_message_id"), // Gmail message ID (unique per email)
  gcpStoragePath: text("gcp_storage_path"), // Reference to full email content in GCP Storage
  subject: text("subject"), // For emails or meeting titles
  fromAddress: text("from_address"), // For emails
  toAddress: text("to_address"), // For emails (could be an array, consider how to store if multiple)
  bodyRaw: text("body_raw"), // Full email body, call transcript, etc.
  bodySummary: text("body_summary"), // AI-generated summary or user-provided summary
  durationMinutes: integer("duration_minutes"), // For calls
  recordingUrl: text("recording_url"), // For call recordings
  metaData: jsonb("meta_data"), // Any other structured data (e.g., email headers, call tags, AI analysis results)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommunicationSchema = createInsertSchema(communications, {
  timestamp: z.coerce.date(), // Ensure timestamp is handled as Date
  metaData: z.any().optional(), // For JSONB
  durationMinutes: z.number().nullable().optional(), // For phone calls
  recordingUrl: z.string().url().nullable().optional(), // For call recordings
  bodyRaw: z.string().nullable().optional(), // Make optional (not all communications have body)
  bodySummary: z.string().nullable().optional(), // Make optional
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// --- Opportunity Email Threads Table ---
// Maps Gmail threads to opportunities for email timeline tracking
export const opportunityEmailThreads = pgTable("opportunity_email_threads", {
  id: serial("id").primaryKey(),
  gmailThreadId: text("gmail_thread_id").notNull().unique(), // Gmail thread ID (unique)
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'cascade' }), // Link to opportunity (nullable for pre-conversion)
  rawLeadId: integer("raw_lead_id").references(() => rawLeads.id, { onDelete: 'set null' }), // Link to raw lead (for pre-conversion tracking)
  primaryEmailAddress: text("primary_email_address").notNull(), // Primary email address in this thread
  participantEmails: text("participant_emails").array(), // Array of all participant emails for validation
  isActive: boolean("is_active").default(true).notNull(), // Flag to handle thread hijacking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunityEmailThreadSchema = createInsertSchema(opportunityEmailThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Menu = typeof menus.$inferSelect;
export type InsertMenu = z.infer<typeof insertMenuSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// --- NEW: Types for new tables ---
export type ContactIdentifier = typeof contactIdentifiers.$inferSelect;
export type InsertContactIdentifier = z.infer<typeof insertContactIdentifierSchema>;

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export type OpportunityEmailThread = typeof opportunityEmailThreads.$inferSelect;
export type InsertOpportunityEmailThread = z.infer<typeof insertOpportunityEmailThreadSchema>;

// Dietary characteristic tags for ingredients
export const DIETARY_TAGS = [
  { value: "gluten_free", label: "Gluten Free" },
  { value: "nut_free", label: "Nut Free" },
  { value: "dairy_free", label: "Dairy Free" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "keto", label: "Keto Friendly" },
  { value: "paleo", label: "Paleo" },
  { value: "low_carb", label: "Low Carb" },
  { value: "low_sodium", label: "Low Sodium" },
  { value: "sugar_free", label: "Sugar Free" },
  { value: "organic", label: "Organic" },
  { value: "non_gmo", label: "Non-GMO" },
  { value: "kosher", label: "Kosher" },
  { value: "halal", label: "Halal" },
] as const;

export type DietaryTag = typeof DIETARY_TAGS[number]["value"];

// Recipe dietary flags computed from ingredients
// "positive" = all ingredients must have this tag for the recipe to inherit it (e.g., vegan, gluten_free)
// If ANY ingredient lacks a positive tag, the recipe does NOT have it
export interface RecipeDietaryFlags {
  tags: string[];           // Tags the recipe has (all ingredients have these)
  warnings: string[];       // Tags the recipe lacks (at least one ingredient is missing these)
}

// Base Ingredients - what you buy in bulk
// NOTE: Database has a case-insensitive partial unique index on SKU:
// CREATE UNIQUE INDEX base_ingredients_sku_ci_unique ON base_ingredients (LOWER(sku)) WHERE sku IS NOT NULL AND sku <> '';
// This allows multiple NULL SKUs but prevents duplicate non-empty SKUs (case-insensitive)
export const baseIngredients = pgTable("base_ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // meat, produce, dairy, spices, dry_goods, seafood, beverages, etc.
  sku: text("sku"), // supplier product code for price research and reordering (unique when non-null, case-insensitive)
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(), // price as purchased
  previousPurchasePrice: numeric("previous_purchase_price", { precision: 10, scale: 2 }), // previous price for tracking changes
  purchaseUnit: text("purchase_unit").notNull(), // pound, ounce, gallon, liter, each, dozen, case, etc.
  purchaseQuantity: numeric("purchase_quantity", { precision: 10, scale: 2 }).default("1").notNull(), // usually 1, but could be 10 for "10lb case"
  supplier: text("supplier"), // optional vendor/supplier name
  notes: text("notes"), // optional storage notes, quality specs, etc.
  dietaryTags: jsonb("dietary_tags").$type<string[]>().default([]), // dietary characteristics: gluten_free, nut_free, keto, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBaseIngredientSchema = createInsertSchema(baseIngredients, {
  purchasePrice: z.coerce.number().nonnegative("Price must be non-negative"),
  purchaseQuantity: z.coerce.number().positive("Quantity must be positive").default(1),
  dietaryTags: z.array(z.string()).optional().default([]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  previousPurchasePrice: true,
});

export type BaseIngredient = typeof baseIngredients.$inferSelect;
export type InsertBaseIngredient = z.infer<typeof insertBaseIngredientSchema>;

// Recipe Ingredients - junction table linking menu items to base ingredients
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  menuItemId: text("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  baseIngredientId: integer("base_ingredient_id").notNull().references(() => baseIngredients.id, { onDelete: 'restrict' }),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).notNull(), // e.g., 0.5, 0.2, 1
  unit: text("unit").notNull(), // pound, ounce, cup, tablespoon, etc. - unit used in recipe
  prepNotes: text("prep_notes"), // optional: "diced", "julienned", "minced", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients, {
  quantity: z.coerce.number().positive("Quantity must be positive"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;

// Preparation step schema for recipes
export const preparationStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  instruction: z.string().min(1, "Instruction is required"),
  duration: z.number().int().optional(), // Duration in minutes
  tips: z.string().optional(),
  imageUrl: z.string().optional(), // Optional image for this step
});

export type PreparationStep = z.infer<typeof preparationStepSchema>;

// Standalone Recipes - grouping of ingredients with calculated costs
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // appetizer, entree, side, dessert, beverage, sauce, etc.
  yield: numeric("yield", { precision: 10, scale: 2 }).default("1"), // How many portions/servings this recipe makes
  yieldUnit: text("yield_unit").default("serving"), // serving, portion, batch, etc.
  notes: text("notes"), // Preparation notes, tips, etc.
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs for final product
  preparationSteps: jsonb("preparation_steps").$type<PreparationStep[]>().default([]), // Step-by-step cooking instructions
  dietaryFlags: jsonb("dietary_flags").$type<RecipeDietaryFlags>().default({ tags: [], warnings: [] }), // Computed dietary flags from ingredients
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipes, {
  yield: z.coerce.number().positive("Yield must be positive").default(1),
  images: z.array(z.string()).optional().default([]),
  preparationSteps: z.array(preparationStepSchema).optional().default([]),
  dietaryFlags: z.object({
    tags: z.array(z.string()),
    warnings: z.array(z.string()),
  }).optional().default({ tags: [], warnings: [] }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

// Recipe Components - junction table linking recipes to base ingredients
export const recipeComponents = pgTable("recipe_components", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  baseIngredientId: integer("base_ingredient_id").notNull().references(() => baseIngredients.id, { onDelete: 'restrict' }),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).notNull(), // e.g., 0.5, 0.2, 1
  unit: text("unit").notNull(), // pound, ounce, cup, tablespoon, etc. - unit used in recipe
  prepNotes: text("prep_notes"), // optional: "diced", "julienned", "minced", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecipeComponentSchema = createInsertSchema(recipeComponents, {
  quantity: z.coerce.number().positive("Quantity must be positive"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RecipeComponent = typeof recipeComponents.$inferSelect;
export type InsertRecipeComponent = z.infer<typeof insertRecipeComponentSchema>;

// Raw Leads module
// Add new enum types for leads scoring and quality assessment
export const leadScoreEnum = pgEnum("lead_score", ['1', '2', '3', '4', '5']);
export const leadQualityCategoryEnum = pgEnum("lead_quality_category", ['hot', 'warm', 'cold', 'nurture']);
export const budgetIndicationEnum = pgEnum("budget_indication", ['not_mentioned', 'low', 'medium', 'high', 'specific_amount']);
export const sentimentEnum = pgEnum("sentiment", ['positive', 'neutral', 'negative', 'urgent']);

// Updated status enum to include new statuses
export const rawLeadStatusEnum = pgEnum("raw_lead_status", ['new', 'under_review', 'qualified', 'archived', 'junk', 'parsing_failed', 'needs_manual_review']);

// Forward declare rawLeads for circular references
export const rawLeads = pgTable("raw_leads", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g., 'weddingwire', 'website_form', 'gmail_sync', 'manual_entry'
  rawData: jsonb("raw_data"), // Store the original request payload/email body etc.
  extractedProspectName: text("extracted_prospect_name"),
  extractedProspectEmail: text("extracted_prospect_email"),
  extractedProspectPhone: text("extracted_prospect_phone"),
  eventSummary: text("event_summary"), // Brief summary/keywords from raw_data
  receivedAt: timestamp("received_at").notNull(), // Removed defaultNow() so we can set this to the email's original date
  status: rawLeadStatusEnum("status").default('new').notNull(),
  // This field links a raw lead to the opportunity created from it.
  createdOpportunityId: integer("created_opportunity_id").references(() => opportunities.id, { onDelete: 'set null' }),
  notes: text("internal_notes"), // For internal notes about this raw lead
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id), // Optional: if raw leads can be assigned for review
  
  // New fields for AI-parsed event details
  extractedEventType: text("extracted_event_type"),
  extractedEventDate: text("extracted_event_date"),
  extractedEventTime: text("extracted_event_time"),
  extractedGuestCount: integer("extracted_guest_count"),
  extractedVenue: text("extracted_venue"),
  extractedMessageSummary: text("extracted_message_summary"),
  leadSourcePlatform: text("lead_source_platform"),
  
  // New fields for AI assessment and scoring
  aiUrgencyScore: leadScoreEnum("ai_urgency_score"),
  aiUrgencyReason: text("ai_urgency_reason"), // AI's brief explanation for urgency score
  aiBudgetIndication: budgetIndicationEnum("ai_budget_indication"),
  aiBudgetValue: integer("ai_budget_value"),
  aiBudgetReason: text("ai_budget_reason"), // AI's brief explanation for budget assessment
  aiClarityOfRequestScore: leadScoreEnum("ai_clarity_of_request_score"),
  aiClarityReason: text("ai_clarity_reason"), // AI's brief explanation for clarity score
  aiDecisionMakerLikelihood: leadScoreEnum("ai_decision_maker_likelihood"),
  aiKeyRequirements: jsonb("ai_key_requirements"),
  aiPotentialRedFlags: jsonb("ai_potential_red_flags"),
  aiOverallLeadQuality: leadQualityCategoryEnum("ai_overall_lead_quality"),
  aiSuggestedNextStep: text("ai_suggested_next_step"),
  aiSentiment: sentimentEnum("ai_sentiment"),
  aiConfidenceScore: doublePrecision("ai_confidence_score"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRawLeadSchema = createInsertSchema(rawLeads, {
  rawData: z.any().optional(),
  receivedAt: z.coerce.date().optional(),
  
  // New AI fields as optional
  aiKeyRequirements: z.any().optional(),
  aiPotentialRedFlags: z.any().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RawLead = typeof rawLeads.$inferSelect;
export type InsertRawLead = z.infer<typeof insertRawLeadSchema>;

// Define the relationships between tables
export const userRelations = relations(users, ({ many }) => ({
  opportunities: many(opportunities, { relationName: 'assignedOpportunities' }),
  estimates: many(estimates),
  rawLeads: many(rawLeads, { relationName: 'assignedRawLeads' }),
}));

export const opportunityRelations = relations(opportunities, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [opportunities.assignedTo],
    references: [users.id],
    relationName: 'assignedOpportunities'
  }),
  client: one(clients, {
    fields: [opportunities.clientId],
    references: [clients.id]
  }),
  // Related raw leads
  rawLeads: many(rawLeads, { relationName: 'createdFromOpportunity' }),
}));

export const clientRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id]
  }),
  opportunity: one(opportunities, {
    fields: [clients.opportunityId],
    references: [opportunities.id]
  }),
  estimates: many(estimates),
  events: many(events),
}));

export const estimateRelations = relations(estimates, ({ one }) => ({
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id]
  }),
  createdBy: one(users, {
    fields: [estimates.createdBy],
    references: [users.id]
  }),
  menu: one(menus, {
    fields: [estimates.menuId],
    references: [menus.id]
  }),
}));

export const eventRelations = relations(events, ({ one }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id]
  }),
  estimate: one(estimates, {
    fields: [events.estimateId],
    references: [estimates.id]
  }),
  menu: one(menus, {
    fields: [events.menuId],
    references: [menus.id]
  }),
}));

export const contactIdentifierRelations = relations(contactIdentifiers, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [contactIdentifiers.opportunityId],
    references: [opportunities.id]
  }),
  client: one(clients, {
    fields: [contactIdentifiers.clientId],
    references: [clients.id]
  }),
}));

export const communicationRelations = relations(communications, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [communications.opportunityId],
    references: [opportunities.id]
  }),
  client: one(clients, {
    fields: [communications.clientId],
    references: [clients.id]
  }),
  user: one(users, {
    fields: [communications.userId],
    references: [users.id]
  }),
}));

export const rawLeadRelations = relations(rawLeads, ({ one }) => ({
  createdOpportunity: one(opportunities, {
    fields: [rawLeads.createdOpportunityId],
    references: [opportunities.id],
    relationName: 'createdFromOpportunity'
  }),
  assignedUser: one(users, {
    fields: [rawLeads.assignedToUserId],
    references: [users.id],
    relationName: 'assignedRawLeads'
  }),
}));

// Gmail Sync State table to track the last known history ID and watch expiration
export const gmailSyncState = pgTable("gmail_sync_state", {
  targetEmail: text("target_email").primaryKey(), // The email address being watched
  lastHistoryId: text("last_history_id").notNull(),
  watchExpirationTimestamp: timestamp("watch_expiration_timestamp"), // Store when the current watch expires
  lastWatchAttemptTimestamp: timestamp("last_watch_attempt_timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGmailSyncStateSchema = createInsertSchema(gmailSyncState, {
  watchExpirationTimestamp: z.coerce.date().nullable(),
}).omit({
  createdAt: true,
  updatedAt: true,
});

export type GmailSyncState = typeof gmailSyncState.$inferSelect;
export type InsertGmailSyncState = z.infer<typeof insertGmailSyncStateSchema>;

// Processed Emails table to track which emails have been processed
export const processedEmails = pgTable("processed_emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  gmailId: text("gmail_id").notNull(),
  service: text("service").notNull(), // Which service processed this email (e.g., 'lead_gen', 'email_sync')
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  email: text("email").notNull(), // The email address this message was processed for
  subject: text("subject"),
  labelApplied: boolean("label_applied").default(false),
});

export const insertProcessedEmailSchema = createInsertSchema(processedEmails).omit({
  id: true,
  processedAt: true,
});

export type ProcessedEmail = typeof processedEmails.$inferSelect;
export type InsertProcessedEmail = z.infer<typeof insertProcessedEmailSchema>;

// --- ENUMS ---

export const formQuestionTypeEnum = pgEnum("form_question_type", [
  // Core types
  'header', 'text_display', 'textbox', 'textarea', 'email', 'phone', 'number',
  'datetime', 'time', 'checkbox_group', 'radio_group', 'dropdown',
  'full_name', 'address', 'matrix',
  // Modern, mobile-first types
  'image_upload', 'file_upload', 'signature_pad', 'rating_scale', 'slider',
  'toggle_switch', 'location_picker', 'tag_select', 'date_range_picker', 'stepper_input',
  // Advanced types
  'hidden_calculation',
]);

export const conditionalLogicActionTypeEnum = pgEnum("conditional_logic_action_type", [
  'show_question', 'hide_question', 'require_question', 'unrequire_question',
  'skip_to_page', 'enable_option', 'disable_option', 'set_value',
  'show_page', 'hide_page', // Added page-level actions
]);

export const conditionalLogicConditionTypeEnum = pgEnum("conditional_logic_condition_type", [
  'equals', 'not_equals', 'is_filled', 'is_not_filled', 'contains',
  'does_not_contain', 'greater_than', 'less_than', 'is_selected_option_value',
  'is_not_selected_option_value',
]);

export const formRuleTargetTypeEnum = pgEnum("form_rule_target_type", [
  'question', // Targets a form_page_questions instance
  'page',     // Targets a form_pages instance
]);

// --- TABLES ---

// 1. Reusable Question Building Blocks
export const questionLibrary = pgTable("question_library", {
  id: serial("id").primaryKey(),
  libraryQuestionKey: text("library_question_key").unique().notNull(),
  defaultText: text("default_text").notNull(),
  questionType: formQuestionTypeEnum("question_type").notNull(),
  defaultMetadata: jsonb("default_metadata"), // For non-matrix types, or general matrix properties.
                                             // For matrix, specific row/col structure is now in separate tables.
  defaultOptions: jsonb("default_options"), // For checkbox_group, radio_group, dropdown
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NEW: For Matrix Question Structure (linked to question_library)
export const libraryMatrixRows = pgTable("library_matrix_rows", {
  id: serial("id").primaryKey(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id, { onDelete: 'cascade' }).notNull(), // FK to the 'matrix' type question in library
  rowKey: text("row_key").notNull(), // Unique key for this row within its matrix question
  label: text("label").notNull(),
  price: text("price"), // Storing as text to allow for various formats like "$2.25 each"
  defaultMetadata: jsonb("default_metadata"), // Row-specific metadata
  rowOrder: integer("row_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    libraryQuestionRowKeyUnique: unique().on(table.libraryQuestionId, table.rowKey),
}));

export const libraryMatrixColumns = pgTable("library_matrix_columns", {
  id: serial("id").primaryKey(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id, { onDelete: 'cascade' }).notNull(), // FK to the 'matrix' type question in library
  columnKey: text("column_key").notNull(), // Unique key for this col within its matrix question (e.g., "quantity", "selection")
  header: text("header").notNull(),
  // Type of input for the cells in this column (could be a simpler enum or use formQuestionTypeEnum if cells can be complex)
  cellInputType: text("cell_input_type").notNull(), // e.g., 'number_input', 'radio_select_from_options_key', 'text_input'
  defaultMetadata: jsonb("default_metadata"), // Column-specific metadata (e.g., options for a 'radio_select' column cell, min/max for 'number_input')
  columnOrder: integer("column_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    libraryQuestionColumnKeyUnique: unique().on(table.libraryQuestionId, table.columnKey),
}));


// 2. The Overall Form Structure
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  formKey: text("form_key").unique().notNull(),
  formTitle: text("form_title").notNull(),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Pages Within a Form
export const formPages = pgTable("form_pages", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  pageTitle: text("page_title"),
  pageOrder: integer("page_order").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    formPageOrderUnique: unique().on(table.formId, table.pageOrder),
}));

// 4. Placing Library Questions onto a Form Page (The Instance)
export const formPageQuestions = pgTable("form_page_questions", {
  id: serial("id").primaryKey(),
  formPageId: integer("form_page_id").references(() => formPages.id, { onDelete: 'cascade' }).notNull(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id, { onDelete: 'restrict' }).notNull(),
  displayOrder: integer("display_order").notNull(),
  displayTextOverride: text("display_text_override"),
  isRequiredOverride: boolean("is_required_override"),
  isHiddenOverride: boolean("is_hidden_override"),
  placeholderOverride: text("placeholder_override"),
  helperTextOverride: text("helper_text_override"),
  metadataOverrides: jsonb("metadata_overrides"), // For a matrix instance, this could specify which library rows/cols are active or their overridden labels.
  optionsOverrides: jsonb("options_overrides"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    pageQuestionOrderUnique: unique().on(table.formPageId, table.displayOrder),
}));

// 5. Conditional Logic
export const formRules = pgTable("form_rules", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  triggerFormPageQuestionId: integer("trigger_form_page_question_id").references(() => formPageQuestions.id, { onDelete: 'cascade' }).notNull(),
  conditionType: conditionalLogicConditionTypeEnum("condition_type").notNull(),
  conditionValue: text("condition_value"),
  actionType: conditionalLogicActionTypeEnum("action_type").notNull(),
  // Removed single target fields: targetFormPageQuestionId, targetFormPageId
  ruleDescription: text("rule_description"),
  executionOrder: integer("execution_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NEW: Join Table for Multiple Rule Targets
export const formRuleTargets = pgTable("form_rule_targets", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => formRules.id, { onDelete: 'cascade' }).notNull(),
  targetType: formRuleTargetTypeEnum("target_type").notNull(), // 'question' or 'page'
  targetId: integer("target_id").notNull(), // This ID refers to either form_page_questions.id or form_pages.id based on target_type
  // You might add constraints or application-level checks to ensure targetId is valid for the targetType
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// 6. Client Submissions
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'restrict' }).notNull(),
  formVersion: integer("form_version").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'set null' }),
  rawLeadId: integer("raw_lead_id").references(() => rawLeads.id, { onDelete: 'set null' }),
  status: text("status").default("in_progress").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7. Answers to Questions in a Submission
export const formSubmissionAnswers = pgTable("form_submission_answers", {
  id: serial("id").primaryKey(),
  formSubmissionId: integer("form_submission_id").references(() => formSubmissions.id, { onDelete: 'cascade' }).notNull(),
  formPageQuestionId: integer("form_page_question_id").references(() => formPageQuestions.id, { onDelete: 'restrict' }).notNull(),
  // For matrix answers, answerValue would be a JSON array like:
  // [ { "rowKey": "pate_sandwich", "columnKey": "quantity_36", "value": true (if radio) or "selected" },
  //   { "rowKey": "pate_sandwich", "columnKey": "user_notes", "value": "extra crispy" } ]
  // Or, if cells are simple values: { "pate_sandwich_quantity_36": true, "pate_sandwich_user_notes": "extra crispy" }
  answerValue: jsonb("answer_value"),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});


// --- RELATIONS ---

export const questionLibraryRelations = relations(questionLibrary, ({ many }) => ({
  formPageQuestions: many(formPageQuestions),
  matrixRows: many(libraryMatrixRows),
  matrixColumns: many(libraryMatrixColumns),
}));

export const libraryMatrixRowsRelations = relations(libraryMatrixRows, ({ one }) => ({
    libraryQuestion: one(questionLibrary, {
        fields: [libraryMatrixRows.libraryQuestionId],
        references: [questionLibrary.id]
    })
}));

export const libraryMatrixColumnsRelations = relations(libraryMatrixColumns, ({ one }) => ({
    libraryQuestion: one(questionLibrary, {
        fields: [libraryMatrixColumns.libraryQuestionId],
        references: [questionLibrary.id]
    })
}));

export const formsRelations = relations(forms, ({ many }) => ({
  formPages: many(formPages),
  formRules: many(formRules),
  formSubmissions: many(formSubmissions),
}));

export const formPagesRelations = relations(formPages, ({ one, many }) => ({
  form: one(forms, { fields: [formPages.formId], references: [forms.id] }),
  formPageQuestions: many(formPageQuestions),
  // No direct relation to formRuleTargets from here, managed through formRules
}));

export const formPageQuestionsRelations = relations(formPageQuestions, ({ one, many }) => ({
  formPage: one(formPages, { fields: [formPageQuestions.formPageId], references: [formPages.id] }),
  libraryQuestion: one(questionLibrary, { fields: [formPageQuestions.libraryQuestionId], references: [questionLibrary.id] }),
  triggeringRules: many(formRules, { relationName: 'triggerQuestionRules' }),
  targetedByRuleTargets: many(formRuleTargets, { relationName: 'targetedQuestionRuleItems' }), // A question can be one of many targets for different rules
  submissionAnswers: many(formSubmissionAnswers),
}));

export const formRulesRelations = relations(formRules, ({ one, many }) => ({
  form: one(forms, { fields: [formRules.formId], references: [forms.id] }),
  triggerFormPageQuestion: one(formPageQuestions, {
    fields: [formRules.triggerFormPageQuestionId],
    references: [formPageQuestions.id],
    relationName: 'triggerQuestionRules',
  }),
  targets: many(formRuleTargets), // A rule now has many targets
}));

export const formRuleTargetsRelations = relations(formRuleTargets, ({ one }) => ({
    rule: one(formRules, {
        fields: [formRuleTargets.ruleId],
        references: [formRules.id],
    }),
    // Note: Polymorphic relation for targetId (to formPageQuestions or formPages)
    // is tricky with Drizzle's static relations. You'd handle this join logic in your queries
    // based on the 'targetType'. For example, if targetType is 'question', join targetId with formPageQuestions.id.
    // For Drizzle's `relations`, you might define two optional relations and only one would be valid per row.
    targetQuestion: one(formPageQuestions, {
        fields: [formRuleTargets.targetId],
        references: [formPageQuestions.id],
        relationName: 'targetedQuestionRuleItems'
    }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one, many }) => ({
  form: one(forms, { fields: [formSubmissions.formId], references: [forms.id] }),
  user: one(users, { fields: [formSubmissions.userId], references: [users.id] }),
  client: one(clients, { fields: [formSubmissions.clientId], references: [clients.id] }),
  opportunity: one(opportunities, { fields: [formSubmissions.opportunityId], references: [opportunities.id] }),
  rawLead: one(rawLeads, { fields: [formSubmissions.rawLeadId], references: [rawLeads.id] }),
  answers: many(formSubmissionAnswers),
}));

export const formSubmissionAnswersRelations = relations(formSubmissionAnswers, ({ one }) => ({
  submission: one(formSubmissions, { fields: [formSubmissionAnswers.formSubmissionId], references: [formSubmissions.id] }),
  formPageQuestion: one(formPageQuestions, { fields: [formSubmissionAnswers.formPageQuestionId], references: [formPageQuestions.id] }),
}));