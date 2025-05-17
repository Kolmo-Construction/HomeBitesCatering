/**
 * Questionnaire Service - Main integration point for the flexible architecture
 * 
 * This service integrates:
 * - Component-based data model
 * - Event-driven architecture
 * - Validation system
 * - Rule engine for configuration-driven logic
 * - API versioning
 */

import { db } from '../db.js';
import { eq, and } from 'drizzle-orm';
import {
  questionnaireDefinitions,
  questionnairePages,
  questionnaireQuestions,
  questionnaireQuestionOptions,
  questionnaireConditionalLogic,
} from '../../shared/schema.js';
import { 
  questionnaireSections,
  questionnairePageSections,
  questionnaireSectionQuestions
} from '../../shared/schema-sections.js';
import {
  questionnaireComponentTypes
} from '../../shared/schema-component-types.js';

import eventEmitter, { 
  emitCreatedEvent, 
  emitUpdatedEvent, 
  emitDeletedEvent,
  emitRelationshipEvent,
  EVENT_TYPES
} from './event-system.js';

import {
  validateComponent,
  validateRelationship
} from './validation-system.js';

import {
  processRules,
  registerRule
} from './rule-engine.js';

// Core questionnaire operations with integration of all architectural components

/**
 * Create a new questionnaire definition
 * @param {Object} definitionData - Data for the new definition
 * @returns {Object} Created definition
 */
