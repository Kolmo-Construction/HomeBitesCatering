// Integration test script for the flexible questionnaire architecture
import { spawn } from 'child_process';
import axios from 'axios';
import assert from 'assert';

// Configuration
const BASE_URL = 'http://localhost:5000';
let authCookie = null;

// Test data that showcases various aspects of the architecture
const testData = {
  // Test event-specific questionnaires
  definitions: [
    {
      versionName: 'Corporate Event Form v1.0',
      description: 'Specialized form for corporate event catering',
      isActive: true
    },
    {
      versionName: 'Wedding Catering Form v1.0',
      description: 'Specialized form for wedding catering',
      isActive: true
    }
  ],
  
  // Test reusable section templates
  sections: [
    {
      title: 'Contact Information',
      description: 'Basic contact details for all event types',
      templateKey: 'contact_info_section',
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
    },
    {
      title: 'Venue Information',
      description: 'Details about the event venue',
      templateKey: 'venue_details_section',
      questions: [
        {
          questionText: 'Venue Name',
          questionKey: 'venue_name',
          questionType: 'text',
          order: 1,
          isRequired: true,
          helpText: 'Please enter the name of the venue'
        },
        {
          questionText: 'Venue Address',
          questionKey: 'venue_address',
          questionType: 'address',
          order: 2,
          isRequired: true,
          helpText: 'Please enter the complete venue address'
        },
        {
          questionText: 'Venue Contact Person',
          questionKey: 'venue_contact',
          questionType: 'text',
          order: 3,
          isRequired: false,
          helpText: 'Who should we contact at the venue?'
        }
      ]
    }
  ],
  
  // Test extensible component types
  componentTypes: [
    {
      typeKey: 'signature_pad',
      componentCategory: 'question',
      displayName: 'Signature Pad',
      description: 'Allows users to draw their signature',
      configSchema: {
        type: 'object',
        properties: {
          width: { type: 'number', default: 400 },
          height: { type: 'number', default: 200 },
          penColor: { type: 'string', default: '#000000' }
        }
      }
    },
    {
      typeKey: 'contains_substring',
      componentCategory: 'condition',
      displayName: 'Contains Substring',
      description: 'Checks if a text field contains a specific substring',
      configSchema: {
        type: 'object',
        properties: {
          caseSensitive: { type: 'boolean', default: false }
        }
      }
    }
  ]
};

// State to keep track of created resources
const testState = {
  definitionIds: [],
  sectionIds: [],
  pageIds: [],
  componentTypeIds: []
};

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
      validateStatus: () => true // Don't throw on non-2xx
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
    
    authCookie = response.headers['set-cookie'][0];
    console.log('Successfully logged in');
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

