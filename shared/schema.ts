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
  role: text("role").default("user").notNull(), // admin, user (read-only), client
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
  createdBy: integer("created_by").references(() => users.id),
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

// Menu Recipe Item - represents a recipe in a menu with optional category override
export interface MenuRecipeItem {
  recipeId: number;
  category?: string; // Optional category override (appetizer, entree, side, dessert, etc.)
  servings?: number; // Optional servings multiplier
}

// Menu package (tier) — used in menus.packages JSONB
export interface MenuPackageTier {
  tierKey: string;                    // "bronze" | "silver" | "gold" | "diamond" | custom
  tierName: string;                   // "Bronze Package"
  pricePerPersonCents: number;        // e.g., 2800 = $28.00/person
  description?: string;
  displayOrder: number;
  minGuestCount?: number;             // e.g., Bronze requires 50+
  selectionLimits: Record<string, number>; // { protein: 3, side: 2, salsa: 3, condiment: 5 }
  included?: string[];                // e.g., ["Chips & Salsa Appetizer"] for Diamond extras
}

// Category item — appears in menus.categoryItems JSONB
export interface MenuCategoryItem {
  id: string;                         // stable slug, e.g., "barbacoa"
  name: string;
  description?: string;
  upchargeCents?: number;             // per-person upcharge when selected
  recipeId?: number;                  // optional link to recipes table
  dietaryTags?: string[];             // vegan, vegetarian, gluten_free, contains_nuts, etc.
  notAvailableForStyles?: string[];   // e.g., ["plated"] for items that can't be plated
}

// Menus (collection of recipes and packages)
export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // standard, custom, seasonal
  eventType: eventTypeEnum("event_type").default("other").notNull(), // wedding, corporate, birthday, etc.
  themeKey: text("theme_key"),        // slug for the quote form to reference, e.g., "taco_fiesta"
  recipes: jsonb("recipes").$type<MenuRecipeItem[]>().default([]).notNull(), // array of recipe references
  packages: jsonb("packages").$type<MenuPackageTier[]>().default([]), // tier definitions (bronze/silver/gold/diamond)
  categoryItems: jsonb("category_items").$type<Record<string, MenuCategoryItem[]>>().default({}), // items grouped by category
  displayOrder: integer("display_order").default(0), // for ordering on the quote form
  isPubliclyVisible: boolean("is_publicly_visible").default(true),
  displayOnCustomerForm: boolean("display_on_customer_form").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for menu recipes array
const menuRecipesSchema = z.array(z.object({
  recipeId: z.number(),
  category: z.string().optional(),
  servings: z.number().optional(),
}));

export const insertMenuSchema = createInsertSchema(menus, {
  recipes: menuRecipesSchema,
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

// Dietary characteristic tags for ingredients - used on base ingredients
// Includes both allergen CONTAINS tags (propagate to recipes) and general dietary info
export const DIETARY_TAGS = [
  // Allergen CONTAINS tags (auto-propagate warnings to recipes)
  { value: "contains_gluten", label: "Contains Gluten", isAllergen: true },
  { value: "contains_nuts", label: "Contains Nuts", isAllergen: true },
  { value: "contains_dairy", label: "Contains Dairy", isAllergen: true },
  { value: "contains_egg", label: "Contains Egg", isAllergen: true },
  { value: "contains_soy", label: "Contains Soy", isAllergen: true },
  { value: "contains_shellfish", label: "Contains Shellfish", isAllergen: true },
  { value: "contains_sesame", label: "Contains Sesame", isAllergen: true },
  // General dietary tags (informational, do not auto-propagate)
  { value: "vegan", label: "Vegan", isAllergen: false },
  { value: "vegetarian", label: "Vegetarian", isAllergen: false },
  { value: "organic", label: "Organic", isAllergen: false },
  { value: "non_gmo", label: "Non-GMO", isAllergen: false },
  { value: "kosher", label: "Kosher", isAllergen: false },
  { value: "halal", label: "Halal", isAllergen: false },
] as const;

export type DietaryTag = typeof DIETARY_TAGS[number]["value"];

// Allergen CONTAINS tags - used on base ingredients to indicate allergen presence
// These auto-propagate to recipes: if ANY ingredient contains an allergen, recipe gets a warning
export const ALLERGEN_CONTAINS_TAGS = [
  { value: "contains_gluten", label: "Contains Gluten", warning: "Contains Gluten" },
  { value: "contains_nuts", label: "Contains Nuts", warning: "Contains Nuts" },
  { value: "contains_dairy", label: "Contains Dairy", warning: "Contains Dairy" },
  { value: "contains_egg", label: "Contains Egg", warning: "Contains Egg" },
  { value: "contains_soy", label: "Contains Soy", warning: "Contains Soy" },
  { value: "contains_shellfish", label: "Contains Shellfish", warning: "Contains Shellfish" },
  { value: "contains_sesame", label: "Contains Sesame", warning: "Contains Sesame" },
] as const;

export type AllergenContainsTag = typeof ALLERGEN_CONTAINS_TAGS[number]["value"];

// Lifestyle tags that require manual recipe certification (NOT auto-computed)
// These depend on the whole recipe, not just individual ingredients
export const LIFESTYLE_TAGS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "keto", label: "Keto Friendly" },
  { value: "paleo", label: "Paleo" },
  { value: "low_carb", label: "Low Carb" },
  { value: "low_sodium", label: "Low Sodium" },
  { value: "sugar_free", label: "Sugar Free" },
  { value: "organic", label: "Organic" },
  { value: "kosher", label: "Kosher" },
  { value: "halal", label: "Halal" },
] as const;

