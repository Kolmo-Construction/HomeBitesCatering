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

// Tier 4: Proper status enums (replacing free text)
export const opportunityStatusEnum = pgEnum("opportunity_status", [
  'new', 'contacted', 'qualified', 'proposal', 'booked', 'lost', 'archived'
]);
export const quoteStatusEnum = pgEnum("quote_status", [
  'draft', 'sent', 'viewed', 'accepted', 'declined'
]);
export const eventStatusEnum = pgEnum("event_status", [
  'confirmed', 'in_progress', 'completed', 'cancelled'
]);

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
  status: opportunityStatusEnum("status").default("new").notNull(),
  opportunitySource: text("opportunity_source"), // website, referral, google, social, etc.
  priority: opportunityPriorityEnum("priority").default('medium'),
  assignedTo: integer("assigned_to").references(() => users.id),
  clientId: integer("client_id"), // Will be set as foreign key after clients table is defined
  createdBy: integer("created_by").references(() => users.id),
  inquiryToken: text("inquiry_token"),
  inquirySentAt: timestamp("inquiry_sent_at"),
  inquiryViewedAt: timestamp("inquiry_viewed_at"),
  // Tier 4: Soft delete
  deletedAt: timestamp("deleted_at"),
  // --- Tier 1: Merge Leads + Opportunities ---
  rawLeadId: integer("raw_lead_id"), // FK to rawLeads set after rawLeads table is defined
  leadData: jsonb("lead_data"), // AI scoring & parsed data carried from rawLead on conversion
  lostReason: text("lost_reason"), // Free-text reason when deal is lost
  statusChangedAt: timestamp("status_changed_at").defaultNow(), // Tracks when status last changed (not just any edit)
  lastFollowUpAt: timestamp("last_follow_up_at"), // Prevents over-pinging in auto follow-up engine
  // --- P1-2: Auto-send follow-up drip state ---
  // Clock starts when the customer first views their quote. Engine advances
  // one step at a time based on days-since-start. Null paused_at = active.
  followUpSequenceStartedAt: timestamp("follow_up_sequence_started_at"),
  followUpSequenceStep: integer("follow_up_sequence_step").default(0).notNull(), // 0 = not started, 1-5 = step last completed
  followUpSequencePausedAt: timestamp("follow_up_sequence_paused_at"),
  // --- P2-3: Marketing / source attribution ---
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  referrer: text("referrer"), // document.referrer at submit time
  // --- Tier 2: Time-in-stage tracking ---
  statusHistory: jsonb("status_history").$type<Array<{ status: string; changedAt: string; changedBy?: number }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities, {
  eventDate: z.string().nullable().transform(date => date ? new Date(date) : null),
  priority: z.enum(opportunityPriorityEnum.enumValues).optional(),
  opportunitySource: z.string().optional(),
  leadData: z.any().optional(),
  rawLeadId: z.number().optional().nullable(),
  statusChangedAt: z.coerce.date().optional().nullable(),
  lastFollowUpAt: z.coerce.date().optional().nullable(),
  followUpSequenceStartedAt: z.coerce.date().optional().nullable(),
  followUpSequenceStep: z.number().optional(),
  followUpSequencePausedAt: z.coerce.date().optional().nullable(),
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
  // Tier keys this item is available in (e.g., ["silver", "gold", "diamond"]).
  // Empty/undefined = available in all tiers. Used to gate premium items like
  // shrimp or ribeye to higher tiers, and to make margin math realistic.
  availableInTiers?: string[];
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

// Client type — prospect (has quote/quote but hasn't paid) vs customer (accepted quote or booked event)
export const clientTypeEnum = pgEnum("client_type", ["prospect", "customer"]);

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
  type: clientTypeEnum("type").default("prospect").notNull(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  deletedAt: timestamp("deleted_at"), // Tier 4: Soft delete
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

// Quotes/Proposals
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
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
  // Full customer-facing wedding proposal payload. When present, this is the
  // single source of truth for the public quote page — couple names, timeline,
  // menu selections, appetizers, desserts, beverages, dietary, special requests,
  // venue, pricing. Populated at inquiry → quote conversion and edited
  // by the admin before send. See shared/proposal.ts for the Proposal type.
  proposal: jsonb("proposal"),
  subtotal: integer("subtotal").notNull(), // stored in cents
  tax: integer("tax").notNull(), // stored in cents
  total: integer("total").notNull(), // stored in cents
  status: quoteStatusEnum("status").default("draft").notNull(),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  declinedReason: text("declined_reason"), // customer's reason if they click Decline
  // P0-3: Decline feedback — magic-link token + categorized reason
  declineFeedbackToken: text("decline_feedback_token").unique(),
  declineFeedbackSubmittedAt: timestamp("decline_feedback_submitted_at"),
  declineCategory: text("decline_category"), // 'pricing'|'menu'|'timing'|'other'
  // P0-2: "I Need More Info" path — client wants to talk before deciding
  infoRequestedAt: timestamp("info_requested_at"),
  infoRequestNote: text("info_request_note"),
  consultationBookedAt: timestamp("consultation_booked_at"),
  consultationMeetingUrl: text("consultation_meeting_url"),
  // Unguessable token used in public quote URLs (/quote/:token). Null until the quote is sent.
  viewToken: text("view_token").unique(),
  autoGenerated: boolean("auto_generated").default(false),
  currentVersion: integer("current_version").default(1).notNull(),
  deletedAt: timestamp("deleted_at"), // Tier 4: Soft delete
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes, {
  eventDate: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  viewedAt: z.coerce.date().nullable(),
  acceptedAt: z.coerce.date().nullable(),
  declinedAt: z.coerce.date().nullable(),
  declineFeedbackSubmittedAt: z.coerce.date().nullable().optional(),
  infoRequestedAt: z.coerce.date().nullable().optional(),
  consultationBookedAt: z.coerce.date().nullable().optional(),
  autoGenerated: z.boolean().optional(),
  currentVersion: z.number().optional(),
  opportunityId: z.number().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Tier 3: Quote Versions — snapshot of each proposal revision
export const quoteVersions = pgTable("quote_versions", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  version: integer("version").notNull(), // 1-based
  proposal: jsonb("proposal").notNull(), // Full proposal snapshot
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  changeNote: text("change_note"), // Optional: "customer requested fewer guests"
  changedBy: integer("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteVersionSchema = createInsertSchema(quoteVersions).omit({
  id: true,
  createdAt: true,
});

export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type InsertQuoteVersion = z.infer<typeof insertQuoteVersionSchema>;

// Tier 3: Client magic-link tokens for portal access
export const clientMagicLinks = pgTable("client_magic_links", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Acceptance audit trail — formalizes the "Accept on quote" clickwrap so it
// holds up as a binding contract without a third-party e-signature vendor.
// Every quote acceptance writes one row capturing the typed name, IP, UA,
// token used, and timestamp. Paired with the stored proposal on the quote
// row, this becomes the permanent legal record.
export const acceptanceAuditLog = pgTable("acceptance_audit_log", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  typedName: text("typed_name").notNull(),
  customerEmail: text("customer_email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // The viewToken the customer used when accepting — useful for forensic
  // matching against email delivery logs.
  tokenUsed: text("token_used"),
  // The exact T&Cs text + version the customer accepted (denormalized so a
  // future edit to the boilerplate doesn't retroactively change what they
  // agreed to).
  termsSnapshot: text("terms_snapshot"),
  termsVersion: text("terms_version"),
  // Per-doc acceptance record. Shape: [{ docId, version, body? }]. Lets us
  // support optional docs (like the leftover-food release) alongside the
  // main T&Cs without overloading termsSnapshot/version above.
  acceptedDocs: jsonb("accepted_docs").$type<Array<{
    docId: string;
    version: string;
    snapshot?: string;
  }>>(),
  leftoverReleaseSignedAt: timestamp("leftover_release_signed_at"),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

// Tier 3: Client portal session tokens (issued after magic link verified)
export const clientSessions = pgTable("client_sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tier 4: Audit Log — tracks every create/update/delete across core entities
export const auditLogActionEnum = pgEnum("audit_log_action", [
  'created', 'updated', 'deleted', 'restored', 'merged'
]);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // opportunity, client, quote, event, inquiry
  entityId: integer("entity_id").notNull(),
  action: auditLogActionEnum("action").notNull(),
  userId: integer("user_id").references(() => users.id),
  changes: jsonb("changes"), // { field: { old, new } } diff
  metadata: jsonb("metadata"), // extra context (e.g. merge source, bulk action ID)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;

// Events (confirmed bookings)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id),
  // Direct FKs to the originating opportunity and inquiry so reports and exports
  // don't have to join through `quotes`. Nullable because events can be created
  // manually (no upstream pipeline) or from legacy data that pre-dates this link.
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  inquiryId: integer("inquiry_id").references(() => inquiries.id),
  // Agreed total at the moment of acceptance — snapshotted so later quote edits
  // don't retroactively change what the customer committed to.
  totalCents: integer("total_cents"),
  eventDate: timestamp("event_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  eventType: text("event_type").notNull(),
  guestCount: integer("guest_count").notNull(),
  venue: text("venue").notNull(),
  menuId: integer("menu_id").references(() => menus.id),
  status: eventStatusEnum("status").default("confirmed").notNull(),
  notes: text("notes"),
  // Checklist state — array of checklist item ids that have been marked complete.
  // Shopping list check-offs are stored under a "shopping:<ingredient>" prefix in the same array.
  completedTasks: jsonb("completed_tasks").$type<string[]>().default([]).notNull(),
  // Unguessable token used in customer-facing event URLs (/event/:token).
  // Minted on event creation; can be rotated later if a link leaks.
  viewToken: text("view_token").unique(),
  // P0-4: Post-event review + referral tracking
  reviewRequestSentAt: timestamp("review_request_sent_at"),
  reviewLeftAt: timestamp("review_left_at"),
  referralsGenerated: integer("referrals_generated").default(0).notNull(),
  // When the customer accepted the optional "Leftover Food Release of
  // Liability" at sign time. Null = not signed → kitchen does not send
  // leftovers home day-of. Checked on prep day.
  leftoverReleaseSignedAt: timestamp("leftover_release_signed_at"),
  // P2-2: Deposit + balance payment tracking (Square Checkout)
  depositPercent: integer("deposit_percent").default(35).notNull(),
  depositAmountCents: integer("deposit_amount_cents"),
  depositPaidAt: timestamp("deposit_paid_at"),
  depositSquarePaymentLinkId: text("deposit_square_payment_link_id"),
  depositSquarePaymentLinkUrl: text("deposit_square_payment_link_url"),
  depositSquareOrderId: text("deposit_square_order_id"),
  depositSquarePaymentId: text("deposit_square_payment_id"),
  balanceAmountCents: integer("balance_amount_cents"),
  balancePaidAt: timestamp("balance_paid_at"),
  balanceRequestedAt: timestamp("balance_requested_at"),
  balanceSquarePaymentLinkId: text("balance_square_payment_link_id"),
  balanceSquarePaymentLinkUrl: text("balance_square_payment_link_url"),
  balanceSquareOrderId: text("balance_square_order_id"),
  balanceSquarePaymentId: text("balance_square_payment_id"),
  deletedAt: timestamp("deleted_at"), // Tier 4: Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events, {
  completedTasks: z.array(z.string()).optional(),
  reviewRequestSentAt: z.coerce.date().nullable().optional(),
  reviewLeftAt: z.coerce.date().nullable().optional(),
  referralsGenerated: z.number().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- P1-1: Tasting Bookings Table ---
// Customer-paid tasting experiences. Created from a Cal.com booking webhook,
// then a Square Checkout link is issued for payment. Status transitions:
// scheduled → completed|cancelled|no_show. Paid-or-not is tracked separately
// via paidAt + squarePaymentId so a tasting can be scheduled but unpaid.
export const tastingStatusEnum = pgEnum("tasting_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const tastings = pgTable("tastings", {
  id: serial("id").primaryKey(),
  // Optional links — tastings can be booked by new leads with no opportunity yet.
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'set null' }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: 'set null' }),

  // Contact info — duplicated so we can reach them even without a linked opp/client
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),

  scheduledAt: timestamp("scheduled_at").notNull(),
  guestCount: integer("guest_count").notNull().default(2), // 2-3 per spec
  // Pricing stored in cents for consistency with the rest of the money fields
  pricePerGuestCents: integer("price_per_guest_cents").notNull().default(0),
  totalPriceCents: integer("total_price_cents").notNull().default(12500), // $125 flat default per spec

  status: tastingStatusEnum("status").notNull().default("scheduled"),

  // Square payment tracking
  squarePaymentLinkId: text("square_payment_link_id"),
  squarePaymentLinkUrl: text("square_payment_link_url"),
  squarePaymentId: text("square_payment_id"),
  squareOrderId: text("square_order_id"),
  paidAt: timestamp("paid_at"),

  // Link back to Cal.com booking so we can reconcile on cancel/reschedule
  calBookingId: text("cal_booking_id"),
  calBookingUid: text("cal_booking_uid"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTastingSchema = createInsertSchema(tastings, {
  scheduledAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Tasting = typeof tastings.$inferSelect;
export type InsertTasting = z.infer<typeof insertTastingSchema>;

// --- P2-1: Contracts Table ---
// E-signature workflow. A contract is a BoldSign document with state tracking.
// Status flows: draft → sent → viewed → signed | declined | expired.
// We store BoldSign's documentId so we can fetch the signed PDF later.
export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "cancelled",
]);

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: 'set null' }),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: 'set null' }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }).notNull(),
  // BoldSign/Dropbox Sign integration fields
  providerDocId: text("provider_doc_id"), // BoldSign documentId
  provider: text("provider").notNull().default("boldsign"),
  signingUrl: text("signing_url"), // URL the signer opens in their inbox link
  status: contractStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  declinedAt: timestamp("declined_at"),
  expiredAt: timestamp("expired_at"),
  pdfUrl: text("pdf_url"), // Signed PDF URL from BoldSign (they store it long-term)
  // Snapshot of the proposal at the time of sending — critical for dispute resolution
  contractSnapshot: jsonb("contract_snapshot"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contracts, {
  sentAt: z.coerce.date().nullable().optional(),
  viewedAt: z.coerce.date().nullable().optional(),
  signedAt: z.coerce.date().nullable().optional(),
  declinedAt: z.coerce.date().nullable().optional(),
  expiredAt: z.coerce.date().nullable().optional(),
  contractSnapshot: z.any().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// --- NEW: Contact Identifiers Table ---
export const identifierTypeEnum = pgEnum("identifier_type", ["email", "phone", "sms", "whatsapp", "instagram", "web_chat", "other"]);

export const contactIdentifiers = pgTable("contact_identifiers", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'cascade' }), // Link to opportunity
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'cascade' }), // Link to client
  type: identifierTypeEnum("type").notNull(), // 'email', 'phone', 'sms', 'whatsapp', 'instagram', 'web_chat', 'other'
  value: text("value").notNull(), // The actual email address, phone number, handle, etc.
  label: text("label"), // Optional human-readable label (e.g., "Work email", "Mom's phone")
  isPrimary: boolean("is_primary").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(), // Whether this identifier has been confirmed (e.g., email opened, call answered)
  source: text("source"), // How this identifier was added (e.g., 'lead_form', 'email_sync', 'manual_entry', 'web_chat', 'gmail_sync')
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactIdentifierSchema = createInsertSchema(contactIdentifiers).omit({
  id: true,
  createdAt: true,
});

