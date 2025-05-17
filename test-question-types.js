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

async function createComponentTypes(authCookie) {
  console.log('\n--- Registering Component Types ---');
  
  const componentTypes = [
    {
      typeKey: 'text_input',
      componentCategory: 'question',
      displayName: 'Text Input',
      description: 'Single line text input field',
      configSchema: {
        type: 'object',
        properties: {
          maxLength: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'textarea_input',
      componentCategory: 'question',
      displayName: 'Text Area',
      description: 'Multi-line text input field',
      configSchema: {
        type: 'object',
        properties: {
          rows: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'select_dropdown',
      componentCategory: 'question',
      displayName: 'Dropdown Select',
      description: 'Dropdown selection field',
      configSchema: {
        type: 'object',
        properties: {
          options: { type: 'array' }
        }
      }
    },
    {
      typeKey: 'radio_group',
      componentCategory: 'question',
      displayName: 'Radio Button Group',
      description: 'Group of radio button options',
      configSchema: {
        type: 'object',
        properties: {
          options: { type: 'array' }
        }
      }
    },
    {
      typeKey: 'checkbox_group',
      componentCategory: 'question',
      displayName: 'Checkbox Group',
      description: 'Group of checkbox options',
      configSchema: {
        type: 'object',
        properties: {
          options: { type: 'array' },
          minSelect: { type: 'number' },
          maxSelect: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'toggle_switch',
      componentCategory: 'question',
      displayName: 'Toggle Switch',
      description: 'On/Off toggle switch',
      configSchema: {
        type: 'object',
        properties: {
          defaultValue: { type: 'boolean' }
        }
      }
    },
    {
      typeKey: 'slider_input',
      componentCategory: 'question',
      displayName: 'Slider',
      description: 'Numeric slider control',
      configSchema: {
        type: 'object',
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'date_picker',
      componentCategory: 'question',
      displayName: 'Date Picker',
      description: 'Date selection calendar',
      configSchema: {
        type: 'object',
        properties: {
          minDate: { type: 'string' },
          maxDate: { type: 'string' }
        }
      }
    },
    {
      typeKey: 'time_picker',
      componentCategory: 'question',
      displayName: 'Time Picker',
      description: 'Time selection input',
      configSchema: {
        type: 'object',
        properties: {
          timeFormat: { type: 'string' }
        }
      }
    },
    {
      typeKey: 'matrix_single',
      componentCategory: 'question',
      displayName: 'Matrix (Single Choice)',
      description: 'Matrix with single choice per row',
      configSchema: {
        type: 'object',
        properties: {
          rows: { type: 'array' },
          columns: { type: 'array' }
        }
      }
    },
    {
      typeKey: 'matrix_multi',
      componentCategory: 'question',
      displayName: 'Matrix (Multiple Choice)',
      description: 'Matrix with multiple choices per row',
      configSchema: {
        type: 'object',
        properties: {
          rows: { type: 'array' },
          columns: { type: 'array' }
        }
      }
    },
    {
      typeKey: 'file_upload',
      componentCategory: 'question',
      displayName: 'File Upload',
      description: 'File upload input',
      configSchema: {
        type: 'object',
        properties: {
          allowedTypes: { type: 'array' },
          maxSize: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'rating_stars',
      componentCategory: 'question',
      displayName: 'Star Rating',
      description: 'Star rating selector',
      configSchema: {
        type: 'object',
        properties: {
          maxStars: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'incrementer',
      componentCategory: 'question',
      displayName: 'Number Incrementer',
      description: 'Increment/decrement counter',
      configSchema: {
        type: 'object',
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' }
        }
      }
    },
    {
      typeKey: 'address_input',
      componentCategory: 'question',
      displayName: 'Address Input',
      description: 'Full address input with multiple fields',
      configSchema: {
        type: 'object',
        properties: {
          includeCountry: { type: 'boolean' }
        }
      }
    }
  ];
  
  for (const componentType of componentTypes) {
    const response = await makeRequest('POST', '/api/questionnaires/builder', {
      action: 'registerComponentType',
      data: componentType
    }, authCookie);
    
    if (response.status === 201) {
      console.log(`✓ Registered ${componentType.displayName}`);
    } else if (response.status === 409) {
      console.log(`! ${componentType.displayName} already exists`);
    } else {
      console.log(`✗ Failed to register ${componentType.displayName}: ${JSON.stringify(response.data)}`);
    }
  }
  
  // Verify all component types are registered
  const listResponse = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'listComponentTypes'
  }, authCookie);
  
  console.log(`\nTotal component types: ${listResponse.data.componentTypes.length}`);
  
  return listResponse.data.componentTypes;
}

async function createTestQuestionnaire(authCookie) {
  console.log('\n--- Creating Test Questionnaire Definition ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createDefinition',
    data: {
      name: 'Question Types Test Questionnaire',
      description: 'A questionnaire for testing all question types',
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

async function createTestPage(questionnaireId, authCookie) {
  console.log('\n--- Creating Test Page ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addPage',
    data: {
      definitionId: questionnaireId,
      title: 'Test All Question Types',
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

async function createTestSection(authCookie) {
  console.log('\n--- Creating Test Section ---');
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'createSection',
    data: {
      title: 'Question Types Testing Section',
      description: 'Section for testing all question types',
      templateKey: `all_question_types_section_${Date.now()}`
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

async function addTestQuestions(sectionId, componentTypes, authCookie) {
  console.log('\n--- Adding Test Questions ---');
  
  const questions = [];
  let questionOrder = 1;
  
  for (const componentType of componentTypes) {
    const questionData = {
      componentTypeId: componentType.id,
      text: `Test ${componentType.displayName}`,
      helpText: `This is a test for the ${componentType.displayName} component`,
      isRequired: true,
      questionOrder: questionOrder++,
      questionKey: `question_${componentType.typeKey}_${Date.now()}_${questionOrder}`
    };
    
    questions.push(questionData);
  }
  
  const response = await makeRequest('POST', '/api/questionnaires/builder', {
    action: 'addSectionQuestions',
    data: {
      sectionId,
      questions
    }
  }, authCookie);
  
  if (response.status !== 201) {
    console.error('Failed to add questions:', response.data);
    return [];
  }
  
  console.log(`Added ${response.data.questions.length} questions`);
  return response.data.questions;
}

async function runTest() {
  try {
    console.log('Starting question types test...');
    
    // Login and get authentication cookie
    const authCookie = await login();
    
    // Register component types
    const componentTypes = await createComponentTypes(authCookie);
    
    // Create questionnaire definition
    const questionnaire = await createTestQuestionnaire(authCookie);
    if (!questionnaire) return;
    
    // Create page
    const page = await createTestPage(questionnaire.id, authCookie);
    if (!page) return;
    
    // Create section
    const section = await createTestSection(authCookie);
    if (!section) return;
    
    // Link section to page
    const linked = await linkSectionToPage(page.id, section.id, authCookie);
    if (!linked) return;
    
    // Add questions for each component type
    const questions = await addTestQuestions(section.id, componentTypes, authCookie);
    
    console.log('\n--- Test Summary ---');
    console.log(`Questionnaire ID: ${questionnaire.id}`);
    console.log(`Page ID: ${page.id}`);
    console.log(`Section ID: ${section.id}`);
    console.log(`Questions added: ${questions.length}`);
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest().catch(console.error);