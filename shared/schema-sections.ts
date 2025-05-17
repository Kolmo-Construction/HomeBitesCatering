import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { questionnairePages } from './schema';
import { questionnaireQuestions } from './schema';

// Table for reusable questionnaire sections
export const questionnaireSections = pgTable('questionnaire_sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  templateKey: text('template_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Junction table for associating sections with pages
export const questionnairePageSections = pgTable('questionnaire_page_sections', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => questionnairePages.id, { onDelete: 'cascade' }),
  sectionId: integer('section_id').notNull().references(() => questionnaireSections.id, { onDelete: 'cascade' }),
  sectionOrder: integer('section_order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Junction table for associating questions with sections (for template questions)
export const questionnaireSectionQuestions = pgTable('questionnaire_section_questions', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => questionnaireSections.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questionnaireQuestions.id, { onDelete: 'cascade' }),
  questionOrder: integer('question_order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relationships
export const questionnaireSectionsRelations = relations(questionnaireSections, ({ many }) => ({
  pageSections: many(questionnairePageSections),
  sectionQuestions: many(questionnaireSectionQuestions)
}));

export const questionnairePageSectionsRelations = relations(questionnairePageSections, ({ one }) => ({
  page: one(questionnairePages, {
    fields: [questionnairePageSections.pageId],
    references: [questionnairePages.id]
  }),
  section: one(questionnaireSections, {
    fields: [questionnairePageSections.sectionId],
    references: [questionnaireSections.id]
  })
}));

export const questionnaireSectionQuestionsRelations = relations(questionnaireSectionQuestions, ({ one }) => ({
  section: one(questionnaireSections, {
    fields: [questionnaireSectionQuestions.sectionId],
    references: [questionnaireSections.id]
  }),
  question: one(questionnaireQuestions, {
    fields: [questionnaireSectionQuestions.questionId],
    references: [questionnaireQuestions.id]
  })
}));

// Insert schemas for Zod validation
export const insertQuestionnaireSection = createInsertSchema(questionnaireSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnairePageSection = createInsertSchema(questionnairePageSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuestionnaireSectionQuestion = createInsertSchema(questionnaireSectionQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type QuestionnaireSection = typeof questionnaireSections.$inferSelect;
export type InsertQuestionnaireSection = z.infer<typeof insertQuestionnaireSection>;

export type QuestionnairePageSection = typeof questionnairePageSections.$inferSelect;
export type InsertQuestionnairePageSection = z.infer<typeof insertQuestionnairePageSection>;

export type QuestionnaireSectionQuestion = typeof questionnaireSectionQuestions.$inferSelect;
export type InsertQuestionnaireSectionQuestion = z.infer<typeof insertQuestionnaireSectionQuestion>;