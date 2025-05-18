// Standalone form schema to avoid circular imports
import { type PgTableWithColumns, pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Reference types only - no imports of actual tables to avoid circular dependencies
type UserTable = PgTableWithColumns<{
  id: { name: string; dataType: number; columnType: string };
}>;

type ClientTable = PgTableWithColumns<{
  id: { name: string; dataType: number; columnType: string };
}>;

type OpportunityTable = PgTableWithColumns<{
  id: { name: string; dataType: number; columnType: string };
}>;

type RawLeadTable = PgTableWithColumns<{
  id: { name: string; dataType: number; columnType: string };
}>;

// These will be resolved at runtime
let usersTable: UserTable;
let clientsTable: ClientTable;
let opportunitiesTable: OpportunityTable;
let rawLeadsTable: RawLeadTable;

// Function to set tables from outside to avoid circular imports
export function setReferenceTables(users: UserTable, clients: ClientTable, opportunities: OpportunityTable, rawLeads: RawLeadTable) {
  usersTable = users;
  clientsTable = clients;
  opportunitiesTable = opportunities;
  rawLeadsTable = rawLeads;
  
  // This function should be called before any queries involving these relations are executed
  console.log("Reference tables for form-schema have been set");
}

// --- ENUMS ---

export const formQuestionTypeEnum = pgEnum("form_question_type", [
  // Core types
  'header', 'text_display', 'textbox', 'textarea', 'email', 'phone', 'number',
  'datetime', 'time', 'checkbox_group', 'radio_group', 'dropdown',
  'full_name', 'address', 'matrix',
  // Modern, mobile-first types
  'image_upload', 'file_upload', 'signature_pad', 'rating_scale', 'slider',
  'toggle_switch', 'location_picker', 'tag_select', 'date_range_picker', 'stepper_input',
]);

export const conditionalLogicActionTypeEnum = pgEnum("conditional_logic_action_type", [
  'show_question', 'hide_question', 'require_question', 'unrequire_question',
  'skip_to_page', 'enable_option', 'disable_option', 'set_value',
  'show_page', 'hide_page',
]);

export const conditionalLogicConditionTypeEnum = pgEnum("conditional_logic_condition_type", [
  'equals', 'not_equals', 'is_filled', 'is_not_filled', 'contains',
  'does_not_contain', 'greater_than', 'less_than', 'is_selected_option_value',
  'is_not_selected_option_value',
]);

export const formRuleTargetTypeEnum = pgEnum("form_rule_target_type", [
  'question',
  'page',
]);

export const formStatusEnum = pgEnum("form_status", [
  'draft',
  'published',
  'archived',
  'template',
]);

// --- TABLES ---

// 1. Reusable Question Building Blocks
export const questionLibrary = pgTable("question_library", {
  id: serial("id").primaryKey(),
  libraryQuestionKey: text("library_question_key").unique().notNull(),
  defaultText: text("default_text").notNull(),
  questionType: formQuestionTypeEnum("question_type").notNull(),
  defaultMetadata: jsonb("default_metadata"),
  defaultOptions: jsonb("default_options"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuestionLibrarySchema = createInsertSchema(questionLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// NEW: For Matrix Question Structure (linked to question_library)
export const libraryMatrixRows = pgTable("library_matrix_rows", {
  id: serial("id").primaryKey(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id, { onDelete: 'cascade' }).notNull(),
  rowKey: text("row_key").notNull(),
  label: text("label").notNull(),
  price: text("price"),
  defaultMetadata: jsonb("default_metadata"),
  rowOrder: integer("row_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    libraryQuestionRowKeyUnique: unique().on(table.libraryQuestionId, table.rowKey),
}));

export const insertLibraryMatrixRowSchema = createInsertSchema(libraryMatrixRows).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const libraryMatrixColumns = pgTable("library_matrix_columns", {
  id: serial("id").primaryKey(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id, { onDelete: 'cascade' }).notNull(),
  columnKey: text("column_key").notNull(),
  header: text("header").notNull(),
  cellInputType: text("cell_input_type").notNull(),
  defaultMetadata: jsonb("default_metadata"),
  columnOrder: integer("column_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    libraryQuestionColumnKeyUnique: unique().on(table.libraryQuestionId, table.columnKey),
}));

export const insertLibraryMatrixColumnSchema = createInsertSchema(libraryMatrixColumns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 2. The Overall Form Structure
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  formKey: text("form_key").unique().notNull(),
  formTitle: text("form_title").notNull(),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  status: formStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
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

export const insertFormPageSchema = createInsertSchema(formPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

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
  metadataOverrides: jsonb("metadata_overrides"),
  optionsOverrides: jsonb("options_overrides"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    pageQuestionOrderUnique: unique().on(table.formPageId, table.displayOrder),
}));

export const insertFormPageQuestionSchema = createInsertSchema(formPageQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 5. Conditional Logic
export const formRules = pgTable("form_rules", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  triggerFormPageQuestionId: integer("trigger_form_page_question_id").references(() => formPageQuestions.id, { onDelete: 'cascade' }).notNull(),
  conditionType: conditionalLogicConditionTypeEnum("condition_type").notNull(),
  conditionValue: text("condition_value"),
  actionType: conditionalLogicActionTypeEnum("action_type").notNull(),
  ruleDescription: text("rule_description"),
  executionOrder: integer("execution_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormRuleSchema = createInsertSchema(formRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// NEW: Join Table for Multiple Rule Targets
export const formRuleTargets = pgTable("form_rule_targets", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => formRules.id, { onDelete: 'cascade' }).notNull(),
  targetType: formRuleTargetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFormRuleTargetSchema = createInsertSchema(formRuleTargets).omit({
  id: true,
  createdAt: true
});

// 6. Client Submissions
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'restrict' }).notNull(),
  formVersion: integer("form_version").notNull(),
  userId: integer("user_id"), // References will be set via relations
  clientId: integer("client_id"), 
  opportunityId: integer("opportunity_id"),
  rawLeadId: integer("raw_lead_id"),
  status: text("status").default("in_progress").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions, {
  submittedAt: z.coerce.date().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// 7. Answers to Questions in a Submission
export const formSubmissionAnswers = pgTable("form_submission_answers", {
  id: serial("id").primaryKey(),
  formSubmissionId: integer("form_submission_id").references(() => formSubmissions.id, { onDelete: 'cascade' }).notNull(),
  formPageQuestionId: integer("form_page_question_id").references(() => formPageQuestions.id, { onDelete: 'restrict' }).notNull(),
  answerValue: jsonb("answer_value"),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const insertFormSubmissionAnswerSchema = createInsertSchema(formSubmissionAnswers, {
  answerValue: z.any().optional(),
}).omit({
  id: true
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
}));

export const formPageQuestionsRelations = relations(formPageQuestions, ({ one, many }) => ({
  formPage: one(formPages, { fields: [formPageQuestions.formPageId], references: [formPages.id] }),
  libraryQuestion: one(questionLibrary, { fields: [formPageQuestions.libraryQuestionId], references: [questionLibrary.id] }),
  triggeringRules: many(formRules, { relationName: 'triggerQuestionRules' }),
  submissionAnswers: many(formSubmissionAnswers),
}));

export const formRulesRelations = relations(formRules, ({ one, many }) => ({
  form: one(forms, { fields: [formRules.formId], references: [forms.id] }),
  triggerFormPageQuestion: one(formPageQuestions, {
    fields: [formRules.triggerFormPageQuestionId],
    references: [formPageQuestions.id],
    relationName: 'triggerQuestionRules',
  }),
  targets: many(formRuleTargets),
}));

export const formRuleTargetsRelations = relations(formRuleTargets, ({ one }) => ({
    rule: one(formRules, {
        fields: [formRuleTargets.ruleId],
        references: [formRules.id],
    })
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one, many }) => {
  const relations = {
    form: one(forms, { fields: [formSubmissions.formId], references: [forms.id] }),
    answers: many(formSubmissionAnswers)
  };
  
  return relations;
});

export const formSubmissionAnswersRelations = relations(formSubmissionAnswers, ({ one }) => ({
  submission: one(formSubmissions, { fields: [formSubmissionAnswers.formSubmissionId], references: [formSubmissions.id] }),
  formPageQuestion: one(formPageQuestions, { fields: [formSubmissionAnswers.formPageQuestionId], references: [formPageQuestions.id] }),
}));

// --- TYPES ---

export type QuestionLibrary = typeof questionLibrary.$inferSelect;
export type InsertQuestionLibrary = z.infer<typeof insertQuestionLibrarySchema>;

export type LibraryMatrixRow = typeof libraryMatrixRows.$inferSelect;
export type InsertLibraryMatrixRow = z.infer<typeof insertLibraryMatrixRowSchema>;

export type LibraryMatrixColumn = typeof libraryMatrixColumns.$inferSelect;
export type InsertLibraryMatrixColumn = z.infer<typeof insertLibraryMatrixColumnSchema>;

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;

export type FormPage = typeof formPages.$inferSelect;
export type InsertFormPage = z.infer<typeof insertFormPageSchema>;

export type FormPageQuestion = typeof formPageQuestions.$inferSelect;
export type InsertFormPageQuestion = z.infer<typeof insertFormPageQuestionSchema>;

export type FormRule = typeof formRules.$inferSelect;
export type InsertFormRule = z.infer<typeof insertFormRuleSchema>;

export type FormRuleTarget = typeof formRuleTargets.$inferSelect;
export type InsertFormRuleTarget = z.infer<typeof insertFormRuleTargetSchema>;

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

export type FormSubmissionAnswer = typeof formSubmissionAnswers.$inferSelect;
export type InsertFormSubmissionAnswer = z.infer<typeof insertFormSubmissionAnswerSchema>;