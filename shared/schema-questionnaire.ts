import { pgTable, serial, text, integer, boolean, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';

// ----------------
// Component Types
// ----------------
export const componentTypes = pgTable('questionnaire_component_types', {
  id: serial('id').primaryKey(),
  typeKey: text('type_key').notNull().unique(),
  componentCategory: text('component_category'),
  displayName: text('display_name').notNull(),
  description: text('description'),
  configSchema: json('config_schema'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type ComponentType = InferSelectModel<typeof componentTypes>;
export type InsertComponentType = InferInsertModel<typeof componentTypes>;
export const insertComponentTypeSchema = createInsertSchema(componentTypes).omit({ id: true, createdAt: true, updatedAt: true });

// ----------------
// Questionnaire Definitions
// ----------------
export const eventTypeEnum = pgEnum('event_type', [
  'corporate', 
  'wedding', 
  'engagement', 
  'birthday', 
  'private_party',
  'food_truck'
]);

export const questionnaireDefinitions = pgTable('questionnaire_definitions', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  versionName: text('version_name').notNull(),
  eventType: eventTypeEnum('event_type'),
  isActive: boolean('is_active').default(true),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionnaireDefinition = InferSelectModel<typeof questionnaireDefinitions>;
export type InsertQuestionnaireDefinition = InferInsertModel<typeof questionnaireDefinitions>;
export const insertQuestionnaireDefinitionSchema = createInsertSchema(questionnaireDefinitions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Pages
// ----------------
export const questionnairePages = pgTable('questionnaire_pages', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').notNull().references(() => questionnaireDefinitions.id),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionnairePage = InferSelectModel<typeof questionnairePages>;
export type InsertQuestionnairePage = InferInsertModel<typeof questionnairePages>;
export const insertQuestionnairePageSchema = createInsertSchema(questionnairePages).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Reusable Sections (Templates)
// ----------------
export const questionnaireSections = pgTable('questionnaire_sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  templateKey: text('template_key').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionnaireSection = InferSelectModel<typeof questionnaireSections>;
export type InsertQuestionnaireSection = InferInsertModel<typeof questionnaireSections>;
export const insertQuestionnaireSectionSchema = createInsertSchema(questionnaireSections).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Page-Section Relationship (for reusing sections across pages)
// ----------------
export const pageSections = pgTable('questionnaire_page_sections', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => questionnairePages.id),
  sectionId: integer('section_id').notNull().references(() => questionnaireSections.id),
  sectionOrder: integer('section_order').notNull(),
  isConditional: boolean('is_conditional').default(false),
  conditionLogic: json('condition_logic'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type PageSection = InferSelectModel<typeof pageSections>;
export type InsertPageSection = InferInsertModel<typeof pageSections>;
export const insertPageSectionSchema = createInsertSchema(pageSections).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Questions
// ----------------
export const questionTypeEnum = pgEnum('question_type', [
  'text',
  'textarea',
  'email',
  'phone',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'date',
  'time',
  'file',
  'matrix',
  'rating',
  'signature',
  'address',
  'custom'
]);

export const questionnaireQuestions = pgTable('questionnaire_questions', {
  id: serial('id').primaryKey(),
  componentTypeId: integer('component_type_id'),
  pageId: integer('page_id'),
  questionType: questionTypeEnum('question_type'),
  questionKey: text('question_key'),
  text: text('question_text').notNull(),
  helpText: text('help_text'),
  placeholderText: text('placeholder_text'),
  isRequired: boolean('is_required').default(false),
  order: integer('order'),
  validationRules: json('validation_rules'),
  defaultValue: json('default_value'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionnaireQuestion = InferSelectModel<typeof questionnaireQuestions>;
export type InsertQuestionnaireQuestion = InferInsertModel<typeof questionnaireQuestions>;
export const insertQuestionnaireQuestionSchema = createInsertSchema(questionnaireQuestions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Question Options (for multi-choice questions)
// ----------------
export const questionnaireQuestionOptions = pgTable('questionnaire_question_options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').notNull().references(() => questionnaireQuestions.id),
  optionText: text('option_text').notNull(),
  optionValue: text('option_value'),
  order: integer('order').notNull(),
  isDefault: boolean('is_default').default(false),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionOption = InferSelectModel<typeof questionnaireQuestionOptions>;
export type InsertQuestionOption = InferInsertModel<typeof questionnaireQuestionOptions>;
export const insertQuestionOptionSchema = createInsertSchema(questionnaireQuestionOptions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Section Questions (link between sections and questions)
// ----------------
export const sectionQuestions = pgTable('questionnaire_section_questions', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => questionnaireSections.id),
  questionId: integer('question_id').notNull().references(() => questionnaireQuestions.id),
  questionOrder: integer('question_order').notNull(),
  isConditional: boolean('is_conditional').default(false),
  conditionLogic: json('condition_logic'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type SectionQuestion = InferSelectModel<typeof sectionQuestions>;
export type InsertSectionQuestion = InferInsertModel<typeof sectionQuestions>;
export const insertSectionQuestionSchema = createInsertSchema(sectionQuestions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Conditional Logic
// ----------------
export const conditionTypeEnum = pgEnum('condition_type', [
  'equals', 
  'not_equals', 
  'contains', 
  'greater_than',
  'less_than',
  'in_list',
  'not_in_list',
  'is_empty',
  'is_not_empty',
  'custom'
]);

export const actionTypeEnum = pgEnum('action_type', [
  'show', 
  'hide', 
  'require', 
  'skip_to',
  'set_value',
  'custom'
]);

export const conditionalLogic = pgTable('questionnaire_conditional_logic', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  targetType: text('target_type').notNull(), // 'question', 'section', 'page'
  targetId: integer('target_id').notNull(),
  conditionType: conditionTypeEnum('condition_type').notNull(),
  sourceType: text('source_type').notNull(), // 'question', 'user', 'data'
  sourceId: text('source_id'), // Can be question ID or other identifier
  conditionValue: json('condition_value'),
  actionType: actionTypeEnum('action_type').notNull(),
  actionValue: json('action_value'),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type ConditionalLogic = InferSelectModel<typeof conditionalLogic>;
export type InsertConditionalLogic = InferInsertModel<typeof conditionalLogic>;
export const insertConditionalLogicSchema = createInsertSchema(conditionalLogic).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ----------------
// Responses
// ----------------
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: serial('id').primaryKey(),
  definitionId: integer('definition_id').notNull().references(() => questionnaireDefinitions.id),
  userId: integer('user_id'), // Optional, can be null for anonymous responses
  responseData: json('response_data').notNull(),
  metadata: json('metadata'),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type QuestionnaireResponse = InferSelectModel<typeof questionnaireResponses>;
export type InsertQuestionnaireResponse = InferInsertModel<typeof questionnaireResponses>;
export const insertQuestionnaireResponseSchema = createInsertSchema(questionnaireResponses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});