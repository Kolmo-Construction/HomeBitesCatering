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

// Test data for different event types
const eventTypes = [
  {
    type: 'wedding',
    name: 'Wedding Event',
    description: 'Questionnaire for wedding catering services',
    specializedQuestions: [
      {
        questionText: 'Wedding Date',
        questionKey: 'wedding_date',
        questionType: 'date',
        isRequired: true,
        helpText: 'Please select the date of your wedding'
      },
      {
        questionText: 'Wedding Style',
        questionKey: 'wedding_style',
        questionType: 'select',
        isRequired: true,
        helpText: 'Select the style of your wedding',
        options: [
          { optionText: 'Traditional', optionValue: 'traditional', order: 1 },
          { optionText: 'Modern', optionValue: 'modern', order: 2 },
          { optionText: 'Rustic', optionValue: 'rustic', order: 3 },
          { optionText: 'Beach', optionValue: 'beach', order: 4 },
          { optionText: 'Destination', optionValue: 'destination', order: 5 }
        ]
      }
    ]
  },
  {
    type: 'corporate',
    name: 'Corporate Event',
    description: 'Questionnaire for corporate catering services',
    specializedQuestions: [
      {
        questionText: 'Company Name',
        questionKey: 'company_name',
        questionType: 'text',
        isRequired: true,
        helpText: 'Please enter your company name'
      },
      {
        questionText: 'Event Type',
        questionKey: 'corporate_event_type',
        questionType: 'select',
        isRequired: true,
        helpText: 'Select the type of corporate event',
        options: [
          { optionText: 'Conference', optionValue: 'conference', order: 1 },
          { optionText: 'Team Building', optionValue: 'team_building', order: 2 },
          { optionText: 'Product Launch', optionValue: 'product_launch', order: 3 },
          { optionText: 'Holiday Party', optionValue: 'holiday_party', order: 4 },
          { optionText: 'Board Meeting', optionValue: 'board_meeting', order: 5 }
        ]
      }
    ]
  }
];

