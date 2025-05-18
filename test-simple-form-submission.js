/**
 * Simple test script for the form submission API
 * 
 * This script tests the basic form submission functionality:
 * 1. Creates a simple form with the API
 * 2. Submits a response to the form
 * 3. Verifies the submission is accepted
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

async function createTestForm() {
  console.log('\n=== Creating a test form ===');
  
  // Create a form
  const formResponse = await makeRequest('POST', '/api/form-builder/forms', {
    formKey: 'test_form',
    formTitle: 'Test Form',
    description: 'A simple test form',
    status: 'published'
  });
  
  const formId = formResponse.id;
  console.log(`Created form with ID: ${formId}`);
  
  // Create a page
  const pageResponse = await makeRequest('POST', '/api/form-builder/form-pages', {
    formId,
    pageTitle: 'Test Page',
    pageOrder: 1,
    description: 'A test page with questions'
  });
  
  const pageId = pageResponse.id;
  console.log(`Created page with ID: ${pageId}`);
  
  // Create a text question in the library
  const libraryQuestionResponse = await makeRequest('POST', '/api/form-builder/library-questions', {
    libraryQuestionKey: 'test_text_question',
    questionType: 'textbox',
    defaultText: 'Please enter your name',
    defaultMetadata: {
      isRequired: true,
      placeholder: 'Your name',
      helperText: 'We need your name for our records'
    }
  });
  
  const libraryQuestionId = libraryQuestionResponse.id;
  console.log(`Created library question with ID: ${libraryQuestionId}`);
  
  // Add the question to the page
  const questionResponse = await makeRequest('POST', '/api/form-builder/form-page-questions', {
    formPageId: pageId,
    libraryQuestionId,
    displayOrder: 1,
    // No overrides, use defaults
  });
  
  const questionId = questionResponse.id;
  console.log(`Added question with ID: ${questionId} to page`);
  
  return {
    formId,
    formKey: 'test_form',
    pageId,
    questionId
  };
}

async function getFormDefinition(formKey, versionNumber = 1) {
  console.log(`\n=== Fetching form definition for ${formKey} version ${versionNumber} ===`);
  const formDefinition = await makeRequest('GET', `/api/form-builder/forms/${formKey}/versions/${versionNumber}/render`);
  console.log(`Retrieved form definition with ${formDefinition.pages.length} pages`);
  return formDefinition;
}

async function submitFormResponse(formKey, versionNumber, responses) {
  console.log(`\n=== Submitting form response for ${formKey} version ${versionNumber} ===`);
  const submission = await makeRequest('POST', `/api/forms/${formKey}/versions/${versionNumber}/submit`, {
    responses,
    submitterInfo: {
      name: "Test User",
      email: "test@example.com"
    }
  });
  console.log('Form submission successful:', submission);
  return submission;
}

async function runTest() {
  try {
    await login();
    
    // Create a test form
    const { formKey } = await createTestForm();
    
    // Get the form definition
    const formDefinition = await getFormDefinition(formKey);
    
    // Extract the question ID from the form definition
    const questionId = formDefinition.pages[0].questions[0].questionInstanceId;
    
    // Submit a valid response
    const responses = {
      [questionId]: 'John Doe'
    };
    
    await submitFormResponse(formKey, 1, responses);
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
runTest();