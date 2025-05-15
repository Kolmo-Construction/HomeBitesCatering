// Test Questionnaire API Endpoints
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie || ''
    }
  };

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
  
  if (response.statusCode === 200 && response.headers.get('set-cookie')) {
    authCookie = response.headers.get('set-cookie');
    console.log('Successfully logged in');
    return true;
  } else {
    console.error('Login failed:', response.data);
    return false;
  }
}

// Test function to run all tests
async function runTests() {
  try {
    // First login to get authenticated
    const isLoggedIn = await login();
    if (!isLoggedIn) {
      console.error('Authentication failed. Tests cannot continue.');
      return;
    }

    // 1. Create a test questionnaire definition first (we need a definition to add pages to)
    console.log('\n=== Creating a test questionnaire definition ===');
    const definitionData = {
      title: 'Test Questionnaire',
      description: 'A test questionnaire for API validation',
      status: 'draft',
      version: '1.0'
    };

    const definitionResponse = await makeRequest(
      'POST',
      '/api/admin/questionnaires/definitions',
      definitionData
    );
    
    console.log(`Create Definition Response (${definitionResponse.statusCode}):`, definitionResponse.data);
    
    // Get the definition ID from the response
    let definitionId;
    if (definitionResponse.statusCode === 201 && definitionResponse.data && definitionResponse.data.id) {
      definitionId = definitionResponse.data.id;
      console.log(`Created definition with ID: ${definitionId}`);
    } else {
      // Fall back to using ID 1 if creation fails
      definitionId = 1;
      console.log(`Failed to create definition, using fallback ID: ${definitionId} for testing`);
    }

    // 2. Test creating a page
    console.log('\n=== Test creating a page ===');
    const pageData = {
      title: 'Test Page 1',
      order: 0
    };
    
    const createResponse = await makeRequest(
      'POST', 
      `/api/admin/questionnaires/definitions/${definitionId}/pages`, 
      pageData
    );
    
    console.log(`Create Page Response (${createResponse.statusCode}):`, createResponse.data);
    
    // Store the created page ID for future tests, if successful
    let createdPageId = null;
    if (createResponse.statusCode === 201 && createResponse.data && createResponse.data.id) {
      createdPageId = createResponse.data.id;
      console.log(`Created page with ID: ${createdPageId}`);
    }

    // 3. Test listing pages
    console.log('\n=== Test listing pages ===');
    const listResponse = await makeRequest(
      'GET',
      `/api/admin/questionnaires/definitions/${definitionId}/pages`
    );
    
    console.log(`List Pages Response (${listResponse.statusCode}):`, listResponse.data);

    // 4. Test getting a specific page
    if (createdPageId) {
      console.log('\n=== Test getting a specific page ===');
      const getResponse = await makeRequest(
        'GET',
        `/api/admin/questionnaires/definitions/${definitionId}/pages/${createdPageId}`
      );
      
      console.log(`Get Page Response (${getResponse.statusCode}):`, getResponse.data);
    
      // 5. Test updating a page
      console.log('\n=== Test updating a page ===');
      const updateData = {
        title: 'Updated Test Page 1',
        order: 1
      };
      
      const updateResponse = await makeRequest(
        'PUT',
        `/api/admin/questionnaires/definitions/${definitionId}/pages/${createdPageId}`,
        updateData
      );
      
      console.log(`Update Page Response (${updateResponse.statusCode}):`, updateResponse.data);
      
      // 6. Test reordering pages
      // First, create another page to have something to reorder
      console.log('\n=== Creating a second test page ===');
      const page2Data = {
        title: 'Test Page 2',
        order: 2
      };
      
      const create2Response = await makeRequest(
        'POST', 
        `/api/admin/questionnaires/definitions/${definitionId}/pages`, 
        page2Data
      );
      
      console.log(`Create Second Page Response (${create2Response.statusCode}):`, create2Response.data);
      
      // Get the ID of the second page if created successfully
      let secondPageId = null;
      if (create2Response.statusCode === 201 && create2Response.data && create2Response.data.id) {
        secondPageId = create2Response.data.id;
        console.log(`Created second page with ID: ${secondPageId}`);
        
        // Now test the reordering
        console.log('\n=== Test reordering pages ===');
        const reorderData = {
          pageIds: [secondPageId, createdPageId] // Reverse the order
        };
        
        const reorderResponse = await makeRequest(
          'PATCH',
          `/api/admin/questionnaires/definitions/${definitionId}/pages/reorder`,
          reorderData
        );
        
        console.log(`Reorder Pages Response (${reorderResponse.statusCode}):`, reorderResponse.data);
      }
      
      // 7. Test deleting a page
      console.log('\n=== Test deleting a page ===');
      const deleteResponse = await makeRequest(
        'DELETE',
        `/api/admin/questionnaires/definitions/${definitionId}/pages/${createdPageId}`
      );
      
      console.log(`Delete Page Response (${deleteResponse.statusCode}):`, deleteResponse.data);
      
      // Delete the second page too if it was created
      if (secondPageId) {
        console.log('\n=== Test deleting the second page ===');
        const delete2Response = await makeRequest(
          'DELETE',
          `/api/admin/questionnaires/definitions/${definitionId}/pages/${secondPageId}`
        );
        
        console.log(`Delete Second Page Response (${delete2Response.statusCode}):`, delete2Response.data);
      }
    }
    
    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the tests
runTests();