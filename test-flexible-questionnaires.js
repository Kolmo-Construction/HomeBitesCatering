// Test script for flexible questionnaire architecture
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fetch from 'node-fetch';

// Configure neon client
neonConfig.webSocketConstructor = ws;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Constants for the test
const API_URL = 'http://localhost:5000';
let authCookie = '';

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const responseData = await response.json();
  
  return {
    status: response.status,
    data: responseData,
    headers: response.headers
  };
}

// Login to get auth cookie
async function login() {
  const response = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (response.status === 200) {
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      authCookie = setCookieHeader;
      console.log('Successfully logged in');
    }
  } else {
    console.error('Login failed:', response.data);
    throw new Error('Login failed');
  }
}

// Test creating component types
async function testComponentTypes() {
  console.log('\n--- Testing Component Type Management ---');
  
  // 1. Create a custom component type
  const customComponentResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'registerComponentType',
    data: {
      typeKey: 'rating_stars',
      componentCategory: 'question',
      displayName: 'Rating Stars',
      description: 'Star rating component (1-5 stars)',
      configSchema: { 
        type: 'object', 
        properties: {
          min: { type: 'number', default: 1 },
          max: { type: 'number', default: 5 },
          showLabels: { type: 'boolean', default: true }
        }
      },
      isActive: true
    }
  });
  
  console.log(`Created custom component: ${customComponentResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  
  // 2. Get all component types
  const getComponentsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'listComponentTypes'
  });
  
  console.log(`Retrieved ${getComponentsResponse.data?.componentTypes?.length || 0} component types`);
  
  // Log a few of them as examples
  if (getComponentsResponse.data?.componentTypes?.length > 0) {
    console.log('Sample component types:');
    getComponentsResponse.data.componentTypes.slice(0, 3).forEach(comp => {
      console.log(`- ${comp.name}: ${comp.description}`);
    });
  }
}

// Test creating questionnaire sections
async function testSections() {
  console.log('\n--- Testing Section Template Management ---');
  
  // 1. Create a contact information section
  const contactSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createSection',
    data: {
      title: 'Guest Information',
      description: 'Basic information about the guest',
      templateKey: 'guest_info_section'
    }
  });
  
  console.log(`Created contact section: ${contactSectionResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const contactSectionId = contactSectionResponse.data?.section?.id;
  
  if (contactSectionId) {
    // 2. Add questions to the section
    const addQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: contactSectionId,
        questions: [
          {
            componentTypeId: 4, // email
            text: 'Email Address',
            helpText: 'We\'ll send confirmation details to this email',
            isRequired: true,
            validationRules: { format: 'email' },
            questionOrder: 1
          },
          {
            componentTypeId: 5, // phone
            text: 'Phone Number',
            helpText: 'We\'ll only call for urgent updates',
            isRequired: false,
            questionOrder: 2
          }
        ]
      }
    });
    
    console.log(`Added questions to section: ${addQuestionsResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  }
  
  // 3. Create a venue section
  const venueSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createSection',
    data: {
      title: 'Venue Details',
      description: 'Information about the event venue',
      templateKey: 'venue_details_section'
    }
  });
  
  console.log(`Created venue section: ${venueSectionResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const venueSectionId = venueSectionResponse.data?.section?.id;
  
  if (venueSectionId) {
    // 4. Add questions to the venue section
    const addVenueQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: venueSectionId,
        questions: [
          {
            componentTypeId: 1, // text
            text: 'Venue Name',
            isRequired: true,
            questionOrder: 1
          },
          {
            componentTypeId: 15, // address
            text: 'Venue Address',
            isRequired: true,
            questionOrder: 2
          },
          {
            componentTypeId: 3, // number
            text: 'Expected Number of Guests',
            helpText: 'Approximate number of attendees',
            isRequired: true,
            validationRules: { minimum: 1, maximum: 1000 },
            questionOrder: 3
          }
        ]
      }
    });
    
    console.log(`Added questions to venue section: ${addVenueQuestionsResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  }
}

// Test creating questionnaire definitions
async function testQuestionnaires() {
  console.log('\n--- Testing Questionnaire Definition Management ---');
  
  // 1. Create a corporate event questionnaire
  const corporateEventResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createDefinition',
    data: {
      name: 'Corporate Event Questionnaire',
      description: 'Form for corporate event catering requests',
      versionName: 'v1.0',
      eventType: 'corporate',
      isActive: true
    }
  });
  
  console.log(`Created corporate event questionnaire: ${corporateEventResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const corporateEventId = corporateEventResponse.data?.definition?.id;
  
  // 2. Create a wedding questionnaire
  const weddingResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createDefinition',
    data: {
      name: 'Wedding Catering Questionnaire',
      description: 'Form for wedding catering requests',
      versionName: 'v1.0',
      eventType: 'wedding',
      isActive: true
    }
  });
  
  console.log(`Created wedding questionnaire: ${weddingResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const weddingEventId = weddingResponse.data?.definition?.id;
  
  // Return the created questionnaire IDs
  return {
    corporateEventId,
    weddingEventId
  };
}

// Test adding pages to questionnaires
async function testPages(questionnaireIds) {
  if (!questionnaireIds.corporateEventId) {
    console.log('Cannot test pages, missing questionnaire ID');
    return;
  }
  
  console.log('\n--- Testing Page Management ---');
  
  // 1. Get section IDs
  const sectionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'listSections'
  });
  
  let guestSectionId = null;
  let venueSectionId = null;
  
  if (sectionsResponse.data?.success) {
    const sections = sectionsResponse.data.sections;
    const guestSection = sections.find(s => s.templateKey === 'guest_info_section');
    const venueSection = sections.find(s => s.templateKey === 'venue_details_section');
    
    guestSectionId = guestSection?.id;
    venueSectionId = venueSection?.id;
    
    console.log(`Found sections: Guest (${guestSectionId}), Venue (${venueSectionId})`);
  } else {
    console.log('Failed to get sections, will use defaults');
    // Use some default IDs based on the order of creation
    guestSectionId = 1;
    venueSectionId = 2;
  }
  
  // 2. Add pages to corporate questionnaire
  const corporateId = questionnaireIds.corporateEventId;
  
  // Create guest info page
  const guestPageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addPage',
    data: {
      definitionId: corporateId,
      title: 'Guest Information',
      description: 'Tell us about yourself',
      order: 1
    }
  });
  
  console.log(`Added guest page: ${guestPageResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const guestPageId = guestPageResponse.data?.page?.id;
  
  // Create venue page
  const venuePageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addPage',
    data: {
      definitionId: corporateId,
      title: 'Venue Information',
      description: 'Tell us about the venue',
      order: 2
    }
  });
  
  console.log(`Added venue page: ${venuePageResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const venuePageId = venuePageResponse.data?.page?.id;
  
  // 3. Add sections to pages
  if (guestPageId && guestSectionId) {
    const addGuestSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: guestPageId,
        sectionId: guestSectionId,
        sectionOrder: 1
      }
    });
    
    console.log(`Added guest section to page: ${addGuestSectionResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  }
  
  if (venuePageId && venueSectionId) {
    const addVenueSectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: venuePageId,
        sectionId: venueSectionId,
        sectionOrder: 1
      }
    });
    
    console.log(`Added venue section to page: ${addVenueSectionResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  }
}

// Test creating conditional logic
async function testConditionalLogic() {
  console.log('\n--- Testing Conditional Logic ---');
  
  // 1. Get a question for condition (venue capacity)
  const questionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'listQuestions'
  });
  
  let capacityQuestionId = null;
  
  if (questionsResponse.data?.success) {
    const questions = questionsResponse.data.questions;
    const capacityQuestion = questions.find(q => q.text.includes('Number of Guests'));
    capacityQuestionId = capacityQuestion?.id;
    
    console.log(`Found capacity question: ID ${capacityQuestionId}`);
  } else {
    console.log('Failed to get questions, using default ID');
    capacityQuestionId = 3; // Guess based on creation order
  }
  
  if (!capacityQuestionId) {
    console.log('Cannot test conditional logic without question ID');
    return;
  }
  
  // 2. Create a new question that will be conditionally shown
  const cateringQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addQuestion',
    data: {
      componentTypeId: 12, // radio_group
      text: 'Do you need special catering options for large groups?',
      helpText: 'We offer special bulk catering options for large events',
      isRequired: false
    }
  });
  
  console.log(`Created catering question: ${cateringQuestionResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  const cateringQuestionId = cateringQuestionResponse.data?.question?.id;
  
  if (!cateringQuestionId) {
    console.log('Failed to create conditional question');
    return;
  }
  
  // 3. Add options to the radio group
  const addOptionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addQuestionOptions',
    data: {
      questionId: cateringQuestionId,
      options: [
        { optionText: 'Yes, need special catering', optionValue: 'yes', order: 1 },
        { optionText: 'No, standard catering is fine', optionValue: 'no', order: 2 }
      ]
    }
  });
  
  console.log(`Added options to question: ${addOptionsResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
  
  // 4. Create conditional logic to show catering question only for large groups
  const addLogicResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addConditionalLogic',
    data: {
      name: 'Show special catering for large groups',
      description: 'Only show special catering question when guest count > 50',
      targetType: 'question',
      targetId: cateringQuestionId,
      conditionType: 'greater_than',
      sourceType: 'question',
      sourceId: capacityQuestionId.toString(),
      conditionValue: 50,
      actionType: 'show',
      actionValue: true,
      isActive: true
    }
  });
  
  console.log(`Added conditional logic: ${addLogicResponse.data?.success ? 'SUCCESS' : 'FAILED'}`);
}

// Main test function
async function runFlexibleQuestionnaireTests() {
  try {
    console.log('Starting flexible questionnaire architecture tests...');
    
    // Log in to the system
    await login();
    
    // 1. Test component types 
    await testComponentTypes();
    
    // 2. Test section templates
    await testSections();
    
    // 3. Test questionnaire definitions
    const questionnaireIds = await testQuestionnaires();
    
    // 4. Test pages
    await testPages(questionnaireIds);
    
    // 5. Test conditional logic
    await testConditionalLogic();
    
    console.log('\nCompleted flexible questionnaire architecture tests!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runFlexibleQuestionnaireTests();