const http = require('http');

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (global.cookie) {
      options.headers['Cookie'] = global.cookie;
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        // Store cookie if it's a login response
        if (res.headers['set-cookie']) {
          global.cookie = res.headers['set-cookie'][0];
        }

        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonResponse, headers: res.headers });
        } catch (err) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Login function
async function login() {
  console.log('Logging in...');
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };

  const response = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (response.status !== 200 && response.status !== 204) {
    throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  console.log('Login successful');
}

// Test function for question library API
async function testQuestionLibraryAPI() {
  console.log('\n--- Testing Question Library API ---');

  try {
    // Generate a unique timestamp key suffix
    const timestamp = Date.now();
    
    // 1. Create a text question
    console.log('\nCreating a text question...');
    const textQuestion = {
      libraryQuestionKey: `text_question_${timestamp}`,
      defaultText: 'What is your name?',
      questionType: 'textbox',
      category: 'personal'
    };

    const createResponse = await makeRequest('POST', '/api/form-builder/library-questions', textQuestion);
    console.log(`Status: ${createResponse.status}`);
    console.log('Response:', createResponse.data);
    
    if (createResponse.status !== 201) {
      console.error('Failed to create text question');
      return;
    }
    
    const textQuestionId = createResponse.data.id;

    // 2. Create a matrix question
    console.log('\nCreating a matrix question...');
    const matrixQuestion = {
      libraryQuestionKey: 'matrix_question_1',
      defaultText: 'Please rate our services:',
      questionType: 'matrix',
      category: 'feedback',
      matrixRows: [
        { rowKey: 'service', label: 'Customer Service', rowOrder: 0 },
        { rowKey: 'quality', label: 'Product Quality', rowOrder: 1 },
        { rowKey: 'price', label: 'Pricing', rowOrder: 2 }
      ],
      matrixColumns: [
        { columnKey: 'poor', header: 'Poor', cellInputType: 'radio', columnOrder: 0 },
        { columnKey: 'fair', header: 'Fair', cellInputType: 'radio', columnOrder: 1 },
        { columnKey: 'good', header: 'Good', cellInputType: 'radio', columnOrder: 2 },
        { columnKey: 'excellent', header: 'Excellent', cellInputType: 'radio', columnOrder: 3 }
      ]
    };

    const createMatrixResponse = await makeRequest('POST', '/api/form-builder/library-questions', matrixQuestion);
    console.log(`Status: ${createMatrixResponse.status}`);
    console.log('Response:', JSON.stringify(createMatrixResponse.data, null, 2));
    
    if (createMatrixResponse.status !== 201) {
      console.error('Failed to create matrix question');
      return;
    }
    
    const matrixQuestionId = createMatrixResponse.data.id;

    // 3. List all questions
    console.log('\nListing all questions...');
    const listResponse = await makeRequest('GET', '/api/form-builder/library-questions');
    console.log(`Status: ${listResponse.status}`);
    if (listResponse.status === 200) {
      console.log('Count:', listResponse.data.pagination.total);
      console.log('Questions:', listResponse.data.data.map(q => ({ 
        id: q.id, 
        key: q.library_question_key, 
        type: q.question_type 
      })));
    } else {
      console.error('Failed to list questions');
    }

    // 4. Get a matrix question details
    console.log(`\nGetting matrix question details (ID: ${matrixQuestionId})...`);
    const getResponse = await makeRequest('GET', `/api/form-builder/library-questions/${matrixQuestionId}`);
    console.log(`Status: ${getResponse.status}`);
    
    if (getResponse.status === 200) {
      console.log('Question text:', getResponse.data.default_text);
      console.log('Matrix rows count:', getResponse.data.matrixRows?.length);
      console.log('Matrix columns count:', getResponse.data.matrixColumns?.length);
    } else {
      console.error('Failed to get matrix question details');
    }

    // 5. Update the text question
    console.log(`\nUpdating text question (ID: ${textQuestionId})...`);
    const updateData = {
      libraryQuestionKey: 'text_question_1_updated',
      defaultText: 'What is your full name?',
      questionType: 'textbox',
      category: 'personal',
      defaultOptions: { required: true, placeholder: 'Enter your full name' }
    };

    const updateResponse = await makeRequest('PUT', `/api/form-builder/library-questions/${textQuestionId}`, updateData);
    console.log(`Status: ${updateResponse.status}`);
    console.log('Updated question:', updateResponse.data);

    // 6. Delete the text question
    console.log(`\nDeleting text question (ID: ${textQuestionId})...`);
    const deleteResponse = await makeRequest('DELETE', `/api/form-builder/library-questions/${textQuestionId}`);
    console.log(`Status: ${deleteResponse.status}`);
    console.log('Response:', deleteResponse.data);

    console.log('\nTests completed successfully!');
    
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the tests
async function runTests() {
  try {
    await login();
    await testQuestionLibraryAPI();
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTests();