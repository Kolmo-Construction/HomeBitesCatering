// ES Module format test for checkbox selection limits

import fetch from 'node-fetch';

async function login() {
  try {
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin@example.com',
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
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Error creating question:', createResponse.status, errorText);
        console.log('✗ Test failed: Could not create question with selection limits');
        return;
      }
      
      const createdQuestion = await createResponse.json();
      console.log('Created new checkbox question with ID:', createdQuestion.question.id);
      
      // Test getting the newly created question to verify validation rules are saved
      const getCreatedQuestionResponse = await fetch(`http://localhost:5000/api/admin/questionnaires/questions/${createdQuestion.question.id}`, {
        method: 'GET',
        headers: {
          'Cookie': cookie
        }
      });
      
      if (!getCreatedQuestionResponse.ok) {
        console.error('Error getting created question:', getCreatedQuestionResponse.status);
        console.log('✗ Test failed: Could not verify created question');
        return;
      }
      
      const retrievedQuestion = await getCreatedQuestionResponse.json();
      console.log('Retrieved question validation rules:', retrievedQuestion.validationRules);
      
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
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error updating question:', updateResponse.status, errorText);
        console.log('✗ Test failed: Could not update question with selection limits');
        return;
      }
      
      const result = await updateResponse.json();
      console.log('Update question result:', JSON.stringify(result, null, 2));
      
      // Verify the updated question has the new validation rules
      const getUpdatedQuestionResponse = await fetch(`http://localhost:5000/api/admin/questionnaires/questions/${createdQuestion.question.id}`, {
        method: 'GET',
        headers: {
          'Cookie': cookie
        }
      });
      
      if (!getUpdatedQuestionResponse.ok) {
        console.error('Error getting updated question:', getUpdatedQuestionResponse.status);
        console.log('✗ Test failed: Could not verify updated question');
        return;
      }
      
      const updatedRetrievedQuestion = await getUpdatedQuestionResponse.json();
      console.log('Updated question validation rules:', updatedRetrievedQuestion.validationRules);
      
      // Verify the validation rules were properly updated
      let parsedRules;
      try {
        if (typeof updatedRetrievedQuestion.validationRules === 'string') {
          parsedRules = JSON.parse(updatedRetrievedQuestion.validationRules);
        } else {
          parsedRules = updatedRetrievedQuestion.validationRules;
        }
        
        if (parsedRules.exactCount === 3) {
          console.log('✓ Test passed: Successfully created and updated a question with selection limits');
        } else {
          console.log('✗ Test failed: Validation rules were not correctly updated. Expected exactCount: 3, but got:', parsedRules.exactCount);
        }
      } catch (e) {
        console.error('Error parsing validation rules:', e);
        console.log('✗ Test failed: Could not parse validation rules');
      }
    } else {
      console.log('Found checkbox question with ID:', checkboxQuestion.id);
      console.log('Current validation rules:', checkboxQuestion.validationRules);
      
      // Prepare validation rules object
      const validationRules = JSON.stringify({
        exactCount: 4  // Change this value to test updating
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
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Error updating question:', updateResponse.status, errorText);
        console.log('✗ Test failed: Could not update question with selection limits');
        return;
      }
      
      const result = await updateResponse.json();
      console.log('Update question result:', JSON.stringify(result, null, 2));
      
      // Verify the updated question has the new validation rules
      const getUpdatedQuestionResponse = await fetch(`http://localhost:5000/api/admin/questionnaires/questions/${checkboxQuestion.id}`, {
        method: 'GET',
        headers: {
          'Cookie': cookie
        }
      });
      
      if (!getUpdatedQuestionResponse.ok) {
        console.error('Error getting updated question:', getUpdatedQuestionResponse.status);
        console.log('✗ Test failed: Could not verify updated question');
        return;
      }
      
      const updatedRetrievedQuestion = await getUpdatedQuestionResponse.json();
      console.log('Updated question validation rules:', updatedRetrievedQuestion.validationRules);
      
      // Verify the validation rules were properly updated
      let parsedRules;
      try {
        if (typeof updatedRetrievedQuestion.validationRules === 'string') {
          parsedRules = JSON.parse(updatedRetrievedQuestion.validationRules);
        } else {
          parsedRules = updatedRetrievedQuestion.validationRules;
        }
        
        if (parsedRules.exactCount === 4) {
          console.log('✓ Test passed: Successfully updated an existing question with selection limits');
        } else {
          console.log('✗ Test failed: Validation rules were not correctly updated. Expected exactCount: 4, but got:', parsedRules.exactCount);
        }
      } catch (e) {
        console.error('Error parsing validation rules:', e);
        console.log('✗ Test failed: Could not parse validation rules');
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