// Basic test for Questionnaire Builder Functionality
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;

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
  
  console.log("Login data:", loginData);
  
  const response = await makeRequest('POST', '/api/auth/login', loginData);
  
  console.log("Login response status:", response.statusCode);
  
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
async function runBasicTest() {
  console.log('=== Starting Basic Test for Questionnaire Builder ===');
  
  try {
    // Step 1: Login
    console.log('\n--- Step 1: Login ---');
    const isLoggedIn = await login();
    if (!isLoggedIn) {
      console.error('Authentication failed. Tests cannot continue.');
      return;
    }
    
    // Step 2: Create a component type
    console.log('\n--- Step 2: Create a component type for text input ---');
    const textComponentData = {
      action: 'registerComponentType',
      data: {
        typeKey: 'text_input',
        componentCategory: 'basic',
        displayName: 'Text Input',
        description: 'A simple text input field',
        isActive: true
      }
    };
    
    const createTextComponentResponse = await makeRequest('POST', '/api/questionnaires/builder', textComponentData);
    console.log(`Component created with status: ${createTextComponentResponse.statusCode}`);
    if (createTextComponentResponse.statusCode !== 201 && createTextComponentResponse.statusCode !== 200 && createTextComponentResponse.statusCode !== 409) {
      console.error('Failed to create component type:', createTextComponentResponse.data);
      // We'll continue anyway since the component might already exist
    }
    
    // Step 3: Create a questionnaire definition
    console.log('\n--- Step 3: Create a questionnaire definition ---');
    const definitionData = {
      action: 'createDefinition',
      data: {
        name: 'Corporate Event Questionnaire',
        versionName: 'v1.0',
        description: 'Basic test questionnaire for corporate events',
        eventType: 'corporate'
      }
    };
    
    const createDefResponse = await makeRequest('POST', '/api/questionnaires/builder', definitionData);
    console.log(`Definition created with status: ${createDefResponse.statusCode}`);
    console.log('Response data:', createDefResponse.data);
    
    let definitionId;
    if (createDefResponse.statusCode === 201 || createDefResponse.statusCode === 200) {
      definitionId = createDefResponse.data?.definition?.id || createDefResponse.data?.id;
      console.log(`Created definition with ID: ${definitionId}`);
    } else {
      console.error('Failed to create questionnaire definition');
      return;
    }
    
    // Step 4: Create a section template
    console.log('\n--- Step 4: Create a section template ---');
    const sectionData = {
      action: 'createSection',
      data: {
        title: 'Event Details',
        description: 'Basic information about the event',
        templateKey: 'event_details'
      }
    };
    
    const createSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', sectionData);
    console.log(`Section created with status: ${createSectionResponse.statusCode}`);
    console.log('Response data:', createSectionResponse.data);
    
    let sectionId;
    if (createSectionResponse.statusCode === 201 || createSectionResponse.statusCode === 200) {
      sectionId = createSectionResponse.data?.section?.id || createSectionResponse.data?.id;
      console.log(`Created section with ID: ${sectionId}`);
    } else {
      console.error('Failed to create section');
      return;
    }
    
    // Step 5: Create a page 
    console.log('\n--- Step 5: Create a page ---');
    const pageData = {
      action: 'addPage',
      data: {
        definitionId: definitionId,
        title: 'Basic Information',
        description: 'Please provide the basic details for your event',
        order: 0
      }
    };
    
    const createPageResponse = await makeRequest('POST', '/api/questionnaires/builder', pageData);
    console.log(`Page created with status: ${createPageResponse.statusCode}`);
    console.log('Response data:', createPageResponse.data);
    
    let pageId;
    if (createPageResponse.statusCode === 201 || createPageResponse.statusCode === 200) {
      pageId = createPageResponse.data?.page?.id || createPageResponse.data?.id;
      console.log(`Created page with ID: ${pageId}`);
    } else {
      console.error('Failed to create page');
      return;
    }
    
    // Step 6: Link section to page
    console.log('\n--- Step 6: Link section to page ---');
    const linkData = {
      action: 'addSectionToPage',
      data: {
        pageId: pageId,
        sectionId: sectionId,
        sectionOrder: 0
      }
    };
    
    const linkSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', linkData);
    console.log(`Section linked with status: ${linkSectionResponse.statusCode}`);
    console.log('Response data:', linkSectionResponse.data);
    
    if (linkSectionResponse.statusCode !== 201 && linkSectionResponse.statusCode !== 200) {
      console.error('Failed to link section to page');
      return;
    }
    
    // Step 7: Add questions to the section
    console.log('\n--- Step 7: Add questions to the section ---');
    const questionsData = {
      action: 'addSectionQuestions',
      data: {
        sectionId: sectionId,
        questions: [
          {
            text: 'Event Name',
            questionKey: 'event_name',
            isRequired: true,
            helpText: 'Please provide a name for your event',
            questionOrder: 0
          },
          {
            text: 'Expected Attendees',
            questionKey: 'attendee_count',
            isRequired: true,
            helpText: 'How many people do you expect to attend?',
            validationRules: {
              min: 1,
              max: 1000
            },
            questionOrder: 1
          },
          {
            text: 'Event Date',
            questionKey: 'event_date',
            isRequired: true,
            helpText: 'When will the event take place?',
            questionOrder: 2
          }
        ]
      }
    };
    
    const addQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', questionsData);
    console.log(`Questions added with status: ${addQuestionsResponse.statusCode}`);
    console.log('Response data:', addQuestionsResponse.data);
    
    if (addQuestionsResponse.statusCode !== 201 && addQuestionsResponse.statusCode !== 200) {
      console.error('Failed to add questions');
      return;
    }
    
    // Step 8: Retrieve the complete questionnaire
    console.log('\n--- Step 8: Retrieve the complete questionnaire ---');
    const getQuestionnaireData = {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definitionId
      }
    };
    
    const getQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', getQuestionnaireData);
    console.log(`Retrieved questionnaire with status: ${getQuestionnaireResponse.statusCode}`);
    
    if (getQuestionnaireResponse.statusCode === 200) {
      console.log('\nQuestionnaire structure summary:');
      const data = getQuestionnaireResponse.data;
      console.log(`Definition: ${data.versionName || data.name}`);
      
      if (data.pages && data.pages.length > 0) {
        console.log(`Pages (${data.pages.length}):`);
        data.pages.forEach(page => {
          console.log(`- ${page.title}`);
          
          if (page.sections && page.sections.length > 0) {
            console.log(`  Sections (${page.sections.length}):`);
            page.sections.forEach(section => {
              console.log(`  - ${section.title}`);
              
              if (section.questions && section.questions.length > 0) {
                console.log(`    Questions (${section.questions.length}):`);
                section.questions.forEach(question => {
                  console.log(`    - ${question.text || question.questionText} (${question.questionKey})`);
                });
              }
            });
          }
        });
      }
    } else {
      console.error('Failed to retrieve questionnaire');
    }
    
    console.log('\n=== Basic Test for Questionnaire Builder Completed ===');
    
  } catch (error) {
    console.error('Error in basic test:', error);
  }
}

// Run the test
runBasicTest().catch(error => {
  console.error('Fatal error in basic test:', error);
});