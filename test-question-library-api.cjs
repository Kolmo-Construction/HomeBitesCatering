const fetch = require('node-fetch');

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': global.cookie
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  const responseData = await response.json();
  
  return { status: response.status, data: responseData };
}

async function login() {
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    throw new Error('Login failed');
  }

  // Extract the cookie for session auth
  const cookie = loginResponse.headers.get('set-cookie');
  global.cookie = cookie;
  
  console.log('Login successful');
}

async function testLibraryQuestions() {
  console.log('\n--- Testing Question Library API ---');

  // 1. Create a text question
  console.log('\nCreating a text question...');
  const textQuestion = {
    libraryQuestionKey: 'text_question_1',
    defaultText: 'What is your name?',
    questionType: 'textbox',
    category: 'personal'
  };

  const createResponse = await makeRequest('POST', '/api/form-builder/library-questions', textQuestion);
  console.log(`Status: ${createResponse.status}`);
  console.log('Response:', createResponse.data);
  
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
  console.log('Response:', createMatrixResponse.data);
  
  const matrixQuestionId = createMatrixResponse.data.id;

  // 3. List questions
  console.log('\nListing all questions...');
  const listResponse = await makeRequest('GET', '/api/form-builder/library-questions');
  console.log(`Status: ${listResponse.status}`);
  console.log('Count:', listResponse.data.pagination.total);
  console.log('Questions:', listResponse.data.data.map(q => ({ id: q.id, key: q.library_question_key, type: q.question_type })));

  // 4. Get a single question (matrix with related data)
  console.log(`\nGetting matrix question details (ID: ${matrixQuestionId})...`);
  const getResponse = await makeRequest('GET', `/api/form-builder/library-questions/${matrixQuestionId}`);
  console.log(`Status: ${getResponse.status}`);
  console.log('Question text:', getResponse.data.default_text);
  console.log('Matrix rows count:', getResponse.data.matrixRows?.length);
  console.log('Matrix columns count:', getResponse.data.matrixColumns?.length);

  // 5. Update a question
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

  // 6. Delete a question
  console.log(`\nDeleting text question (ID: ${textQuestionId})...`);
  const deleteResponse = await makeRequest('DELETE', `/api/form-builder/library-questions/${textQuestionId}`);
  console.log(`Status: ${deleteResponse.status}`);
  console.log('Response:', deleteResponse.data);

  return {
    createdTextQuestionId: textQuestionId,
    createdMatrixQuestionId: matrixQuestionId
  };
}

async function runTests() {
  try {
    await login();
    const results = await testLibraryQuestions();
    console.log('\nTests completed successfully!');
    console.log('Created IDs:', results);
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

runTests();