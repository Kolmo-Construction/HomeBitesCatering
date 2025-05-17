/**
 * Configuration-Driven Logic for Questionnaire System
 * 
 * This system implements a rule engine that:
 * - Stores business rules as configuration rather than code
 * - Allows hot-reloading of rules without redeploying
 * - Processes rule conditions and actions in a flexible way
 */

import eventEmitter from './event-system.js';
import { validateComponent } from './validation-system.js';

// Store for the rule configurations
let ruleConfigurations = new Map();

// Rule config schema (would be more detailed in production)
const ruleConfigSchema = {
  id: 'string', // Unique identifier for the rule
  name: 'string', // Human-readable name
  description: 'string', // Optional description
  condition: {
    type: 'string', // Type of condition (e.g., 'equals', 'contains', etc.)
    parameters: {}, // Parameters for the condition
  },
  action: {
    type: 'string', // Type of action (e.g., 'show', 'hide', 'skip', etc.)
    parameters: {}, // Parameters for the action
  },
  priority: 'number', // Priority for rule execution order
  isActive: 'boolean', // Whether the rule is active
};

// Registry of condition handlers
const conditionHandlers = new Map();

// Registry of action handlers
const actionHandlers = new Map();

/**
 * Register a rule configuration
 * @param {string} ruleId - Unique identifier for the rule
 * @param {Object} config - Rule configuration object
 * @returns {boolean} Success status
 */
export function registerRule(ruleId, config) {
  // Basic validation of the config structure
  if (!config || typeof config !== 'object') {
    console.error('Invalid rule configuration');
    return false;
  }
  
  // Check required fields
  if (!config.condition || !config.action) {
    console.error('Rule configuration must include condition and action');
    return false;
  }
  
  // Validate that we have handlers for this condition and action
  if (!conditionHandlers.has(config.condition.type)) {
    console.error(`No handler registered for condition type: ${config.condition.type}`);
    return false;
  }
  
  if (!actionHandlers.has(config.action.type)) {
    console.error(`No handler registered for action type: ${config.action.type}`);
    return false;
  }
  
  // Store the rule
  ruleConfigurations.set(ruleId, {
    ...config,
    priority: config.priority || 0,
    isActive: config.isActive !== false, // Default to active if not specified
  });
  
  // Notify that a rule was registered
  eventEmitter.emit('rule.registered', { ruleId, config });
  
  return true;
}

/**
 * Register a condition handler function
 * @param {string} conditionType - Type of condition
 * @param {Function} handlerFn - Function that evaluates the condition
 */
export function registerConditionHandler(conditionType, handlerFn) {
  conditionHandlers.set(conditionType, handlerFn);
}

/**
 * Register an action handler function
 * @param {string} actionType - Type of action
 * @param {Function} handlerFn - Function that performs the action
 */
export function registerActionHandler(actionType, handlerFn) {
  actionHandlers.set(actionType, handlerFn);
}

/**
 * Process a single rule against data
 * @param {Object} rule - Rule configuration
 * @param {Object} data - Data to evaluate the rule against
 * @param {Object} context - Additional context for rule processing
 * @returns {Object} Result of rule processing
 */
function processRule(rule, data, context = {}) {
  try {
    // Skip processing if rule is not active
    if (!rule.isActive) {
      return { processed: false, reason: 'Rule is not active' };
    }
    
    // Get the condition handler
    const conditionHandler = conditionHandlers.get(rule.condition.type);
    if (!conditionHandler) {
      return { processed: false, reason: `No handler for condition type: ${rule.condition.type}` };
    }
    
    // Evaluate the condition
    const conditionResult = conditionHandler(rule.condition.parameters, data, context);
    
    // If condition is not met, stop processing
    if (!conditionResult.satisfied) {
      return { 
        processed: true, 
        conditionMet: false,
        actionExecuted: false,
        details: conditionResult.details || 'Condition not satisfied'
      };
    }
    
    // Get the action handler
    const actionHandler = actionHandlers.get(rule.action.type);
    if (!actionHandler) {
      return { processed: false, reason: `No handler for action type: ${rule.action.type}` };
    }
    
    // Execute the action
    const actionResult = actionHandler(rule.action.parameters, data, context);
    
    return {
      processed: true,
      conditionMet: true,
      actionExecuted: actionResult.success,
      details: actionResult.details || 'Action executed'
    };
  } catch (error) {
    return { 
      processed: false, 
      error: error.message || 'Unknown error during rule processing'
    };
  }
}

/**
 * Process all applicable rules against data
 * @param {Object} data - Data to evaluate rules against
 * @param {Object} context - Additional context for rule processing
 * @returns {Array} Results of all rule processing
 */
export function processRules(data, context = {}) {
  const results = [];
  
  // Get all active rules, sorted by priority
  const rules = Array.from(ruleConfigurations.values())
    .filter(rule => rule.isActive)
    .sort((a, b) => b.priority - a.priority); // Higher priority first
  
  // Process each rule
  for (const rule of rules) {
    const result = processRule(rule, data, context);
    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      ...result
    });
    
    // Some rules might specify to stop processing if they match
    if (result.processed && result.conditionMet && rule.stopOnMatch) {
      break;
    }
  }
  
  return results;
}

