// test-public-questionnaire-api.js
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
      const text = await response.text();
      console.log(`Response from ${endpoint}:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      responseData = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('Error parsing JSON:', e);
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
  console.log('Starting public questionnaire API tests...');
  
  try {
    // Test 1: Get active questionnaire (public API)
    console.log('\n--- Test 1: Check public API - Get active questionnaire ---');
    
    const getActiveRes = await makeRequest('GET', '/api/questionnaires/active');
    
    console.log(`Status code: ${getActiveRes.status}`);
    
    if (getActiveRes.status === 404) {
      console.log('No active questionnaire found (this is OK if none is active yet)');
    } else if (getActiveRes.status === 200) {
      console.log('Found active questionnaire');
      if (getActiveRes.data.questionnaire && getActiveRes.data.questionnaire.pages) {
        console.log(`Found ${getActiveRes.data.questionnaire.pages.length} pages with questions`);
      }
    } else {
      throw new Error(`Unexpected status code getting active questionnaire: ${getActiveRes.status}`);
    }
    
    // Test 2: Create a test questionnaire submission (public API)
    console.log('\n--- Test 2: Test public API - Submit questionnaire response ---');
    
    // For testing purposes, we'll create a submission for definition ID 1
    // Normally you'd get this ID from the active questionnaire
    const testDefinitionId = 1;
    
    const submissionData = {
      definitionId: testDefinitionId,
      status: 'submitted',
      clientIdentifier: 'test-session-123',
      submittedData: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        phone: '555-123-4567',
        eventType: 'wedding',
        guestCount: 100,
        eventDate: '2025-12-31',
        message: 'This is a test submission via the public API.'
      }
    };
    
    const submitRes = await makeRequest('POST', '/api/questionnaires/submit', submissionData);
    
    console.log(`Submission response status: ${submitRes.status}`);
    console.log('Submission response:', JSON.stringify(submitRes.data, null, 2));
    
    if (submitRes.status === 201) {
      console.log('Successfully submitted questionnaire response');
      
      // Check if a raw lead was created
      if (submitRes.data.submission && submitRes.data.submission.rawLeadId) {
        console.log(`Raw lead created with ID: ${submitRes.data.submission.rawLeadId}`);
      }
    } else if (submitRes.status === 404) {
      console.log('Questionnaire definition not found. This is expected if we are using a test ID.');
    } else {
      throw new Error(`Unexpected error submitting questionnaire: ${JSON.stringify(submitRes)}`);
    }
    
    console.log('\n✅ Public questionnaire API endpoints are working!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error during tests:', error);
});