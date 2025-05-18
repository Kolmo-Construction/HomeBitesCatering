/**
 * Test script for the form builder API
 * 
 * This script tests all the form builder endpoints:
 * 1. Creates a form
 * 2. Adds pages to the form
 * 3. Adds questions to the pages
 * 4. Sets up conditional logic rules
 * 5. Tests updating and retrieving entities
 */
import axios from 'axios';
const baseURL = 'http://localhost:5000';

// Helper function for making API requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': global.authCookie
      }
    };
    
    if (data && (method === 'post' || method === 'put')) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making ${method} request to ${endpoint}:`, 
      error.response ? error.response.data : error.message);
    throw error;
  }
}

// Login to get auth cookie
async function login() {
  try {
    const response = await axios({
      method: 'post',
      url: `${baseURL}/api/auth/login`,
      data: {
        username: 'admin',
        password: 'admin'
      }
    });
    
    global.authCookie = response.headers['set-cookie'][0];
    console.log('Successfully logged in');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    return false;
  }
}

async function runTests() {
  try {
    console.log('Starting form builder API tests...');
    
    // Test form creation
    console.log('\n----- Testing Form Creation -----');
    const newForm = await makeRequest('post', '/api/form-builder/forms', {
      formKey: 'wedding_questionnaire',
      formTitle: 'Wedding Questionnaire',
      description: 'Form for gathering wedding details from clients',
      version: 1,
      status: 'draft'
    });
    
    console.log('Created form:', newForm);
    const formId = newForm.id;
    
    // Test form retrieval
    console.log('\n----- Testing Form Retrieval -----');
    const retrievedForm = await makeRequest('get', `/api/form-builder/forms/${formId}`);
    console.log('Retrieved form:', retrievedForm);
    
    // Test form list
    console.log('\n----- Testing Form List -----');
    const formList = await makeRequest('get', '/api/form-builder/forms');
    console.log('Form list:', formList);
    
    // Test creating pages
    console.log('\n----- Testing Page Creation -----');
    const page1 = await makeRequest('post', `/api/form-builder/forms/${formId}/pages`, {
      pageTitle: 'Basic Information',
      pageOrder: 0,
      description: 'Collect basic wedding information'
    });
    console.log('Created page 1:', page1);
    
    const page2 = await makeRequest('post', `/api/form-builder/forms/${formId}/pages`, {
      pageTitle: 'Venue Information',
      pageOrder: 1,
      description: 'Collect venue details'
    });
    console.log('Created page 2:', page2);
    
    const page3 = await makeRequest('post', `/api/form-builder/forms/${formId}/pages`, {
      pageTitle: 'Guest Information',
      pageOrder: 2,
      description: 'Collect guest count and requirements'
    });
    console.log('Created page 3:', page3);
    
    // Test page retrieval
    console.log('\n----- Testing Page List -----');
    const pageList = await makeRequest('get', `/api/form-builder/forms/${formId}/pages`);
    console.log('Page list:', pageList);
    
    // First, let's create some library questions to use
    console.log('\n----- Creating Library Questions -----');
    
    // Create a text question for name
    const nameQuestion = await makeRequest('post', '/api/question-library', {
      questionType: 'text',
      displayText: 'What is your name?',
      isRequired: true,
      placeholder: 'Enter your full name',
      helperText: 'We need your name for our records',
      metadata: { textType: 'short' }
    });
    console.log('Created name question:', nameQuestion);
    
    // Create a date question for wedding date
    const dateQuestion = await makeRequest('post', '/api/question-library', {
      questionType: 'date',
      displayText: 'What is your wedding date?',
      isRequired: true,
      helperText: 'Select your planned wedding date',
      metadata: { 
        dateFormat: 'MM/DD/YYYY',
        allowPastDates: false 
      }
    });
    console.log('Created date question:', dateQuestion);
    
    // Create a number question for guest count
    const guestCountQuestion = await makeRequest('post', '/api/question-library', {
      questionType: 'number',
      displayText: 'How many guests are you expecting?',
      isRequired: true,
      placeholder: 'Enter a number',
      helperText: 'Approximate number of guests',
      validationRules: {
        min: 1,
        max: 1000
      }
    });
    console.log('Created guest count question:', guestCountQuestion);
    
    // Create a select question for venue type
    const venueTypeQuestion = await makeRequest('post', '/api/question-library', {
      questionType: 'select',
      displayText: 'What type of venue are you looking for?',
      isRequired: true,
      helperText: 'Select the type of venue you prefer',
      options: {
        choices: [
          { value: 'indoor', label: 'Indoor' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'hybrid', label: 'Hybrid (Indoor/Outdoor)' }
        ]
      }
    });
    console.log('Created venue type question:', venueTypeQuestion);
    
    // Create a checkbox question for catering options
    const cateringOptionsQuestion = await makeRequest('post', '/api/question-library', {
      questionType: 'checkbox',
      displayText: 'Which catering options are you interested in?',
      isRequired: true,
      helperText: 'Select all that apply',
      options: {
        choices: [
          { value: 'appetizers', label: 'Appetizers/Hors d\'oeuvres' },
          { value: 'full_dinner', label: 'Full Dinner Service' },
          { value: 'dessert', label: 'Dessert Options' },
          { value: 'bar', label: 'Bar Service' },
          { value: 'special_meals', label: 'Special Dietary Meals' }
        ],
        minSelections: 1,
        maxSelections: 5
      }
    });
    console.log('Created catering options question:', cateringOptionsQuestion);
    
    // Add questions to pages
    console.log('\n----- Adding Questions to Pages -----');
    
    // Add name question to page 1
    const nameQuestionInstance = await makeRequest('post', `/api/form-builder/pages/${page1.id}/questions`, {
      libraryQuestionId: nameQuestion.id,
      displayOrder: 0,
      displayTextOverride: 'What is the couple\'s names?',
      helperTextOverride: 'Please provide both names'
    });
    console.log('Added name question to page 1:', nameQuestionInstance);
    
    // Add date question to page 1
    const dateQuestionInstance = await makeRequest('post', `/api/form-builder/pages/${page1.id}/questions`, {
      libraryQuestionId: dateQuestion.id,
      displayOrder: 1
    });
    console.log('Added date question to page 1:', dateQuestionInstance);
    
    // Add venue type question to page 2
    const venueQuestionInstance = await makeRequest('post', `/api/form-builder/pages/${page2.id}/questions`, {
      libraryQuestionId: venueTypeQuestion.id,
      displayOrder: 0
    });
    console.log('Added venue type question to page 2:', venueQuestionInstance);
    
    // Add guest count question to page 3
    const guestCountQuestionInstance = await makeRequest('post', `/api/form-builder/pages/${page3.id}/questions`, {
      libraryQuestionId: guestCountQuestion.id,
      displayOrder: 0
    });
    console.log('Added guest count question to page 3:', guestCountQuestionInstance);
    
    // Add catering options question to page 3
    const cateringOptionsQuestionInstance = await makeRequest('post', `/api/form-builder/pages/${page3.id}/questions`, {
      libraryQuestionId: cateringOptionsQuestion.id,
      displayOrder: 1
    });
    console.log('Added catering options question to page 3:', cateringOptionsQuestionInstance);
    
    // Test question list for a page
    console.log('\n----- Testing Question List for Page 1 -----');
    const questionsForPage1 = await makeRequest('get', `/api/form-builder/pages/${page1.id}/questions`);
    console.log('Questions for page 1:', questionsForPage1);
    
    // Test reordering questions on a page
    console.log('\n----- Testing Question Reordering -----');
    const reorderedQuestions = await makeRequest('post', `/api/form-builder/pages/${page1.id}/questions/reorder`, [
      { questionInstanceId: nameQuestionInstance.id, newDisplayOrder: 1 },
      { questionInstanceId: dateQuestionInstance.id, newDisplayOrder: 0 }
    ]);
    console.log('Reordered questions result:', reorderedQuestions);
    
    // Create a conditional logic rule
    console.log('\n----- Testing Conditional Logic Creation -----');
    const rule = await makeRequest('post', `/api/form-builder/forms/${formId}/rules`, {
      triggerFormPageQuestionId: venueQuestionInstance.id,
      conditionType: 'is_selected_option_value',
      conditionValue: 'outdoor',
      actionType: 'show',
      ruleDescription: 'Show guest count question if venue is outdoor',
      executionOrder: 0,
      targets: [
        { targetType: 'question', targetId: guestCountQuestionInstance.id }
      ]
    });
    console.log('Created rule:', rule);
    
    // Test rule retrieval
    console.log('\n----- Testing Rule List -----');
    const ruleList = await makeRequest('get', `/api/form-builder/forms/${formId}/rules`);
    console.log('Rule list:', ruleList);
    
    // Update the form
    console.log('\n----- Testing Form Update -----');
    const updatedForm = await makeRequest('put', `/api/form-builder/forms/${formId}`, {
      formTitle: 'Wedding Details Questionnaire',
      description: 'Updated form for gathering detailed wedding information from clients',
      status: 'published'
    });
    console.log('Updated form:', updatedForm);
    
    console.log('\n----- All Tests Completed Successfully -----');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Self-executing main function for ES modules
(async function() {
  if (await login()) {
    await runTests();
  }
})();