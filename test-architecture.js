// Simple test script for the flexible questionnaire architecture
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fetch from 'node-fetch';

// Configure neon client
neonConfig.webSocketConstructor = ws;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Login and get auth cookie
async function login() {
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    };
    
    const response = await fetch(`http://localhost:5000/api/auth/login`, options);
    
    if (response.status === 200) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('Successfully logged in');
        return setCookieHeader;
      }
    }
    
    console.error('Login failed:', await response.json());
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, cookie = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (cookie) {
      options.headers.Cookie = cookie;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`http://localhost:5000${endpoint}`, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    return {
      status: 500,
      data: { error: error.message }
    };
  }
}

// Test creating component types
async function testComponentTypes(authCookie) {
  console.log('\n--- Testing Component Types ---');
  
  // Create a custom component type
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'registerComponentType',
    data: {
      typeKey: 'rating_slider',
      componentCategory: 'question',
      displayName: 'Rating Slider',
      description: 'Slider for rating on a scale',
      configSchema: { 
        type: 'object', 
        properties: {
          min: { type: 'number', default: 1 },
          max: { type: 'number', default: 10 },
          step: { type: 'number', default: 1 }
        }
      },
      isActive: true
    }
  }, authCookie);
  
  console.log(`Component type registration: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log('Component type created:', response.data.componentType);
  }
  
  // List component types
  const listResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'listComponentTypes'
  }, authCookie);
  
  if (listResponse.status === 200) {
    console.log(`Retrieved ${listResponse.data.componentTypes.length} component types`);
    listResponse.data.componentTypes.forEach(type => {
      console.log(`- ${type.displayName}: ${type.description}`);
    });
  } else {
    console.log('Failed to list component types:', listResponse.data);
  }
}

// Test creating a questionnaire definition
async function testQuestionnaireDefinition(authCookie) {
  console.log('\n--- Testing Questionnaire Definition ---');
  
  // Create a corporate event questionnaire definition
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createDefinition',
    data: {
      name: 'Corporate Event Questionnaire',
      description: 'Questionnaire for corporate event catering',
      versionName: 'v1.0',
      eventType: 'corporate',
      isActive: true,
      isPublished: false
    }
  }, authCookie);
  
  console.log(`Questionnaire definition creation: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log('Questionnaire definition created:', response.data.definition);
    return response.data.definition.id;
  }
  
  return null;
}

// Test creating sections
async function testSections(authCookie) {
  console.log('\n--- Testing Sections ---');
  
  // Create a contact information section
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createSection',
    data: {
      title: 'Contact Information',
      description: 'Basic contact details for the event organizer',
      templateKey: 'contact_info_section_' + Date.now() // Add timestamp to avoid conflicts
    }
  }, authCookie);
  
  console.log(`Section creation: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log('Section created:', response.data.section);
    return response.data.section.id;
  }
  
  return null;
}

// Test adding questions to a section
async function testSectionQuestions(sectionId, authCookie) {
  if (!sectionId) {
    console.log('Cannot test section questions without a section ID');
    return;
  }
  
  console.log('\n--- Testing Section Questions ---');
  
  // Add questions to the section
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionQuestions',
    data: {
      sectionId,
      questions: [
        {
          componentTypeId: 1, // Using a default component type ID
          text: 'Name of the Contact Person',
          helpText: 'Full name of the primary contact',
          isRequired: true,
          questionOrder: 1,
          questionKey: 'contact_name'
        },
        {
          componentTypeId: 1, // Using a default component type ID
          text: 'Email Address',
          helpText: 'We will send confirmation details to this email',
          isRequired: true,
          questionOrder: 2,
          questionKey: 'contact_email'
        }
      ]
    }
  }, authCookie);
  
  console.log(`Adding questions to section: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log(`Added ${response.data.questions.length} questions to section`);
  }
}

// Test adding pages to a questionnaire
async function testPages(definitionId, authCookie) {
  if (!definitionId) {
    console.log('Cannot test pages without a definition ID');
    return;
  }
  
  console.log('\n--- Testing Pages ---');
  
  // Add a page to the questionnaire
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addPage',
    data: {
      definitionId,
      title: 'Event Details',
      description: 'Information about the event',
      order: 1
    }
  }, authCookie);
  
  console.log(`Page creation: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log('Page created:', response.data.page);
    return response.data.page.id;
  }
  
  return null;
}

// Test adding a section to a page
async function testPageSections(pageId, sectionId, authCookie) {
  if (!pageId || !sectionId) {
    console.log('Cannot test page sections without page and section IDs');
    return;
  }
  
  console.log('\n--- Testing Page Sections ---');
  
  // Add the section to the page
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionToPage',
    data: {
      pageId,
      sectionId,
      sectionOrder: 1
    }
  }, authCookie);
  
  console.log(`Adding section to page: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
  if (response.status !== 201) {
    console.log('Error:', response.data);
  } else {
    console.log('Section added to page:', response.data.pageSection);
  }
}

// Main test function
async function runTest() {
  try {
    console.log('Starting flexible questionnaire architecture test...');
    
    // Login first
    const authCookie = await login();
    if (!authCookie) {
      console.error('Authentication failed, cannot continue tests');
      return;
    }
    
    // Test component types
    await testComponentTypes(authCookie);
    
    // Test questionnaire definition
    const definitionId = await testQuestionnaireDefinition(authCookie);
    
    // Test sections
    const sectionId = await testSections(authCookie);
    
    // Test section questions
    await testSectionQuestions(sectionId, authCookie);
    
    // Test pages
    const pageId = await testPages(definitionId, authCookie);
    
    // Test page sections
    await testPageSections(pageId, sectionId, authCookie);
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

runTest();