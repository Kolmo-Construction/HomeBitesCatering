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

// Test simple questionnaire creation
async function testSimpleQuestionnaire() {
  try {
    // Login to get auth cookie
    const authCookie = await login();
    
    // 1. Create a test questionnaire definition
    console.log('\nStep 1: Creating a test questionnaire definition');
    
    // Use timestamp to ensure unique names
    const timestamp = Date.now();
    
    const definitionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        name: `Test Questionnaire ${timestamp}`,
        description: 'A simple test questionnaire',
        versionName: 'v1.0',
        eventType: 'corporate'
      }
    }, authCookie);
    
    if (definitionResponse.status !== 201) {
      throw new Error(`Failed to create questionnaire: ${JSON.stringify(definitionResponse.data)}`);
    }
    
    const definition = definitionResponse.data.definition;
    console.log(`✓ Created questionnaire with ID: ${definition.id}`);
    
    // 2. Create a section
    console.log('\nStep 2: Creating a section');
    
    const sectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: `Test Section ${timestamp}`,
        description: 'A test section',
        templateKey: `test_section_${timestamp}`
      }
    }, authCookie);
    
    if (sectionResponse.status !== 201) {
      throw new Error(`Failed to create section: ${JSON.stringify(sectionResponse.data)}`);
    }
    
    const section = sectionResponse.data.section;
    console.log(`✓ Created section with ID: ${section.id}`);
    
    // 3. Create a page
    console.log('\nStep 3: Creating a page');
    
    const pageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: definition.id,
        title: `Test Page ${timestamp}`,
        description: 'A test page',
        order: 1
      }
    }, authCookie);
    
    if (pageResponse.status !== 201) {
      throw new Error(`Failed to create page: ${JSON.stringify(pageResponse.data)}`);
    }
    
    const page = pageResponse.data.page;
    console.log(`✓ Created page with ID: ${page.id}`);
    
    // 4. Link section to page
    console.log('\nStep 4: Linking section to page');
    
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
    
    console.log('✓ Successfully linked section to page');
    
    // 5. Add a few questions
    console.log('\nStep 5: Adding questions');
    
    const questionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [
          {
            componentTypeId: 1, // Text input
            text: 'What is your name?',
            helpText: 'Please provide your full name',
            isRequired: true,
            questionKey: `name_${timestamp}`,
            questionOrder: 1
          },
          {
            componentTypeId: 4, // Radio button
            text: 'Do you have any dietary restrictions?',
            helpText: 'Please select yes or no',
            isRequired: true,
            questionKey: `dietary_${timestamp}`,
            questionOrder: 2
          }
        ]
      }
    }, authCookie);
    
    if (questionsResponse.status !== 201) {
      throw new Error(`Failed to add questions: ${JSON.stringify(questionsResponse.data)}`);
    }
    
    const questions = questionsResponse.data.questions;
    console.log(`✓ Added ${questions.length} questions to section`);
    
    // 6. Add options to radio button question
    console.log('\nStep 6: Adding options to radio button');
    
    const dietaryQuestion = questions.find(q => q.questionKey === `dietary_${timestamp}`);
    
    const optionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dietaryQuestion.id,
        options: [
          { optionText: 'Yes', optionValue: 'yes', order: 1 },
          { optionText: 'No', optionValue: 'no', order: 2 }
        ]
      }
    }, authCookie);
    
    if (optionsResponse.status !== 201) {
      throw new Error(`Failed to add options: ${JSON.stringify(optionsResponse.data)}`);
    }
    
    console.log('✓ Added options to dietary question');
    
    // 7. Create dependent question
    console.log('\nStep 7: Adding dependent question');
    
    const dependentQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [{
          componentTypeId: 5, // Checkbox group
          text: 'Select your dietary restrictions',
          helpText: 'Check all that apply',
          isRequired: true,
          questionKey: `restrictions_${timestamp}`,
          questionOrder: 3
        }]
      }
    }, authCookie);
    
    if (dependentQuestionResponse.status !== 201) {
      throw new Error(`Failed to add dependent question: ${JSON.stringify(dependentQuestionResponse.data)}`);
    }
    
    const dependentQuestion = dependentQuestionResponse.data.questions[0];
    console.log(`✓ Added dependent question with ID: ${dependentQuestion.id}`);
    
    // 8. Add options to dependent question
    console.log('\nStep 8: Adding options to dependent question');
    
    const dependentOptionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dependentQuestion.id,
        options: [
          { optionText: 'Vegetarian', optionValue: 'vegetarian', order: 1 },
          { optionText: 'Vegan', optionValue: 'vegan', order: 2 },
          { optionText: 'Gluten-Free', optionValue: 'gluten_free', order: 3 }
        ]
      }
    }, authCookie);
    
    if (dependentOptionsResponse.status !== 201) {
      throw new Error(`Failed to add options to dependent question: ${JSON.stringify(dependentOptionsResponse.data)}`);
    }
    
    console.log('✓ Added options to dependent question');
    
    // 9. Set up conditional logic
    console.log('\nStep 9: Setting up conditional logic');
    
    const logicResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: definition.id,
        triggerQuestionKey: dietaryQuestion.questionKey,
        targetQuestionKey: dependentQuestion.questionKey,
        triggerCondition: 'equals',
        triggerValue: 'yes',
        actionType: 'show_question'
      }
    }, authCookie);
    
    if (logicResponse.status !== 201) {
      throw new Error(`Failed to create conditional logic: ${JSON.stringify(logicResponse.data)}`);
    }
    
    console.log('✓ Successfully set up conditional logic');
    
    // 10. Get full questionnaire
    console.log('\nStep 10: Retrieving full questionnaire');
    
    const fullQuestionnaireResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'getFullQuestionnaire',
      data: {
        definitionId: definition.id
      }
    }, authCookie);
    
    if (fullQuestionnaireResponse.status !== 200) {
      throw new Error(`Failed to retrieve full questionnaire: ${JSON.stringify(fullQuestionnaireResponse.data)}`);
    }
    
    console.log('✓ Successfully retrieved full questionnaire');
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log('✓ Created questionnaire definition');
    console.log('✓ Created section');
    console.log('✓ Created page');
    console.log('✓ Linked section to page');
    console.log('✓ Added questions with options');
    console.log('✓ Set up conditional logic');
    console.log('✓ Retrieved full questionnaire structure');
    console.log('All steps completed successfully!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the test
testSimpleQuestionnaire();