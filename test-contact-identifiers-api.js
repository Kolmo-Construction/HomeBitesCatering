// Script to test the contact identifiers API endpoints
import axios from 'axios';

// Configuration
const API_BASE = 'http://localhost:5000';
const USERNAME = 'admin';
const PASSWORD = 'password';

// Test data variables
let leadId = 2; // Update with an actual lead ID in your system
let clientId = 1; // Update with an actual client ID in your system
let contactIdentifierId1; // Will store the ID of the first test contact identifier
let contactIdentifierId2; // Will store the ID of the second test contact identifier

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

  console.log('\n========== STARTING TESTS ==========\n');

  // Test Case CI-1: Create Contact Identifier for a Lead
  console.log('Test Case CI-1: Create Contact Identifier for a Lead');
  try {
    const ci1Result = await makeRequest('POST', '/api/contact-identifiers', {
      leadId,
      type: 'email',
      value: 'testlead@example.com',
      isPrimary: true,
      source: 'manual_test'
    });
    
    console.log(`Status: ${ci1Result.status}`);
    console.log('Response:', ci1Result.data);
    
    if (ci1Result.status === 201 && ci1Result.data.id) {
      console.log('✅ Test CI-1 PASSED');
      contactIdentifierId1 = ci1Result.data.id;
    } else {
      console.log('❌ Test CI-1 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-1:', error);
    console.log('❌ Test CI-1 FAILED');
  }
  
  // Test Case CI-2: Create Contact Identifier for a Client
  console.log('\nTest Case CI-2: Create Contact Identifier for a Client');
  try {
    const ci2Result = await makeRequest('POST', '/api/contact-identifiers', {
      clientId,
      type: 'phone',
      value: '123-456-7890',
      isPrimary: false,
      source: 'manual_test'
    });
    
    console.log(`Status: ${ci2Result.status}`);
    console.log('Response:', ci2Result.data);
    
    if (ci2Result.status === 201 && ci2Result.data.id) {
      console.log('✅ Test CI-2 PASSED');
      contactIdentifierId2 = ci2Result.data.id;
    } else {
      console.log('❌ Test CI-2 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-2:', error);
    console.log('❌ Test CI-2 FAILED');
  }
  
  // Test Case CI-3: Attempt to Create Identifier without leadId or clientId
  console.log('\nTest Case CI-3: Attempt to Create Identifier without leadId or clientId');
  try {
    const ci3Result = await makeRequest('POST', '/api/contact-identifiers', {
      type: 'email',
      value: 'nocontact@example.com',
      source: 'manual_test'
    });
    
    console.log(`Status: ${ci3Result.status}`);
    console.log('Response:', ci3Result.data);
    
    if (ci3Result.status === 400 && ci3Result.data.message === 'Either leadId or clientId must be provided.') {
      console.log('✅ Test CI-3 PASSED');
    } else {
      console.log('❌ Test CI-3 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-3:', error);
    console.log('❌ Test CI-3 FAILED');
  }
  
  // Test Case CI-4: Attempt to Create Identifier with invalid type
  console.log('\nTest Case CI-4: Attempt to Create Identifier with invalid type');
  try {
    const ci4Result = await makeRequest('POST', '/api/contact-identifiers', {
      leadId,
      type: 'fax', // Invalid enum value
      value: 'invalidtype@example.com',
      source: 'manual_test'
    });
    
    console.log(`Status: ${ci4Result.status}`);
    console.log('Response:', ci4Result.data);
    
    if (ci4Result.status === 400) {
      console.log('✅ Test CI-4 PASSED');
    } else {
      console.log('❌ Test CI-4 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-4:', error);
    console.log('❌ Test CI-4 FAILED');
  }
  
  // Test Case CI-5: Get Contact Identifiers for a Lead
  console.log('\nTest Case CI-5: Get Contact Identifiers for a Lead');
  try {
    const ci5Result = await makeRequest('GET', `/api/leads/${leadId}/contact-identifiers`);
    
    console.log(`Status: ${ci5Result.status}`);
    console.log('Response:', ci5Result.data);
    
    if (ci5Result.status === 200 && Array.isArray(ci5Result.data)) {
      // Check if our created identifier is in the results
      const foundIdentifier = ci5Result.data.find(ci => ci.id === contactIdentifierId1);
      if (foundIdentifier) {
        console.log('✅ Test CI-5 PASSED');
      } else {
        console.log('❌ Test CI-5 FAILED - Created identifier not found');
      }
    } else {
      console.log('❌ Test CI-5 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-5:', error);
    console.log('❌ Test CI-5 FAILED');
  }
  
  // Test Case CI-6: Get Contact Identifiers for a Client
  console.log('\nTest Case CI-6: Get Contact Identifiers for a Client');
  try {
    const ci6Result = await makeRequest('GET', `/api/clients/${clientId}/contact-identifiers`);
    
    console.log(`Status: ${ci6Result.status}`);
    console.log('Response:', ci6Result.data);
    
    if (ci6Result.status === 200 && Array.isArray(ci6Result.data)) {
      // Check if our created identifier is in the results
      const foundIdentifier = ci6Result.data.find(ci => ci.id === contactIdentifierId2);
      if (foundIdentifier) {
        console.log('✅ Test CI-6 PASSED');
      } else {
        console.log('❌ Test CI-6 FAILED - Created identifier not found');
      }
    } else {
      console.log('❌ Test CI-6 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-6:', error);
    console.log('❌ Test CI-6 FAILED');
  }
  
  // Test Case CI-7: Delete Contact Identifier
  console.log('\nTest Case CI-7: Delete Contact Identifier');
  try {
    if (!contactIdentifierId1) {
      console.log('❌ Test CI-7 SKIPPED - No identifier ID available from previous tests');
      return;
    }
    
    const ci7Result = await makeRequest('DELETE', `/api/contact-identifiers/${contactIdentifierId1}`);
    
    console.log(`Status: ${ci7Result.status}`);
    
    if (ci7Result.status === 204) {
      // Verify it's deleted by trying to get lead identifiers again
      const verifyResult = await makeRequest('GET', `/api/leads/${leadId}/contact-identifiers`);
      
      if (verifyResult.status === 200) {
        const identifierStillExists = verifyResult.data.some(ci => ci.id === contactIdentifierId1);
        
        if (!identifierStillExists) {
          console.log('✅ Test CI-7 PASSED');
        } else {
          console.log('❌ Test CI-7 FAILED - Identifier still exists after deletion');
        }
      } else {
        console.log('❌ Test CI-7 FAILED - Could not verify deletion');
      }
    } else {
      console.log('❌ Test CI-7 FAILED');
    }
  } catch (error) {
    console.error('Error in Test CI-7:', error);
    console.log('❌ Test CI-7 FAILED');
  }
  
  console.log('\n========== TESTS COMPLETED ==========\n');
}

// Execute the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});