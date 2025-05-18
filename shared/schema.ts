import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, pgEnum, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // appetizer, entree, side, dessert, beverage
  price: numeric("price", { precision: 10, scale: 2 }), // stored as decimal, nullable for items without price
  ingredients: text("ingredients"),
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isDairyFree: boolean("is_dairy_free").default(false),
  isNutFree: boolean("is_nut_free").default(false),
  image: text("image"), // url to image
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
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
  items: jsonb("items").notNull(), // array of menu item IDs with quantities
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({
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
}).omit({
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
  extractedName: text("extracted_name"),
  extractedEmail: text("extracted_email"),
  extractedPhone: text("extracted_phone"),
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
  aiBudgetIndication: budgetIndicationEnum("ai_budget_indication"),
  aiBudgetValue: integer("ai_budget_value"),
  aiClarityOfRequestScore: leadScoreEnum("ai_clarity_of_request_score"),
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
  aiPotentialRedFlags: z.any().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RawLead = typeof rawLeads.$inferSelect;
export type InsertRawLead = z.infer<typeof insertRawLeadSchema>;

// Gmail Sync State Table
export const gmailSyncState = pgTable("gmail_sync_state", {
  targetEmail: text("target_email").primaryKey().notNull(),
  lastHistoryId: text("last_history_id").notNull(),
  watchExpirationTimestamp: timestamp("watch_expiration_timestamp"),
  lastWatchAttemptTimestamp: timestamp("last_watch_attempt_timestamp"),
  lastSuccessfulSync: timestamp("last_successful_sync"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGmailSyncStateSchema = createInsertSchema(gmailSyncState).omit({
  updatedAt: true,
});

// Processed Emails Table
export const processedEmails = pgTable("processed_emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  service: text("service").notNull(), // e.g., 'gmail_sync', 'gmail_webhook'
  receivedAt: timestamp("received_at").notNull(),
  processed: boolean("processed").default(true).notNull(),
  leadGenerated: boolean("lead_generated").default(false),
  reason: text("reason"), // e.g., 'not_vendor_source', 'lead_generated', 'processing_failed'
  labelApplied: boolean("label_applied").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProcessedEmailSchema = createInsertSchema(processedEmails).omit({
  id: true,
  createdAt: true,
});

export type GmailSyncState = typeof gmailSyncState.$inferSelect;
export type InsertGmailSyncState = z.infer<typeof insertGmailSyncStateSchema>;

export type ProcessedEmail = typeof processedEmails.$inferSelect;
export type InsertProcessedEmail = z.infer<typeof insertProcessedEmailSchema>;

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