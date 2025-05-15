// test-conditional-logic-api.js
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
      responseData = await response.json();
    } catch (e) {
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
  console.log('Starting conditional logic API tests...');
  
  // First login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Authentication failed. Tests aborted.');
    return;
  }
  
  try {
    // Step 1: Create a test questionnaire definition
    console.log('\n--- Step 1: Create questionnaire definition ---');
    const definitionData = {
      title: 'Test Questionnaire',
      description: 'A test questionnaire for conditional logic',
      version: '1.0'
    };
    
    const createDefinitionRes = await makeRequest('POST', '/api/admin/questionnaires/definitions', definitionData);
    
    if (createDefinitionRes.status !== 201) {
      throw new Error(`Failed to create questionnaire definition: ${JSON.stringify(createDefinitionRes)}`);
    }
    
    const definitionId = createDefinitionRes.data.id;
    console.log(`Created questionnaire definition with ID: ${definitionId}`);
    
    // Step 2: Create pages for the definition
    console.log('\n--- Step 2: Create questionnaire pages ---');
    const page1Data = {
      title: 'Page 1',
      order: 0
    };
    
    const page2Data = {
      title: 'Page 2',
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
    const question1Data = {
      questionText: 'Are you attending?',
      questionKey: 'attending',
      questionType: 'radio',
      order: 0,
      isRequired: true,
      options: [
        { optionText: 'Yes', optionValue: 'yes', order: 0 },
        { optionText: 'No', optionValue: 'no', order: 1 }
      ]
    };
    
    const question2Data = {
      questionText: 'Dietary Restrictions',
      questionKey: 'dietary',
      questionType: 'checkbox_group',
      order: 0,
      isRequired: false,
      options: [
        { optionText: 'Vegetarian', optionValue: 'vegetarian', order: 0 },
        { optionText: 'Vegan', optionValue: 'vegan', order: 1 },
        { optionText: 'Gluten Free', optionValue: 'gluten_free', order: 2 }
      ]
    };
    
    const createQuestion1Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page1Id}/questions`, question1Data);
    const createQuestion2Res = await makeRequest('POST', `/api/admin/questionnaires/pages/${page2Id}/questions`, question2Data);
    
    if (createQuestion1Res.status !== 201 || createQuestion2Res.status !== 201) {
      throw new Error('Failed to create questionnaire questions');
    }
    
    console.log(`Created questions with keys: 'attending', 'dietary'`);
    
    // Step 4: Create a conditional logic rule
    console.log('\n--- Step 4: Create conditional logic rule ---');
    const ruleData = {
      triggerQuestionKey: 'attending',
      triggerCondition: 'equals',
      triggerValue: 'yes',
      actionType: 'show_question',
      targetQuestionKey: 'dietary'
    };
    
    const createRuleRes = await makeRequest('POST', `/api/admin/questionnaires/definitions/${definitionId}/conditional-logic`, ruleData);
    
    if (createRuleRes.status !== 201) {
      throw new Error(`Failed to create conditional logic rule: ${JSON.stringify(createRuleRes)}`);
    }
    
    const ruleId = createRuleRes.data.id;
    console.log(`Created conditional logic rule with ID: ${ruleId}`);
    
    // Step 5: List all conditional logic rules for the definition
    console.log('\n--- Step 5: List conditional logic rules ---');
    const listRulesRes = await makeRequest('GET', `/api/admin/questionnaires/definitions/${definitionId}/conditional-logic`);
    
    if (listRulesRes.status !== 200) {
      throw new Error('Failed to list conditional logic rules');
    }
    
    console.log(`Found ${listRulesRes.data.length} conditional logic rules`);
    console.log('Rule details:', JSON.stringify(listRulesRes.data[0], null, 2));
    
    // Step 6: Get a specific conditional logic rule
    console.log('\n--- Step 6: Get specific conditional logic rule ---');
    const getRuleRes = await makeRequest('GET', `/api/admin/questionnaires/conditional-logic/${ruleId}`);
    
    if (getRuleRes.status !== 200) {
      throw new Error('Failed to get conditional logic rule');
    }
    
    console.log('Retrieved rule successfully');
    
    // Step 7: Update the conditional logic rule
    console.log('\n--- Step 7: Update conditional logic rule ---');
    const updateRuleData = {
      triggerCondition: 'equals',
      triggerValue: 'yes',
      actionType: 'skip_to_page',
      targetPageId: page2Id
    };
    
    const updateRuleRes = await makeRequest('PUT', `/api/admin/questionnaires/conditional-logic/${ruleId}`, updateRuleData);
    
    if (updateRuleRes.status !== 200) {
      throw new Error(`Failed to update conditional logic rule: ${JSON.stringify(updateRuleRes)}`);
    }
    
    console.log('Updated rule successfully');
    console.log('Updated rule details:', JSON.stringify(updateRuleRes.data, null, 2));
    
    // Step 8: Delete the conditional logic rule
    console.log('\n--- Step 8: Delete conditional logic rule ---');
    const deleteRuleRes = await makeRequest('DELETE', `/api/admin/questionnaires/conditional-logic/${ruleId}`);
    
    if (deleteRuleRes.status !== 204) {
      throw new Error('Failed to delete conditional logic rule');
    }
    
    console.log('Deleted rule successfully');
    
    // Final verification - list rules to confirm deletion
    const finalListRes = await makeRequest('GET', `/api/admin/questionnaires/definitions/${definitionId}/conditional-logic`);
    console.log(`After deletion, found ${finalListRes.data.length} conditional logic rules`);
    
    console.log('\n✅ All conditional logic API tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error during tests:', error);
});