// Test Questionnaire API Endpoints
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
let authCookie = null;
const debug = true;

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
  
  if (debug) {
    console.log(`Request: ${method} ${endpoint}`);
    console.log('Options:', JSON.stringify(options, null, 2));
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
      versionName: 'Test Questionnaire v1.0',
      description: 'A test questionnaire for API validation',
      isActive: true
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
    
    // ===== Question Management Tests =====
    if (createdPageId) {
      // Create a new page for testing questions
      console.log('\n=== Creating a test page for questions ===');
      const testPageData = {
        title: 'Question Test Page',
        order: 1
      };
      
      const testPageResponse = await makeRequest(
        'POST', 
        `/api/admin/questionnaires/definitions/${definitionId}/pages`, 
        testPageData
      );
      
      console.log(`Create Test Page Response (${testPageResponse.statusCode}):`, testPageResponse.data);
      
      let testPageId = null;
      if (testPageResponse.statusCode === 201 && testPageResponse.data && testPageResponse.data.id) {
        testPageId = testPageResponse.data.id;
        console.log(`Created test page with ID: ${testPageId}`);
        
        // 1. Test creating a simple question
        console.log('\n=== Test creating a simple question ===');
        const questionData = {
          questionText: 'What is your name?',
          questionKey: 'name',
          questionType: 'text',
          isRequired: true,
          order: 0,
          helpText: 'Please enter your full name'
        };
        
        // 1.1 Test creating a complex question with options
        console.log('\n=== Test creating a complex question with options ===');
        const complexQuestionData = {
          questionText: 'What is your preferred meal type?',
          questionKey: 'meal_preference',
          questionType: 'radio',
          isRequired: true,
          order: 1,
          helpText: 'Please select your preferred meal type',
          options: [
            {
              optionText: 'Vegetarian',
              optionValue: 'vegetarian',
              order: 0
            },
            {
              optionText: 'Vegan',
              optionValue: 'vegan',
              order: 1
            },
            {
              optionText: 'Meat',
              optionValue: 'meat',
              order: 2
            },
            {
              optionText: 'No Preference',
              optionValue: 'none',
              order: 3
            }
          ]
        };
        
        // 1.2 Test creating a matrix question
        console.log('\n=== Test creating a matrix question ===');
        const matrixQuestionData = {
          questionText: 'Rate the following aspects of our service:',
          questionKey: 'service_rating',
          questionType: 'matrix_single',
          isRequired: true,
          order: 2,
          helpText: 'Please rate each aspect from 1 to 5',
          options: [
            {
              optionText: 'Food Quality',
              optionValue: 'food_quality',
              order: 0
            },
            {
              optionText: 'Service Speed',
              optionValue: 'service_speed',
              order: 1
            },
            {
              optionText: 'Staff Friendliness',
              optionValue: 'staff_friendliness',
              order: 2
            }
          ],
          matrixColumns: [
            {
              columnText: '1 - Poor',
              columnValue: '1',
              order: 0
            },
            {
              columnText: '2 - Fair',
              columnValue: '2',
              order: 1
            },
            {
              columnText: '3 - Good',
              columnValue: '3',
              order: 2
            },
            {
              columnText: '4 - Very Good',
              columnValue: '4',
              order: 3
            },
            {
              columnText: '5 - Excellent',
              columnValue: '5',
              order: 4
            }
          ]
        };
        
        // Create simple question
        const createQuestionResponse = await makeRequest(
          'POST',
          `/api/admin/questionnaires/pages/${testPageId}/questions`,
          questionData
        );
        
        console.log(`Create Question Response (${createQuestionResponse.statusCode}):`, createQuestionResponse.data);
        
        let questionId = null;
        if (createQuestionResponse.statusCode === 201 && createQuestionResponse.data && createQuestionResponse.data.question && createQuestionResponse.data.question.id) {
          questionId = createQuestionResponse.data.question.id;
          console.log(`Created question with ID: ${questionId}`);
          
          // Now create complex question with options
          console.log('\n=== Creating a complex question with options ===');
          const createComplexQuestionResponse = await makeRequest(
            'POST',
            `/api/admin/questionnaires/pages/${testPageId}/questions`,
            complexQuestionData
          );
          
          console.log(`Create Complex Question Response (${createComplexQuestionResponse.statusCode}):`, createComplexQuestionResponse.data);
          
          // Now create matrix question
          console.log('\n=== Creating a matrix question ===');
          const createMatrixQuestionResponse = await makeRequest(
            'POST',
            `/api/admin/questionnaires/pages/${testPageId}/questions`,
            matrixQuestionData
          );
          
          console.log(`Create Matrix Question Response (${createMatrixQuestionResponse.statusCode}):`, createMatrixQuestionResponse.data);
          
          // 2. Test listing questions for a page
          console.log('\n=== Test listing questions for a page ===');
          const listQuestionsResponse = await makeRequest(
            'GET',
            `/api/admin/questionnaires/pages/${testPageId}/questions`
          );
          
          console.log(`List Questions Response (${listQuestionsResponse.statusCode}):`, listQuestionsResponse.data);
          
          // 3. Test getting a specific question
          console.log('\n=== Test getting a specific question ===');
          const getQuestionResponse = await makeRequest(
            'GET',
            `/api/admin/questionnaires/questions/${questionId}`
          );
          
          console.log(`Get Question Response (${getQuestionResponse.statusCode}):`, getQuestionResponse.data);
          
          // 4. Test updating a question
          console.log('\n=== Test updating a question ===');
          const updateQuestionData = {
            questionText: 'What is your full name?',
            helpText: 'Please enter your first and last name',
            isRequired: true
          };
          
          const updateQuestionResponse = await makeRequest(
            'PUT',
            `/api/admin/questionnaires/questions/${questionId}`,
            updateQuestionData
          );
          
          console.log(`Update Question Response (${updateQuestionResponse.statusCode}):`, updateQuestionResponse.data);
          
          // 5. Test creating a second question for reordering
          console.log('\n=== Test creating a second question for reordering ===');
          const question2Data = {
            questionText: 'What is your email address?',
            questionKey: 'email',
            questionType: 'email',
            isRequired: true,
            order: 1,
            helpText: 'Please enter a valid email'
          };
          
          const createQuestion2Response = await makeRequest(
            'POST',
            `/api/admin/questionnaires/pages/${testPageId}/questions`,
            question2Data
          );
          
          console.log(`Create Second Question Response (${createQuestion2Response.statusCode}):`, createQuestion2Response.data);
          
          let question2Id = null;
          if (createQuestion2Response.statusCode === 201 && createQuestion2Response.data && createQuestion2Response.data.id) {
            question2Id = createQuestion2Response.data.id;
            console.log(`Created second question with ID: ${question2Id}`);
            
            // 6. Test reordering questions
            console.log('\n=== Test reordering questions ===');
            const reorderQuestionsData = {
              questionIds: [question2Id, questionId] // Reverse the order
            };
            
            const reorderQuestionsResponse = await makeRequest(
              'PATCH',
              `/api/admin/questionnaires/pages/${testPageId}/questions/reorder`,
              reorderQuestionsData
            );
            
            console.log(`Reorder Questions Response (${reorderQuestionsResponse.statusCode}):`, reorderQuestionsResponse.data);
          }
          
          // ===== Question Options Tests =====
          
          // Create a multiple choice question for testing options
          console.log('\n=== Test creating a multiple choice question ===');
          const multiChoiceQuestionData = {
            questionText: 'What is your preferred contact method?',
            questionKey: 'contact_preference',
            questionType: 'select',
            isRequired: true,
            order: 2,
            helpText: 'Please select your preferred contact method'
          };
          
          const createMultiChoiceResponse = await makeRequest(
            'POST',
            `/api/admin/questionnaires/pages/${testPageId}/questions`,
            multiChoiceQuestionData
          );
          
          console.log(`Create Multi-Choice Question Response (${createMultiChoiceResponse.statusCode}):`, createMultiChoiceResponse.data);
          
          let multiChoiceQuestionId = null;
          if (createMultiChoiceResponse.statusCode === 201 && createMultiChoiceResponse.data && createMultiChoiceResponse.data.id) {
            multiChoiceQuestionId = createMultiChoiceResponse.data.id;
            console.log(`Created multi-choice question with ID: ${multiChoiceQuestionId}`);
            
            // 1. Test creating options for the multi-choice question
            console.log('\n=== Test creating an option ===');
            const optionData = {
              label: 'Email',
              value: 'email',
              order: 0
            };
            
            const createOptionResponse = await makeRequest(
              'POST',
              `/api/admin/questionnaires/questions/${multiChoiceQuestionId}/options`,
              optionData
            );
            
            console.log(`Create Option Response (${createOptionResponse.statusCode}):`, createOptionResponse.data);
            
            let optionId = null;
            if (createOptionResponse.statusCode === 201 && createOptionResponse.data && createOptionResponse.data.id) {
              optionId = createOptionResponse.data.id;
              console.log(`Created option with ID: ${optionId}`);
              
              // Create a second option
              console.log('\n=== Test creating a second option ===');
              const option2Data = {
                label: 'Phone',
                value: 'phone',
                order: 1
              };
              
              const createOption2Response = await makeRequest(
                'POST',
                `/api/admin/questionnaires/questions/${multiChoiceQuestionId}/options`,
                option2Data
              );
              
              console.log(`Create Second Option Response (${createOption2Response.statusCode}):`, createOption2Response.data);
              
              let option2Id = null;
              if (createOption2Response.statusCode === 201 && createOption2Response.data && createOption2Response.data.id) {
                option2Id = createOption2Response.data.id;
                console.log(`Created second option with ID: ${option2Id}`);
              }
              
              // 2. Test listing options for a question
              console.log('\n=== Test listing options for a question ===');
              const listOptionsResponse = await makeRequest(
                'GET',
                `/api/admin/questionnaires/questions/${multiChoiceQuestionId}/options`
              );
              
              console.log(`List Options Response (${listOptionsResponse.statusCode}):`, listOptionsResponse.data);
              
              // 3. Test updating an option
              console.log('\n=== Test updating an option ===');
              const updateOptionData = {
                label: 'Email Address',
                value: 'email_address'
              };
              
              const updateOptionResponse = await makeRequest(
                'PUT',
                `/api/admin/questionnaires/options/${optionId}`,
                updateOptionData
              );
              
              console.log(`Update Option Response (${updateOptionResponse.statusCode}):`, updateOptionResponse.data);
              
              // 4. Test deleting an option
              console.log('\n=== Test deleting an option ===');
              const deleteOptionResponse = await makeRequest(
                'DELETE',
                `/api/admin/questionnaires/options/${optionId}`
              );
              
              console.log(`Delete Option Response (${deleteOptionResponse.statusCode}):`, deleteOptionResponse.data);
              
              // Delete the second option if it was created
              if (option2Id) {
                console.log('\n=== Test deleting the second option ===');
                const deleteOption2Response = await makeRequest(
                  'DELETE',
                  `/api/admin/questionnaires/options/${option2Id}`
                );
                
                console.log(`Delete Second Option Response (${deleteOption2Response.statusCode}):`, deleteOption2Response.data);
              }
            }
          }
          
          // Delete questions in reverse order of creation
          if (multiChoiceQuestionId) {
            console.log('\n=== Test deleting multi-choice question ===');
            const deleteMultiChoiceResponse = await makeRequest(
              'DELETE',
              `/api/admin/questionnaires/questions/${multiChoiceQuestionId}`
            );
            
            console.log(`Delete Multi-Choice Question Response (${deleteMultiChoiceResponse.statusCode}):`, deleteMultiChoiceResponse.data);
          }
          
          if (question2Id) {
            console.log('\n=== Test deleting second question ===');
            const deleteQuestion2Response = await makeRequest(
              'DELETE',
              `/api/admin/questionnaires/questions/${question2Id}`
            );
            
            console.log(`Delete Second Question Response (${deleteQuestion2Response.statusCode}):`, deleteQuestion2Response.data);
          }
          
          console.log('\n=== Test deleting first question ===');
          const deleteQuestionResponse = await makeRequest(
            'DELETE',
            `/api/admin/questionnaires/questions/${questionId}`
          );
          
          console.log(`Delete Question Response (${deleteQuestionResponse.statusCode}):`, deleteQuestionResponse.data);
        }
        
        // Clean up test page
        console.log('\n=== Cleaning up test page ===');
        const deleteTestPageResponse = await makeRequest(
          'DELETE',
          `/api/admin/questionnaires/definitions/${definitionId}/pages/${testPageId}`
        );
        
        console.log(`Delete Test Page Response (${deleteTestPageResponse.statusCode}):`, deleteTestPageResponse.data);
      }
    }

    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the tests
runTests();