// --- NEW: Communications/Interactions Table ---
export const communicationTypeEnum = pgEnum("communication_type", ["email", "call", "sms", "note", "meeting", "in_person", "web_chat", "hand_written", "whatsapp"]);
export const communicationDirectionEnum = pgEnum("communication_direction", ["incoming", "outgoing", "internal"]);

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'set null' }), // Link to opportunity
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }), // Link to client
  eventId: integer("event_id").references(() => events.id, { onDelete: 'set null' }), // Link to event (for post-booking chef context)
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

// --- Follow-Up Drafts Table (Tier 1: Auto-Follow-Up Engine) ---
// Stores DRAFT follow-ups generated by the system. Nothing is sent automatically.
// Admin must review, optionally edit, then explicitly approve/send each draft.
export const followUpDraftStatusEnum = pgEnum("follow_up_draft_status", [
  "pending",   // Created by engine, awaiting admin review
  "approved",  // Admin approved, ready to send (or sent immediately on approval)
  "sent",      // Email sent to customer
  "edited",    // Admin edited the draft (still needs send)
  "cancelled", // Admin dismissed this draft
]);

export const followUpDraftTypeEnum = pgEnum("follow_up_draft_type", [
  "inquiry_not_opened",     // Inquiry sent but customer hasn't clicked
  "inquiry_not_submitted",  // Customer opened inquiry link but didn't submit
  "quote_not_viewed",       // Quote sent but customer hasn't opened
  "quote_no_action",        // Customer viewed quote but hasn't accepted/declined
  "quote_expiring_soon",    // Quote expires within 3 days
  "opportunity_stale",      // Opportunity hasn't moved status in 7+ days
  "drip_phone_call",        // P1-2: Day-7 drip step — a task for Mike to call the client
]);

