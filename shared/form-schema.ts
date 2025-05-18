// Standalone form schema to avoid circular imports
import { type PgTableWithColumns, pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Using references to tables defined in schema.ts in a safe way 
// instead of trying to import them directly to avoid circular dependencies
// We'll reference these tables by column name in the relations

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

export const formStatusEnum = pgEnum("form_status", [
  'draft', 'published', 'archived', 'testing'
]);

export const formRuleTargetTypeEnum = pgEnum("form_rule_target_type", [
  'question',
  'page',
]);

export const reorderFormPagesSchema = z.array(z.object({
  pageId: z.number(),
  newPageOrder: z.number().int().min(0)
}));

export type ReorderFormPages = z.infer<typeof reorderFormPagesSchema>;

// --- TABLES ---

// 1. The Question Library for reusable questions
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
  status: formStatusEnum("status").default('draft').notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formPages = pgTable("form_pages", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  pageTitle: text("page_title").notNull(),
  pageOrder: integer("page_order").notNull(),
  description: text("description"),
  isVisible: boolean("is_visible").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormPageSchema = createInsertSchema(formPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formPageQuestions = pgTable("form_page_questions", {
  id: serial("id").primaryKey(),
  formPageId: integer("form_page_id").references(() => formPages.id, { onDelete: 'cascade' }).notNull(),
  libraryQuestionId: integer("library_question_id").references(() => questionLibrary.id).notNull(),
  questionKey: text("question_key").notNull(), // Unique within a specific form, used for rules & responses
  questionText: text("question_text").notNull(),
  questionOrder: integer("question_order").notNull(),
  isRequired: boolean("is_required").default(false).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  metadata: jsonb("metadata"), // Override any defaults
  options: jsonb("options"), // Override any defaults
  helpText: text("help_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    formPageQuestionKeyUnique: unique().on(table.formPageId, table.questionKey),
}));

export const insertFormPageQuestionSchema = createInsertSchema(formPageQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formRules = pgTable("form_rules", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  ruleName: text("rule_name").notNull(),
  condition: conditionalLogicConditionTypeEnum("condition").notNull(),
  sourceQuestionKey: text("source_question_key").notNull(), // Question key that triggers this rule
  conditionValue: text("condition_value"), // Value to compare against
  action: conditionalLogicActionTypeEnum("action").notNull(), // What happens when condition is met
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormRuleSchema = createInsertSchema(formRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formRuleTargets = pgTable("form_rule_targets", {
  id: serial("id").primaryKey(),
  formRuleId: integer("form_rule_id").references(() => formRules.id, { onDelete: 'cascade' }).notNull(),
  targetType: formRuleTargetTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(), // pageId or questionId depending on targetType
  targetValue: text("target_value"), // For "set_value" actions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormRuleTargetSchema = createInsertSchema(formRuleTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id).notNull(),
  formVersion: integer("form_version").notNull(), // Version of the form when submitted
  clientId: integer("client_id"),
  opportunityId: integer("opportunity_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("in_progress").notNull(), // in_progress, completed, abandoned
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions, {
  clientId: z.number().optional().nullable(),
  opportunityId: z.number().optional().nullable(),
  completedAt: z.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const formSubmissionAnswers = pgTable("form_submission_answers", {
  id: serial("id").primaryKey(),
  formSubmissionId: integer("form_submission_id").references(() => formSubmissions.id, { onDelete: 'cascade' }).notNull(),
  questionKey: text("question_key").notNull(), // Matches the question_key in form_page_questions
  answer: jsonb("answer").notNull(), // Structured response data
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    submissionQuestionKeyUnique: unique().on(table.formSubmissionId, table.questionKey),
}));

export const insertFormSubmissionAnswerSchema = createInsertSchema(formSubmissionAnswers, {
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// --- RELATIONS ---

export const questionLibraryRelations = relations(questionLibrary, ({ many }) => ({
  matrixRows: many(libraryMatrixRows),
  matrixColumns: many(libraryMatrixColumns),
}));

export const libraryMatrixRowsRelations = relations(libraryMatrixRows, ({ one }) => ({
  question: one(questionLibrary, {
    fields: [libraryMatrixRows.libraryQuestionId],
    references: [questionLibrary.id],
  }),
}));

export const libraryMatrixColumnsRelations = relations(libraryMatrixColumns, ({ one }) => ({
  question: one(questionLibrary, {
    fields: [libraryMatrixColumns.libraryQuestionId],
    references: [questionLibrary.id],
  }),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  pages: many(formPages),
  rules: many(formRules),
  submissions: many(formSubmissions),
}));

export const formPagesRelations = relations(formPages, ({ one, many }) => ({
  form: one(forms, {
    fields: [formPages.formId],
    references: [forms.id],
  }),
  questions: many(formPageQuestions),
}));

export const formPageQuestionsRelations = relations(formPageQuestions, ({ one, many }) => ({
  page: one(formPages, {
    fields: [formPageQuestions.formPageId],
    references: [formPages.id],
  }),
  libraryQuestion: one(questionLibrary, {
    fields: [formPageQuestions.libraryQuestionId],
    references: [questionLibrary.id],
  }),
}));

export const formRulesRelations = relations(formRules, ({ one, many }) => ({
  form: one(forms, {
    fields: [formRules.formId],
    references: [forms.id],
  }),
  targets: many(formRuleTargets),
}));

export const formRuleTargetsRelations = relations(formRuleTargets, ({ one }) => ({
  rule: one(formRules, {
    fields: [formRuleTargets.formRuleId],
    references: [formRules.id],
  }),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one, many }) => {
  return {
    form: one(forms, {
      fields: [formSubmissions.formId],
      references: [forms.id],
    }),
    answers: many(formSubmissionAnswers),
  };
});

export const formSubmissionAnswersRelations = relations(formSubmissionAnswers, ({ one }) => ({
  submission: one(formSubmissions, {
    fields: [formSubmissionAnswers.formSubmissionId],
    references: [formSubmissions.id],
  }),
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