import fetch from 'node-fetch';
import fs from 'fs';

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: fs.readFileSync('./cookie.txt', 'utf8')
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

async function createTestQuestionTypes() {
  // 1. First, let's get the form ID to work with
  const formsResponse = await makeRequest('GET', '/api/form-builder/forms');
  
  if (!formsResponse.data || formsResponse.data.length === 0) {
    console.error('No forms found. Please create a form first.');
    return;
  }
  
  const formId = formsResponse.data[0].id; // Use the first form
  console.log(`Using form ID: ${formId}`);
  
  // 2. Create or find a page to add questions to
  let pageId;
  const pagesResponse = await makeRequest('GET', `/api/form-builder/forms/${formId}/pages`);
  
  if (pagesResponse.data && pagesResponse.data.length > 0) {
    pageId = pagesResponse.data[0].id; // Use the first page
    console.log(`Using existing page ID: ${pageId}`);
  } else {
    // Create a new page
    const newPageResponse = await makeRequest('POST', '/api/form-builder/pages', {
      formId,
      title: 'Test Question Types',
      description: 'A page with questions of each type for testing',
      pageOrder: 1
    });
    
    if (newPageResponse.status !== 201) {
      console.error('Failed to create page:', newPageResponse);
      return;
    }
    
    pageId = newPageResponse.data.id;
    console.log(`Created new page with ID: ${pageId}`);
  }
  
  // 3. Add one question of each type to the library and then to the form
  const questionTypes = [
    { type: 'textbox', text: 'Text Field Question' },
    { type: 'textarea', text: 'Long Text Area Question' },
    { type: 'number', text: 'Number Input Question' },
    { type: 'email', text: 'Email Address Question' },
    { type: 'phone', text: 'Phone Number Question' },
    { type: 'checkbox_group', text: 'Multiple Choice Question' },
    { type: 'radio_group', text: 'Single Choice Question' },
    { type: 'dropdown', text: 'Dropdown Selection Question' },
    { type: 'date', text: 'Date Selection Question' },
    { type: 'matrix', text: 'Matrix Rating Question' }
  ];
  
  let displayOrder = 1;
  
  for (const questionType of questionTypes) {
    console.log(`Adding ${questionType.type} question...`);
    
    // Create question in the library
    const libraryQuestion = {
      questionType: questionType.type,
      questionKey: `test_${questionType.type}_${Date.now()}`,
      displayText: questionType.text,
      metadata: {
        helperText: `Helper text for ${questionType.text}`,
        placeholder: `Placeholder for ${questionType.text}`,
        defaultRequired: true
      }
    };
    
    // Add options for types that need them
    if (questionType.type === 'checkbox_group' || questionType.type === 'radio_group' || questionType.type === 'dropdown') {
      libraryQuestion.options = [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
        { label: 'Option 3', value: '3' }
      ];
    }
    
    // Add matrix specific data
    if (questionType.type === 'matrix') {
      libraryQuestion.metadata = {
        ...libraryQuestion.metadata,
        rows: [
          { id: 'r1', label: 'Row 1' },
          { id: 'r2', label: 'Row 2' },
          { id: 'r3', label: 'Row 3' }
        ],
        columns: [
          { id: 'c1', label: 'Poor' },
          { id: 'c2', label: 'Fair' },
          { id: 'c3', label: 'Good' },
          { id: 'c4', label: 'Excellent' }
        ]
      };
    }
    
    const libraryResponse = await makeRequest('POST', '/api/question-library', libraryQuestion);
    
    if (libraryResponse.status !== 201) {
      console.error(`Failed to create library question ${questionType.type}:`, libraryResponse);
      continue;
    }
    
    const libQuestionId = libraryResponse.data.id;
    console.log(`Created library question with ID: ${libQuestionId}`);
    
    // Add the question to the form page
    const pageQuestion = {
      libraryQuestionId: libQuestionId,
      formPageId: pageId,
      displayOrder: displayOrder++,
      displayTextOverride: null,
      isRequiredOverride: true,
      isHiddenOverride: false,
      placeholderOverride: null,
      helperTextOverride: null,
      metadataOverrides: {},
      optionsOverrides: []
    };
    
    const pageQuestionResponse = await makeRequest('POST', '/api/form-builder/page-questions', pageQuestion);
    
    if (pageQuestionResponse.status !== 201) {
      console.error(`Failed to add question to page (${questionType.type}):`, pageQuestionResponse);
    } else {
      console.log(`Added ${questionType.type} question to page successfully!`);
    }
  }
  
  console.log('Done adding test questions. You can now preview the form to test all question types.');
}

createTestQuestionTypes().catch(error => {
  console.error('Script failed:', error);
});