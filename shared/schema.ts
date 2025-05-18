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
  // Questionnaire connections
  questionnaireSubmissionId: integer('questionnaire_submission_id').references(() => questionnaireSubmissions.id, { onDelete: 'set null' }).unique(),
  questionnaireDefinitionId: integer('questionnaire_definition_id').references(() => questionnaireDefinitions.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities, {
  eventDate: z.string().nullable().transform(date => date ? new Date(date) : null),
  priority: z.enum(opportunityPriorityEnum.enumValues).optional(), // Make it optional on creation, defaults to 'medium'
  opportunitySource: z.string().optional(),
  questionnaireSubmissionId: z.number().optional(),
  questionnaireDefinitionId: z.number().optional(),
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
  
  // Add the new fields to schema with proper validation
  extractedEventType: z.string().optional().nullable(),
  extractedEventDate: z.string().optional().nullable(),
  extractedEventTime: z.string().optional().nullable(),
  extractedGuestCount: z.number().int().optional().nullable(),
  extractedVenue: z.string().optional().nullable(),
  extractedMessageSummary: z.string().optional().nullable(),
  leadSourcePlatform: z.string().optional().nullable(),
  
  aiUrgencyScore: z.enum(leadScoreEnum.enumValues).optional().nullable(),
  aiBudgetIndication: z.enum(budgetIndicationEnum.enumValues).optional().nullable(),
  aiBudgetValue: z.number().int().optional().nullable(),
  aiClarityOfRequestScore: z.enum(leadScoreEnum.enumValues).optional().nullable(),
  aiDecisionMakerLikelihood: z.enum(leadScoreEnum.enumValues).optional().nullable(),
  aiKeyRequirements: z.array(z.string()).optional().nullable(),
  aiPotentialRedFlags: z.array(z.string()).optional().nullable(),
  aiOverallLeadQuality: z.enum(leadQualityCategoryEnum.enumValues).optional().nullable(),
  aiSuggestedNextStep: z.string().optional().nullable(),
  aiSentiment: z.enum(sentimentEnum.enumValues).optional().nullable(),
  aiConfidenceScore: z.number().min(0).max(1).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdOpportunityId: true // This is set after opportunity creation
});

export type RawLead = typeof rawLeads.$inferSelect;
export type InsertRawLead = z.infer<typeof insertRawLeadSchema>;

// Table to track processed emails to avoid duplicates
export const processedEmails = pgTable("processed_emails", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(), // Gmail/Email message ID
  gmailId: text("gmail_id").notNull(), // Gmail's internal message ID
  service: text("service").notNull(), // Which service processed this (lead_generation, comm_sync)
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  email: text("email").notNull(), // The email address that was matched
  subject: text("subject"), // Subject line for debugging
  labelApplied: boolean("label_applied").default(false), // Whether we successfully applied a label
});

export const insertProcessedEmailSchema = createInsertSchema(processedEmails).omit({
  id: true,
  processedAt: true
});

export type ProcessedEmail = typeof processedEmails.$inferSelect;
export type InsertProcessedEmail = z.infer<typeof insertProcessedEmailSchema>;

// Questionnaire System Schemas

// Enums for questionnaire system
export const questionTypeEnum = pgEnum('question_type_enum', [
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox', // single boolean checkbox
  'checkbox_group', // multiple choice checkbox
  'date',
  'time', // Standard time input
  'time_picker', // Enhanced time picker with hour, minutes, AM/PM
  'number',
  'slider', // Range slider with min/max values
  'incrementer', // Step incrementer (number input with +/- buttons)
  'matrix_single', // matrix where each row can have one selection from columns
  'matrix_multi', // matrix where each row can have multiple selections from columns
  'info_text', // for displaying read-only information blocks
  'name', // Compound field for first/last name (could be handled as two 'text' fields too)
  'address', // Compound field for address (could be multiple 'text' fields)
  'phone',
  'email',
  'toggle', // Toggle switch for Yes/No questions
]);

export const conditionTriggerOperatorEnum = pgEnum('condition_trigger_operator_enum', [
  'equals',
  'not_equals',
  'contains', // for text or array-like values
  'not_contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
  'is_selected', // for checkboxes or radio options
  'is_not_selected'
]);

export const conditionActionTypeEnum = pgEnum('condition_action_type_enum', [
  'show_question',
  'hide_question',
  'require_question',
  'unrequire_question', // new
  'skip_to_page',
  'enable_option', // new
  'disable_option', // new
]);

export const submissionStatusEnum = pgEnum('submission_status_enum', ['draft', 'submitted', 'archived']);

