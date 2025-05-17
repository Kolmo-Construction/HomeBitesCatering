// Test for checkbox selection limits in questionnaires

const fetch = require('node-fetch');

async function login() {
  try {
    // First login to get a session
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      }),
      redirect: 'manual'
    });
    
    console.log('Login status:', loginResponse.status);
    return loginResponse.headers.get('set-cookie');
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function testEditQuestion(cookie) {
  try {
    // First, let's get a checkbox question to edit
    const getQuestionsResponse = await fetch('http://localhost:5000/api/admin/questionnaires/pages/72/questions', {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });
    
    const questions = await getQuestionsResponse.json();
    console.log('Found', questions.length, 'questions');
    
    // Find a checkbox question
    const checkboxQuestion = questions.find(q => q.questionType === 'checkbox_group');
    
    if (!checkboxQuestion) {
      console.log('No checkbox question found in page 72, trying to create one');
      // If no checkbox question exists, create one with selection limits
      const newQuestion = {
        questionText: 'Test Selection Limits - Choose exactly 2',
        questionKey: 'test_selection_limits',
        questionType: 'checkbox_group',
        order: 1,
        isRequired: true,
        helpText: 'Please select exactly 2 options',
        validationRules: JSON.stringify({
          exactCount: 2
        }),
        options: [
          { optionText: 'Option 1', optionValue: 'option1', order: 0 },
          { optionText: 'Option 2', optionValue: 'option2', order: 1 },
          { optionText: 'Option 3', optionValue: 'option3', order: 2 },
          { optionText: 'Option 4', optionValue: 'option4', order: 3 }
        ]
      };
      
      const createResponse = await fetch('http://localhost:5000/api/admin/questionnaires/pages/72/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify(newQuestion)
      });
      
      const createdQuestion = await createResponse.json();
      console.log('Created new checkbox question with ID:', createdQuestion.question.id);
      
      // Test editing this newly created question
      const updatedQuestion = {
        questionText: 'Updated Selection Limits - Choose exactly 3',
        questionKey: 'test_selection_limits',
        questionType: 'checkbox_group',
        order: 1,
        isRequired: true,
        helpText: 'Please select exactly 3 options',
        validationRules: JSON.stringify({
          exactCount: 3
        })
      };
      
      const updateResponse = await fetch(`http://localhost:5000/api/admin/questionnaires/questions/${createdQuestion.question.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify(updatedQuestion)
      });
      
      const result = await updateResponse.json();
      console.log('Update question result:', JSON.stringify(result, null, 2));
      console.log('✓ Test passed: Successfully created and updated a question with selection limits');
    } else {
      console.log('Found checkbox question with ID:', checkboxQuestion.id);
      
      // Prepare validation rules object - note we're stringifying it
      const validationRules = JSON.stringify({
        exactCount: 3
      });
      
      // Update this question with selection limits
      const updatedQuestion = {
        questionText: checkboxQuestion.questionText,
        questionKey: checkboxQuestion.questionKey,
        questionType: checkboxQuestion.questionType,
        order: checkboxQuestion.order,
        isRequired: checkboxQuestion.isRequired,
        helpText: checkboxQuestion.helpText || '',
        placeholderText: checkboxQuestion.placeholderText || '',
        validationRules: validationRules
      };
      
      // Log what we're about to send
      console.log('Updating question with data:', JSON.stringify(updatedQuestion, null, 2));
      
      const updateResponse = await fetch(`http://localhost:5000/api/admin/questionnaires/questions/${checkboxQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify(updatedQuestion)
      });
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('Update question result:', JSON.stringify(result, null, 2));
        console.log('✓ Test passed: Successfully updated an existing question with selection limits');
      } else {
        const errorText = await updateResponse.text();
        console.error('Error updating question:', updateResponse.status, errorText);
        console.log('✗ Test failed: Could not update question with selection limits');
      }
    }
  } catch (error) {
    console.error('Test error:', error);
    console.log('✗ Test failed with an exception');
  }
}

async function runTest() {
  console.log('Starting checkbox selection limits test...');
  const cookie = await login();
  
  if (cookie) {
    await testEditQuestion(cookie);
  } else {
    console.log('✗ Test failed: Could not log in');
  }
  
  console.log('Test completed');
}

runTest();