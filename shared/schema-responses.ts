import { pgTable, text, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { questionnaireDefinitions, questionnaireQuestions } from "./schema-questionnaire";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Store complete questionnaire submissions
export const questionnaireSubmissions = pgTable("questionnaire_submissions", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  definitionId: integer("definition_id").notNull().references(() => questionnaireDefinitions.id, { onDelete: "cascade" }),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  submitterPhone: text("submitter_phone"),
  status: text("status").default("submitted").notNull(), // submitted, in_review, approved, rejected
  eventDate: timestamp("event_date"),
  eventType: text("event_type").notNull(),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  additionalNotes: text("additional_notes"),
  metadata: json("metadata").$type<Record<string, any>>(),
});

// Store individual question responses
export const questionResponses = pgTable("question_responses", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  submissionId: uuid("submission_id").notNull().references(() => questionnaireSubmissions.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionnaireQuestions.id),
  questionKey: text("question_key").notNull(), // For direct access without joins
  textValue: text("text_value"), // For text, email, etc.
  numberValue: integer("number_value"), // For numeric responses
  booleanValue: boolean("boolean_value"), // For boolean responses
  dateValue: timestamp("date_value"), // For date responses
  jsonValue: json("json_value").$type<any>(), // For complex responses (arrays, objects)
  responseDate: timestamp("response_date").defaultNow().notNull(),
});

// Create Zod schemas for insert operations
export const insertQuestionnaireSubmissionSchema = createInsertSchema(questionnaireSubmissions);
export const insertQuestionResponseSchema = createInsertSchema(questionResponses);

// Define TypeScript types for each table
export type QuestionnaireSubmission = typeof questionnaireSubmissions.$inferSelect;
export type InsertQuestionnaireSubmission = z.infer<typeof insertQuestionnaireSubmissionSchema>;

export type QuestionResponse = typeof questionResponses.$inferSelect;
export type InsertQuestionResponse = z.infer<typeof insertQuestionResponseSchema>;

// Response summary type for API responses
export type SubmissionWithResponses = QuestionnaireSubmission & {
  responses: QuestionResponse[];
};