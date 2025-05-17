/**
 * Validation Layer for Questionnaire System
 * 
 * This system implements a flexible validation approach:
 * - Schema-Based Validation: Uses JSON Schema for validating components
 * - Custom Validators: Supports pluggable custom validators
 * - Contextual Validation: Validates components based on their relationships
 */

import { z } from 'zod';
import eventEmitter from './event-system.js';

// Registry of validation schemas
const validationSchemas = new Map();

// Registry of custom validators
const customValidators = new Map();

/**
 * Register a schema for validating a specific component type
 * @param {string} componentType - Type of component (e.g., 'definition', 'question')
 * @param {Object} schema - JSON Schema for validation
 */
export function registerSchema(componentType, schema) {
  validationSchemas.set(componentType, schema);
}

/**
 * Register a custom validator function
 * @param {string} validatorName - Name of the custom validator
 * @param {Function} validatorFn - Validator function that returns { valid: boolean, errors: Array }
 */
export function registerCustomValidator(validatorName, validatorFn) {
  customValidators.set(validatorName, validatorFn);
}

/**
 * Validate a component against its schema
 * @param {string} componentType - Type of component to validate
 * @param {Object} data - Component data to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateComponent(componentType, data) {
  const schema = validationSchemas.get(componentType);
  
  if (!schema) {
    return { 
      valid: false, 
      errors: [`No validation schema registered for component type: ${componentType}`] 
    };
  }
  
  try {
    // Use Zod for validation
    schema.parse(data);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      };
    }
    
    return { 
      valid: false, 
      errors: [error.message || 'Unknown validation error'] 
    };
  }
}

/**
 * Validate a component using a custom validator
 * @param {string} validatorName - Name of the custom validator to use
 * @param {Object} data - Data to validate
 * @param {Object} context - Additional context for validation
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateWithCustomValidator(validatorName, data, context = {}) {
  const validator = customValidators.get(validatorName);
  
  if (!validator) {
    return { 
      valid: false, 
      errors: [`Custom validator not found: ${validatorName}`] 
    };
  }
  
  try {
    return validator(data, context);
  } catch (error) {
    return { 
      valid: false, 
      errors: [error.message || 'Custom validator error'] 
    };
  }
}

/**
 * Validate relationships between components
 * @param {string} relationshipType - Type of relationship to validate
 * @param {Object} data - Relationship data
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateRelationship(relationshipType, data) {
  // Implementation depends on the specific relationship types in the system
  switch (relationshipType) {
    case 'page_to_definition':
      return validatePageToDefinition(data);
    case 'section_to_page':
      return validateSectionToPage(data);
    case 'question_to_section':
      return validateQuestionToSection(data);
    case 'option_to_question':
      return validateOptionToQuestion(data);
    case 'condition_logic':
      return validateConditionLogic(data);
    default:
      return { 
        valid: false, 
        errors: [`Unknown relationship type: ${relationshipType}`] 
      };
  }
}

// Specific relationship validators
function validatePageToDefinition(data) {
  const { pageId, definitionId } = data;
  
  if (!pageId || !definitionId) {
    return {
      valid: false,
      errors: ['Page ID and Definition ID are required']
    };
  }
  
  // Additional validation logic would check if the definition exists, etc.
  return { valid: true, errors: [] };
}

function validateSectionToPage(data) {
  const { sectionId, pageId, sectionOrder } = data;
  
  if (!sectionId || !pageId) {
    return {
      valid: false,
      errors: ['Section ID and Page ID are required']
    };
  }
  
  if (typeof sectionOrder !== 'number' || sectionOrder < 1) {
    return {
      valid: false,
      errors: ['Section order must be a positive number']
    };
  }
  
  // Additional validation logic would check if the section and page exist, etc.
  return { valid: true, errors: [] };
}

function validateQuestionToSection(data) {
  const { questionId, sectionId, questionOrder } = data;
  
  if (!questionId || !sectionId) {
    return {
      valid: false,
      errors: ['Question ID and Section ID are required']
    };
  }
  
  if (typeof questionOrder !== 'number' || questionOrder < 1) {
    return {
      valid: false,
      errors: ['Question order must be a positive number']
    };
  }
  
  // Additional validation logic
  return { valid: true, errors: [] };
}

function validateOptionToQuestion(data) {
  const { optionId, questionId, optionOrder } = data;
  
  if (!optionId || !questionId) {
    return {
      valid: false,
      errors: ['Option ID and Question ID are required']
    };
  }
  
  if (typeof optionOrder !== 'number' || optionOrder < 1) {
    return {
      valid: false,
      errors: ['Option order must be a positive number']
    };
  }
  
  // Additional validation logic
  return { valid: true, errors: [] };
}

function validateConditionLogic(data) {
  const { 
    triggerQuestionKey, 
    triggerCondition, 
    triggerValue,
    actionType,
    targetQuestionKey,
    targetPageId,
    targetOptionValue
  } = data;
  
  if (!triggerQuestionKey || !triggerCondition || !actionType) {
    return {
      valid: false,
      errors: ['Trigger question key, condition, and action type are required']
    };
  }
  
  // Check for required fields based on action type
  if (actionType === 'show_question' || actionType === 'hide_question') {
    if (!targetQuestionKey) {
      return {
        valid: false,
        errors: [`${actionType} requires targetQuestionKey`]
      };
    }
  } else if (actionType === 'skip_to_page') {
    if (!targetPageId) {
      return {
        valid: false,
        errors: ['skip_to_page requires targetPageId']
      };
    }
  } else if (actionType === 'enable_option' || actionType === 'disable_option') {
    if (!targetOptionValue) {
      return {
        valid: false,
        errors: [`${actionType} requires targetOptionValue`]
      };
    }
  }
  
  // Additional validation logic would check if the referenced questions, pages, options exist
  return { valid: true, errors: [] };
}

// Register default schemas
// These would be defined and registered based on the application's specific needs

// Initialize event listeners for automatic validation
eventEmitter.on('definition.created', ({ component }) => {
  const result = validateComponent('definition', component);
  if (!result.valid) {
    console.warn('Created definition has validation issues:', result.errors);
  }
});

eventEmitter.on('page.created', ({ component }) => {
  const result = validateComponent('page', component);
  if (!result.valid) {
    console.warn('Created page has validation issues:', result.errors);
  }
});

eventEmitter.on('section.created', ({ component }) => {
  const result = validateComponent('section', component);
  if (!result.valid) {
    console.warn('Created section has validation issues:', result.errors);
  }
});

eventEmitter.on('question.created', ({ component }) => {
  const result = validateComponent('question', component);
  if (!result.valid) {
    console.warn('Created question has validation issues:', result.errors);
  }
});

eventEmitter.on('section.added_to_page', (data) => {
  const result = validateRelationship('section_to_page', data);
  if (!result.valid) {
    console.warn('Section to page relationship has validation issues:', result.errors);
  }
});

// Export validation schemas for testing and external use
export function getRegisteredSchemas() {
  return new Map(validationSchemas);
}

export function getRegisteredValidators() {
  return new Map(customValidators);
}