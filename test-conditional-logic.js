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

async function createConditionalQuestionnaire(authCookie) {
  console.log('\n--- Creating Conditional Logic Questionnaire ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createDefinition',
    data: {
      name: 'Conditional Logic Test Questionnaire',
      description: 'A questionnaire for testing conditional logic between questions',
      versionName: 'v1.0',
      eventType: 'corporate'
    }
  }, authCookie);
  
  if (response.status !== 201) {
    console.error('Failed to create questionnaire definition:', response.data);
    return null;
  }
  
  console.log(`Questionnaire created: ${response.data.definition.id}`);
  return response.data.definition;
}

async function createQuestionPage(questionnaireId, authCookie) {
  console.log('\n--- Creating Question Page ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addPage',
    data: {
      definitionId: questionnaireId,
      title: 'Conditional Questions Test',
      order: 1
    }
  }, authCookie);
  
  if (response.status !== 201) {
    console.error('Failed to create page:', response.data);
    return null;
  }
  
  console.log(`Page created: ${response.data.page.id}`);
  return response.data.page;
}

async function createConditionalSection(authCookie) {
  console.log('\n--- Creating Conditional Section ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createSection',
    data: {
      title: 'Conditional Logic Testing',
      description: 'Section for testing conditional logic between questions',
      templateKey: `conditional_logic_section_${Date.now()}`
    }
  }, authCookie);
  
  if (response.status !== 201) {
    console.error('Failed to create section:', response.data);
    return null;
  }
  
  console.log(`Section created: ${response.data.section.id}`);
  return response.data.section;
}

async function linkSectionToPage(pageId, sectionId, authCookie) {
  console.log('\n--- Linking Section to Page ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionToPage',
    data: {
      pageId,
      sectionId,
      sectionOrder: 1
    }
  }, authCookie);
  
  if (response.status !== 201) {
    console.error('Failed to link section to page:', response.data);
    return false;
  }
  
  console.log('Section linked to page successfully');
  return true;
}

async function addConditionalQuestions(sectionId, authCookie) {
  console.log('\n--- Adding Conditional Questions ---');
  
  // First, add the trigger question (Yes/No question)
  const triggerQuestionResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionQuestions',
    data: {
      sectionId,
      questions: [
        {
          componentTypeId: 4, // Radio button group
          text: 'Do you need catering for special dietary requirements?',
          helpText: 'Select Yes if you need vegetarian, vegan, gluten-free, or other special meals',
          isRequired: true,
          questionOrder: 1,
          questionKey: 'special_dietary_needs'
        }
      ]
    }
  }, authCookie);
  
  if (triggerQuestionResponse.status !== 201) {
    console.error('Failed to add trigger question:', triggerQuestionResponse.data);
    return null;
  }
  
  const triggerQuestion = triggerQuestionResponse.data.questions[0];
  console.log(`Trigger question created: ${triggerQuestion.id}`);
  
  // Add options to the trigger question (Yes/No)
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
    console.error('Failed to add options to trigger question:', optionsResponse.data);
    return null;
  }
  
  console.log('Added options to trigger question');
  
  // Now, add the conditional questions that will be shown or hidden
  const conditionalQuestionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionQuestions',
    data: {
      sectionId,
      questions: [
        {
          componentTypeId: 5, // Checkbox group
          text: 'Select all dietary requirements that apply:',
          helpText: 'Check all options that your guests might need',
          isRequired: true,
          questionOrder: 2,
          questionKey: 'dietary_requirements_list'
        },
        {
          componentTypeId: 2, // Text area
          text: 'Please provide details about any allergies or special dietary needs:',
          helpText: 'Include any additional information that might help us prepare appropriate meals',
          isRequired: false,
          questionOrder: 3,
          questionKey: 'dietary_requirements_details'
        }
      ]
    }
  }, authCookie);
  
  if (conditionalQuestionsResponse.status !== 201) {
    console.error('Failed to add conditional questions:', conditionalQuestionsResponse.data);
    return null;
  }
  
  const conditionalQuestions = conditionalQuestionsResponse.data.questions;
  console.log(`Created ${conditionalQuestions.length} conditional questions`);
  
  // Add options to the checkbox group
  const checkboxOptionsResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addQuestionOptions',
    data: {
      questionId: conditionalQuestions[0].id,
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
          optionText: 'Dairy-Free',
          optionValue: 'dairy_free',
          order: 4,
          defaultSelectionIndicator: 'false'
        },
        {
          optionText: 'Nut Allergy',
          optionValue: 'nut_allergy',
          order: 5,
          defaultSelectionIndicator: 'false'
        },
        {
          optionText: 'Other',
          optionValue: 'other',
          order: 6,
          defaultSelectionIndicator: 'false'
        }
      ]
    }
  }, authCookie);
  
  if (checkboxOptionsResponse.status !== 201) {
    console.error('Failed to add options to checkbox question:', checkboxOptionsResponse.data);
    return null;
  }
  
  console.log('Added options to checkbox question');
  
  return {
    triggerQuestion,
    conditionalQuestions
  };
}