// Test the flexible questionnaire architecture
async function testQuestionnaireArchitecture() {
  console.log('Starting flexible questionnaire architecture tests...');
  
  try {
    // Step 1: Login
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('Login failed, cannot proceed with tests');
      return false;
    }
    
    // Step 2: Register component types
    console.log('\nTesting Component Type Registration:');
    for (const componentType of testData.componentTypes) {
      const response = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'registerComponentType',
        data: componentType
      });
      
      assert.strictEqual(response.status, 201, `Failed to register component type ${componentType.typeKey}`);
      assert.ok(response.data.success, 'Response should indicate success');
      assert.ok(response.data.componentType, 'Response should contain componentType data');
      
      testState.componentTypeIds.push(response.data.componentType.id);
      console.log(`- Registered ${componentType.componentCategory} type: ${componentType.typeKey}`);
    }
    
    // Step 3: Create reusable sections
    console.log('\nTesting Reusable Section Creation:');
    for (const section of testData.sections) {
      // Create the section
      const createSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'createSection',
        data: {
          title: section.title,
          description: section.description,
          templateKey: section.templateKey
        }
      });
      
      assert.strictEqual(createSectionResponse.status, 201, `Failed to create section ${section.title}`);
      assert.ok(createSectionResponse.data.success, 'Response should indicate success');
      assert.ok(createSectionResponse.data.section, 'Response should contain section data');
      
      const sectionId = createSectionResponse.data.section.id;
      testState.sectionIds.push(sectionId);
      
      // Add questions to the section
      const addQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionQuestions',
        data: {
          sectionId,
          questions: section.questions
        }
      });
      
      assert.strictEqual(addQuestionsResponse.status, 201, `Failed to add questions to section ${section.title}`);
      assert.ok(addQuestionsResponse.data.success, 'Response should indicate success');
      assert.ok(Array.isArray(addQuestionsResponse.data.questions), 'Response should contain questions array');
      assert.strictEqual(addQuestionsResponse.data.questions.length, section.questions.length, 'Should have added all questions');
      
      console.log(`- Created section "${section.title}" with ${section.questions.length} questions`);
    }
    
    // Step 4: Create questionnaire definitions
    console.log('\nTesting Questionnaire Definition Creation:');
    for (const definition of testData.definitions) {
      const response = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'createDefinition',
        data: definition
      });
      
      assert.strictEqual(response.status, 201, `Failed to create definition ${definition.versionName}`);
      assert.ok(response.data.success, 'Response should indicate success');
      assert.ok(response.data.definition, 'Response should contain definition data');
      
      testState.definitionIds.push(response.data.definition.id);
      console.log(`- Created questionnaire definition: ${definition.versionName}`);
    }
    
    // Step 5: Add pages to questionnaires and reuse sections
    console.log('\nTesting Page Creation and Section Reuse:');
    
    // For the first questionnaire (Corporate)
    const corporateDefId = testState.definitionIds[0];
    
    // Add contact page
    const contactPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: corporateDefId,
        title: 'Contact Information',
        order: 1
      }
    });
    
    assert.strictEqual(contactPageResponse.status, 201, 'Failed to add contact page');
    const contactPageId = contactPageResponse.data.page.id;
    testState.pageIds.push(contactPageId);
    
    // Add venue page
    const venuePageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: corporateDefId,
        title: 'Venue Details',
        order: 2
      }
    });
    
    assert.strictEqual(venuePageResponse.status, 201, 'Failed to add venue page');
    const venuePageId = venuePageResponse.data.page.id;
    testState.pageIds.push(venuePageId);
    
    // Reuse contact section on contact page
    const addContactSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: contactPageId,
        sectionId: testState.sectionIds[0], // Contact info section
        sectionOrder: 1
      }
    });
    
    assert.strictEqual(addContactSectionResponse.status, 201, 'Failed to add contact section to page');
    
    // Reuse venue section on venue page
    const addVenueSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: venuePageId,
        sectionId: testState.sectionIds[1], // Venue info section
        sectionOrder: 1
      }
    });
    
    assert.strictEqual(addVenueSectionResponse.status, 201, 'Failed to add venue section to page');
    
    console.log(`- Created pages and reused sections in Corporate questionnaire`);
    
    // Step 6: Retrieve full questionnaire with all components
    console.log('\nTesting Full Questionnaire Retrieval:');
    const getQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: corporateDefId
      }
    });
    
    assert.strictEqual(getQuestionnaireResponse.status, 200, 'Failed to retrieve full questionnaire');
    assert.ok(getQuestionnaireResponse.data.success, 'Response should indicate success');
    assert.ok(getQuestionnaireResponse.data.questionnaire, 'Response should contain questionnaire data');
    assert.ok(getQuestionnaireResponse.data.questionnaire.pages, 'Questionnaire should have pages');
    assert.strictEqual(getQuestionnaireResponse.data.questionnaire.pages.length, 2, 'Should have 2 pages');
    
    // Verify the first page has the contact section and questions
    const contactPage = getQuestionnaireResponse.data.questionnaire.pages.find(p => p.title === 'Contact Information');
    assert.ok(contactPage, 'Contact page should exist');
    assert.ok(contactPage.sections, 'Contact page should have sections');
    assert.strictEqual(contactPage.sections.length, 1, 'Contact page should have 1 section');
    assert.strictEqual(contactPage.sections[0].title, 'Contact Information', 'Section title should match');
    
    // Verify the questions were correctly copied from the section template
    assert.ok(contactPage.questions, 'Contact page should have questions');
    assert.ok(contactPage.questions.length >= 3, 'Contact page should have at least 3 questions');
    
    console.log(`- Retrieved full questionnaire with ${getQuestionnaireResponse.data.questionnaire.pages.length} pages`);
    console.log(`- First page has ${contactPage.questions.length} questions from reused section`);
    
    // All tests passed!
    console.log('\nAll flexible questionnaire architecture tests passed successfully!');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Main execution
testQuestionnaireArchitecture()
  .then(success => {
    console.log(success ? 'Architecture testing completed successfully.' : 'Architecture testing failed.');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error during testing:', err);
    process.exit(1);
  });