// Questionnaire tables
export const questionnaireDefinitions = pgTable('questionnaire_definitions', {
  id: serial('id').primaryKey(),
  versionName: text('version_name').notNull(), // e.g., "Customer Intake Form - Q3 2025"
  description: text('description'),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionnairePages = pgTable('questionnaire_pages', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').references(() => questionnaireDefinitions.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(), // e.g., "Event Details," "Menu Preferences"
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionnaireQuestions = pgTable('questionnaire_questions', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').references(() => questionnairePages.id, { onDelete: 'cascade' }).notNull(),
  questionText: text('question_text').notNull(),
  questionKey: text('question_key').notNull(), // Key for this question, e.g., `event_type`, `guest_count` (removed unique constraint)
  questionType: questionTypeEnum('question_type').notNull(),
  order: integer('order').notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  placeholderText: text('placeholder_text'),
  helpText: text('help_text'), // For tooltips or sub-labels
  validationRules: jsonb('validation_rules'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionnaireQuestionOptions = pgTable('questionnaire_question_options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').references(() => questionnaireQuestions.id, { onDelete: 'cascade' }).notNull(),
  optionText: text('option_text').notNull(), // Label for the option
  optionValue: text('option_value').notNull(), // Value stored when selected
  order: integer('order').notNull(),
  defaultSelectionIndicator: text('default_selection_indicator'),
  relatedMenuItemId: integer('related_menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionnaireMatrixColumns = pgTable('questionnaire_matrix_columns', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').references(() => questionnaireQuestions.id, { onDelete: 'cascade' }).notNull(), // The matrix question
  columnText: text('column_text').notNull(), // Label for the column
  columnValue: text('column_value').notNull(), // Value for the column
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const questionnaireConditionalLogic = pgTable('questionnaire_conditional_logic', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').references(() => questionnaireDefinitions.id, { onDelete: 'cascade' }).notNull(),
  triggerQuestionKey: text('trigger_question_key').notNull(), // References questionnaireQuestions.questionKey
  triggerCondition: conditionTriggerOperatorEnum('trigger_condition').notNull(),
  triggerValue: text('trigger_value'), // Value to compare against. Can be null for 'is_empty'/'is_not_empty'
  actionType: conditionActionTypeEnum('action_type').notNull(),
  targetQuestionKey: text('target_question_key'), // References questionnaireQuestions.questionKey (for show/hide/require question)
  targetPageId: integer('target_page_id').references(() => questionnairePages.id, { onDelete: 'set null' }), // For skip_to_page
  targetOptionValue: text('target_option_value'), // For enable/disable option, references questionnaireQuestionOptions.optionValue
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define the questionnaire submissions table
export const questionnaireSubmissions = pgTable('questionnaire_submissions', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').references(() => questionnaireDefinitions.id, { onDelete: 'cascade' }).notNull(),
  // This will store the answers from the questionnaire, typically as a JSON object:
  // { "question_key_1": "answer_1", "question_key_2": ["option_a", "option_c"], ... }
  submittedData: jsonb('submitted_data').notNull(),
  status: submissionStatusEnum('status').default('draft').notNull(),
  clientIdentifier: text('client_identifier'), // e.g., session ID for anonymous, user ID for logged-in
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }), // If submitted by a logged-in user
  rawLeadId: integer('raw_lead_id').references(() => rawLeads.id, { onDelete: 'set null' }).unique(), // Link to the created rawLead
  submittedAt: timestamp('submitted_at'), // Only set when status becomes 'submitted'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Now add the questionnaire fields to raw_leads
export const rawLeadsUpdate = pgTable('raw_leads', {
  questionnaireSubmissionId: integer('questionnaire_submission_id').references(() => questionnaireSubmissions.id, { onDelete: 'set null' }).unique(),
  questionnaireDefinitionId: integer('questionnaire_definition_id').references(() => questionnaireDefinitions.id, { onDelete: 'set null' }),
});

// Define the relationships between tables
export const questionnaireDefinitionRelations = relations(questionnaireDefinitions, ({ many }) => ({
  pages: many(questionnairePages),
  conditionalLogic: many(questionnaireConditionalLogic),
  submissions: many(questionnaireSubmissions),
}));

export const questionnairePageRelations = relations(questionnairePages, ({ one, many }) => ({
  definition: one(questionnaireDefinitions, {
    fields: [questionnairePages.definitionId],
    references: [questionnaireDefinitions.id],
  }),
  questions: many(questionnaireQuestions),
  conditionalLogicTargets: many(questionnaireConditionalLogic, { relationName: 'targetPageConditionalLogic' }),
}));

export const questionnaireQuestionRelations = relations(questionnaireQuestions, ({ one, many }) => ({
  page: one(questionnairePages, {
    fields: [questionnaireQuestions.pageId],
    references: [questionnairePages.id],
  }),
  options: many(questionnaireQuestionOptions),
  matrixColumns: many(questionnaireMatrixColumns),
}));

export const questionnaireQuestionOptionRelations = relations(questionnaireQuestionOptions, ({ one }) => ({
  question: one(questionnaireQuestions, {
    fields: [questionnaireQuestionOptions.questionId],
    references: [questionnaireQuestions.id],
  }),
  relatedMenuItem: one(menuItems, {
    fields: [questionnaireQuestionOptions.relatedMenuItemId],
    references: [menuItems.id],
  }),
}));

export const questionnaireMatrixColumnRelations = relations(questionnaireMatrixColumns, ({ one }) => ({
  question: one(questionnaireQuestions, {
    fields: [questionnaireMatrixColumns.questionId],
    references: [questionnaireQuestions.id],
  }),
}));

export const questionnaireConditionalLogicRelations = relations(questionnaireConditionalLogic, ({ one }) => ({
  definition: one(questionnaireDefinitions, {
    fields: [questionnaireConditionalLogic.definitionId],
    references: [questionnaireDefinitions.id],
  }),
  targetPage: one(questionnairePages, {
    fields: [questionnaireConditionalLogic.targetPageId],
    references: [questionnairePages.id],
    relationName: 'targetPageConditionalLogic',
  }),
}));

export const questionnaireSubmissionRelations = relations(questionnaireSubmissions, ({ one }) => ({
  definition: one(questionnaireDefinitions, {
    fields: [questionnaireSubmissions.definitionId],
    references: [questionnaireDefinitions.id],
  }),
  user: one(users, {
    fields: [questionnaireSubmissions.userId],
    references: [users.id],
  }),
  rawLead: one(rawLeads, {
    fields: [questionnaireSubmissions.rawLeadId],
    references: [rawLeads.id],
  }),
}));

// Add relation from opportunities to questionnaire
export const opportunityQuestionnaireRelations = relations(opportunities, ({ one }) => ({
  questionnaireSubmission: one(questionnaireSubmissions, {
    fields: [opportunities.questionnaireSubmissionId],
    references: [questionnaireSubmissions.id],
  }),
  questionnaireDefinition: one(questionnaireDefinitions, {
    fields: [opportunities.questionnaireDefinitionId],
    references: [questionnaireDefinitions.id],
  }),
}));

// Expose types for the questionnaire tables
export type QuestionnaireDefinition = typeof questionnaireDefinitions.$inferSelect;
export type QuestionnairePage = typeof questionnairePages.$inferSelect;
export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type QuestionnaireQuestionOption = typeof questionnaireQuestionOptions.$inferSelect;
export type QuestionnaireMatrixColumn = typeof questionnaireMatrixColumns.$inferSelect;
export type QuestionnaireConditionalLogic = typeof questionnaireConditionalLogic.$inferSelect;
export type QuestionnaireSubmission = typeof questionnaireSubmissions.$inferSelect;

// Create insert schemas for the questionnaire tables
export const insertQuestionnaireDefinitionSchema = createInsertSchema(questionnaireDefinitions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    // Add sourceDefinitionId as an optional field for cloning operations
    sourceDefinitionId: z.number().optional().describe('Source definition ID for cloning operations')
  });

export const insertQuestionnairePageSchema = createInsertSchema(questionnairePages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireQuestionSchema = createInsertSchema(questionnaireQuestions, {
  validationRules: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    minCount: z.number().optional(),
    maxCount: z.number().optional(),
    exactCount: z.number().optional()
  }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireQuestionOptionSchema = createInsertSchema(questionnaireQuestionOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireMatrixColumnSchema = createInsertSchema(questionnaireMatrixColumns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireConditionalLogicSchema = createInsertSchema(questionnaireConditionalLogic).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireSubmissionSchema = createInsertSchema(questionnaireSubmissions, {
  submittedData: z.any().optional(),
  submittedAt: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Insert type exports
export type InsertQuestionnaireDefinition = z.infer<typeof insertQuestionnaireDefinitionSchema>;
export type InsertQuestionnairePage = z.infer<typeof insertQuestionnairePageSchema>;
export type InsertQuestionnaireQuestion = z.infer<typeof insertQuestionnaireQuestionSchema>;
export type InsertQuestionnaireQuestionOption = z.infer<typeof insertQuestionnaireQuestionOptionSchema>;
export type InsertQuestionnaireMatrixColumn = z.infer<typeof insertQuestionnaireMatrixColumnSchema>;
export type InsertQuestionnaireConditionalLogic = z.infer<typeof insertQuestionnaireConditionalLogicSchema>;
export type InsertQuestionnaireSubmission = z.infer<typeof insertQuestionnaireSubmissionSchema>;
