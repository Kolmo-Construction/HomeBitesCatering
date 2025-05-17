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

async function basicConditionalLogicTest() {
  try {
    // Login to get auth cookie
    const authCookie = await login();
    
    // Step 1: Create a simple questionnaire definition
    console.log('\nStep 1: Creating questionnaire definition');
    const definitionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createDefinition',
      data: {
        name: 'Basic Conditional Test',
        description: 'Simple questionnaire with conditional logic',
        versionName: 'v1.0',
        eventType: 'corporate'
      }
    }, authCookie);
    
    if (definitionResponse.status !== 201) {
      throw new Error(`Failed to create questionnaire: ${JSON.stringify(definitionResponse.data)}`);
    }
    
    const definition = definitionResponse.data.definition;
    console.log(`Created questionnaire with ID: ${definition.id}`);
    
    // Step 2: Create a page
    console.log('\nStep 2: Creating page');
    const pageResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addPage',
      data: {
        definitionId: definition.id,
        title: 'Conditional Test Page',
        order: 1
      }
    }, authCookie);
    
    if (pageResponse.status !== 201) {
      throw new Error(`Failed to create page: ${JSON.stringify(pageResponse.data)}`);
    }
    
    const page = pageResponse.data.page;
    console.log(`Created page with ID: ${page.id}`);
    
    // Step 3: Create a section
    console.log('\nStep 3: Creating section');
    const sectionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'createSection',
      data: {
        title: 'Basic Conditional Section',
        description: 'Section for testing basic conditional logic',
        templateKey: `conditional_basic_section_${Date.now()}`
      }
    }, authCookie);
    
    if (sectionResponse.status !== 201) {
      throw new Error(`Failed to create section: ${JSON.stringify(sectionResponse.data)}`);
    }
    
    const section = sectionResponse.data.section;
    console.log(`Created section with ID: ${section.id}`);
    
    // Step 4: Link section to page
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
    
    console.log('Successfully linked section to page');
    
    // Step 5: Add trigger question (Yes/No)
    console.log('\nStep 5: Adding trigger question');
    const triggerResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [{
          componentTypeId: 4, // Radio button
          text: 'Do you have any dietary restrictions?',
          helpText: 'Please select Yes if you have any dietary restrictions',
          questionKey: 'has_dietary_restrictions',
          isRequired: true,
          questionOrder: 1
        }]
      }
    }, authCookie);
    
    if (triggerResponse.status !== 201) {
      throw new Error(`Failed to add trigger question: ${JSON.stringify(triggerResponse.data)}`);
    }
    
    const triggerQuestion = triggerResponse.data.questions[0];
    console.log(`Created trigger question with ID: ${triggerQuestion.id}`);
    
    // Step 6: Add options to trigger question
    console.log('\nStep 6: Adding options to trigger question');
    const optionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: triggerQuestion.id,
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1,
            defaultSelectionIndicator: 'false'
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2,
            defaultSelectionIndicator: 'false'
          }
        ]
      }
    }, authCookie);
    
    if (optionsResponse.status !== 201) {
      throw new Error(`Failed to add options to trigger question: ${JSON.stringify(optionsResponse.data)}`);
    }
    
    console.log('Added options to trigger question');
    
    // Step 7: Add dependent question (only shown when trigger = "Yes")
    console.log('\nStep 7: Adding dependent question');
    const dependentResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addSectionQuestions',
      data: {
        sectionId: section.id,
        questions: [{
          componentTypeId: 5, // Checkbox group
          text: 'Which dietary restrictions do you have?',
          helpText: 'Please select all that apply',
          questionKey: 'dietary_restrictions_list',
          isRequired: true,
          questionOrder: 2
        }]
      }
    }, authCookie);
    
    if (dependentResponse.status !== 201) {
      throw new Error(`Failed to add dependent question: ${JSON.stringify(dependentResponse.data)}`);
    }
    
    const dependentQuestion = dependentResponse.data.questions[0];
    console.log(`Created dependent question with ID: ${dependentQuestion.id}`);
    
    // Step 8: Add options to dependent question
    console.log('\nStep 8: Adding options to dependent question');
    const dependentOptionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addQuestionOptions',
      data: {
        questionId: dependentQuestion.id,
        options: [
          {
            optionText: 'Vegetarian',
            optionValue: 'vegetarian',
            order: 1,
            defaultSelectionIndicator: 'false'
          },
          {
            optionText: 'Vegan',
            optionValue: 'vegan',
            order: 2,
            defaultSelectionIndicator: 'false'
          },
          {
            optionText: 'Gluten-Free',
            optionValue: 'gluten_free',
            order: 3,
            defaultSelectionIndicator: 'false'
          },
          {
            optionText: 'Other',
            optionValue: 'other',
            order: 4,
            defaultSelectionIndicator: 'false'
          }
        ]
      }
    }, authCookie);
    
    if (dependentOptionsResponse.status !== 201) {
      throw new Error(`Failed to add options to dependent question: ${JSON.stringify(dependentOptionsResponse.data)}`);
    }
    
    console.log('Added options to dependent question');
    
    // Step 9: Create conditional logic rule
    console.log('\nStep 9: Creating conditional logic rule');
    const logicResponse = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        definitionId: definition.id,
        triggerQuestionKey: triggerQuestion.questionKey,
        targetQuestionKey: dependentQuestion.questionKey,
        triggerCondition: 'equals',
        triggerValue: 'yes',
        actionType: 'show'
      }
    }, authCookie);
    
    if (logicResponse.status !== 201) {
      throw new Error(`Failed to create conditional logic: ${JSON.stringify(logicResponse.data)}`);
    }
    
    console.log('Successfully created conditional logic rule');
    
    // Summary
    console.log('\n--- Test Summary ---');
    console.log(`Questionnaire ID: ${definition.id}`);
    console.log(`Page ID: ${page.id}`);
    console.log(`Section ID: ${section.id}`);
    console.log(`Trigger Question ID: ${triggerQuestion.id}`);
    console.log(`Dependent Question ID: ${dependentQuestion.id}`);
    console.log('Condition: Show "dietary restrictions list" when "has dietary restrictions" = "yes"');
    console.log('Basic conditional logic test completed successfully!');
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the test
basicConditionalLogicTest();