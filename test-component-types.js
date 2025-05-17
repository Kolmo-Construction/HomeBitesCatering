const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'http://localhost:5000';
let authCookie = null;

// Helper function for making authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie || ''
      },
      validateStatus: () => true, // Don't throw on non-2xx
    };
    
    if (data) {
      options.data = data;
    }
    
    const response = await axios(options);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    console.error(`Request error for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

// Login helper
async function login() {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.status !== 200 || !response.headers['set-cookie']) {
      throw new Error(`Login failed with status ${response.status}`);
    }
    
    authCookie = response.headers['set-cookie'].join('; ');
    console.log('Successfully logged in');
    return authCookie;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Main test function
async function runComponentTypeTests() {
  console.log('Starting questionnaire component types tests...');
  
  try {
    // Step 1: Login
    await login();
    
    // Test 1: Register a new question type
    console.log('\nTest 1: Registering a new question type');
    const questionTypeData = {
      typeKey: 'signature_pad',
      componentCategory: 'question',
      displayName: 'Signature Pad',
      description: 'Allows users to draw their signature with a mouse or touch',
      configSchema: {
        type: 'object',
        properties: {
          width: { type: 'number', default: 400 },
          height: { type: 'number', default: 200 },
          penColor: { type: 'string', default: '#000000' },
          backgroundColor: { type: 'string', default: '#ffffff' }
        }
      },
      isActive: true
    };
    
    const createTypeResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'registerComponentType',
      data: questionTypeData
    });
    
    assert.strictEqual(createTypeResponse.status, 201, 'Should return 201 Created');
    assert.ok(createTypeResponse.data.componentType, 'Response should contain componentType data');
    assert.strictEqual(createTypeResponse.data.componentType.typeKey, 'signature_pad', 'Type key should match');
    
    const questionTypeId = createTypeResponse.data.componentType.id;
    console.log(`Registered question type with ID: ${questionTypeId}`);
    
    // Test 2: Register a new condition type
    console.log('\nTest 2: Registering a new condition type');
    const conditionTypeData = {
      typeKey: 'contains_substring',
      componentCategory: 'condition',
      displayName: 'Contains Substring',
      description: 'Checks if a text field contains a specific substring',
      configSchema: {
        type: 'object',
        properties: {
          caseSensitive: { type: 'boolean', default: false }
        }
      },
      isActive: true
    };
    
    const createConditionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'registerComponentType',
      data: conditionTypeData
    });
    
    assert.strictEqual(createConditionResponse.status, 201, 'Should return 201 Created');
    assert.ok(createConditionResponse.data.componentType, 'Response should contain componentType data');
    assert.strictEqual(createConditionResponse.data.componentType.typeKey, 'contains_substring', 'Type key should match');
    
    const conditionTypeId = createConditionResponse.data.componentType.id;
    console.log(`Registered condition type with ID: ${conditionTypeId}`);
    
    // Test 3: List all component types
    console.log('\nTest 3: Listing all component types');
    const listTypesResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'listComponentTypes',
      data: {}
    });
    
    assert.strictEqual(listTypesResponse.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(listTypesResponse.data.componentTypes), 'Response should contain componentTypes array');
    
    // Test 4: Create a questionnaire definition using new component type
    console.log('\nTest 4: Creating a definition with new component type');
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        versionName: 'Test Form with Custom Components',
        description: 'Testing custom component types',
        isActive: true
      }
    });
    
    assert.strictEqual(createDefResponse.status, 201, 'Should return 201 Created');
    assert.ok(createDefResponse.data.definition, 'Response should contain definition data');
    
    const definitionId = createDefResponse.data.definition.id;
    console.log(`Created questionnaire definition with ID: ${definitionId}`);
    
    // Test 5: Add a page to the questionnaire
    console.log('\nTest 5: Adding a page to the questionnaire');
    const addPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: definitionId,
        title: 'Signature Page',
        order: 1
      }
    });
    
    assert.strictEqual(addPageResponse.status, 201, 'Should return 201 Created');
    assert.ok(addPageResponse.data.page, 'Response should contain page data');
    
    const pageId = addPageResponse.data.page.id;
    console.log(`Created page with ID: ${pageId}`);
    
    // Test 6: Add a custom question using the new question type
    console.log('\nTest 6: Adding a custom question with the new question type');
    const addQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestions',
      data: {
        pageId: pageId,
        questions: [
          {
            questionText: 'Please sign below',
            questionKey: 'customer_signature',
            questionType: 'signature_pad',
            order: 1,
            isRequired: true,
            helpText: 'Click and drag to sign',
            config: {
              width: 500,
              height: 200,
              penColor: '#0000FF'
            }
          }
        ]
      }
    });
    
    assert.strictEqual(addQuestionResponse.status, 201, 'Should return 201 Created');
    assert.ok(addQuestionResponse.data.questions, 'Response should contain questions data');
    assert.strictEqual(addQuestionResponse.data.questions[0].questionType, 'signature_pad', 'Question type should match');
    
    // Test 7: Add conditional logic using new condition type
    console.log('\nTest 7: Adding conditional logic with new condition type');
    const addLogicResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: definitionId,
        conditionalLogic: {
          triggerQuestionKey: 'customer_name',
          triggerCondition: 'contains_substring',
          triggerValue: 'Smith',
          actionType: 'show_question',
          targetQuestionKey: 'special_offer',
          config: {
            caseSensitive: false
          }
        }
      }
    });
    
    assert.strictEqual(addLogicResponse.status, 201, 'Should return 201 Created');
    assert.ok(addLogicResponse.data.conditionalLogic, 'Response should contain conditionalLogic data');
    assert.strictEqual(addLogicResponse.data.conditionalLogic.triggerCondition, 'contains_substring', 'Condition type should match');
    
    console.log('\nAll component type tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  runComponentTypeTests()
    .then(() => {
      console.log('All tests completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Tests failed:', err);
      process.exit(1);
    });
}

module.exports = { runComponentTypeTests };