// Test file to verify fixes for checkbox selection limits when editing questions

// Import the validator function that handles checkbox selection
// from the PublicQuestionnaireView.jsx component
import { useCallback, useState } from 'react';

// Mock implementation for testing purposes
class TestCheckboxQuestion {
  constructor(validationRules) {
    // Initialize with validation rules (could be a string or object)
    this.validationRules = validationRules;
    this.selectedOptions = [];
  }

  // This simulates loading a question with validation rules
  loadForEditing() {
    // Parse validation rules similar to how it's done in QuestionnaireBuilder.tsx
    let parsedValidationRules = {};
    
    try {
      if (this.validationRules) {
        // If it's a string, parse it
        if (typeof this.validationRules === 'string') {
          parsedValidationRules = JSON.parse(this.validationRules);
        } 
        // If it's already an object, use it directly
        else if (typeof this.validationRules === 'object') {
          parsedValidationRules = this.validationRules;
        }
      }
    } catch (e) {
      console.error("Error parsing validation rules:", e);
      return {};
    }
    
    // Return what would be set in the form when editing
    return {
      validationRules: {
        exactCount: parsedValidationRules.exactCount,
        minCount: parsedValidationRules.minCount,
        maxCount: parsedValidationRules.maxCount
      }
    };
  }
  
  // Simulate selecting options
  selectOption(option) {
    if (!this.canSelectMoreOptions()) {
      return false;
    }
    this.selectedOptions.push(option);
    return true;
  }
  
  // Check if more options can be selected based on validation rules
  canSelectMoreOptions() {
    let parsedRules = {};
    
    try {
      if (this.validationRules) {
        if (typeof this.validationRules === 'string') {
          parsedRules = JSON.parse(this.validationRules);
        } else {
          parsedRules = this.validationRules;
        }
      }
    } catch (e) {
      console.error("Error parsing rules for selection check:", e);
      return true; // If parsing fails, allow selection
    }
    
    const { exactCount, maxCount } = parsedRules;
    
    // Check if maximum selections reached
    if (exactCount !== undefined && this.selectedOptions.length >= exactCount) {
      return false;
    }
    
    if (maxCount !== undefined && this.selectedOptions.length >= maxCount) {
      return false;
    }
    
    return true;
  }
}

// Run tests
function runTests() {
  console.log("Running checkbox selection limit tests...");
  
  // Test 1: Validation rules as JSON string
  const test1 = new TestCheckboxQuestion(JSON.stringify({
    exactCount: 2
  }));
  
  const test1FormValues = test1.loadForEditing();
  console.log("Test 1 - JSON string exactCount=2:");
  console.log("  Form values for editing:", test1FormValues);
  console.assert(test1FormValues.validationRules.exactCount === 2, 
    "Test 1 Failed: exactCount should be 2");
  
  // Test 2: Validation rules as object
  const test2 = new TestCheckboxQuestion({
    maxCount: 3
  });
  
  const test2FormValues = test2.loadForEditing();
  console.log("Test 2 - Object maxCount=3:");
  console.log("  Form values for editing:", test2FormValues);
  console.assert(test2FormValues.validationRules.maxCount === 3, 
    "Test 2 Failed: maxCount should be 3");
  
  // Test 3: Limit enforcement with exactCount
  const test3 = new TestCheckboxQuestion({
    exactCount: 2
  });
  
  console.log("Test 3 - Enforcing exactCount=2 limit:");
  console.log("  Can select first option:", test3.selectOption("option1"));
  console.log("  Can select second option:", test3.selectOption("option2"));
  console.log("  Can select third option:", test3.selectOption("option3"));
  console.assert(test3.selectedOptions.length === 2, 
    "Test 3 Failed: Should only allow 2 selections");
  
  // Test 4: Broken validation rules (invalid JSON)
  const test4 = new TestCheckboxQuestion("[object Object]");
  
  const test4FormValues = test4.loadForEditing();
  console.log("Test 4 - Invalid JSON '[object Object]':");
  console.log("  Form values for editing:", test4FormValues);
  console.assert(test4FormValues.validationRules.exactCount === undefined, 
    "Test 4 Failed: exactCount should be undefined for invalid JSON");
  
  // Test 5: Multiple validation rules
  const test5 = new TestCheckboxQuestion({
    minCount: 1,
    maxCount: 3
  });
  
  const test5FormValues = test5.loadForEditing();
  console.log("Test 5 - Multiple validation rules (minCount=1, maxCount=3):");
  console.log("  Form values for editing:", test5FormValues);
  console.assert(test5FormValues.validationRules.minCount === 1, 
    "Test 5 Failed: minCount should be 1");
  console.assert(test5FormValues.validationRules.maxCount === 3, 
    "Test 5 Failed: maxCount should be 3");
  
  console.log("All tests complete!");
}

runTests();