/**
 * Update an existing rule configuration
 * @param {string} ruleId - Unique identifier for the rule
 * @param {Object} configUpdates - Updates to apply to the rule
 * @returns {boolean} Success status
 */
export function updateRule(ruleId, configUpdates) {
  if (!ruleConfigurations.has(ruleId)) {
    console.error(`Rule not found: ${ruleId}`);
    return false;
  }
  
  const currentConfig = ruleConfigurations.get(ruleId);
  const updatedConfig = { ...currentConfig, ...configUpdates };
  
  // Store the updated rule
  ruleConfigurations.set(ruleId, updatedConfig);
  
  // Notify that a rule was updated
  eventEmitter.emit('rule.updated', { 
    ruleId, 
    previousConfig: currentConfig,
    currentConfig: updatedConfig
  });
  
  return true;
}

/**
 * Delete a rule configuration
 * @param {string} ruleId - Unique identifier for the rule
 * @returns {boolean} Success status
 */
export function deleteRule(ruleId) {
  if (!ruleConfigurations.has(ruleId)) {
    console.error(`Rule not found: ${ruleId}`);
    return false;
  }
  
  const deletedConfig = ruleConfigurations.get(ruleId);
  ruleConfigurations.delete(ruleId);
  
  // Notify that a rule was deleted
  eventEmitter.emit('rule.deleted', { ruleId, deletedConfig });
  
  return true;
}

/**
 * Get all rule configurations
 * @returns {Array} All rule configurations
 */
export function getAllRules() {
  return Array.from(ruleConfigurations.values());
}

/**
 * Get a specific rule configuration
 * @param {string} ruleId - Unique identifier for the rule
 * @returns {Object|null} Rule configuration or null if not found
 */
export function getRule(ruleId) {
  return ruleConfigurations.has(ruleId) 
    ? ruleConfigurations.get(ruleId) 
    : null;
}

/**
 * Import rules from a configuration file or JSON
 * @param {Object|string} configData - Configuration data or path to config file
 * @returns {boolean} Success status
 */
export function importRules(configData) {
  try {
    // Parse the config data if it's a string
    const config = typeof configData === 'string' 
      ? JSON.parse(configData)
      : configData;
    
    // Validate the config structure
    if (!Array.isArray(config.rules)) {
      console.error('Invalid rule configuration format: rules must be an array');
      return false;
    }
    
    // Register each rule
    let successCount = 0;
    for (const rule of config.rules) {
      if (registerRule(rule.id, rule)) {
        successCount++;
      }
    }
    
    console.log(`Imported ${successCount} of ${config.rules.length} rules`);
    return successCount > 0;
  } catch (error) {
    console.error('Error importing rules:', error);
    return false;
  }
}

/**
 * Export all rules as a configuration object
 * @returns {Object} Rule configuration object
 */
export function exportRules() {
  return {
    rules: Array.from(ruleConfigurations.values()),
    exportedAt: new Date().toISOString()
  };
}

// Register default condition handlers
registerConditionHandler('equals', (parameters, data, context) => {
  const { field, value } = parameters;
  const fieldValue = data[field];
  
  return {
    satisfied: fieldValue === value,
    details: `Field '${field}' ${fieldValue === value ? 'equals' : 'does not equal'} '${value}'`
  };
});

registerConditionHandler('contains', (parameters, data, context) => {
  const { field, value } = parameters;
  const fieldValue = data[field];
  
  if (typeof fieldValue !== 'string') {
    return {
      satisfied: false,
      details: `Field '${field}' is not a string`
    };
  }
  
  return {
    satisfied: fieldValue.includes(value),
    details: `Field '${field}' ${fieldValue.includes(value) ? 'contains' : 'does not contain'} '${value}'`
  };
});

registerConditionHandler('greaterThan', (parameters, data, context) => {
  const { field, value } = parameters;
  const fieldValue = data[field];
  
  if (typeof fieldValue !== 'number') {
    return {
      satisfied: false,
      details: `Field '${field}' is not a number`
    };
  }
  
  return {
    satisfied: fieldValue > value,
    details: `Field '${field}' ${fieldValue > value ? 'is' : 'is not'} greater than '${value}'`
  };
});

// Register default action handlers
registerActionHandler('showQuestion', (parameters, data, context) => {
  const { questionId } = parameters;
  
  // In a real implementation, this would update UI state or questionnaire model
  return {
    success: true,
    details: `Showing question '${questionId}'`
  };
});

registerActionHandler('hideQuestion', (parameters, data, context) => {
  const { questionId } = parameters;
  
  // In a real implementation, this would update UI state or questionnaire model
  return {
    success: true,
    details: `Hiding question '${questionId}'`
  };
});

registerActionHandler('skipToPage', (parameters, data, context) => {
  const { pageId } = parameters;
  
  // In a real implementation, this would update UI state or questionnaire model
  return {
    success: true,
    details: `Skipping to page '${pageId}'`
  };
});

// Example: Listen for questionnaire submission events to process rules
eventEmitter.on('questionnaire.submitted', ({ submission, questionnaire }) => {
  const results = processRules(submission, { questionnaire });
  console.log(`Processed ${results.length} rules for submission`);
});