export async function createQuestionnaireDefinition(definitionData) {
  // Validate the data
  const validationResult = validateComponent('definition', definitionData);
  if (!validationResult.valid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Create the definition in the database
  const [definition] = await db.insert(questionnaireDefinitions)
    .values(definitionData)
    .returning();
  
  // Emit event for the created definition
  emitCreatedEvent('definition', definition);
  
  return definition;
}

/**
 * Add a page to a questionnaire definition
 * @param {Object} pageData - Data for the new page
 * @returns {Object} Created page
 */
export async function addQuestionnairePage(pageData) {
  // Validate the data
  const validationResult = validateComponent('page', pageData);
  if (!validationResult.valid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Create the page in the database
  const [page] = await db.insert(questionnairePages)
    .values(pageData)
    .returning();
  
  // Emit event for the created page
  emitCreatedEvent('page', page);
  
  // Emit relationship event for definition-page
  emitRelationshipEvent(EVENT_TYPES.PAGE_CREATED, {
    definitionId: pageData.definitionId,
    pageId: page.id
  });
  
  return page;
}

/**
 * Create a reusable section template
 * @param {Object} sectionData - Data for the new section
 * @returns {Object} Created section
 */
export async function createQuestionnaireSection(sectionData) {
  // Validate the data
  const validationResult = validateComponent('section', sectionData);
  if (!validationResult.valid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Create the section in the database
  const [section] = await db.insert(questionnaireSections)
    .values(sectionData)
    .returning();
  
  // Emit event for the created section
  emitCreatedEvent('section', section);
  
  return section;
}

/**
 * Add questions to a section template
 * @param {number} sectionId - ID of the section
 * @param {Array} questions - Array of question data
 * @returns {Array} Created questions
 */
export async function addSectionQuestions(sectionId, questions) {
  const createdQuestions = [];
  
  // Process each question
  for (const questionData of questions) {
    // Validate the question data
    const validationResult = validateComponent('question', questionData);
    if (!validationResult.valid) {
      throw new Error(`Validation failed for question: ${validationResult.errors.join(', ')}`);
    }
    
    // Create the question in the database
    const [question] = await db.insert(questionnaireQuestions)
      .values(questionData)
      .returning();
    
    // Associate the question with the section
    const sectionQuestionData = {
      sectionId,
      questionId: question.id,
      questionOrder: questionData.order || 1
    };
    
    await db.insert(questionnaireSectionQuestions)
      .values(sectionQuestionData);
    
    // Emit event for the created question
    emitCreatedEvent('question', question);
    
    // Emit relationship event for section-question
    emitRelationshipEvent(EVENT_TYPES.QUESTION_ADDED_TO_SECTION, {
      sectionId,
      questionId: question.id,
      questionOrder: questionData.order || 1
    });
    
    // Add options if provided
    if (questionData.options && Array.isArray(questionData.options)) {
      const options = [];
      
      for (const optionData of questionData.options) {
        // Create the option in the database
        const [option] = await db.insert(questionnaireQuestionOptions)
          .values({
            questionId: question.id,
            optionText: optionData.optionText,
            optionValue: optionData.optionValue || optionData.optionText.toLowerCase().replace(/\s+/g, '_'),
            order: optionData.order || 1
          })
          .returning();
        
        // Emit event for the created option
        emitCreatedEvent('option', option);
        
        options.push(option);
      }
      
      // Add options to the created question
      createdQuestions.push({
        ...question,
        options
      });
    } else {
      createdQuestions.push(question);
    }
  }
  
  return createdQuestions;
}

/**
 * Add section to a page
 * @param {number} pageId - ID of the page
 * @param {number} sectionId - ID of the section
 * @param {number} sectionOrder - Order of the section within the page
 * @returns {Object} Created page-section relationship
 */
export async function addSectionToPage(pageId, sectionId, sectionOrder) {
  // Validate the relationship
  const validationResult = validateRelationship('section_to_page', { pageId, sectionId, sectionOrder });
  if (!validationResult.valid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Create the page-section relationship in the database
  const [pageSection] = await db.insert(questionnairePageSections)
    .values({ pageId, sectionId, sectionOrder })
    .returning();
  
  // Emit relationship event
  emitRelationshipEvent(EVENT_TYPES.SECTION_ADDED_TO_PAGE, {
    pageId,
    sectionId,
    sectionOrder
  });
  
  // Get questions from the section template
  const sectionQuestions = await db
    .select()
    .from(questionnaireSectionQuestions)
    .where(eq(questionnaireSectionQuestions.sectionId, sectionId))
    .orderBy(questionnaireSectionQuestions.questionOrder);
  
  // For each section question, create a page-specific copy
  for (const sectionQuestion of sectionQuestions) {
    // Get the template question details
    const [templateQuestion] = await db
      .select()
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.id, sectionQuestion.questionId));
    
    if (templateQuestion) {
      // Create a copy of the question for this page
      const [pageQuestion] = await db.insert(questionnaireQuestions)
        .values({
          pageId,
          questionText: templateQuestion.questionText,
          questionKey: templateQuestion.questionKey,
          questionType: templateQuestion.questionType,
          order: templateQuestion.order,
          isRequired: templateQuestion.isRequired,
          placeholderText: templateQuestion.placeholderText,
          helpText: templateQuestion.helpText,
          validationRules: templateQuestion.validationRules
        })
        .returning();
      
      // Emit event for the created question
      emitCreatedEvent('question', pageQuestion);
      
      // Copy options if the question has them
      const templateOptions = await db
        .select()
        .from(questionnaireQuestionOptions)
        .where(eq(questionnaireQuestionOptions.questionId, templateQuestion.id))
        .orderBy(questionnaireQuestionOptions.order);
      
      for (const option of templateOptions) {
        const [newOption] = await db.insert(questionnaireQuestionOptions)
          .values({
            questionId: pageQuestion.id,
            optionText: option.optionText,
            optionValue: option.optionValue,
            order: option.order,
            defaultSelectionIndicator: option.defaultSelectionIndicator,
            relatedMenuItemId: option.relatedMenuItemId
          })
          .returning();
        
        // Emit event for the created option
        emitCreatedEvent('option', newOption);
      }
    }
  }
  
  return pageSection;
}

/**
 * Register a component type
 * @param {Object} componentTypeData - Data for the new component type
 * @returns {Object} Created component type
 */
export async function registerComponentType(componentTypeData) {
  // Validate the data
  const validationResult = validateComponent('componentType', componentTypeData);
  if (!validationResult.valid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
  }
  
  // Check if component type already exists
  const [existingType] = await db
    .select()
    .from(questionnaireComponentTypes)
    .where(eq(questionnaireComponentTypes.typeKey, componentTypeData.typeKey));
  
  if (existingType) {
    throw new Error(`Component type with key '${componentTypeData.typeKey}' already exists`);
  }
  
  // Create the component type in the database
  const [componentType] = await db.insert(questionnaireComponentTypes)
    .values(componentTypeData)
    .returning();
  
  // Emit event for the created component type
  emitCreatedEvent('componentType', componentType);
  
  return componentType;
}

/**
 * Get all component types
 * @param {Object} options - Filter options
 * @returns {Array} Component types
 */
export async function getComponentTypes(options = {}) {
  let query = db.select().from(questionnaireComponentTypes);
  
  // Apply category filter if provided
  if (options.category) {
    query = query.where(eq(questionnaireComponentTypes.componentCategory, options.category));
  }
  
  // Only return active types by default
  if (options.includeInactive !== true) {
    query = query.where(eq(questionnaireComponentTypes.isActive, true));
  }
  
  return await query.orderBy(questionnaireComponentTypes.displayName);
}

/**
 * Get a full questionnaire with all its components
 * @param {number} definitionId - ID of the questionnaire definition
 * @returns {Object} Complete questionnaire data
 */
export async function getFullQuestionnaire(definitionId) {
  // Get the definition
  const [definition] = await db
    .select()
    .from(questionnaireDefinitions)
    .where(eq(questionnaireDefinitions.id, definitionId));
  
  if (!definition) {
    throw new Error(`Questionnaire definition with ID ${definitionId} not found`);
  }
  
  // Get pages for this definition
  const pages = await db
    .select()
    .from(questionnairePages)
    .where(eq(questionnairePages.definitionId, definitionId))
    .orderBy(questionnairePages.order);
  
  // For each page, get its sections and questions
  const pagesWithSectionsAndQuestions = [];
  
  for (const page of pages) {
    // Get sections for this page
    const pageSections = await db
      .select()
      .from(questionnairePageSections)
      .where(eq(questionnairePageSections.pageId, page.id))
      .orderBy(questionnairePageSections.sectionOrder);
    
    const sectionsWithDetails = [];
    
    for (const pageSection of pageSections) {
      // Get section details
      const [section] = await db
        .select()
        .from(questionnaireSections)
        .where(eq(questionnaireSections.id, pageSection.sectionId));
      
      if (section) {
        sectionsWithDetails.push({
          ...section,
          sectionOrder: pageSection.sectionOrder
        });
      }
    }
    
    // Get questions for this page
    const questions = await db
      .select()
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.pageId, page.id))
      .orderBy(questionnaireQuestions.order);
    
    // For each question, get its options if applicable
    const questionsWithOptions = [];
    
    for (const question of questions) {
      if (
        question.questionType === 'select' || 
        question.questionType === 'radio' || 
        question.questionType === 'checkbox_group' ||
        question.questionType === 'checkbox'
      ) {
        const options = await db
          .select()
          .from(questionnaireQuestionOptions)
          .where(eq(questionnaireQuestionOptions.questionId, question.id))
          .orderBy(questionnaireQuestionOptions.order);
        
        questionsWithOptions.push({
          ...question,
          options
        });
      } else {
        questionsWithOptions.push({
          ...question,
          options: []
        });
      }
    }
    
    pagesWithSectionsAndQuestions.push({
      ...page,
      sections: sectionsWithDetails,
      questions: questionsWithOptions
    });
  }
  
  // Get conditional logic rules
  const conditionalLogic = await db
    .select()
    .from(questionnaireConditionalLogic)
    .where(eq(questionnaireConditionalLogic.definitionId, definitionId));
  
  // Return the complete questionnaire
  return {
    definition,
    pages: pagesWithSectionsAndQuestions,
    conditionalLogic
  };
}

// Export service functions for use in routes
export default {
  createQuestionnaireDefinition,
  addQuestionnairePage,
  createQuestionnaireSection,
  addSectionQuestions,
  addSectionToPage,
  registerComponentType,
  getComponentTypes,
  getFullQuestionnaire
};