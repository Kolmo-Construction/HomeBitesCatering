// End-to-End Test for Questionnaire Builder Functionality
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;
const debug = true;

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Only add the cookie header if we have one
  if (authCookie) {
    options.headers.Cookie = authCookie;
  }
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const responseText = await response.text();
  
  try {
    return { 
      statusCode: response.status,
      headers: response.headers,
      data: responseText ? JSON.parse(responseText) : null
    };
  } catch (error) {
    return { 
      statusCode: response.status,
      headers: response.headers,
      data: responseText,
      error: 'Invalid JSON response'
    };
  }
}

// Login function to get authenticated
async function login() {
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };
  
  const response = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (response.statusCode === 200) {
    if (response.headers.get('set-cookie')) {
      authCookie = response.headers.get('set-cookie');
      console.log('Successfully logged in with cookie');
      return true;
    } else {
      console.log('Login successful but no cookie was set. Session might not work properly.');
      return true; // Still return true to continue tests
    }
  } else {
    console.error('Login failed:', response.data);
    return false;
  }
}

// Main test function
async function runE2ETest() {
  console.log('=== Starting E2E Test for Questionnaire Builder ===');
  
  try {
    // Step 1: Login
    console.log('\n--- Step 1: Login ---');
    const isLoggedIn = await login();
    if (!isLoggedIn) {
      console.error('Authentication failed. Tests cannot continue.');
      return;
    }
    
    // Step 2: Create a questionnaire definition
    console.log('\n--- Step 2: Create a questionnaire definition ---');
    const definitionData = {
      action: 'createDefinition',
      data: {
        versionName: 'Corporate Event Form E2E Test',
        description: 'E2E test questionnaire for corporate events',
        category: 'CORPORATE_EVENT',
        isActive: true
      }
    };
    
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', definitionData);
    console.log(`Definition created with status: ${createDefResponse.statusCode}`);
    
    if (createDefResponse.statusCode !== 200 || !createDefResponse.data || !createDefResponse.data.id) {
      console.error('Failed to create questionnaire definition');
      return;
    }
    
    const definitionId = createDefResponse.data.id;
    console.log(`Created definition with ID: ${definitionId}`);
    
    // Step 3: Create a page
    console.log('\n--- Step 3: Create a page ---');
    const pageData = {
      action: 'createPage',
      data: {
        definitionId: definitionId,
        title: 'Event Details',
        description: 'Please provide basic information about your event',
        order: 0
      }
    };
    
    const createPageResponse = await makeRequest('POST', '/api/questionnaires/builder', pageData);
    console.log(`Page created with status: ${createPageResponse.statusCode}`);
    
    if (createPageResponse.statusCode !== 200 || !createPageResponse.data || !createPageResponse.data.id) {
      console.error('Failed to create page');
      return;
    }
    
    const pageId = createPageResponse.data.id;
    console.log(`Created page with ID: ${pageId}`);
    
    // Step 4: Create a section
    console.log('\n--- Step 4: Create a section ---');
    const sectionData = {
      action: 'createSection',
      data: {
        title: 'Basic Information',
        description: 'Core details about your event',
        order: 0
      }
    };
    
    const createSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', sectionData);
    console.log(`Section created with status: ${createSectionResponse.statusCode}`);
    
    if (createSectionResponse.statusCode !== 200 || !createSectionResponse.data || !createSectionResponse.data.id) {
      console.error('Failed to create section');
      return;
    }
    
    const sectionId = createSectionResponse.data.id;
    console.log(`Created section with ID: ${sectionId}`);
    
    // Step 5: Link section to page
    console.log('\n--- Step 5: Link section to page ---');
    const linkData = {
      action: 'linkSectionToPage',
      data: {
        pageId: pageId,
        sectionId: sectionId,
        order: 0
      }
    };
    
    const linkSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', linkData);
    console.log(`Section linked with status: ${linkSectionResponse.statusCode}`);
    
    if (linkSectionResponse.statusCode !== 200) {
      console.error('Failed to link section to page');
      return;
    }
    
    // Step 6: Add questions to the section
    console.log('\n--- Step 6: Add questions to the section ---');
    const questionsData = {
      action: 'addQuestions',
      data: {
        sectionId: sectionId,
        questions: [
          {
            questionText: 'Event Name',
            questionKey: 'event_name',
            questionType: 'text',
            isRequired: true,
            order: 0,
            helpText: 'Please provide a name for your event'
          },
          {
            questionText: 'Expected Attendees',
            questionKey: 'attendee_count',
            questionType: 'number',
            isRequired: true,
            order: 1,
            helpText: 'How many people do you expect to attend?',
            validationRules: {
              min: 1,
              max: 1000
            }
          },
          {
            questionText: 'Event Type',
            questionKey: 'event_type',
            questionType: 'radio',
            isRequired: true,
            order: 2,
            helpText: 'What type of corporate event is this?',
            options: [
              {
                optionText: 'Conference',
                optionValue: 'conference',
                order: 0
              },
              {
                optionText: 'Team Building',
                optionValue: 'team_building',
                order: 1
              },
              {
                optionText: 'Product Launch',
                optionValue: 'product_launch',
                order: 2
              },
              {
                optionText: 'Holiday Party',
                optionValue: 'holiday_party',
                order: 3
              },
              {
                optionText: 'Other',
                optionValue: 'other',
                order: 4
              }
            ]
          }
        ]
      }
    };
    
    const addQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', questionsData);
    console.log(`Questions added with status: ${addQuestionsResponse.statusCode}`);
    
    if (addQuestionsResponse.statusCode !== 200 || !addQuestionsResponse.data) {
      console.error('Failed to add questions');
      return;
    }
    
    // Get the question IDs
    let eventTypeQuestionId;
    if (addQuestionsResponse.data.questions && addQuestionsResponse.data.questions.length >= 3) {
      eventTypeQuestionId = addQuestionsResponse.data.questions[2].id;
      console.log(`Event Type question ID: ${eventTypeQuestionId}`);
    } else {
      console.error('Could not retrieve question IDs');
      return;
    }
    
    // Step 7: Add a follow-up question with conditional logic
    console.log('\n--- Step 7: Add a follow-up question with conditional logic ---');
    const followUpQuestionData = {
      action: 'addQuestions',
      data: {
        sectionId: sectionId,
        questions: [
          {
            questionText: 'Please specify the event type',
            questionKey: 'event_type_other',
            questionType: 'text',
            isRequired: true,
            order: 3,
            helpText: 'Please describe your event type'
          }
        ]
      }
    };
    
    const followUpResponse = await makeRequest('POST', '/api/questionnaires/builder', followUpQuestionData);
    console.log(`Follow-up question added with status: ${followUpResponse.statusCode}`);
    
    if (followUpResponse.statusCode !== 200 || !followUpResponse.data || !followUpResponse.data.questions || !followUpResponse.data.questions.length) {
      console.error('Failed to add follow-up question');
      return;
    }
    
    const followUpQuestionId = followUpResponse.data.questions[0].id;
    console.log(`Follow-up question ID: ${followUpQuestionId}`);
    
    // Step 8: Add conditional logic
    console.log('\n--- Step 8: Add conditional logic ---');
    const conditionalLogicData = {
      action: 'addConditionalLogic',
      data: {
        conditionalLogic: [
          {
            targetQuestionId: followUpQuestionId,
            conditions: [
              {
                sourceQuestionId: eventTypeQuestionId,
                operator: 'equals',
                value: 'other'
              }
            ],
            actionType: 'show_if_true'
          }
        ]
      }
    };
    
    const conditionalLogicResponse = await makeRequest('POST', '/api/questionnaires/builder', conditionalLogicData);
    console.log(`Conditional logic added with status: ${conditionalLogicResponse.statusCode}`);
    
    if (conditionalLogicResponse.statusCode !== 200) {
      console.error('Failed to add conditional logic');
      return;
    }
    
    // Step 9: Retrieve the complete questionnaire
    console.log('\n--- Step 9: Retrieve the complete questionnaire ---');
    const getQuestionnaireData = {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definitionId
      }
    };
    
    const getQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', getQuestionnaireData);
    console.log(`Retrieved questionnaire with status: ${getQuestionnaireResponse.statusCode}`);
    
    if (getQuestionnaireResponse.statusCode !== 200 || !getQuestionnaireResponse.data) {
      console.error('Failed to retrieve questionnaire');
      return;
    }
    
    // Verify the structure of the retrieved questionnaire
    const fullQuestionnaire = getQuestionnaireResponse.data;
    console.log('\nVerifying questionnaire structure:');
    console.log(` - Definition ID: ${fullQuestionnaire.id}`);
    console.log(` - Version Name: ${fullQuestionnaire.versionName}`);
    console.log(` - Pages Count: ${fullQuestionnaire.pages ? fullQuestionnaire.pages.length : 0}`);
    
    if (fullQuestionnaire.pages && fullQuestionnaire.pages.length > 0) {
      const page = fullQuestionnaire.pages[0];
      console.log(` - First Page: ${page.title}`);
      console.log(` - Sections Count: ${page.sections ? page.sections.length : 0}`);
      
      if (page.sections && page.sections.length > 0) {
        const section = page.sections[0];
        console.log(` - First Section: ${section.title}`);
        console.log(` - Questions Count: ${section.questions ? section.questions.length : 0}`);
      }
    }
    
    console.log(` - Conditional Logic Rules: ${fullQuestionnaire.conditionalLogic ? fullQuestionnaire.conditionalLogic.length : 0}`);
    
    // Step 10: Clean up - Delete the questionnaire definition
    console.log('\n--- Step 10: Clean up - Delete the questionnaire definition ---');
    const deleteResponse = await makeRequest('DELETE', `/api/admin/questionnaires/definitions/${definitionId}`);
    console.log(`Deleted questionnaire with status: ${deleteResponse.statusCode}`);
    
    if (deleteResponse.statusCode !== 200) {
      console.error('Failed to delete questionnaire definition');
    }
    
    console.log('\n=== E2E Test for Questionnaire Builder Completed ===');
    
  } catch (error) {
    console.error('Error in E2E test:', error);
  }
}

// Run the E2E test
runE2ETest().catch(error => {
  console.error('Fatal error in E2E test:', error);
});