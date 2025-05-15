// test-public-questionnaire-api.js
import fetch from 'node-fetch';

// Base configuration
const HOST = 'http://localhost:5000';
let authCookie = null;

// Utility functions
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie || ''
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${HOST}${endpoint}`, options);
    
    // Store auth cookie if present in response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      authCookie = setCookie;
    }

    // Parse response
    let responseData;
    try {
      const text = await response.text();
      console.log(`Response from ${endpoint}:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      responseData = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Error parsing JSON:', e);
      responseData = { status: response.status };
    }

    return {
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error(`Failed to ${method} ${endpoint}:`, error);
    return { error: error.message };
  }
}

async function login() {
  // First try to get an existing session
  const authCheck = await makeRequest('GET', '/api/auth/me');
  
  if (authCheck.status === 200) {
    console.log('Already authenticated');
    return true;
  }
  
  // Login as admin
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };
  
  const loginRes = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (loginRes.status === 200) {
    console.log('Login successful');
    return true;
  }
  
  console.error('Login failed:', loginRes);
  return false;
}

// Main test function
async function runTests() {
  console.log('Starting public questionnaire API tests...');
  
  // First login for the admin operations
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Authentication failed. Tests aborted.');
    return;
  }
  
  try {
    // Step 1: Create a test questionnaire definition with isActive=true
    console.log('\n--- Step 1: Create active questionnaire definition ---');
    const definitionData = {
      title: 'Public Test Questionnaire',
      description: 'A test questionnaire for public API endpoints',
      versionName: '1.0',
      status: 'draft',
      isActive: true
    };
    
    const createDefinitionRes = await makeRequest('POST', '/api/admin/questionnaires/definitions', definitionData);
    
    if (createDefinitionRes.status !== 201) {
      throw new Error(`Failed to create questionnaire definition: ${JSON.stringify(createDefinitionRes)}`);
    }
    
    const definitionId = createDefinitionRes.data.id;
    console.log(`Created active questionnaire definition with ID: ${definitionId}`);
    
    // Step 2: Create pages for the definition
    console.log('\n--- Step 2: Create questionnaire pages ---');
    const page1Data = {
      title: 'Personal Information',
      order: 0
    };
    
    const page2Data = {
      title: 'Event Details',
      order: 1
    };
    
    const createPage1Res = await makeRequest('POST', `/api/admin/questionnaires/definitions/${definitionId}/pages`, page1Data);
    const createPage2Res = await makeRequest('POST', `/api/admin/questionnaires/definitions/${definitionId}/pages`, page2Data);
    
    if (createPage1Res.status !== 201 || createPage2Res.status !== 201) {
      throw new Error('Failed to create questionnaire pages');
    }
    
    const page1Id = createPage1Res.data.id;
    const page2Id = createPage2Res.data.id;
    console.log(`Created pages with IDs: ${page1Id}, ${page2Id}`);
    
    // Step 3: Create questions for both pages
    console.log('\n--- Step 3: Create questionnaire questions ---');
    
    // Personal information page questions
    const question1Data = {
      questionText: 'First Name',
      questionKey: 'firstName',
      questionType: 'text',
      order: 0,
      isRequired: true
    };
    
    const question2Data = {
      questionText: 'Last Name',
      questionKey: 'lastName',
      questionType: 'text',
      order: 1,
      isRequired: true
    };
    
    const question3Data = {
      questionText: 'Email Address',
      questionKey: 'email',
      questionType: 'email',
      order: 2,
      isRequired: true
    };
    
    const question4Data = {
      questionText: 'Phone Number',
      questionKey: 'phone',
      questionType: 'phone',
      order: 3,
      isRequired: false
    };
    
    // Event details page questions
    const question5Data = {
      questionText: 'Event Type',
      questionKey: 'eventType',
      questionType: 'radio',
      order: 0,
      isRequired: true,
      options: [
        { optionText: 'Wedding', optionValue: 'wedding', order: 0 },
        { optionText: 'Corporate Event', optionValue: 'corporate', order: 1 },
        { optionText: 'Birthday Party', optionValue: 'birthday', order: 2 },
        { optionText: 'Other', optionValue: 'other', order: 3 }
      ]
    };
    
    const question6Data = {
      questionText: 'Estimated Number of Guests',
      questionKey: 'guestCount',
      questionType: 'number',
      order: 1,
      isRequired: true
    };
    
    const question7Data = {
      questionText: 'Event Date',
      questionKey: 'eventDate',
      questionType: 'date',
      order: 2,
      isRequired: true
    };
    
    const question8Data = {
      questionText: 'Additional Notes',
      questionKey: 'message',
      questionType: 'textarea',
      order: 3,
      isRequired: false
    };
    
    // Create questions for page 1
    const createQuestion1Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page1Id}/questions`, question1Data);
    const createQuestion2Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page1Id}/questions`, question2Data);
    const createQuestion3Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page1Id}/questions`, question3Data);
    const createQuestion4Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page1Id}/questions`, question4Data);
    
    // Create questions for page 2
    const createQuestion5Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page2Id}/questions`, question5Data);
    const createQuestion6Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page2Id}/questions`, question6Data);
    const createQuestion7Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page2Id}/questions`, question7Data);
    const createQuestion8Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page2Id}/questions`, question8Data);
    
    if (createQuestion1Res.status !== 201 || createQuestion2Res.status !== 201 || 
        createQuestion3Res.status !== 201 || createQuestion4Res.status !== 201 ||
        createQuestion5Res.status !== 201 || createQuestion6Res.status !== 201 || 
        createQuestion7Res.status !== 201 || createQuestion8Res.status !== 201) {
      throw new Error('Failed to create all questionnaire questions');
    }
    
    console.log('Created all questions successfully');
    
    // Step 4: Add a conditional logic rule
    console.log('\n--- Step 4: Add conditional logic rule ---');
    const ruleData = {
      triggerQuestionKey: 'eventType',
      triggerCondition: 'equals',
      triggerValue: 'other',
      actionType: 'require_question',
      targetQuestionKey: 'message'
    };
    
    const createRuleRes = await makeRequest('POST', `/api/admin/questionnaires/definitions/${definitionId}/conditional-logic`, ruleData);
    
    if (createRuleRes.status !== 201) {
      throw new Error(`Failed to create conditional logic rule: ${JSON.stringify(createRuleRes)}`);
    }
    
    console.log('Created conditional logic rule successfully');
    
    // Step 5: Get active questionnaire (public API)
    console.log('\n--- Step 5: Test public API - Get active questionnaire ---');
    
    // Clear auth cookie for public endpoints
    authCookie = null;
    
    const getActiveRes = await makeRequest('GET', '/api/questionnaires/active');
    
    if (getActiveRes.status !== 200 || !getActiveRes.data.success) {
      throw new Error(`Failed to get active questionnaire: ${JSON.stringify(getActiveRes)}`);
    }
    
    console.log('Successfully retrieved active questionnaire');
    console.log(`Found ${getActiveRes.data.questionnaire.pages.length} pages with questions`);
    console.log(`Found ${getActiveRes.data.questionnaire.conditionalLogic.length} conditional logic rules`);
    
    // Step 6: Get specific questionnaire by ID (public API)
    console.log('\n--- Step 6: Test public API - Get questionnaire by ID ---');
    
    const getByIdRes = await makeRequest('GET', `/api/questionnaires/${definitionId}`);
    
    if (getByIdRes.status !== 200 || !getByIdRes.data.success) {
      throw new Error(`Failed to get questionnaire by ID: ${JSON.stringify(getByIdRes)}`);
    }
    
    console.log('Successfully retrieved questionnaire by ID');
    
    // Step 7: Submit a questionnaire response (public API)
    console.log('\n--- Step 7: Test public API - Submit questionnaire response ---');
    
    const submissionData = {
      definitionId,
      status: 'submitted',
      clientIdentifier: 'test-session-123',
      submittedData: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phone: '555-123-4567',
        eventType: 'wedding',
        guestCount: 100,
        eventDate: '2025-12-31',
        message: 'This is a test submission for a wedding event.'
      }
    };
    
    const submitRes = await makeRequest('POST', '/api/questionnaires/submit', submissionData);
    
    if (submitRes.status !== 201 || !submitRes.data.success) {
      throw new Error(`Failed to submit questionnaire response: ${JSON.stringify(submitRes)}`);
    }
    
    console.log('Successfully submitted questionnaire response');
    console.log('Submission details:', JSON.stringify(submitRes.data.submission, null, 2));
    
    // Check if a raw lead was created
    if (submitRes.data.submission.rawLeadId) {
      console.log(`Raw lead created with ID: ${submitRes.data.submission.rawLeadId}`);
    }
    
    console.log('\n✅ All public questionnaire API tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error during tests:', error);
});