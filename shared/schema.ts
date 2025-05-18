import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations, type PgColumn, type PgTableWithColumns, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- USER & AUTH ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- ENUMS ---

export const opportunityPriorityEnum = pgEnum("opportunity_priority", ['hot', 'high', 'medium', 'low']);

// --- OPPORTUNITIES ---

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  eventType: text("event_type").notNull(),
  eventDate: timestamp("event_date"),
  guestCount: integer("guest_count"),
  venue: text("venue"),
  budget: text("budget"),
  details: text("details"),
  status: text("status").default("new").notNull(),
  priority: opportunityPriorityEnum("priority").default('medium'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities, {
  userId: z.number().optional().nullable(),
  guestCount: z.number().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// --- MENU ITEMS ---

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  pricePerPerson: text("price_per_person"),
  metadata: jsonb("metadata"),
  ingredients: jsonb("ingredients"),
  dietaryLimitations: jsonb("dietary_limitations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- MENUS ---

export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  items: jsonb("items").notNull(),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- CLIENTS ---

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- ESTIMATES ---

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  menuId: integer("menu_id").references(() => menus.id),
  eventDate: timestamp("event_date"),
  eventLocation: text("event_location"),
  guestCount: integer("guest_count"),
  status: text("status").default("draft").notNull(),
  subtotal: text("subtotal"),
  taxRate: text("tax_rate"),
  taxAmount: text("tax_amount"),
  total: text("total"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEstimateSchema = createInsertSchema(estimates, {
  opportunityId: z.number(),
  clientId: z.number().optional().nullable(),
  menuId: z.number().optional().nullable(),
  guestCount: z.number().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- EVENTS ---

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  clientId: integer("client_id").references(() => clients.id),
  title: text("title").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  location: text("location"),
  description: text("description"),
  allDay: boolean("all_day").default(false).notNull(),
  status: text("status").default("scheduled").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- CONTACT IDENTIFIERS ---

export const identifierTypeEnum = pgEnum("identifier_type", ["email", "phone"]);

export const contactIdentifiers = pgTable("contact_identifiers", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  clientId: integer("client_id").references(() => clients.id),
  type: identifierTypeEnum("type").notNull(),
  value: text("value").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  source: text("source"), // Where did this identifier come from? A form, manual entry, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactIdentifierSchema = createInsertSchema(contactIdentifiers).omit({
  id: true,
  createdAt: true,
});

// --- COMMUNICATIONS ---

export const communicationTypeEnum = pgEnum("communication_type", ["email", "call", "sms", "note", "meeting"]);
export const communicationDirectionEnum = pgEnum("communication_direction", ["incoming", "outgoing", "internal"]);

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  clientId: integer("client_id").references(() => clients.id),
  userId: integer("user_id").references(() => users.id),
  type: communicationTypeEnum("type").notNull(),
  direction: communicationDirectionEnum("direction").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommunicationSchema = createInsertSchema(communications, {
  opportunityId: z.number().optional().nullable(),
  clientId: z.number().optional().nullable(),
  userId: z.number().optional().nullable(),
  sentAt: z.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// --- TYPES ---

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

export type ContactIdentifier = typeof contactIdentifiers.$inferSelect;
export type InsertContactIdentifier = z.infer<typeof insertContactIdentifierSchema>;

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// --- AI-ANALYSIS ENUMS ---

export const leadScoreEnum = pgEnum("lead_score", ['1', '2', '3', '4', '5']);
export const leadQualityCategoryEnum = pgEnum("lead_quality_category", ['hot', 'warm', 'cold', 'nurture']);
export const budgetIndicationEnum = pgEnum("budget_indication", ['not_mentioned', 'low', 'medium', 'high', 'specific_amount']);
export const sentimentEnum = pgEnum("sentiment", ['positive', 'neutral', 'negative', 'urgent']);

// --- RAW LEADS ---

export const rawLeadStatusEnum = pgEnum("raw_lead_status", ['new', 'under_review', 'qualified', 'archived', 'junk', 'parsing_failed', 'needs_manual_review']);

export const rawLeads = pgTable("raw_leads", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // "gmail", "web_form", "manual_entry"
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  status: rawLeadStatusEnum("status").default('new').notNull(),
  notes: text("notes"),
  rawData: jsonb("raw_data"), // For email, the email JSON; for form, the form data
  subjectLine: text("subject_line"), 
  bodyText: text("body_text"),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  messageId: text("message_id"), // For tracking email threads
  eventType: text("event_type"), // AI-extracted event type
  eventDate: timestamp("event_date"), // AI-extracted date
  guestCount: integer("guest_count"), // AI-extracted guest count
  venue: text("venue"), // AI-extracted venue
  budget: text("budget"), // AI-extracted budget
  leadScore: leadScoreEnum("lead_score"), // AI-scored lead quality (1-5)
  leadQuality: leadQualityCategoryEnum("lead_quality"), // AI categorization (hot/warm/cold/nurture)
  budgetIndication: budgetIndicationEnum("budget_indication"), // AI budget estimate
  sentiment: sentimentEnum("sentiment"), // AI sentiment analysis
  requestUrgency: integer("request_urgency"), // 1-10, AI urgency assessment
  aiExtractedContact: jsonb("ai_extracted_contact"), // Name, email, phone
  aiAnalysisJson: jsonb("ai_analysis_json"), // Full analysis results
  aiCalendarConflictAssessment: text("ai_calendar_conflict_assessment"),
  
  // For tracking which leads have been processed
  convertedToOpportunityId: integer("converted_to_opportunity_id").references(() => opportunities.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingNotes: text("processing_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRawLeadSchema = createInsertSchema(rawLeads, {
  guestCount: z.number().optional().nullable(),
  eventDate: z.date().optional().nullable(),
  convertedToOpportunityId: z.number().optional().nullable(),
  assignedUserId: z.number().optional().nullable(),
  processingStartedAt: z.date().optional().nullable(),
  processingCompletedAt: z.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type RawLead = typeof rawLeads.$inferSelect;
export type InsertRawLead = z.infer<typeof insertRawLeadSchema>;

// --- RELATIONS ---

export const userRelations = relations(users, ({ many }) => ({
  opportunities: many(opportunities),
  clients: many(clients),
}));

export const opportunityRelations = relations(opportunities, ({ one, many }) => ({
  user: one(users, {
    fields: [opportunities.userId],
    references: [users.id]
  }),
  estimates: many(estimates),
  events: many(events),
}));

export const clientRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id]
  }),
  estimates: many(estimates),
  events: many(events),
}));

export const estimateRelations = relations(estimates, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [estimates.opportunityId],
    references: [opportunities.id]
  }),
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id]
  }),
  menu: one(menus, {
    fields: [estimates.menuId],
    references: [menus.id]
  })
}));

