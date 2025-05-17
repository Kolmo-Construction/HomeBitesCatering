// Test file to verify fixes for checkbox selection limits when editing questions

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
    let parsedValidationRules = {
      min: undefined, 
      max: undefined, 
      step: undefined,
      exactCount: undefined,
      minCount: undefined,
      maxCount: undefined
    };
    
    try {
      if (this.validationRules) {
        // If it's a string, try to parse it as JSON
        if (typeof this.validationRules === 'string') {
          // Skip parsing if it's "[object Object]" which is a common issue
          if (this.validationRules !== "[object Object]") {
            const parsed = JSON.parse(this.validationRules);
            if (parsed) {
              // Extract only the properties we need
              if (parsed.exactCount !== undefined) parsedValidationRules.exactCount = parsed.exactCount;
              if (parsed.minCount !== undefined) parsedValidationRules.minCount = parsed.minCount;
              if (parsed.maxCount !== undefined) parsedValidationRules.maxCount = parsed.maxCount;
              if (parsed.min !== undefined) parsedValidationRules.min = parsed.min;
              if (parsed.max !== undefined) parsedValidationRules.max = parsed.max;
              if (parsed.step !== undefined) parsedValidationRules.step = parsed.step;
            }
          }
        } 
        // If it's already an object, extract the properties we need
        else if (typeof this.validationRules === 'object' && this.validationRules !== null) {
          const rules = this.validationRules;
          if (rules.exactCount !== undefined) parsedValidationRules.exactCount = rules.exactCount;
          if (rules.minCount !== undefined) parsedValidationRules.minCount = rules.minCount;
          if (rules.maxCount !== undefined) parsedValidationRules.maxCount = rules.maxCount;
          if (rules.min !== undefined) parsedValidationRules.min = rules.min;
          if (rules.max !== undefined) parsedValidationRules.max = rules.max;
          if (rules.step !== undefined) parsedValidationRules.step = rules.step;
        }
      }
    } catch (e) {
      console.error("Error parsing validation rules:", e);
    }
    
    // Return what would be set in the form when editing
    return {
      validationRules: parsedValidationRules
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
    let parsedRules = {
      exactCount: undefined,
      minCount: undefined,
      maxCount: undefined
    };
    
    try {
      if (this.validationRules) {
        // If it's a string, try to parse it as JSON
        if (typeof this.validationRules === 'string') {
          // Skip parsing if it's "[object Object]" which is a common issue
          if (this.validationRules !== "[object Object]") {
            const parsed = JSON.parse(this.validationRules);
            if (parsed) {
              // Extract only the properties we need
              if (parsed.exactCount !== undefined) parsedRules.exactCount = parsed.exactCount;
              if (parsed.minCount !== undefined) parsedRules.minCount = parsed.minCount;
              if (parsed.maxCount !== undefined) parsedRules.maxCount = parsed.maxCount;
            }
          }
        } 
        // If it's already an object, extract the properties we need
        else if (typeof this.validationRules === 'object' && this.validationRules !== null) {
          const rules = this.validationRules;
          if (rules.exactCount !== undefined) parsedRules.exactCount = rules.exactCount;
          if (rules.minCount !== undefined) parsedRules.minCount = rules.minCount;
          if (rules.maxCount !== undefined) parsedRules.maxCount = rules.maxCount;
        }
      }
    } catch (e) {
      console.error("Error parsing rules for selection check:", e);
      return true; // If parsing fails, allow selection
    }
    
    // Check if maximum selections reached
    if (parsedRules.exactCount !== undefined && this.selectedOptions.length >= parsedRules.exactCount) {
      console.log(`Selection limit reached: exactCount=${parsedRules.exactCount}`);
      return false;
    }
    
    if (parsedRules.maxCount !== undefined && this.selectedOptions.length >= parsedRules.maxCount) {
      console.log(`Selection limit reached: maxCount=${parsedRules.maxCount}`);
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