export const followUpDrafts = pgTable("follow_up_drafts", {
  id: serial("id").primaryKey(),
  type: followUpDraftTypeEnum("type").notNull(),
  // Which entity triggered this draft
  opportunityId: integer("opportunity_id").references(() => opportunities.id, { onDelete: 'cascade' }),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: 'cascade' }),
  // Email content (editable by admin before send)
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  // Status tracking
  status: followUpDraftStatusEnum("status").default("pending").notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id), // Admin who reviewed
  sentAt: timestamp("sent_at"),
  // Metadata
  triggerReason: text("trigger_reason"), // Human-readable reason this was generated
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFollowUpDraftSchema = createInsertSchema(followUpDrafts, {
  sentAt: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FollowUpDraft = typeof followUpDrafts.$inferSelect;
export type InsertFollowUpDraft = z.infer<typeof insertFollowUpDraftSchema>;

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

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

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
  // Yield / trim factor — edible weight ÷ as-purchased weight.
  // e.g., for yellow onions ~0.9 (10% lost to skin/ends).
  // Recipes are written in the ready-to-cook form ("1 cup diced onion"), so
  // the shopping list divides by yieldPct to get the actual purchase qty.
  // 1.0 (or null) = no waste adjustment.
  yieldPct: numeric("yield_pct", { precision: 5, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBaseIngredientSchema = createInsertSchema(baseIngredients, {
  purchasePrice: z.coerce.number().nonnegative("Price must be non-negative"),
  purchaseQuantity: z.coerce.number().positive("Quantity must be positive").default(1),
  dietaryTags: z.array(z.string()).optional().default([]),
  unitConversions: z.record(z.string(), z.number().positive()).optional().default({}),
  yieldPct: z.coerce
    .number()
    .positive("Yield must be positive")
    .max(1, "Yield cannot exceed 100%")
    .optional()
    .nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  previousPurchasePrice: true,
});

export type BaseIngredient = typeof baseIngredients.$inferSelect;
export type InsertBaseIngredient = z.infer<typeof insertBaseIngredientSchema>;

// Pack sizes — real-world purchase SKUs for a base ingredient.
//
// A single base ingredient (e.g. "All-Purpose Flour") can be purchased in
// multiple pack sizes: a 5 lb bag at one price, a 25 lb sack at a per-pound
// discount, a 50 lb case at Costco, etc. The shopping list picks the best
// pack(s) to fill the recipe's needed quantity, and the UI can show both
// per-unit cost and per-case total.
//
// The legacy `baseIngredients.purchasePrice/Quantity/Unit` triple represents
// the *default* pack (marked with isDefault=true in this table). That keeps
// backward compatibility with the existing recipe cost math.
export const ingredientPackSizes = pgTable("ingredient_pack_sizes", {
  id: serial("id").primaryKey(),
  baseIngredientId: integer("base_ingredient_id")
    .notNull()
    .references(() => baseIngredients.id, { onDelete: "cascade" }),
  label: text("label").notNull(),                     // e.g., "5 lb bag", "50 lb case"
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(), // 5, 50, etc.
  unit: text("unit").notNull(),                        // lb, kg, each, case, pack
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  supplier: text("supplier"),
  sku: text("sku"),
  // Minimum purchase quantity (in packs). Defaults to 1. Mike might be forced
  // to buy a case of 6 even if he only needs 2 bags.
  minOrderPacks: integer("min_order_packs").default(1).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIngredientPackSizeSchema = createInsertSchema(
  ingredientPackSizes,
  {
    label: z.string().min(1, "Label is required"),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    unit: z.string().min(1, "Unit is required"),
    price: z.coerce.number().nonnegative("Price must be non-negative"),
    minOrderPacks: z.coerce.number().int().positive().default(1),
    isDefault: z.boolean().optional().default(false),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type IngredientPackSize = typeof ingredientPackSizes.$inferSelect;
export type InsertIngredientPackSize = z.infer<
  typeof insertIngredientPackSizeSchema
>;

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
export const rawLeadStatusEnum = pgEnum("raw_lead_status", ['new', 'under_review', 'qualified', 'disqualified', 'archived', 'junk', 'parsing_failed', 'needs_manual_review']);

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
  disqualificationReason: text("disqualification_reason"), // Free-text reason when status is 'disqualified' (wrong fit, out of area, ghosted, spam, etc.)
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
  // Which event types this venue is suitable for — e.g. {"wedding","engagement"}.
  // Empty/null = show for all event types (legacy fallback). The inquiry form
  // filters its dropdown using this list so wedding venues don't surface on a
  // corporate inquiry.
  eventTypes: text("event_types").array(),
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
export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "draft",        // Customer started but hasn't submitted
  "submitted",    // Customer submitted the form
  "reviewing",    // Staff is reviewing
  "quoted",       // Quote has been generated
  "converted",    // Converted to opportunity/booking
  "disqualified", // Not a real fit — out of area, spam, wrong date, ghosted. Captures reason separately.
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

// --- Structured JSONB types for inquiries ---

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
  marginQuote?: number;             // estimated margin percentage
  similarPastEvents?: number[];        // IDs of similar past inquiries for reference
  autoGeneratedNotes?: string;         // AI summary for the sales team
  analyzedAt?: string;                 // ISO timestamp of when AI analysis ran
}

// --- Quote Requests ---
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),

  // Status & Workflow
  status: inquiryStatusEnum("status").default("draft").notNull(),

  // Source & Attribution
  source: text("source"),                        // website, wedding_wire, the_knot, zola, google, referral, etc.
  referralDetail: text("referral_detail"),        // free text: "recommended by Sarah", "found on Instagram", etc.
  // P2-3: Structured UTM attribution captured from URL params at submit time
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  referrer: text("referrer"),
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
  guestCount: integer("guest_count").notNull(),                    // total = adults + children
  adultCount: integer("adult_count"),                               // >= 10 years old, pay full food price
  childCount: integer("child_count").default(0),                    // under 10, food discounted (see pricing_config.childDiscountBps)

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
  disqualificationReason: text("disqualification_reason"), // Free-text reason when status is 'disqualified'

  // AI Analysis — populated asynchronously after submission
  aiAnalysis: jsonb("ai_analysis").$type<QuoteAiAnalysis>(),

  // Origin: set when this quote request was promoted from a raw lead (vs. submitted directly via public form)
  rawLeadId: integer("raw_lead_id").references(() => rawLeads.id, { onDelete: 'set null' }),

  // Links to other entities (set when converted)
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  quoteId: integer("quote_id").references(() => quotes.id),

  // Timestamps
  submittedAt: timestamp("submitted_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod shapes for jsonb payloads — backend rejects malformed data before the
// pricing calculator runs. Without these, drizzle-zod produces z.any() and the
// calculator silently sees $0 for everything.
const quoteAppetizerPayloadSchema = z.object({
  category: z.string(),
  itemName: z.string(),
  pricePerPiece: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
});
const quoteDessertPayloadSchema = z.object({
  itemName: z.string(),
  pricePerPiece: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
});
const quoteBeveragesPayloadSchema = z.object({
  hasNonAlcoholic: z.boolean(),
  nonAlcoholicSelections: z.array(z.string()).optional(),
  mocktails: z.array(z.string()).optional(),
  hasAlcoholic: z.boolean(),
  bartendingType: z.enum(["dry_hire", "wet_hire"]).optional(),
  drinkingGuestCount: z.number().int().nonnegative().optional(),
  bartendingDurationHours: z.number().nonnegative().optional(),
  alcoholSelections: z.array(z.string()).optional(),
  liquorQuality: z.enum(["well", "mid_shelf", "top_shelf"]).optional(),
  additionalCocktails: z.number().int().nonnegative().optional(),
  glassware: z.boolean().optional(),
  barEquipment: z.array(z.string()).optional(),
  tableWaterService: z.boolean().optional(),
  coffeeTeaService: z.boolean().optional(),
  servingWareType: z.string().optional(),
  notes: z.string().optional(),
});
const quoteEquipmentItemPayloadSchema = z.object({
  item: z.string(),
  category: z.string(),
  pricePerUnit: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const insertInquirySchema = createInsertSchema(inquiries, {
  eventDate: z.coerce.date().nullable().optional(),
  guestCount: z.coerce.number().int().positive(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  menuSelections: z.array(z.object({
    itemId: z.string().optional(),
    name: z.string(),
    category: z.string(),
    upcharge: z.number().optional(),
  })).optional(),
  appetizers: z.object({
    serviceStyle: z.string().optional(),
    selections: z.array(quoteAppetizerPayloadSchema),
  }).nullable().optional(),
  desserts: z.array(quoteDessertPayloadSchema).nullable().optional(),
  beverages: quoteBeveragesPayloadSchema.nullable().optional(),
  equipment: z.object({
    items: z.array(quoteEquipmentItemPayloadSchema),
    otherNotes: z.string().optional(),
  }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  convertedAt: true,
  opportunityId: true,
  quoteId: true,
  aiAnalysis: true,
  estimatedPerPersonCents: true,
  estimatedSubtotalCents: true,
  estimatedServiceFeeCents: true,
  estimatedTaxCents: true,
  estimatedTotalCents: true,
});

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

// --- Inquiry Invites ---
// Mike-initiated invitations to fill in the customer-facing /inquire form.
// Used when a lead arrives via phone call, in-person meeting, or referral —
// i.e. anywhere the customer hasn't self-served the form online. An invite
// holds prefill data (name/email/phone) and an unguessable token. When the
// customer submits the linked form, the resulting `inquiries` row is
// stamped on `submittedInquiryId` so we can see invite → inquiry conversion.
export const inquiryInvites = pgTable("inquiry_invites", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  eventType: text("event_type"),
  notes: text("notes"),
  // Optional link back to an existing client in the CRM so we can attribute
  // the eventual submission to them (does NOT require a client to exist).
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  // Channel tracking — a single invite may have been sent via email, SMS, or both.
  sentViaEmail: boolean("sent_via_email").default(false).notNull(),
  sentViaSms: boolean("sent_via_sms").default(false).notNull(),
  // Timestamps for engagement metrics
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  viewedAt: timestamp("viewed_at"),
  submittedAt: timestamp("submitted_at"),
  submittedInquiryId: integer("submitted_inquiry_id").references(() => inquiries.id, { onDelete: 'set null' }),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInquiryInviteSchema = createInsertSchema(inquiryInvites, {
  sentAt: z.coerce.date().optional(),
  viewedAt: z.coerce.date().nullable().optional(),
  submittedAt: z.coerce.date().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  token: true,
  submittedInquiryId: true,
  viewedAt: true,
  submittedAt: true,
});

export type InquiryInvite = typeof inquiryInvites.$inferSelect;
export type InsertInquiryInvite = z.infer<typeof insertInquiryInviteSchema>;

// Define the relationships between tables
export const userRelations = relations(users, ({ many }) => ({
  opportunities: many(opportunities, { relationName: 'assignedOpportunities' }),
  quotes: many(quotes),
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
  // The raw lead this opportunity was created from (direct FK)
  sourceRawLead: one(rawLeads, {
    fields: [opportunities.rawLeadId],
    references: [rawLeads.id],
    relationName: 'sourceRawLead'
  }),
  // Related raw leads (legacy link via rawLeads.createdOpportunityId)
  rawLeads: many(rawLeads, { relationName: 'createdFromOpportunity' }),
  followUpDrafts: many(followUpDrafts, { relationName: 'opportunityFollowUps' }),
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
  quotes: many(quotes),
  events: many(events),
}));

export const quoteRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id]
  }),
  createdBy: one(users, {
    fields: [quotes.createdBy],
    references: [users.id]
  }),
  menu: one(menus, {
    fields: [quotes.menuId],
    references: [menus.id]
  }),
  versions: many(quoteVersions),
}));

export const quoteVersionRelations = relations(quoteVersions, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteVersions.quoteId],
    references: [quotes.id]
  }),
  author: one(users, {
    fields: [quoteVersions.changedBy],
    references: [users.id]
  }),
}));

export const eventRelations = relations(events, ({ one, many }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id]
  }),
  quote: one(quotes, {
    fields: [events.quoteId],
    references: [quotes.id]
  }),
  menu: one(menus, {
    fields: [events.menuId],
    references: [menus.id]
  }),
  communications: many(communications),
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
  event: one(events, {
    fields: [communications.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [communications.userId],
    references: [users.id]
  }),
}));

