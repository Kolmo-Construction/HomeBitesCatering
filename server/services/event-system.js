/**
 * Event-Driven Architecture for Questionnaire System
 * 
 * This system implements an event-based approach for component modifications to enable:
 * - Triggering events when components are created/updated/deleted
 * - Registering listeners for specific component changes
 * - Automatically updating dependent components
 */

// Event types
export const EVENT_TYPES = {
  // Creation events
  DEFINITION_CREATED: 'definition.created',
  PAGE_CREATED: 'page.created',
  SECTION_CREATED: 'section.created',
  QUESTION_CREATED: 'question.created',
  OPTION_CREATED: 'option.created',
  COMPONENT_TYPE_CREATED: 'component_type.created',
  LOGIC_RULE_CREATED: 'logic_rule.created',
  
  // Update events
  DEFINITION_UPDATED: 'definition.updated',
  PAGE_UPDATED: 'page.updated',
  SECTION_UPDATED: 'section.updated',
  QUESTION_UPDATED: 'question.updated',
  OPTION_UPDATED: 'option.updated',
  COMPONENT_TYPE_UPDATED: 'component_type.updated',
  LOGIC_RULE_UPDATED: 'logic_rule.updated',
  
  // Delete events
  DEFINITION_DELETED: 'definition.deleted', 
  PAGE_DELETED: 'page.deleted',
  SECTION_DELETED: 'section.deleted',
  QUESTION_DELETED: 'question.deleted',
  OPTION_DELETED: 'option.deleted',
  COMPONENT_TYPE_DELETED: 'component_type.deleted',
  LOGIC_RULE_DELETED: 'logic_rule.deleted',
  
  // Relationship events
  SECTION_ADDED_TO_PAGE: 'section.added_to_page',
  SECTION_REMOVED_FROM_PAGE: 'section.removed_from_page',
  QUESTION_ADDED_TO_SECTION: 'question.added_to_section',
  QUESTION_REMOVED_FROM_SECTION: 'question.removed_from_section'
};

// Main event emitter class
class QuestionnaireEventEmitter {
  constructor() {
    this.listeners = {};
    this.onceListeners = {};
    this.history = []; // Keep track of recent events for debugging
  }
  
  /**
   * Register an event listener
   * @param {string} eventType - Type of event to listen for
   * @param {Function} listener - Callback function
   */
  on(eventType, listener) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
    
    // Return an unsubscribe function
    return () => this.off(eventType, listener);
  }
  
  /**
   * Register a one-time event listener
   * @param {string} eventType - Type of event to listen for
   * @param {Function} listener - Callback function
   */
  once(eventType, listener) {
    const wrappedListener = (data) => {
      this.off(eventType, wrappedListener);
      listener(data);
    };
    
    return this.on(eventType, wrappedListener);
  }
  
  /**
   * Remove an event listener
   * @param {string} eventType - Type of event to stop listening for
   * @param {Function} listener - Callback function to remove
   */
  off(eventType, listener) {
    if (!this.listeners[eventType]) return;
    
    const index = this.listeners[eventType].indexOf(listener);
    if (index !== -1) {
      this.listeners[eventType].splice(index, 1);
    }
  }
  
  /**
   * Emit an event
   * @param {string} eventType - Type of event to emit
   * @param {Object} data - Event data
   */
  emit(eventType, data) {
    // Log event for debugging/monitoring
    this.history.push({
      timestamp: new Date(),
      type: eventType,
      data
    });
    
    // Keep history limited to most recent 100 events
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    // Execute registered listeners
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
    
    // Execute wildcard listeners (listeners that respond to all events)
    if (this.listeners['*']) {
      this.listeners['*'].forEach(listener => {
        try {
          listener({ type: eventType, data });
        } catch (error) {
          console.error(`Error in wildcard event listener for ${eventType}:`, error);
        }
      });
    }
  }
  
  /**
   * Get all registered listeners
   * @returns {Object} Map of event types to listener arrays
   */
  getListeners() {
    return { ...this.listeners };
  }
  
  /**
   * Get recent event history
   * @returns {Array} Recent events
   */
  getEventHistory() {
    return [...this.history];
  }
}

// Create singleton instance
const eventEmitter = new QuestionnaireEventEmitter();

/**
 * Helper function for emitting component creation events
 * @param {string} componentType - Type of component ('definition', 'page', etc.)
 * @param {Object} data - Component data
 */
export function emitCreatedEvent(componentType, data) {
  const eventType = `${componentType}.created`;
  eventEmitter.emit(eventType, { 
    component: data,
    timestamp: new Date()
  });
}

/**
 * Helper function for emitting component update events
 * @param {string} componentType - Type of component ('definition', 'page', etc.)
 * @param {Object} data - Updated component data
 * @param {Object} previousData - Previous component data before update
 */
export function emitUpdatedEvent(componentType, data, previousData) {
  const eventType = `${componentType}.updated`;
  eventEmitter.emit(eventType, { 
    component: data,
    previousComponent: previousData,
    timestamp: new Date()
  });
}

/**
 * Helper function for emitting component deletion events
 * @param {string} componentType - Type of component ('definition', 'page', etc.)
 * @param {Object} data - Component data being deleted
 */
export function emitDeletedEvent(componentType, data) {
  const eventType = `${componentType}.deleted`;
  eventEmitter.emit(eventType, { 
    component: data,
    timestamp: new Date()
  });
}

/**
 * Helper function for emitting relationship events
 * @param {string} relationshipType - Type of relationship (e.g., 'section.added_to_page')
 * @param {Object} data - Relationship data
 */
export function emitRelationshipEvent(relationshipType, data) {
  eventEmitter.emit(relationshipType, { 
    ...data,
    timestamp: new Date()
  });
}

// Export the singleton instance
export default eventEmitter;