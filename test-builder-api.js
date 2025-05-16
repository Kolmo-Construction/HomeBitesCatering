// Test the unified form builder API
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie || ''
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  // Save cookies for session
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    authCookie = setCookieHeader;
  }
  
  let responseData;
  try {
    responseData = await response.json();
  } catch (error) {
    responseData = null;
  }
  
  return {
    status: response.status,
    data: responseData
  };
}

async function login() {
  console.log('\n--- Logging in ---');
  const loginData = {
    username: 'admin',
    password: 'admin'
  };
  
  const loginResponse = await makeRequest('POST', '/api/auth/login', loginData);
  console.log(`Login Response (${loginResponse.status}):`, loginResponse.data);
  
  if (loginResponse.status !== 200) {
    throw new Error('Login failed');
  }
  
  return loginResponse.data;
}

async function runBuilderApiTests() {
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Create a questionnaire definition
    console.log('\n--- Step 2: Create a questionnaire definition ---');
    const definitionData = {
      action: 'createDefinition',
      data: {
        versionName: 'Unified API Test v1.0',
        description: 'Testing the unified form builder API',
        isActive: true
      }
    };
    
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', definitionData);
    console.log(`Create Definition Response (${createDefResponse.status}):`, createDefResponse.data);
    
    if (createDefResponse.status !== 201 || !createDefResponse.data.definition) {
      throw new Error('Failed to create questionnaire definition');
    }
    
    const definitionId = createDefResponse.data.definition.id;
    console.log(`Created definition with ID: ${definitionId}`);
    
    // Step 3: Add a page to the definition
    console.log('\n--- Step 3: Add a page to the definition ---');
    const pageData = {
      action: 'addPage',
      data: {
        definitionId: definitionId,
        title: 'Basic Information',
        order: 1
      }
    };
    
    const createPageResponse = await makeRequest('POST', '/api/questionnaires/builder', pageData);
    console.log(`Create Page Response (${createPageResponse.status}):`, createPageResponse.data);
    
    if (createPageResponse.status !== 201 || !createPageResponse.data.page) {
      throw new Error('Failed to create page');
    }
    
    const pageId = createPageResponse.data.page.id;
    console.log(`Created page with ID: ${pageId}`);
    
    // Step 4: Add questions to the page
    console.log('\n--- Step 4: Add questions to the page ---');
    const questionsData = {
      action: 'addQuestions',
      data: {
        pageId: pageId,
        questions: [
          {
            questionText: 'What type of event are you planning?',
            questionKey: 'event_type',
            questionType: 'select',
            isRequired: true,
            order: 1,
            options: [
              { optionText: 'Wedding', optionValue: 'wedding', order: 1 },
              { optionText: 'Corporate', optionValue: 'corporate', order: 2 },
              { optionText: 'Birthday', optionValue: 'birthday', order: 3 },
              { optionText: 'Other', optionValue: 'other', order: 4 }
            ]
          },
          {
            questionText: 'Approximate number of guests?',
            questionKey: 'guest_count',
            questionType: 'number',
            isRequired: true,
            order: 2
          }
        ]
      }
    };
    
    const createQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', questionsData);
    console.log(`Create Questions Response (${createQuestionsResponse.status}):`, createQuestionsResponse.data);
    
    if (createQuestionsResponse.status !== 201 || !createQuestionsResponse.data.questions) {
      throw new Error('Failed to create questions');
    }
    
    const questionIds = createQuestionsResponse.data.questions.map(q => q.id);
    console.log(`Created questions with IDs: ${questionIds.join(', ')}`);
    
    // Step 5: Get the full questionnaire
    console.log('\n--- Step 5: Get the full questionnaire ---');
    const getFullQuestionnaireData = {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definitionId
      }
    };
    
    const getFullQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', getFullQuestionnaireData);
    console.log(`Get Full Questionnaire Response (${getFullQuestionnaireResponse.status}):`, 
      getFullQuestionnaireResponse.data ? 'Success (data received)' : 'No data');
    
    // Step 6: Clean up - Delete the questionnaire definition to leave the system as we found it
    console.log('\n--- Deleting test questionnaire (cleanup) ---');
    // Use the existing admin API to delete the definition
    const deleteResponse = await makeRequest('DELETE', `/api/admin/questionnaires/definitions/${definitionId}`);
    console.log(`Delete Definition Response (${deleteResponse.status}):`, deleteResponse.data);
    
    console.log('\n=== Unified Form Builder API Tests Completed Successfully ===');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the tests
runBuilderApiTests().catch(console.error);