// Main test function
async function runEventQuestionnaireTests() {
  console.log('Starting event-specific questionnaire tests...');
  
  try {
    // Step 1: Login
    await login();
    
    // Test 1: Create a reusable contact information section
    console.log('\nTest 1: Creating a reusable contact information section');
    const createContactSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Contact Information',
        description: 'Basic contact details for all event types',
        templateKey: 'contact_info'
      }
    });
    
    assert.strictEqual(createContactSectionResponse.status, 201, 'Should return 201 Created');
    const contactSectionId = createContactSectionResponse.data.section.id;
    console.log(`Created contact section template with ID: ${contactSectionId}`);
    
    // Test 2: Add contact questions to the section
    console.log('\nTest 2: Adding contact questions to the section');
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: contactSectionId,
        questions: [
          {
            questionText: 'Full Name',
            questionKey: 'contact_name',
            questionType: 'text',
            order: 1,
            isRequired: true
          },
          {
            questionText: 'Email Address',
            questionKey: 'contact_email',
            questionType: 'email',
            order: 2,
            isRequired: true
          },
          {
            questionText: 'Phone Number',
            questionKey: 'contact_phone',
            questionType: 'phone',
            order: 3,
            isRequired: true
          }
        ]
      }
    });
    
    // Test 3: Create a reusable venue section
    console.log('\nTest 3: Creating a reusable venue section');
    const createVenueSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Venue Information',
        description: 'Venue details for all event types',
        templateKey: 'venue_info'
      }
    });
    
    assert.strictEqual(createVenueSectionResponse.status, 201, 'Should return 201 Created');
    const venueSectionId = createVenueSectionResponse.data.section.id;
    console.log(`Created venue section template with ID: ${venueSectionId}`);
    
    // Test 4: Add venue questions to the section
    console.log('\nTest 4: Adding venue questions to the section');
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: venueSectionId,
        questions: [
          {
            questionText: 'Venue Name',
            questionKey: 'venue_name',
            questionType: 'text',
            order: 1,
            isRequired: true
          },
          {
            questionText: 'Venue Address',
            questionKey: 'venue_address',
            questionType: 'address',
            order: 2,
            isRequired: true
          },
          {
            questionText: 'Venue Contact Person',
            questionKey: 'venue_contact',
            questionType: 'text',
            order: 3,
            isRequired: false
          }
        ]
      }
    });
    
    // Test 5-6: Create event-specific questionnaires
    const eventQuestionnaires = [];
    
    for (const eventType of eventTypes) {
      console.log(`\nTest 5-6: Creating questionnaire for ${eventType.name}`);
      
      // Create questionnaire definition
      const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'createDefinition',
        data: {
          versionName: `${eventType.name} Catering Form v1.0`,
          description: eventType.description,
          isActive: true
        }
      });
      
      assert.strictEqual(createDefResponse.status, 201, 'Should return 201 Created');
      const definitionId = createDefResponse.data.definition.id;
      console.log(`Created ${eventType.name} questionnaire with ID: ${definitionId}`);
      
      // Add contact info page
      const addContactPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          definitionId: definitionId,
          title: 'Contact Information',
          order: 1
        }
      });
      
      assert.strictEqual(addContactPageResponse.status, 201, 'Should return 201 Created');
      const contactPageId = addContactPageResponse.data.page.id;
      
      // Add contact section to page
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionToPage',
        data: {
          pageId: contactPageId,
          sectionId: contactSectionId,
          sectionOrder: 1
        }
      });
      
      // Add event details page
      const addDetailsPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          definitionId: definitionId,
          title: `${eventType.name} Details`,
          order: 2
        }
      });
      
      assert.strictEqual(addDetailsPageResponse.status, 201, 'Should return 201 Created');
      const detailsPageId = addDetailsPageResponse.data.page.id;
      
      // Add event-specific questions
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestions',
        data: {
          pageId: detailsPageId,
          questions: eventType.specializedQuestions
        }
      });
      
      // Add venue page
      const addVenuePageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          definitionId: definitionId,
          title: 'Venue Information',
          order: 3
        }
      });
      
      assert.strictEqual(addVenuePageResponse.status, 201, 'Should return 201 Created');
      const venuePageId = addVenuePageResponse.data.page.id;
      
      // Add venue section to page
      await makeRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionToPage',
        data: {
          pageId: venuePageId,
          sectionId: venueSectionId,
          sectionOrder: 1
        }
      });
      
      eventQuestionnaires.push({
        type: eventType.type,
        definitionId: definitionId
      });
    }
    
    // Test 7: Create a landing form to route users
    console.log('\nTest 7: Creating a landing form to route users');
    const createLandingResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        versionName: 'Event Type Selection',
        description: 'Initial form to determine which event questionnaire to show',
        isActive: true
      }
    });
    
    assert.strictEqual(createLandingResponse.status, 201, 'Should return 201 Created');
    const landingDefId = createLandingResponse.data.definition.id;
    console.log(`Created landing form with ID: ${landingDefId}`);
    
    // Add selection page
    const addSelectionPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: landingDefId,
        title: 'Select Your Event Type',
        order: 1
      }
    });
    
    assert.strictEqual(addSelectionPageResponse.status, 201, 'Should return 201 Created');
    const selectionPageId = addSelectionPageResponse.data.page.id;
    
    // Add event type selection question
    console.log('\nAdding event type selection question');
    const addSelectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestions',
      data: {
        pageId: selectionPageId,
        questions: [
          {
            questionText: 'What type of event are you planning?',
            questionKey: 'event_type_selection',
            questionType: 'radio',
            order: 1,
            isRequired: true,
            helpText: 'Select the type of event you need catering for'
          }
        ]
      }
    });
    
    assert.strictEqual(addSelectionResponse.status, 201, 'Should return 201 Created');
    const selectionQuestionId = addSelectionResponse.data.questions[0].id;
    
    // Add options to selection question
    console.log('\nAdding options to selection question');
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: selectionQuestionId,
        options: [
          { optionText: 'Wedding', optionValue: 'wedding', order: 1 },
          { optionText: 'Corporate Event', optionValue: 'corporate', order: 2 },
          { optionText: 'Birthday', optionValue: 'birthday', order: 3 },
          { optionText: 'Engagement', optionValue: 'engagement', order: 4 },
          { optionText: 'Other Private Party', optionValue: 'other_private', order: 5 },
          { optionText: 'Food Truck', optionValue: 'food_truck', order: 6 }
        ]
      }
    });
    
    // Test 8: Verify all questionnaires are active
    console.log('\nTest 8: Verifying all questionnaires are active');
    const activeResponse = await makeRequest('GET', '/api/questionnaires/active');
    assert.strictEqual(activeResponse.status, 200, 'Should return 200 OK');
    
    // Test 9: Simulate a user selecting an event type
    console.log('\nTest 9: Simulating a user selecting Corporate Event');
    // This would typically be implemented with either a frontend router
    // or by using session data to store the event type selection
    
    // We'll verify we can access the corporate event questionnaire
    const corporateQuestionnaire = eventQuestionnaires.find(q => q.type === 'corporate');
    const getCorporateResponse = await makeRequest('GET', `/api/questionnaires/${corporateQuestionnaire.definitionId}`);
    
    assert.strictEqual(getCorporateResponse.status, 200, 'Should return 200 OK');
    assert.ok(getCorporateResponse.data.questionnaire, 'Response should contain questionnaire data');
    assert.ok(getCorporateResponse.data.questionnaire.pages.length > 2, 'Should have at least 3 pages');
    
    // Verify that the corporate-specific questions exist
    let foundCorporateQuestion = false;
    for (const page of getCorporateResponse.data.questionnaire.pages) {
      for (const question of page.questions) {
        if (question.questionKey === 'company_name') {
          foundCorporateQuestion = true;
          break;
        }
      }
    }
    
    assert.strictEqual(foundCorporateQuestion, true, 'Corporate questionnaire should contain company_name question');
    
    console.log('\nAll event questionnaire tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  runEventQuestionnaireTests()
    .then(() => {
      console.log('All tests completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Tests failed:', err);
      process.exit(1);
    });
}

module.exports = { runEventQuestionnaireTests };