export type LifestyleTag = typeof LIFESTYLE_TAGS[number]["value"];

// Recipe dietary flags - combines auto-computed allergen warnings with manual designations
export interface RecipeDietaryFlags {
  allergenWarnings: string[];    // Auto-computed: allergens present (e.g., "Contains Gluten", "Contains Nuts")
  manualDesignations: string[];  // User-set lifestyle certifications (e.g., "vegan", "keto")
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
  // Custom unit conversions used when a recipe calls for this ingredient in a unit
  // that is incompatible with the purchase unit (e.g., cup → kilogram).
  // Shape: Record<recipeUnit, purchaseUnitFactor>
  //   e.g., for artichokes purchased in "pound":
  //     { "cup": 0.33 }  means 1 cup = 0.33 pounds
  //   e.g., for flour purchased in "kilogram":
  //     { "cup": 0.125 }  means 1 cup = 0.125 kg
  unitConversions: jsonb("unit_conversions").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBaseIngredientSchema = createInsertSchema(baseIngredients, {
  purchasePrice: z.coerce.number().nonnegative("Price must be non-negative"),
  purchaseQuantity: z.coerce.number().positive("Quantity must be positive").default(1),
  dietaryTags: z.array(z.string()).optional().default([]),
  unitConversions: z.record(z.string(), z.number().positive()).optional().default({}),
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

// Labor cost constant — $35/hour for kitchen staff
// Stored in cents to avoid floating-point issues in calculations
export const LABOR_RATE_PER_HOUR_CENTS = 3500;

// Standalone Recipes - grouping of ingredients with calculated costs
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // appetizer, entree, side, dessert, beverage, sauce, etc.
  yield: numeric("yield", { precision: 10, scale: 2 }).default("1"), // How many portions/servings this recipe makes
  yieldUnit: text("yield_unit").default("serving"), // serving, portion, batch, etc.
  // Labor time to prepare this recipe (for the full yield, not per serving).
  // Multiplied by LABOR_RATE_PER_HOUR_CENTS to get the labor component of total cost.
  laborHours: numeric("labor_hours", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"), // Preparation notes, tips, etc.
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs for final product
  preparationSteps: jsonb("preparation_steps").$type<PreparationStep[]>().default([]), // Step-by-step cooking instructions
  dietaryFlags: jsonb("dietary_flags").$type<RecipeDietaryFlags>().default({ allergenWarnings: [], manualDesignations: [] }), // Allergen warnings (auto) + manual certifications
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipes, {
  yield: z.coerce.number().positive("Yield must be positive").default(1),
  laborHours: z.coerce.number().nonnegative("Labor hours must be non-negative").default(0),
  images: z.array(z.string()).optional().default([]),
  preparationSteps: z.array(preparationStepSchema).optional().default([]),
  dietaryFlags: z.object({
    allergenWarnings: z.array(z.string()),
    manualDesignations: z.array(z.string()),
  }).optional().default({ allergenWarnings: [], manualDesignations: [] }),
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
  createdBy: integer("created_by").references(() => users.id),

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

// ============================================
// QUOTE REQUEST SYSTEM
// ============================================

// --- Venues ---
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  hasKitchen: boolean("has_kitchen"),
  hasElectricity: boolean("has_electricity").default(true),
  hasWater: boolean("has_water").default(true),
  capacity: integer("capacity"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

// --- Promo Codes ---
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes, {
  discountPercent: z.coerce.number().min(0).max(100),
}).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

// --- Quote Request Status Enum ---
export const quoteRequestStatusEnum = pgEnum("quote_request_status", [
  "draft",        // Customer started but hasn't submitted
  "submitted",    // Customer submitted the form
  "reviewing",    // Staff is reviewing
  "quoted",       // Estimate has been generated
  "converted",    // Converted to opportunity/booking
  "expired",      // Quote expired without action
  "archived",     // Manually archived
]);

// --- Quote Request Service Type Enum ---
export const serviceTypeEnum = pgEnum("service_type", [
  "buffet",
  "plated",
  "family_style",
  "cocktail_party",
  "breakfast_brunch",
  "sandwich",
  "food_truck",
  "kids_party",
]);

// --- Quote Request Service Style Enum ---
export const serviceStyleEnum = pgEnum("service_style", [
  "drop_off",
  "standard",
  "full_service_no_setup",
  "full_service",
]);

// --- Structured JSONB types for quote_requests ---

export interface QuoteAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface QuoteMenuSelection {
  itemId?: string;       // reference to menu_items.id if available
  name: string;
  category: string;      // protein, side, salad, salsa, condiment, sauce, spread, pasta
  upcharge?: number;     // per-person upcharge if applicable
}

export interface QuoteAppetizer {
  category: string;      // tea_sandwiches, shooters, skewers, canapes, vol_au_vents, simple_fare, charcuterie, spreads
  itemName: string;
  pricePerPiece: number;
  quantity: number;       // lot size selected
  subtotal: number;
}

export interface QuoteDessert {
  itemName: string;
  pricePerPiece: number;
  quantity: number;
  subtotal: number;
}

export interface QuoteBeverages {
  hasNonAlcoholic: boolean;
  nonAlcoholicSelections?: string[];
  mocktails?: string[];
  hasAlcoholic: boolean;
  bartendingType?: "dry_hire" | "wet_hire";
  drinkingGuestCount?: number;
  bartendingDurationHours?: number;
  alcoholSelections?: string[];
  liquorQuality?: "well" | "mid_shelf" | "top_shelf";
  additionalCocktails?: number;
  glassware?: boolean;
  barEquipment?: string[];
  tableWaterService?: boolean;
  coffeeTeaService?: boolean;
  servingWareType?: string;
  notes?: string;
}

export interface QuoteEquipmentItem {
  item: string;
  category: string;     // linens, serving_ware, furniture
  pricePerUnit: number;
  quantity: number;
  subtotal: number;
}

export interface QuoteDietary {
  restrictions?: string[];     // vegan, vegetarian, gluten_free, paleo, halal, kosher
  allergies?: string[];        // dairy, eggs, soy, peanuts, fish, shellfish, wheat, tree_nuts, sesame
  specialNotes?: string;
}

// AI enrichment fields — populated asynchronously after submission
export interface QuoteAiAnalysis {
  eventComplexityScore?: number;       // 1-10 how complex this event is to execute
  estimatedPrepHours?: number;         // AI-estimated prep time
  recommendedStaffCount?: number;      // AI-suggested staffing level
  suggestedUpsells?: Array<{ item: string; reason: string; estimatedValue: number }>;
  suggestedAlternatives?: Array<{ original: string; suggestion: string; reason: string }>;
  pricingConfidence?: number;          // 0-1 confidence in the auto-calculated price
  marginEstimate?: number;             // estimated margin percentage
  similarPastEvents?: number[];        // IDs of similar past quote_requests for reference
  autoGeneratedNotes?: string;         // AI summary for the sales team
  analyzedAt?: string;                 // ISO timestamp of when AI analysis ran
}

// --- Quote Requests ---
export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),

  // Status & Workflow
  status: quoteRequestStatusEnum("status").default("draft").notNull(),

  // Source & Attribution
  source: text("source"),                        // website, wedding_wire, the_knot, zola, google, referral, etc.
  referralDetail: text("referral_detail"),        // free text: "recommended by Sarah", "found on Instagram", etc.
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  decisionTimeline: text("decision_timeline"),    // 7_to_10_days, 10_to_20_days, 20_to_30_days, 30_to_60_days

  // Contact Info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  partnerFirstName: text("partner_first_name"),
  partnerLastName: text("partner_last_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  companyName: text("company_name"),
  billingAddress: jsonb("billing_address").$type<QuoteAddress>(),

  // Event Details — proper columns for AI queryability
  eventType: text("event_type").notNull(),        // wedding, corporate, birthday, engagement, cocktail_party, other
  eventDate: timestamp("event_date"),
  eventStartTime: text("event_start_time"),
  eventEndTime: text("event_end_time"),
  guestCount: integer("guest_count").notNull(),

  // Venue
  venueId: integer("venue_id").references(() => venues.id),
  venueName: text("venue_name"),
  venueAddress: jsonb("venue_address").$type<QuoteAddress>(),
  venueHasKitchen: boolean("venue_has_kitchen"),
  venueContactName: text("venue_contact_name"),
  venueContactPhone: text("venue_contact_phone"),

  // Ceremony (weddings)
  hasCeremony: boolean("has_ceremony").default(false),
  ceremonySameSpace: boolean("ceremony_same_space"),
  ceremonyStartTime: text("ceremony_start_time"),
  ceremonyEndTime: text("ceremony_end_time"),

  // Service Configuration — proper columns for filtering/analysis
  serviceType: serviceTypeEnum("service_type"),
  serviceStyle: serviceStyleEnum("service_style"),

  // Meal Timing
  hasCocktailHour: boolean("has_cocktail_hour").default(false),
  cocktailStartTime: text("cocktail_start_time"),
  cocktailEndTime: text("cocktail_end_time"),
  hasMainMeal: boolean("has_main_meal").default(true),
  mainMealStartTime: text("main_meal_start_time"),
  mainMealEndTime: text("main_meal_end_time"),

  // Menu Selections — theme/tier as columns, detailed items in JSONB
  menuTheme: text("menu_theme"),                  // taco_fiesta, bbq, greece, kebab, italy, vegan, custom
  menuTier: text("menu_tier"),                    // bronze, silver, gold, diamond
  menuSelections: jsonb("menu_selections").$type<QuoteMenuSelection[]>().default([]),

  // Appetizers, Desserts, Beverages, Equipment — complex nested structures in JSONB
  appetizers: jsonb("appetizers").$type<{ serviceStyle?: string; selections: QuoteAppetizer[] }>(),
  desserts: jsonb("desserts").$type<QuoteDessert[]>(),
  beverages: jsonb("beverages").$type<QuoteBeverages>(),
  equipment: jsonb("equipment").$type<{ items: QuoteEquipmentItem[]; otherNotes?: string }>(),

  // Dietary
  dietary: jsonb("dietary").$type<QuoteDietary>(),

  // Pricing (auto-calculated, stored in cents)
  estimatedPerPersonCents: integer("estimated_per_person_cents"),
  estimatedSubtotalCents: integer("estimated_subtotal_cents"),
  estimatedServiceFeeCents: integer("estimated_service_fee_cents"),
  estimatedTaxCents: integer("estimated_tax_cents"),
  estimatedTotalCents: integer("estimated_total_cents"),

  // Referral needs
  referralNeeds: jsonb("referral_needs").$type<string[]>(),  // cakes, event_planner, florist, dj, photographer, videographer

  // Notes
  specialRequests: text("special_requests"),
  internalNotes: text("internal_notes"),

  // AI Analysis — populated asynchronously after submission
  aiAnalysis: jsonb("ai_analysis").$type<QuoteAiAnalysis>(),

  // Links to other entities (set when converted)
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  estimateId: integer("estimate_id").references(() => estimates.id),

  // Timestamps
  submittedAt: timestamp("submitted_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteRequestSchema = createInsertSchema(quoteRequests, {
  eventDate: z.coerce.date().nullable().optional(),
  guestCount: z.coerce.number().int().positive(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  menuSelections: z.array(z.object({
    itemId: z.string().optional(),
    name: z.string(),
    category: z.string(),
    upcharge: z.number().optional(),
  })).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  convertedAt: true,
  opportunityId: true,
  estimateId: true,
  aiAnalysis: true,
  estimatedPerPersonCents: true,
  estimatedSubtotalCents: true,
  estimatedServiceFeeCents: true,
  estimatedTaxCents: true,
  estimatedTotalCents: true,
});

export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;

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

// Quote Request System Relations
export const quoteRequestRelations = relations(quoteRequests, ({ one }) => ({
  venue: one(venues, { fields: [quoteRequests.venueId], references: [venues.id] }),
  promoCode: one(promoCodes, { fields: [quoteRequests.promoCodeId], references: [promoCodes.id] }),
  opportunity: one(opportunities, { fields: [quoteRequests.opportunityId], references: [opportunities.id] }),
  estimate: one(estimates, { fields: [quoteRequests.estimateId], references: [estimates.id] }),
}));

export const venueRelations = relations(venues, ({ many }) => ({
  quoteRequests: many(quoteRequests),
}));