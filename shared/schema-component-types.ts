import { pgTable, serial, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Table for extensible component types (questions, conditions, etc.)
export const questionnaireComponentTypes = pgTable('questionnaire_component_types', {
  id: serial('id').primaryKey(),
  typeKey: text('type_key').notNull().unique(),
  componentCategory: text('component_category').notNull(), // 'question', 'condition', etc.
  displayName: text('display_name').notNull(),
  description: text('description'),
  configSchema: jsonb('config_schema'), // JSON schema defining expected configuration
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Insert schema for Zod validation
export const insertQuestionnaireComponentType = createInsertSchema(questionnaireComponentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type QuestionnaireComponentType = typeof questionnaireComponentTypes.$inferSelect;
export type InsertQuestionnaireComponentType = z.infer<typeof insertQuestionnaireComponentType>;

// Sample component type configurations for different question types
export const defaultComponentTypeConfigs = {
  // Question types
  text: {
    typeKey: 'text',
    componentCategory: 'question',
    displayName: 'Text Input',
    description: 'Single-line text input field',
    configSchema: {
      type: 'object',
      properties: {
        minLength: { type: 'number' },
        maxLength: { type: 'number' },
        pattern: { type: 'string' }
      }
    }
  },
  textarea: {
    typeKey: 'textarea',
    componentCategory: 'question',
    displayName: 'Textarea',
    description: 'Multi-line text input field',
    configSchema: {
      type: 'object',
      properties: {
        minLength: { type: 'number' },
        maxLength: { type: 'number' },
        rows: { type: 'number', default: 3 }
      }
    }
  },
  select: {
    typeKey: 'select',
    componentCategory: 'question',
    displayName: 'Dropdown Select',
    description: 'Dropdown selection field',
    configSchema: {
      type: 'object',
      properties: {
        allowMultiple: { type: 'boolean', default: false },
        placeholder: { type: 'string' }
      }
    }
  },
  
  // Condition types
  equals: {
    typeKey: 'equals',
    componentCategory: 'condition',
    displayName: 'Equals',
    description: 'Checks if a value equals another value',
    configSchema: {
      type: 'object',
      properties: {
        caseSensitive: { type: 'boolean', default: false }
      }
    }
  },
  contains: {
    typeKey: 'contains',
    componentCategory: 'condition',
    displayName: 'Contains',
    description: 'Checks if a value contains another value',
    configSchema: {
      type: 'object',
      properties: {
        caseSensitive: { type: 'boolean', default: false }
      }
    }
  },
  greaterThan: {
    typeKey: 'greaterThan',
    componentCategory: 'condition',
    displayName: 'Greater Than',
    description: 'Checks if a value is greater than another value',
    configSchema: {
      type: 'object',
      properties: {
        inclusive: { type: 'boolean', default: false }
      }
    }
  }
};