export const rawLeadRelations = relations(rawLeads, ({ one, many }) => ({
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
  promotedInquiries: many(inquiries, { relationName: 'promotedFromRawLead' }),
}));

export const followUpDraftRelations = relations(followUpDrafts, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [followUpDrafts.opportunityId],
    references: [opportunities.id],
    relationName: 'opportunityFollowUps'
  }),
  quote: one(quotes, {
    fields: [followUpDrafts.quoteId],
    references: [quotes.id],
  }),
  reviewer: one(users, {
    fields: [followUpDrafts.reviewedBy],
    references: [users.id],
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
export const inquiryRelations = relations(inquiries, ({ one }) => ({
  venue: one(venues, { fields: [inquiries.venueId], references: [venues.id] }),
  promoCode: one(promoCodes, { fields: [inquiries.promoCodeId], references: [promoCodes.id] }),
  opportunity: one(opportunities, { fields: [inquiries.opportunityId], references: [opportunities.id] }),
  quote: one(quotes, { fields: [inquiries.quoteId], references: [quotes.id] }),
  rawLead: one(rawLeads, {
    fields: [inquiries.rawLeadId],
    references: [rawLeads.id],
    relationName: 'promotedFromRawLead',
  }),
}));

export const venueRelations = relations(venues, ({ many }) => ({
  inquiries: many(inquiries),
}));

// ============================================================================
// Follow-up inbox state (per-user overlay)
// ============================================================================
//
// The Follow-ups inbox is computed on the fly by unioning 16 source queries
// across inquiries / quotes / events / contracts / tastings / communications /
// follow_up_drafts / raw_leads / opportunities. This table stores ONLY the
// per-user state that can't be derived from sources: snooze, dismiss, pin,
// and quick-notes. item_key uniquely identifies a source item (e.g.
// "change_request:47", "quote_unviewed:12", "inquiry_unread:8").

export const followUpStateEnum = pgEnum("follow_up_state", [
  "snoozed",
  "dismissed",
  "in_progress",
]);

export const followUpStates = pgTable(
  "follow_up_states",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    state: followUpStateEnum("state").notNull(),
    snoozeUntil: timestamp("snooze_until"),
    note: text("note"),
    // When dismissing, we capture the source record's last-modified marker so
    // we can auto-re-surface the item if the source changes. For "snoozed" /
    // "in_progress" this is ignored.
    dismissedAtSource: text("dismissed_at_source"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userItemUnique: unique("follow_up_states_user_item_uq").on(t.userId, t.itemKey),
  }),
);

export type FollowUpState = typeof followUpStates.$inferSelect;
export type InsertFollowUpState = typeof followUpStates.$inferInsert;

// ---------------------------------------------------------------------------
// Catalog: appetizer / dessert / equipment items (previously hardcoded in
// client/src/pages/Inquire.tsx). Admin-editable so Mike can adjust prices
// without a deploy.
// ---------------------------------------------------------------------------

// --- Appetizer categories (Tea Sandwiches, Shooters, Spreads, etc.) ---
export const appetizerCategories = pgTable("appetizer_categories", {
  id: serial("id").primaryKey(),
  categoryKey: text("category_key").notNull().unique(), // tea_sandwiches, shooters, spreads
  label: text("label").notNull(),                        // "Tea Sandwiches"
  // perPerson=true means items are priced × guestCount (e.g. Charcuterie boards)
  perPerson: boolean("per_person").default(false).notNull(),
  // servingPack: when set, the category is priced at pack level (e.g. Spreads
  // trio = $6.50/serving × servings, customer picks N flavors to fill the pack).
  servingPack: jsonb("serving_pack").$type<{
    pricePerServingCents: number;
    flavorsToPick: number;
    description: string;
  }>(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appetizerItems = pgTable("appetizer_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => appetizerCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(), // 0 for servingPack "flavor" items
  unit: text("unit").notNull(),                  // per_piece, per_person, flavor
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppetizerCategorySchema = createInsertSchema(appetizerCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAppetizerItemSchema = createInsertSchema(appetizerItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AppetizerCategory = typeof appetizerCategories.$inferSelect;
export type AppetizerItem = typeof appetizerItems.$inferSelect;
export type InsertAppetizerCategory = z.infer<typeof insertAppetizerCategorySchema>;
export type InsertAppetizerItem = z.infer<typeof insertAppetizerItemSchema>;

// --- Desserts (flat list, no categories) ---
export const dessertItems = pgTable("dessert_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  unit: text("unit").notNull().default("per_piece"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDessertItemSchema = createInsertSchema(dessertItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DessertItem = typeof dessertItems.$inferSelect;
export type InsertDessertItem = z.infer<typeof insertDessertItemSchema>;

// --- Equipment categories (Linens, Serving Ware, Furniture) ---
export const equipmentCategories = pgTable("equipment_categories", {
  id: serial("id").primaryKey(),
  categoryKey: text("category_key").notNull().unique(),
  label: text("label").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const equipmentItemsTable = pgTable("equipment_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => equipmentCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  unit: text("unit").notNull(), // each, per_person
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEquipmentCategorySchema = createInsertSchema(equipmentCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEquipmentItemSchema = createInsertSchema(equipmentItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EquipmentCategory = typeof equipmentCategories.$inferSelect;
export type EquipmentItem = typeof equipmentItemsTable.$inferSelect;
export type InsertEquipmentCategory = z.infer<typeof insertEquipmentCategorySchema>;
export type InsertEquipmentItem = z.infer<typeof insertEquipmentItemSchema>;

// --- Pricing Config (single-row table — rates that aren't tied to catalog items) ---
// Percentages and multipliers are stored as basis points to keep math in integers:
//   * basis points (bps): 10000 = 100%. So 1025 bps = 10.25%, 2000 bps = 20%.
//   * multipliers × 100:  100 = 1.00×. So 150 = 1.5× (top-shelf uplift).
// Admin UI converts to/from user-friendly % and × on display.
export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  // --- Bartending ---
  wetHireRateCentsPerHour: integer("wet_hire_rate_cents_per_hour").notNull().default(1500), // $15/pp/hr
  dryHireRateCentsPerHour: integer("dry_hire_rate_cents_per_hour").notNull().default(800),  // $8/pp/hr
  liquorMultiplierWell: integer("liquor_multiplier_well").notNull().default(100),           // 1.00×
  liquorMultiplierMidShelf: integer("liquor_multiplier_mid_shelf").notNull().default(125),  // 1.25×
  liquorMultiplierTopShelf: integer("liquor_multiplier_top_shelf").notNull().default(150),  // 1.50×
  // --- Per-person add-ons ---
  nonAlcoholicPackageCents: integer("non_alcoholic_package_cents").notNull().default(500),  // $5/pp
  coffeeTeaServiceCents: integer("coffee_tea_service_cents").notNull().default(400),        // $4/pp
  tableWaterServiceCents: integer("table_water_service_cents").notNull().default(650),      // $6.50/pp
  glasswareCents: integer("glassware_cents").notNull().default(200),                        // $2/pp
  // --- Service fee by service style (basis points) ---
  serviceFeeDropOffBps: integer("service_fee_drop_off_bps").notNull().default(0),                   // 0%
  serviceFeeStandardBps: integer("service_fee_standard_bps").notNull().default(1500),               // 15%
  serviceFeeFullServiceNoSetupBps: integer("service_fee_full_no_setup_bps").notNull().default(1750), // 17.5%
  serviceFeeFullServiceBps: integer("service_fee_full_bps").notNull().default(2000),                 // 20%
  // --- Tax (basis points) ---
  taxRateBps: integer("tax_rate_bps").notNull().default(1025),                                        // 10.25%
  // --- Kids pricing ---
  // Child (under 10) food discount as basis points off the adult price.
  // 5000 bps = 50% off, so a child's food is priced at 50% of the adult rate.
  // Only applied to the per-person food tier; appetizers, equipment, water,
  // coffee/tea, and non-alcoholic package all use total guest count.
  childDiscountBps: integer("child_discount_bps").notNull().default(5000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfig).omit({
  id: true,
  updatedAt: true,
});

export type PricingConfig = typeof pricingConfig.$inferSelect;
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;