export const eventRelations = relations(events, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [events.opportunityId],
    references: [opportunities.id]
  }),
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id]
  })
}));

export const contactIdentifierRelations = relations(contactIdentifiers, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [contactIdentifiers.opportunityId],
    references: [opportunities.id]
  }),
  client: one(clients, {
    fields: [contactIdentifiers.clientId],
    references: [clients.id]
  })
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
  })
}));

export const rawLeadRelations = relations(rawLeads, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [rawLeads.convertedToOpportunityId],
    references: [opportunities.id]
  }),
  assignedUser: one(users, {
    fields: [rawLeads.assignedUserId],
    references: [users.id]
  })
}));

// --- GMAIL SYNC ---

export const gmailSyncState = pgTable("gmail_sync_state", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lastSyncTimestamp: text("last_sync_timestamp").notNull(),
  historyId: text("history_id"),
  nextSyncToken: text("next_sync_token"),
  status: text("status").default("idle").notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGmailSyncStateSchema = createInsertSchema(gmailSyncState, {
  historyId: z.string().optional().nullable(),
  nextSyncToken: z.string().optional().nullable(),
  lastError: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type GmailSyncState = typeof gmailSyncState.$inferSelect;
export type InsertGmailSyncState = z.infer<typeof insertGmailSyncStateSchema>;

export const processedEmails = pgTable("processed_emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  threadId: text("thread_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const insertProcessedEmailSchema = createInsertSchema(processedEmails).omit({
  id: true,
  processedAt: true,
});

export type ProcessedEmail = typeof processedEmails.$inferSelect;
export type InsertProcessedEmail = z.infer<typeof insertProcessedEmailSchema>;

// Import form-schema tables for usage in this file
import {
  formQuestionTypeEnum, 
  conditionalLogicActionTypeEnum, 
  conditionalLogicConditionTypeEnum,
  formStatusEnum, 
  formRuleTargetTypeEnum,
  questionLibrary,
  forms,
  formPages,
  formPageQuestions,
  formRules,
  formRuleTargets
} from "./form-schema";

// Re-export everything from form-schema
export * from "./form-schema";