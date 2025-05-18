// Test Questionnaire Builder UI Interactions
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;
const debug = true;

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, cookie = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Use the provided cookie or the authCookie if available
  if (cookie) {
    options.headers.Cookie = cookie;
  } else if (authCookie) {
    options.headers.Cookie = authCookie;
  }
  
  if (debug) {
    console.log(`Request: ${method} ${endpoint}`);
    if (data) console.log('Request Data:', JSON.stringify(data, null, 2));
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
  
  if (debug) console.log("Login data:", loginData);
  
  const response = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (debug) {
    console.log("Login response status:", response.statusCode);
    console.log("Login response headers:", [...response.headers.entries()]);
  }
  
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

// Test function for questionnaire builder UI interactions
async function testQuestionnaireBuilderUI() {
  console.log('=== Testing Questionnaire Builder UI Interactions ===');
  
  try {
    // Log in first to get authenticated
    const isLoggedIn = await login();
    if (!isLoggedIn) {
      console.error('Authentication failed. Tests cannot continue.');
      return;
    }
    
    // Test 1: Create a new questionnaire definition
    console.log('\n--- Test 1: Create a new questionnaire definition ---');
    const definitionData = {
      action: 'createDefinition',
      data: {
        versionName: 'Event Questionnaire Test',
        description: 'Questionnaire for testing builder UI',
        category: 'CORPORATE_EVENT', // Using a specific event type
        isActive: true
      }
    };
    
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', definitionData);
    console.log(`Create Definition Response (${createDefResponse.statusCode}):`, createDefResponse.data);
    
    // Get the definition ID from the response
    let definitionId;
    if (createDefResponse.statusCode === 200 && createDefResponse.data && createDefResponse.data.id) {
      definitionId = createDefResponse.data.id;
      console.log(`Created definition with ID: ${definitionId}`);
    } else {
      console.error('Failed to create questionnaire definition');
      return;
    }
    
    // Test 2: Create a new page in the questionnaire
    console.log('\n--- Test 2: Create a new page in the questionnaire ---');
    const pageData = {
      action: 'createPage',
      data: {
        definitionId: definitionId,
        title: 'Event Details',
        description: 'Please provide details about your event',
        order: 0
      }
    };
    
    const createPageResponse = await makeRequest('POST', '/api/questionnaires/builder', pageData);
    console.log(`Create Page Response (${createPageResponse.statusCode}):`, createPageResponse.data);
    
    // Get the page ID from the response
    let pageId;
    if (createPageResponse.statusCode === 200 && createPageResponse.data && createPageResponse.data.id) {
      pageId = createPageResponse.data.id;
      console.log(`Created page with ID: ${pageId}`);
    } else {
      console.error('Failed to create page');
      // Continue with other tests even if this one fails
    }
    
    // Test 3: Create a section for the page
    console.log('\n--- Test 3: Create a section for the page ---');
    const sectionData = {
      action: 'createSection',
      data: {
        title: 'Basic Information',
        description: 'Please provide basic information about your event',
        order: 0
      }
    };
    
    const createSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', sectionData);
    console.log(`Create Section Response (${createSectionResponse.statusCode}):`, createSectionResponse.data);
    
    // Get the section ID from the response
    let sectionId;
    if (createSectionResponse.statusCode === 200 && createSectionResponse.data && createSectionResponse.data.id) {
      sectionId = createSectionResponse.data.id;
      console.log(`Created section with ID: ${sectionId}`);
      
      // Test 3.1: Link section to page
      if (pageId) {
        console.log('\n--- Test 3.1: Link section to page ---');
        const linkData = {
          action: 'linkSectionToPage',
          data: {
            pageId: pageId,
            sectionId: sectionId,
            order: 0
          }
        };
        
        const linkResponse = await makeRequest('POST', '/api/questionnaires/builder', linkData);
        console.log(`Link Section Response (${linkResponse.statusCode}):`, linkResponse.data);
      }
    } else {
      console.error('Failed to create section');
      // Continue with other tests even if this one fails
    }
    
    // Test 4: Add questions to the section
    if (sectionId) {
      console.log('\n--- Test 4: Add questions to the section ---');
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
      
      const createQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', questionsData);
      console.log(`Create Questions Response (${createQuestionsResponse.statusCode}):`, createQuestionsResponse.data);
      
      // Store the question IDs for conditional logic testing
      let questionIds = [];
      if (createQuestionsResponse.statusCode === 200 && createQuestionsResponse.data && createQuestionsResponse.data.questions) {
        questionIds = createQuestionsResponse.data.questions.map(q => q.id);
        console.log(`Created questions with IDs: ${questionIds.join(', ')}`);
        
        // Test 4.1: Add conditional logic between questions
        if (questionIds.length >= 2) {
          console.log('\n--- Test 4.1: Add conditional logic between questions ---');
          
          // Add a follow-up question that shows only if "Other" is selected
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
          console.log(`Create Follow-up Question Response (${followUpResponse.statusCode}):`, followUpResponse.data);
          
          if (followUpResponse.statusCode === 200 && followUpResponse.data && followUpResponse.data.questions && followUpResponse.data.questions.length > 0) {
            const followUpQuestionId = followUpResponse.data.questions[0].id;
            
            // Set up conditional logic
            const conditionalLogicData = {
              action: 'addConditionalLogic',
              data: {
                conditionalLogic: [
                  {
                    targetQuestionId: followUpQuestionId,
                    conditions: [
                      {
                        sourceQuestionId: questionIds[2], // The event type radio button question
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
            console.log(`Add Conditional Logic Response (${conditionalLogicResponse.statusCode}):`, conditionalLogicResponse.data);
          }
        }
      }
    }
    
    // Test 5: Get the full questionnaire
    console.log('\n--- Test 5: Get the full questionnaire ---');
    const getFullQuestionnaireData = {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definitionId
      }
    };
    
    const getFullQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', getFullQuestionnaireData);
    console.log(`Get Full Questionnaire Response (${getFullQuestionnaireResponse.statusCode}):`, getFullQuestionnaireResponse.data);
    
    // Test 6: Create a test submission to simulate a user filling out the form
    console.log('\n--- Test 6: Create a test submission ---');
    const submissionData = {
      action: 'submitResponse',
      data: {
        definitionId: definitionId,
        responses: {
          event_name: 'Annual Company Conference 2025',
          attendee_count: 250,
          event_type: 'conference'
        }
      }
    };
    
    const submissionResponse = await makeRequest('POST', '/api/questionnaires/submit', submissionData);
    console.log(`Submission Response (${submissionResponse.statusCode}):`, submissionResponse.data);
    
    // Test 7: Clean up - Delete the questionnaire definition to leave the system as we found it
    console.log('\n--- Test 7: Deleting test questionnaire (cleanup) ---');
    
    const deleteResponse = await makeRequest('DELETE', `/api/admin/questionnaires/definitions/${definitionId}`);
    console.log(`Delete Response (${deleteResponse.statusCode}):`, deleteResponse.data);
    
    console.log('\n=== Questionnaire Builder UI Tests Complete ===');
    
  } catch (error) {
    console.error('Error in testQuestionnaireBuilderUI:', error);
  }
}

// Run the tests
testQuestionnaireBuilderUI().catch(error => {
  console.error('Fatal error:', error);
});