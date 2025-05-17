import axios from 'axios';
import assert from 'assert';

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
async function runSectionTests() {
  console.log('Starting questionnaire sections tests...');
  
  try {
    // Step 1: Login
    await login();
    
    // Test 1: Create a reusable section template
    console.log('\nTest 1: Creating a reusable section template');
    const createSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Contact Information',
        description: 'Basic contact details for the client',
        templateKey: 'contact_info'
      }
    });
    
    assert.strictEqual(createSectionResponse.status, 201, 'Should return 201 Created');
    assert.ok(createSectionResponse.data.section, 'Response should contain section data');
    assert.strictEqual(createSectionResponse.data.section.title, 'Contact Information', 'Section title should match');
    
    const sectionId = createSectionResponse.data.section.id;
    console.log(`Created section template with ID: ${sectionId}`);
    
    // Test 2: Add questions to the section template
    console.log('\nTest 2: Adding questions to the section template');
    const addQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: sectionId,
        questions: [
          {
            questionText: 'Full Name',
            questionKey: 'contact_name',
            questionType: 'text',
            order: 1,
            isRequired: true,
            helpText: 'Please enter your full name'
          },
          {
            questionText: 'Email Address',
            questionKey: 'contact_email',
            questionType: 'email',
            order: 2,
            isRequired: true,
            helpText: 'Please enter a valid email address'
          },
          {
            questionText: 'Phone Number',
            questionKey: 'contact_phone',
            questionType: 'phone',
            order: 3,
            isRequired: true,
            helpText: 'Please enter your phone number'
          }
        ]
      }
    });
    
    assert.strictEqual(addQuestionsResponse.status, 201, 'Should return 201 Created');
    assert.ok(addQuestionsResponse.data.questions, 'Response should contain questions data');
    assert.strictEqual(addQuestionsResponse.data.questions.length, 3, 'Should have added 3 questions');
    
    // Test 3: Create a questionnaire definition
    console.log('\nTest 3: Creating a questionnaire definition');
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        versionName: 'Corporate Event Form v1.0',
        description: 'Specialized form for corporate event catering',
        isActive: true
      }
    });
    
    assert.strictEqual(createDefResponse.status, 201, 'Should return 201 Created');
    assert.ok(createDefResponse.data.definition, 'Response should contain definition data');
    
    const definitionId = createDefResponse.data.definition.id;
    console.log(`Created questionnaire definition with ID: ${definitionId}`);
    
    // Test 4: Add a page to the questionnaire
    console.log('\nTest 4: Adding a page to the questionnaire');
    const addPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: definitionId,
        title: 'Basic Information',
        order: 1
      }
    });
    
    assert.strictEqual(addPageResponse.status, 201, 'Should return 201 Created');
    assert.ok(addPageResponse.data.page, 'Response should contain page data');
    
    const pageId = addPageResponse.data.page.id;
    console.log(`Created page with ID: ${pageId}`);
    
    // Test 5: Add section to page
    console.log('\nTest 5: Adding section to page');
    const addSectionToPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: pageId,
        sectionId: sectionId,
        sectionOrder: 1
      }
    });
    
    assert.strictEqual(addSectionToPageResponse.status, 201, 'Should return 201 Created');
    assert.ok(addSectionToPageResponse.data.pageSection, 'Response should contain page section data');
    
    // Test 6: Get the full questionnaire
    console.log('\nTest 6: Get the full questionnaire with sections');
    const getQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definitionId
      }
    });
    
    assert.strictEqual(getQuestionnaireResponse.status, 200, 'Should return 200 OK');
    assert.ok(getQuestionnaireResponse.data.questionnaire, 'Response should contain questionnaire data');
    
    // Validate the structure of the returned questionnaire
    const questionnaire = getQuestionnaireResponse.data.questionnaire;
    assert.ok(questionnaire.definition, 'Questionnaire should have definition data');
    assert.ok(questionnaire.pages, 'Questionnaire should have pages data');
    assert.ok(questionnaire.pages[0].sections, 'Pages should include sections data');
    
    console.log('\nAll section tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Main execution
runSectionTests()
  .then(() => {
    console.log('All tests completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
  });

export { runSectionTests };