async function addConditionalLogic(questions, authCookie) {
  console.log('\n--- Setting Up Conditional Logic ---');
  
  const triggerQuestion = questions.triggerQuestion;
  const conditionalQuestions = questions.conditionalQuestions;
  
  // Create conditional logic rules for each question that should be conditional
  const conditionalLogicRequests = conditionalQuestions.map((question, index) => {
    return makeRequest('POST', '/api/questionnaires/builder', {
      action: 'addConditionalLogic',
      data: {
        name: `Show Question ${index + 1} when dietary needs is Yes`,
        description: `Shows the ${index === 0 ? 'dietary requirements list' : 'dietary details'} question when user selects Yes for special dietary needs`,
        targetType: 'question',
        targetId: question.id,
        conditionType: 'equals',
        sourceType: 'question',
        sourceId: triggerQuestion.id,
        conditionValue: 'yes',
        actionType: 'show',
        actionValue: null,
        priority: 1,
        isActive: true
      }
    }, authCookie);
  });
  
  try {
    const results = await Promise.all(conditionalLogicRequests);
    
    const successCount = results.filter(result => result.status === 201).length;
    console.log(`Successfully added conditional logic for ${successCount} out of ${conditionalQuestions.length} questions`);
    
    if (successCount !== conditionalQuestions.length) {
      console.error('Some conditional logic rules failed to be created:');
      results.forEach((result, index) => {
        if (result.status !== 201) {
          console.error(`- Rule ${index + 1} failed:`, result.data);
        }
      });
    }
    
    return successCount === conditionalQuestions.length;
  } catch (error) {
    console.error('Error adding conditional logic:', error);
    return false;
  }
}

async function runTest() {
  try {
    console.log('Starting conditional logic test...');
    
    // Login and get authentication cookie
    const authCookie = await login();
    
    // Create questionnaire definition
    const questionnaire = await createConditionalQuestionnaire(authCookie);
    if (!questionnaire) return;
    
    // Create page
    const page = await createQuestionPage(questionnaire.id, authCookie);
    if (!page) return;
    
    // Create section
    const section = await createConditionalSection(authCookie);
    if (!section) return;
    
    // Link section to page
    const linked = await linkSectionToPage(page.id, section.id, authCookie);
    if (!linked) return;
    
    // Add conditional questions
    const questions = await addConditionalQuestions(section.id, authCookie);
    if (!questions) return;
    
    // Add conditional logic
    const logicAdded = await addConditionalLogic(questions, authCookie);
    
    console.log('\n--- Test Summary ---');
    console.log(`Questionnaire ID: ${questionnaire.id}`);
    console.log(`Page ID: ${page.id}`);
    console.log(`Section ID: ${section.id}`);
    console.log(`Trigger Question ID: ${questions.triggerQuestion.id}`);
    console.log(`Conditional Questions: ${questions.conditionalQuestions.map(q => q.id).join(', ')}`);
    console.log(`Conditional Logic Setup: ${logicAdded ? 'Successful' : 'Partial Success/Failed'}`);
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest().catch(console.error);