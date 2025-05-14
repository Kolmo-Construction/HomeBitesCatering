// Script to test the communications API endpoints
import axios from 'axios';

// Configuration
const API_BASE = 'http://localhost:5000';
const USERNAME = 'admin';
const PASSWORD = 'password';

// Test data variables
let leadId = 2; // Update with an actual lead ID in your system
let clientId = 1; // Update with an actual client ID in your system
let communicationId1; // Will store the ID of the first test communication
let communicationId2; // Will store the ID of the second test communication

// Create axios instance with cookie support
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

// Helper for making authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: endpoint,
      data
    };
    
    const response = await api(config);
    return { status: response.status, data: response.data };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      return { status: error.response.status, data: error.response.data };
    } else {
      // Something happened in setting up the request
      console.error('Error making request:', error.message);
      throw error;
    }
  }
}

// Login to get a session cookie
async function login() {
  console.log('Attempting to login...');
  try {
    const response = await api.post('/api/auth/login', {
      username: USERNAME,
      password: PASSWORD
    });
    
    console.log('Login successful!', response.data);
    return true;
  } catch (error) {
    if (error.response) {
      console.error('Login failed:', error.response.data);
    } else {
      console.error('Login error:', error.message);
    }
    return false;
  }
}

// Run all test cases
async function runTests() {
  // First login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Login failed, cannot proceed with tests');
    return;
  }

  console.log('\n========== STARTING COMMUNICATIONS TESTS ==========\n');

  // Test Case COM-1: Create Communication for a Lead
  console.log('Test Case COM-1: Create Communication for a Lead');
  try {
    const com1Result = await makeRequest('POST', '/api/communications', {
      leadId,
      type: 'email',
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      subject: 'API Test Email',
      bodyRaw: 'This is a test email created through the API test',
      source: 'api_test'
    });
    
    console.log(`Status: ${com1Result.status}`);
    console.log('Response:', com1Result.data);
    
    if (com1Result.status === 201 && com1Result.data.id) {
      console.log('✅ Test COM-1 PASSED');
      communicationId1 = com1Result.data.id;
    } else {
      console.log('❌ Test COM-1 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-1:', error);
    console.log('❌ Test COM-1 FAILED');
  }
  
  // Test Case COM-2: Create Communication for a Client
  console.log('\nTest Case COM-2: Create Communication for a Client');
  try {
    const com2Result = await makeRequest('POST', '/api/communications', {
      clientId,
      type: 'call',
      direction: 'incoming',
      timestamp: new Date().toISOString(),
      durationMinutes: 15,
      bodyRaw: 'Client called about their upcoming event',
      source: 'api_test'
    });
    
    console.log(`Status: ${com2Result.status}`);
    console.log('Response:', com2Result.data);
    
    if (com2Result.status === 201 && com2Result.data.id) {
      console.log('✅ Test COM-2 PASSED');
      communicationId2 = com2Result.data.id;
    } else {
      console.log('❌ Test COM-2 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-2:', error);
    console.log('❌ Test COM-2 FAILED');
  }
  
  // Test Case COM-3: Attempt to Create Communication with Invalid Type
  console.log('\nTest Case COM-3: Attempt to Create Communication with Invalid Type');
  try {
    const com3Result = await makeRequest('POST', '/api/communications', {
      leadId,
      type: 'invalid_type', // Invalid enum value
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      bodyRaw: 'This should fail validation',
      source: 'api_test'
    });
    
    console.log(`Status: ${com3Result.status}`);
    console.log('Response:', com3Result.data);
    
    if (com3Result.status === 400) {
      console.log('✅ Test COM-3 PASSED');
    } else {
      console.log('❌ Test COM-3 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-3:', error);
    console.log('❌ Test COM-3 FAILED');
  }
  
  // Test Case COM-4: Get Communications for a Lead
  console.log('\nTest Case COM-4: Get Communications for a Lead');
  try {
    const com4Result = await makeRequest('GET', `/api/leads/${leadId}/communications`);
    
    console.log(`Status: ${com4Result.status}`);
    console.log('Response:', com4Result.data);
    
    if (com4Result.status === 200 && Array.isArray(com4Result.data)) {
      // Check if our created communication is in the results
      const foundCommunication = com4Result.data.find(com => com.id === communicationId1);
      if (foundCommunication) {
        console.log('✅ Test COM-4 PASSED');
      } else {
        console.log('❌ Test COM-4 FAILED - Created communication not found');
      }
    } else {
      console.log('❌ Test COM-4 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-4:', error);
    console.log('❌ Test COM-4 FAILED');
  }
  
  // Test Case COM-5: Get Communications for a Client
  console.log('\nTest Case COM-5: Get Communications for a Client');
  try {
    const com5Result = await makeRequest('GET', `/api/clients/${clientId}/communications`);
    
    console.log(`Status: ${com5Result.status}`);
    console.log('Response:', com5Result.data);
    
    if (com5Result.status === 200 && Array.isArray(com5Result.data)) {
      // Check if our created communication is in the results
      const foundCommunication = com5Result.data.find(com => com.id === communicationId2);
      if (foundCommunication) {
        console.log('✅ Test COM-5 PASSED');
      } else {
        console.log('❌ Test COM-5 FAILED - Created communication not found');
      }
    } else {
      console.log('❌ Test COM-5 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-5:', error);
    console.log('❌ Test COM-5 FAILED');
  }
  
  // Test Case COM-6: Test FindByContactIdentifier API
  console.log('\nTest Case COM-6: Test Finding Lead/Client by Contact');
  try {
    const com6Result = await makeRequest('POST', '/api/contacts/find', {
      value: 'pascal.matta@gmail.com', // Use a known email address from your database
      type: 'email'
    });
    
    console.log(`Status: ${com6Result.status}`);
    console.log('Response:', com6Result.data);
    
    if (com6Result.status === 200 && (com6Result.data.lead || com6Result.data.client)) {
      console.log('✅ Test COM-6 PASSED');
    } else {
      console.log('❌ Test COM-6 FAILED');
    }
  } catch (error) {
    console.error('Error in Test COM-6:', error);
    console.log('❌ Test COM-6 FAILED');
  }
  
  console.log('\n========== COMMUNICATIONS TESTS COMPLETED ==========\n');
}

// Execute the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});