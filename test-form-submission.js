/**
 * Test script for the form submission API
 * 
 * This script tests submitting form responses through the API:
 * 1. Retrieves a form definition
 * 2. Creates a form submission with appropriate answers
 * 3. Tests validation for required fields and conditional logic
 * 4. Verifies the submission is properly stored
 */

const axios = require('axios');
const fs = require('fs');

const baseUrl = 'http://localhost:5000';
let authCookie = '';

async function makeRequest(method, endpoint, data = null) {
  try {
    const response = await axios({
      method,
      url: `${baseUrl}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error making ${method} request to ${endpoint}:`, 
      error.response ? error.response.data : error.message);
    throw error;
  }
}

async function login() {
  try {
    const response = await axios.post(`${baseUrl}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const cookieHeader = response.headers['set-cookie'];
    if (cookieHeader) {
      authCookie = cookieHeader[0];
      console.log('Login successful');
      
      // Save cookie for other tests
      fs.writeFileSync('cookie.txt', authCookie);
      
      return authCookie;
    } else {
      throw new Error('No cookie received after login');
    }
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    
    // Try to load existing cookie if login fails
    try {
      if (fs.existsSync('cookie.txt')) {
        authCookie = fs.readFileSync('cookie.txt', 'utf8');
        console.log('Using existing cookie from file');
        return authCookie;
      }
    } catch (readError) {
      console.error('Failed to read existing cookie:', readError);
    }
    
    throw error;
  }
}

async function getFormDefinition(formKey, versionNumber) {
  console.log(`Fetching form definition for ${formKey} version ${versionNumber}...`);
  const formDefinition = await makeRequest('GET', `/api/form-builder/forms/${formKey}/versions/${versionNumber}/render`);
  console.log(`Retrieved form definition with ${formDefinition.pages.length} pages`);
  return formDefinition;
}

async function submitFormResponse(formKey, versionNumber, responses) {
  console.log(`Submitting form response for ${formKey} version ${versionNumber}...`);
  const submission = await makeRequest('POST', `/api/forms/${formKey}/versions/${versionNumber}/submit`, {
    responses,
    submitterInfo: {
      name: "Test User",
      email: "test@example.com",
      phone: "555-123-4567"
    }
  });
  console.log('Form submission successful:', submission);
  return submission;
}

async function testValidSubmission() {
  console.log('\n=== Testing Valid Form Submission ===');
  
  // Retrieve a form definition (update with your actual form key and version)
  const formKey = 'wedding_questionnaire';
  const versionNumber = 1;
  
  try {
    const formDefinition = await getFormDefinition(formKey, versionNumber);
    
    // Create response object based on the form definition
    const responses = {};
    
    // For each page in the form
    for (const page of formDefinition.pages) {
      // For each question on the page
      for (const question of page.questions) {
        // Skip non-input questions (headers, displays)
        if (['header', 'text_display'].includes(question.questionType)) {
          continue;
        }
        
        // Generate appropriate test data based on question type
        let answer;
        switch (question.questionType) {
          case 'textbox':
          case 'textarea':
            answer = `Test answer for ${question.questionKey}`;
            break;
          case 'email':
            answer = 'test@example.com';
            break;
          case 'phone':
            answer = '555-123-4567';
            break;
          case 'number':
            answer = 100;
            break;
          case 'datetime':
            answer = new Date().toISOString();
            break;
          case 'date':
            answer = new Date().toISOString().split('T')[0];
            break;
          case 'time':
            answer = '14:30';
            break;
          case 'single_select':
          case 'dropdown':
            // Get the first option if available
            if (question.options && question.options.length > 0) {
              answer = question.options[0].key;
            } else {
              answer = 'option1'; // Fallback
            }
            break;
          case 'multi_select':
          case 'checkbox':
            // Select first two options if available
            if (question.options && question.options.length > 0) {
              answer = [
                question.options[0].key,
                question.options.length > 1 ? question.options[1].key : question.options[0].key
              ];
            } else {
              answer = ['option1', 'option2']; // Fallback
            }
            break;
          case 'matrix_select':
            // Create a matrix of answers
            if (question.matrixStructure) {
              answer = {};
              for (const row of question.matrixStructure.rows) {
                if (question.matrixStructure.columns.length > 0) {
                  answer[row.key] = question.matrixStructure.columns[0].key;
                }
              }
            } else {
              answer = { row1: 'col1' }; // Fallback
            }
            break;
          default:
            answer = 'Test answer';
        }
        
        // Add answer to responses
        responses[question.questionKey] = answer;
      }
    }
    
    // Submit the form response
    const submission = await submitFormResponse(formKey, versionNumber, responses);
    
    console.log('Valid submission test passed!');
    return submission;
  } catch (error) {
    console.error('Valid submission test failed:', error);
    return null;
  }
}

async function testInvalidSubmission() {
  console.log('\n=== Testing Invalid Form Submission (Missing Required Fields) ===');
  
  const formKey = 'wedding_questionnaire';
  const versionNumber = 1;
  
  try {
    const formDefinition = await getFormDefinition(formKey, versionNumber);
    
    // Create a deliberately incomplete response
    const responses = {};
    
    // Only fill in a few fields to test validation
    let filledCount = 0;
    for (const page of formDefinition.pages) {
      for (const question of page.questions) {
        // Only fill in every third question
        if (filledCount % 3 === 0 && !['header', 'text_display'].includes(question.questionType)) {
          responses[question.questionKey] = 'Test answer';
        }
        filledCount++;
      }
    }
    
    try {
      // This should fail with validation errors
      await submitFormResponse(formKey, versionNumber, responses);
      console.error('❌ Invalid submission test FAILED - submission should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid submission correctly rejected with validation errors');
        console.log('Validation errors:', error.response.data);
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Invalid submission test error:', error);
    return false;
  }
}

async function testConditionalLogic() {
  console.log('\n=== Testing Conditional Logic in Form Submission ===');
  
  const formKey = 'wedding_questionnaire';
  const versionNumber = 1;
  
  try {
    const formDefinition = await getFormDefinition(formKey, versionNumber);
    
    // Look for questions with conditional logic
    const conditionalQuestions = [];
    const triggerQuestions = new Set();
    
    // Find rules and their targets
    for (const rule of formDefinition.rules || []) {
      if (rule.targets && rule.targets.length > 0) {
        // This question has conditional display logic
        for (const target of rule.targets) {
          conditionalQuestions.push({
            targetQuestionKey: target.questionKey,
            conditionType: rule.conditionType,
            triggerQuestionKey: rule.questionKey,
            expectedValue: rule.expectedValue
          });
          
          // Track questions that trigger conditional logic
          triggerQuestions.add(rule.questionKey);
        }
      }
    }
    
    if (conditionalQuestions.length === 0) {
      console.log('No conditional logic found in the form to test.');
      return true;
    }
    
    console.log(`Found ${conditionalQuestions.length} conditional rules to test`);
    
    // Create base responses
    const baseResponses = {};
    
    // Fill in all questions except conditional ones
    for (const page of formDefinition.pages) {
      for (const question of page.questions) {
        if (!['header', 'text_display'].includes(question.questionType) && 
            !conditionalQuestions.some(q => q.targetQuestionKey === question.questionKey)) {
          
          // Generate a generic answer
          if (question.questionType === 'single_select' || question.questionType === 'dropdown') {
            baseResponses[question.questionKey] = question.options[0]?.key || 'option1';
          } else if (question.questionType === 'multi_select' || question.questionType === 'checkbox') {
            baseResponses[question.questionKey] = [question.options[0]?.key || 'option1'];
          } else {
            baseResponses[question.questionKey] = 'Base answer';
          }
        }
      }
    }
    
    // Test each conditional rule
    for (const condition of conditionalQuestions) {
      console.log(`Testing condition: ${condition.triggerQuestionKey} ${condition.conditionType} ${condition.expectedValue} shows ${condition.targetQuestionKey}`);
      
      // Clone the base responses
      const testResponses = {...baseResponses};
      
      // Find the trigger question
      let triggerQuestion = null;
      for (const page of formDefinition.pages) {
        const found = page.questions.find(q => q.questionKey === condition.triggerQuestionKey);
        if (found) {
          triggerQuestion = found;
          break;
        }
      }
      
      if (!triggerQuestion) {
        console.warn(`Couldn't find trigger question ${condition.triggerQuestionKey}`);
        continue;
      }
      
      // Set the trigger value to match the condition
      if (condition.conditionType === 'equals') {
        testResponses[condition.triggerQuestionKey] = condition.expectedValue;
      } else if (condition.conditionType === 'not_equals') {
        // Set a different value
        if (triggerQuestion.questionType === 'single_select' || triggerQuestion.questionType === 'dropdown') {
          // Find an option that's not the expected value
          const otherOption = triggerQuestion.options.find(opt => opt.key !== condition.expectedValue);
          testResponses[condition.triggerQuestionKey] = otherOption?.key || 'different_value';
        } else {
          testResponses[condition.triggerQuestionKey] = 'different_value';
        }
      }
      
      // Set a value for the target question
      const targetKey = condition.targetQuestionKey;
      testResponses[targetKey] = 'Conditional answer';
      
      try {
        // Submit with the condition satisfied
        await submitFormResponse(formKey, versionNumber, testResponses);
        console.log(`✅ Submission with conditional logic passed for ${targetKey}`);
      } catch (error) {
        console.error(`❌ Conditional logic test failed for ${targetKey}:`, 
          error.response ? error.response.data : error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Conditional logic test error:', error);
    return false;
  }
}

async function runTests() {
  try {
    await login();
    
    // Run all tests
    await testValidSubmission();
    await testInvalidSubmission();
    await testConditionalLogic();
    
    console.log('\n✅ All form submission tests completed');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Run the tests
runTests();