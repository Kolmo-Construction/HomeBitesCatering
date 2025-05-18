import { pgTable, text, integer, boolean, timestamp, uuid, primaryKey, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define component types for extensible question/component types
export const componentTypes = pgTable("questionnaire_component_types", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  typeKey: text("type_key").notNull(),
  componentCategory: text("component_category").notNull(),
  displayName: text("display_name").notNull(),
  configSchema: json("config_schema").$type<Record<string, any>>(),
  isActive: boolean("is_active").default(true).notNull(),
  configuration: json("configuration").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define questionnaire definitions
export const questionnaireDefinitions = pgTable("questionnaire_definitions", {
  id: integer("id").primaryKey().notNull(),
  name: text("name").notNull(),
  versionName: text("version_name").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // corporate, wedding, birthday, etc.
  category: text("category"), // For backward compatibility
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define questionnaire pages
export const questionnairePages = pgTable("questionnaire_pages", {
  id: integer("id").primaryKey().notNull(),
  definitionId: integer("definition_id").notNull().references(() => questionnaireDefinitions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  isConditional: boolean("is_conditional").default(false),
  conditionLogic: json("condition_logic").$type<Record<string, any>>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define sections (reusable templates)
export const questionnaireSections = pgTable("questionnaire_sections", {
  id: integer("id").primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isTemplate: boolean("is_template").default(false).notNull(),
  templateKey: text("template_key"), // For identifying reusable templates
  parentSectionId: integer("parent_section_id").references(() => questionnaireSections.id), // For section inheritance
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Link sections to pages
export const pageSections = pgTable("questionnaire_page_sections", {
  id: integer("id").primaryKey().notNull(),
  pageId: integer("page_id").notNull().references(() => questionnairePages.id, { onDelete: "cascade" }),
  sectionId: integer("section_id").notNull().references(() => questionnaireSections.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  sectionOrder: integer("section_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Link questions to sections
export const sectionQuestions = pgTable("questionnaire_section_questions", {
  id: integer("id").primaryKey().notNull(),
  sectionId: integer("section_id").notNull().references(() => questionnaireSections.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
  questionOrder: integer("question_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define questions
export const questionnaireQuestions = pgTable("questionnaire_questions", {
  id: integer("id").primaryKey().notNull(),
  text: text("text").notNull(),
  questionText: text("question_text").notNull(),
  questionKey: text("question_key").notNull(), // For identifying responses
  questionType: text("question_type").notNull(), // text, radio, checkbox, etc.
  componentTypeId: integer("component_type_id").references(() => componentTypes.id), // Reference to component type
  isRequired: boolean("is_required").default(false).notNull(),
  helpText: text("help_text"),
  placeholderText: text("placeholder_text"),
  order: integer("order").notNull(),
  validationRules: json("validation_rules").$type<Record<string, any>>(), // JSON for flexible validation
  defaultValue: json("default_value").$type<any>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define question options (for radio, checkboxes, etc.)
export const questionnaireQuestionOptions = pgTable("questionnaire_question_options", {
  id: integer("id").primaryKey().notNull(),
  questionId: integer("question_id").notNull().references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  optionValue: text("option_value").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Alias for backward compatibility
export const questionOptions = questionnaireQuestionOptions;

// Define matrix columns (for matrix questions)
export const matrixColumns = pgTable("questionnaire_matrix_columns", {
  id: integer("id").primaryKey().notNull(),
  questionId: integer("question_id").notNull().references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
  columnText: text("column_text").notNull(),
  columnValue: text("column_value").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define conditional logic
export const conditionalLogic = pgTable("questionnaire_conditional_logic", {
  id: integer("id").primaryKey().notNull(),
  targetQuestionId: integer("target_question_id").notNull().references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // show_if_true, hide_if_true, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define conditions (for conditional logic)
export const conditions = pgTable("questionnaire_conditions", {
  id: integer("id").primaryKey().notNull(),
  conditionalLogicId: integer("conditional_logic_id").notNull().references(() => conditionalLogic.id, { onDelete: "cascade" }),
  sourceQuestionId: integer("source_question_id").notNull().references(() => questionnaireQuestions.id, { onDelete: "cascade" }),
  operator: text("operator").notNull(), // equals, contains, greater_than, etc.
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define questionnaire responses
export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: integer("id").primaryKey().notNull(),
  definitionId: integer("definition_id").notNull().references(() => questionnaireDefinitions.id),
  respondentId: integer("respondent_id"), // Optional reference to a user or lead
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define response answers
export const responseAnswers = pgTable("questionnaire_response_answers", {
  id: integer("id").primaryKey().notNull(),
  responseId: integer("response_id").notNull().references(() => questionnaireResponses.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionnaireQuestions.id),
  questionKey: text("question_key").notNull(), // Duplicated for direct access
  answerValue: text("answer_value"), // For simple answers
  answerValues: json("answer_values").$type<string[]>(), // For multiple selections
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Create Zod schemas for insert operations
export const insertComponentTypeSchema = createInsertSchema(componentTypes);
export const insertQuestionnaireDefinitionSchema = createInsertSchema(questionnaireDefinitions);
export const insertQuestionnairePageSchema = createInsertSchema(questionnairePages);
export const insertQuestionnaireSectionSchema = createInsertSchema(questionnaireSections);
export const insertPageSectionSchema = createInsertSchema(pageSections);
export const insertQuestionnaireQuestionSchema = createInsertSchema(questionnaireQuestions);
export const insertQuestionOptionSchema = createInsertSchema(questionOptions);
export const insertMatrixColumnSchema = createInsertSchema(matrixColumns);
export const insertConditionalLogicSchema = createInsertSchema(conditionalLogic);
export const insertConditionSchema = createInsertSchema(conditions);
export const insertQuestionnaireResponseSchema = createInsertSchema(questionnaireResponses);
export const insertResponseAnswerSchema = createInsertSchema(responseAnswers);
export const insertSectionQuestionSchema = createInsertSchema(sectionQuestions);

// Define TypeScript types for each table
export type ComponentType = typeof componentTypes.$inferSelect;
export type InsertComponentType = z.infer<typeof insertComponentTypeSchema>;

export type QuestionnaireDefinition = typeof questionnaireDefinitions.$inferSelect;
export type InsertQuestionnaireDefinition = z.infer<typeof insertQuestionnaireDefinitionSchema>;

export type QuestionnairePage = typeof questionnairePages.$inferSelect;
export type InsertQuestionnairePage = z.infer<typeof insertQuestionnairePageSchema>;

export type QuestionnaireSection = typeof questionnaireSections.$inferSelect;
export type InsertQuestionnaireSection = z.infer<typeof insertQuestionnaireSectionSchema>;

export type PageSection = typeof pageSections.$inferSelect;
export type InsertPageSection = z.infer<typeof insertPageSectionSchema>;

export type QuestionnaireQuestion = typeof questionnaireQuestions.$inferSelect;
export type InsertQuestionnaireQuestion = z.infer<typeof insertQuestionnaireQuestionSchema>;

export type QuestionOption = typeof questionOptions.$inferSelect;
export type InsertQuestionOption = z.infer<typeof insertQuestionOptionSchema>;

export type MatrixColumn = typeof matrixColumns.$inferSelect;
export type InsertMatrixColumn = z.infer<typeof insertMatrixColumnSchema>;

export type ConditionalLogic = typeof conditionalLogic.$inferSelect;
export type InsertConditionalLogic = z.infer<typeof insertConditionalLogicSchema>;

export type Condition = typeof conditions.$inferSelect;
export type InsertCondition = z.infer<typeof insertConditionSchema>;

export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type InsertQuestionnaireResponse = z.infer<typeof insertQuestionnaireResponseSchema>;

export type ResponseAnswer = typeof responseAnswers.$inferSelect;
export type InsertResponseAnswer = z.infer<typeof insertResponseAnswerSchema>;

// Extended types for API operations
export type FullQuestionnaire = QuestionnaireDefinition & {
  pages: (QuestionnairePage & {
    sections: (QuestionnaireSection & {
      questions: (QuestionnaireQuestion & {
        options?: QuestionOption[];
        matrixColumns?: MatrixColumn[];
      })[];
    })[];
  })[];
  conditionalLogic: (ConditionalLogic & {
    conditions: Condition[];
  })[];
};