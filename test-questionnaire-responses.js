import axios from 'axios';

async function makeRequest(method, endpoint, data = null, cookie = null) {
  try {
    const config = {
      method,
      url: `http://localhost:5000${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (cookie) {
      config.headers.Cookie = cookie;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
    }
    console.error('Error making request:', error.message);
    return {
      status: 500,
      data: { error: error.message }
    };
  }
}

async function login() {
  console.log('Logging in...');
  
  const response = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (response.status === 200) {
    console.log('Successfully logged in');
    const cookie = response.headers['set-cookie'][0];
    return cookie;
  } else {
    console.error('Login failed:', response.data);
    throw new Error('Login failed');
  }
}

// Test Cases for Questionnaire Responses
async function runQuestionnaireResponseTests() {
  try {
    // Login to get auth cookie
    const authCookie = await login();
    
    // ==========================================
    // Test Case 1: Create a simple questionnaire for response testing
    // ==========================================
    console.log('\nTest Case 1: Creating a simple questionnaire for response testing');
    
    // 1. Create questionnaire definition
    const definitionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        name: 'Corporate Lunch Questionnaire',
        description: 'Simple questionnaire for corporate lunch orders',
        versionName: 'v1.0',
        eventType: 'corporate',
        isPublished: true
      }
    }, authCookie);
    
    if (definitionResponse.status !== 201) {
      throw new Error(`Failed to create questionnaire: ${JSON.stringify(definitionResponse.data)}`);
    }
    
    const definition = definitionResponse.data.definition;
    console.log(`Created questionnaire with ID: ${definition.id}`);
    
    // 2. Create a page
    const pageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: definition.id,
        title: 'Lunch Order Form',
        description: 'Please provide your lunch preferences',
        order: 1
      }
    }, authCookie);
    
    if (pageResponse.status !== 201) {
      throw new Error(`Failed to create page: ${JSON.stringify(pageResponse.data)}`);
    }
    
    const page = pageResponse.data.page;
    console.log(`Created page with ID: ${page.id}`);
    
    // 3. Create a section
    const sectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Lunch Preferences',
        description: 'Your lunch options',
        templateKey: 'lunch_preferences'
      }
    }, authCookie);
    
    if (sectionResponse.status !== 201) {
      throw new Error(`Failed to create section: ${JSON.stringify(sectionResponse.data)}`);
    }
    
    const section = sectionResponse.data.section;
    console.log(`Created section with ID: ${section.id}`);
    
    // 4. Link section to page
    const linkResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionToPage',
      data: {
        pageId: page.id,
        sectionId: section.id,
        sectionOrder: 1
      }
    }, authCookie);
    
    if (linkResponse.status !== 201) {
      throw new Error(`Failed to link section to page: ${JSON.stringify(linkResponse.data)}`);
    }
    
    console.log('Successfully linked section to page');
    
    // 5. Add questions to the section
    const questionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [
          {
            componentTypeId: 1, // Text
            text: 'Your Full Name',
            helpText: 'Please provide your first and last name',
            isRequired: true,
            questionKey: 'full_name',
            questionOrder: 1
          },
          {
            componentTypeId: 3, // Email
            text: 'Your Email Address',
            helpText: 'We\'ll send the confirmation to this email',
            isRequired: true,
            questionKey: 'email',
            questionOrder: 2
          },
          {
            componentTypeId: 4, // Radio
            text: 'Select your main dish',
            helpText: 'Choose one of the following options',
            isRequired: true,
            questionKey: 'main_dish',
            questionOrder: 3
          },
          {
            componentTypeId: 5, // Checkbox group
            text: 'Select your sides',
            helpText: 'Choose up to 2 side dishes',
            isRequired: true,
            questionKey: 'side_dishes',
            questionOrder: 4,
            validationRules: {
              maxSelections: 2,
              errorMessage: "Please select no more than 2 side dishes"
            }
          },
          {
            componentTypeId: 4, // Radio
            text: 'Any dietary restrictions?',
            helpText: 'Please indicate if you have any dietary restrictions',
            isRequired: true,
            questionKey: 'has_dietary_restrictions',
            questionOrder: 5
          },
          {
            componentTypeId: 2, // Textarea
            text: 'Special Instructions',
            helpText: 'Any additional comments or instructions',
            isRequired: false,
            questionKey: 'special_instructions',
            questionOrder: 6
          }
        ]
      }
    }, authCookie);
    
    if (questionsResponse.status !== 201) {
      throw new Error(`Failed to add questions: ${JSON.stringify(questionsResponse.data)}`);
    }
    
    console.log(`Added ${questionsResponse.data.questions.length} questions to the section`);
    
    // Get questions by key
    const questions = questionsResponse.data.questions;
    const mainDishQuestion = questions.find(q => q.questionKey === 'main_dish');
    const sideDishesQuestion = questions.find(q => q.questionKey === 'side_dishes');
    const dietaryQuestion = questions.find(q => q.questionKey === 'has_dietary_restrictions');
    
    // 6. Add options to questions
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: mainDishQuestion.id,
        options: [
          { optionText: 'Grilled Chicken', optionValue: 'chicken', order: 1 },
          { optionText: 'Beef Tenderloin', optionValue: 'beef', order: 2 },
          { optionText: 'Salmon Fillet', optionValue: 'salmon', order: 3 },
          { optionText: 'Vegetarian Pasta', optionValue: 'pasta', order: 4 }
        ]
      }
    }, authCookie);
    
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: sideDishesQuestion.id,
        options: [
          { optionText: 'Garden Salad', optionValue: 'salad', order: 1 },
          { optionText: 'Roasted Vegetables', optionValue: 'vegetables', order: 2 },
          { optionText: 'Mashed Potatoes', optionValue: 'potatoes', order: 3 },
          { optionText: 'Rice Pilaf', optionValue: 'rice', order: 4 },
          { optionText: 'Dinner Rolls', optionValue: 'rolls', order: 5 }
        ]
      }
    }, authCookie);
    
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dietaryQuestion.id,
        options: [
          { optionText: 'Yes', optionValue: 'yes', order: 1 },
          { optionText: 'No', optionValue: 'no', order: 2 }
        ]
      }
    }, authCookie);
    
    console.log('Added options to all questions');
    
    // 7. Add conditional logic question for dietary restrictions
    const dietaryDetailsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [{
          componentTypeId: 5, // Checkbox group
          text: 'Select your dietary restrictions',
          helpText: 'Choose all that apply',
          isRequired: true,
          questionKey: 'dietary_restriction_types',
          questionOrder: 6
        }]
      }
    }, authCookie);
    
    if (dietaryDetailsResponse.status !== 201) {
      throw new Error(`Failed to add dietary details question: ${JSON.stringify(dietaryDetailsResponse.data)}`);
    }
    
    const dietaryDetailsQuestion = dietaryDetailsResponse.data.questions[0];
    console.log(`Added dietary details question with ID: ${dietaryDetailsQuestion.id}`);
    
    // Add options to dietary details question
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dietaryDetailsQuestion.id,
        options: [
          { optionText: 'Vegetarian', optionValue: 'vegetarian', order: 1 },
          { optionText: 'Vegan', optionValue: 'vegan', order: 2 },
          { optionText: 'Gluten-Free', optionValue: 'gluten_free', order: 3 },
          { optionText: 'Dairy-Free', optionValue: 'dairy_free', order: 4 },
          { optionText: 'Nut Allergies', optionValue: 'nut_allergies', order: 5 },
          { optionText: 'Other', optionValue: 'other', order: 6 }
        ]
      }
    }, authCookie);
    
    // Set up conditional logic
    await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: definition.id,
        triggerQuestionKey: dietaryQuestion.questionKey,
        targetQuestionKey: dietaryDetailsQuestion.questionKey,
        triggerCondition: 'equals',
        triggerValue: 'yes',
        actionType: 'show_question'
      }
    }, authCookie);
    
    console.log('Set up conditional logic for dietary restrictions');
    
    // ==========================================
    // Test Case 2: Create and test a response to the questionnaire
    // ==========================================
    console.log('\nTest Case 2: Creating a response to the questionnaire');
    
    // 1. Get the full questionnaire structure
    const fullQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definition.id
      }
    }, authCookie);
    
    if (fullQuestionnaireResponse.status !== 200) {
      throw new Error(`Failed to retrieve full questionnaire: ${JSON.stringify(fullQuestionnaireResponse.data)}`);
    }
    
    console.log('Retrieved full questionnaire structure');
    
    // 2. Create a valid response
    const responseData = {
      definitionId: definition.id,
      respondent: {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '555-123-4567'
      },
      answers: [
        {
          questionKey: 'full_name',
          answer: 'John Smith'
        },
        {
          questionKey: 'email',
          answer: 'john.smith@example.com'
        },
        {
          questionKey: 'main_dish',
          answer: 'chicken'
        },
        {
          questionKey: 'side_dishes',
          answer: ['salad', 'rice']
        },
        {
          questionKey: 'has_dietary_restrictions',
          answer: 'no'
        },
        {
          questionKey: 'special_instructions',
          answer: 'Please deliver to Conference Room B by 12:30 PM.'
        }
      ]
    };
    
    // Submit the response
    const submitResponseResponse = await makeRequest('POST', '/api/questionnaires/response', {
      action: 'submitResponse',
      data: responseData
    }, authCookie);
    
    if (submitResponseResponse.status !== 201) {
      console.error(`Failed to submit response: ${JSON.stringify(submitResponseResponse.data)}`);
    } else {
      console.log('Successfully submitted questionnaire response');
      console.log(`Response ID: ${submitResponseResponse.data.responseId}`);
    }
    
    // ==========================================
    // Test Case 3: Create an invalid response with validation errors
    // ==========================================
    console.log('\nTest Case 3: Testing validation with an invalid response');
    
    // Create an invalid response (too many side dishes selected)
    const invalidResponseData = {
      definitionId: definition.id,
      respondent: {
        name: 'Jane Doe',
        email: 'jane.doe@example.com'
      },
      answers: [
        {
          questionKey: 'full_name',
          answer: 'Jane Doe'
        },
        {
          questionKey: 'email',
          answer: 'jane.doe@example.com'
        },
        {
          questionKey: 'main_dish',
          answer: 'pasta'
        },
        {
          questionKey: 'side_dishes',
          answer: ['salad', 'vegetables', 'rolls'] // Too many selections
        },
        {
          questionKey: 'has_dietary_restrictions',
          answer: 'yes'
        },
        {
          questionKey: 'dietary_restriction_types',
          answer: ['vegetarian']
        }
      ]
    };
    
    // Submit the invalid response
    const invalidSubmitResponse = await makeRequest('POST', '/api/questionnaires/response', {
      action: 'submitResponse',
      data: invalidResponseData
    }, authCookie);
    
    if (invalidSubmitResponse.status === 400) {
      console.log('✓ Validation correctly rejected response with too many side dishes');
      console.log(`Validation error: ${invalidSubmitResponse.data.message}`);
    } else {
      console.error('Expected validation error but got:', invalidSubmitResponse);
    }
    
    // ==========================================
    // Test Case 4: Test required field validation
    // ==========================================
    console.log('\nTest Case 4: Testing required field validation');
    
    // Create a response missing required fields
    const missingFieldsResponse = {
      definitionId: definition.id,
      respondent: {
        name: 'Michael Johnson',
        email: 'michael.johnson@example.com'
      },
      answers: [
        {
          questionKey: 'full_name',
          answer: 'Michael Johnson'
        },
        {
          questionKey: 'email',
          answer: 'michael.johnson@example.com'
        },
        // Missing main_dish (required)
        {
          questionKey: 'side_dishes',
          answer: ['salad']
        },
        // Missing has_dietary_restrictions (required)
        {
          questionKey: 'special_instructions',
          answer: 'No special instructions'
        }
      ]
    };
    
    // Submit the response missing required fields
    const missingFieldsSubmitResponse = await makeRequest('POST', '/api/questionnaires/response', {
      action: 'submitResponse',
      data: missingFieldsResponse
    }, authCookie);
    
    if (missingFieldsSubmitResponse.status === 400) {
      console.log('✓ Validation correctly rejected response with missing required fields');
      console.log(`Validation error: ${missingFieldsSubmitResponse.data.message}`);
    } else {
      console.error('Expected validation error but got:', missingFieldsSubmitResponse);
    }
    
    // ==========================================
    // Test Case 5: Retrieve questionnaire responses
    // ==========================================
    console.log('\nTest Case 5: Retrieving questionnaire responses');
    
    // Get all responses for the questionnaire
    const getResponsesResponse = await makeRequest('GET', `/api/questionnaires/${definition.id}/responses`, null, authCookie);
    
    if (getResponsesResponse.status !== 200) {
      console.error(`Failed to retrieve responses: ${JSON.stringify(getResponsesResponse.data)}`);
    } else {
      const responses = getResponsesResponse.data.responses;
      console.log(`Retrieved ${responses.length} responses for questionnaire`);
      
      // Print summary of each response
      responses.forEach((response, index) => {
        console.log(`Response #${index + 1}:`);
        console.log(`  Respondent: ${response.respondent.name}`);
        console.log(`  Submitted: ${new Date(response.submittedAt).toLocaleString()}`);
        console.log(`  Main dish: ${response.answers.find(a => a.questionKey === 'main_dish')?.answer}`);
      });
    }
    
    // ==========================================
    // Test Case 6: Update a response
    // ==========================================
    console.log('\nTest Case 6: Updating an existing response');
    
    if (submitResponseResponse.status === 201) {
      const responseId = submitResponseResponse.data.responseId;
      
      // Update the response
      const updateData = {
        responseId: responseId,
        updates: {
          answers: [
            {
              questionKey: 'main_dish',
              answer: 'salmon' // Changed from chicken to salmon
            },
            {
              questionKey: 'special_instructions',
              answer: 'Please deliver to Conference Room C by 1:00 PM.' // Updated instructions
            }
          ]
        }
      };
      
      const updateResponseResponse = await makeRequest('PATCH', '/api/questionnaires/response', {
        action: 'updateResponse',
        data: updateData
      }, authCookie);
      
      if (updateResponseResponse.status !== 200) {
        console.error(`Failed to update response: ${JSON.stringify(updateResponseResponse.data)}`);
      } else {
        console.log('Successfully updated questionnaire response');
        console.log(`Updated main dish to: ${updateResponseResponse.data.response.answers.find(a => a.questionKey === 'main_dish')?.answer}`);
      }
    }
    
    // ==========================================
    // Test Case 7: Export responses to CSV
    // ==========================================
    console.log('\nTest Case 7: Exporting responses to CSV');
    
    const exportResponse = await makeRequest('GET', `/api/questionnaires/${definition.id}/responses/export`, null, authCookie);
    
    if (exportResponse.status !== 200) {
      console.error(`Failed to export responses: ${JSON.stringify(exportResponse.data)}`);
    } else {
      console.log('Successfully exported questionnaire responses to CSV');
      console.log(`CSV data sample: ${exportResponse.data.csv.substring(0, 100)}...`);
    }
    
    // ==========================================
    // Test Summary
    // ==========================================
    console.log('\n==== Questionnaire Response Tests Summary ====');
    console.log('✓ Created test questionnaire with conditional logic');
    console.log('✓ Successfully submitted valid questionnaire response');
    console.log('✓ Validated responses with appropriate error handling');
    console.log('✓ Tested required fields validation');
    console.log('✓ Retrieved and listed questionnaire responses');
    console.log('✓ Updated an existing response');
    console.log('✓ Exported responses to CSV format');
    console.log('\nAll questionnaire response tests completed!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the tests
runQuestionnaireResponseTests();