// This script seeds a test form with multiple pages, questions, and conditional logic
const fetch = require('node-fetch');

async function login() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'password',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.statusText}`);
  }

  // Extract the cookie
  const setCookieHeader = response.headers.get('set-cookie');
  return setCookieHeader;
}

async function makeRequest(method, url, data = null, cookie) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`http://localhost:5000${url}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${method} ${url} failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return await response.json();
}

async function seedTestForm() {
  try {
    // Login to get the cookie
    const cookie = await login();
    console.log('Logged in successfully');

    // 1. Create a form
    const form = await makeRequest('POST', '/api/form-builder/forms', {
      form_title: "Event Planning Questionnaire",
      form_key: "event-planning",
      description: "Help us understand your event needs and preferences",
      status: "draft"
    }, cookie);
    
    console.log(`Created form with ID: ${form.id}`);
    const formId = form.id;

    // 2. Create pages
    const page1 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Event Basics",
      description: "Let's start with some basic information about your event",
      pageOrder: 1
    }, cookie);
    console.log(`Created page 1 with ID: ${page1.id}`);

    const page2 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Venue & Catering",
      description: "Tell us about your venue preferences and catering needs",
      pageOrder: 2
    }, cookie);
    console.log(`Created page 2 with ID: ${page2.id}`);

    const page3 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Special Requirements",
      description: "Any special requirements or preferences for your event?",
      pageOrder: 3
    }, cookie);
    console.log(`Created page 3 with ID: ${page3.id}`);

    // 3. Create library questions
    const eventTypeQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "What type of event are you planning?",
      questionType: "radio_group",
      helperText: "Select the type of event you're organizing",
      isRequired: true,
      defaultOptions: [
        { label: "Wedding", value: "wedding" },
        { label: "Corporate Event", value: "corporate" },
        { label: "Birthday Party", value: "birthday" },
        { label: "Other", value: "other" }
      ]
    }, cookie);
    console.log(`Created event type question with ID: ${eventTypeQuestion.id}`);

    const guestCountQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "How many guests do you expect?",
      questionType: "number",
      helperText: "Enter the approximate number of attendees",
      isRequired: true
    }, cookie);
    console.log(`Created guest count question with ID: ${guestCountQuestion.id}`);

    const eventDateQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "When is your event?",
      questionType: "date",
      helperText: "Select the date of your event",
      isRequired: true
    }, cookie);
    console.log(`Created event date question with ID: ${eventDateQuestion.id}`);

    const venueQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Do you need help finding a venue?",
      questionType: "radio_group",
      helperText: "Let us know if you need assistance with venue selection",
      isRequired: true,
      defaultOptions: [
        { label: "Yes, I need help finding a venue", value: "yes" },
        { label: "No, I already have a venue", value: "no" }
      ]
    }, cookie);
    console.log(`Created venue question with ID: ${venueQuestion.id}`);

    const venueName = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "What is the name of your venue?",
      questionType: "textbox",
      helperText: "Please provide the name of your venue if you have one selected",
      isRequired: false
    }, cookie);
    console.log(`Created venue name question with ID: ${venueName.id}`);

    const dietaryRestrictions = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Are there any dietary restrictions we should be aware of?",
      questionType: "checkbox_group",
      helperText: "Select all that apply",
      isRequired: false,
      defaultOptions: [
        { label: "Vegetarian", value: "vegetarian" },
        { label: "Vegan", value: "vegan" },
        { label: "Gluten-Free", value: "gluten_free" },
        { label: "Nut Allergies", value: "nut_allergies" },
        { label: "Dairy-Free", value: "dairy_free" },
        { label: "Other", value: "other" }
      ]
    }, cookie);
    console.log(`Created dietary restrictions question with ID: ${dietaryRestrictions.id}`);

    const additionalDetails = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Any additional details you'd like to share?",
      questionType: "textarea",
      helperText: "Please provide any other information that might help us better understand your needs",
      isRequired: false
    }, cookie);
    console.log(`Created additional details question with ID: ${additionalDetails.id}`);

    // 4. Add questions to pages
    // Page 1 questions
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page1.id,
      libraryQuestionId: eventTypeQuestion.id,
      displayOrder: 1
    }, cookie);
    console.log(`Added event type question to page 1`);

    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page1.id,
      libraryQuestionId: guestCountQuestion.id,
      displayOrder: 2
    }, cookie);
    console.log(`Added guest count question to page 1`);

    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page1.id,
      libraryQuestionId: eventDateQuestion.id,
      displayOrder: 3
    }, cookie);
    console.log(`Added event date question to page 1`);

    // Page 2 questions
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page2.id,
      libraryQuestionId: venueQuestion.id,
      displayOrder: 1
    }, cookie);
    console.log(`Added venue question to page 2`);

    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page2.id,
      libraryQuestionId: venueName.id,
      displayOrder: 2
    }, cookie);
    console.log(`Added venue name question to page 2`);

    // Page 3 questions
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page3.id,
      libraryQuestionId: dietaryRestrictions.id,
      displayOrder: 1
    }, cookie);
    console.log(`Added dietary restrictions question to page 3`);

    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page3.id,
      libraryQuestionId: additionalDetails.id,
      displayOrder: 2
    }, cookie);
    console.log(`Added additional details question to page 3`);

    // 5. Add conditional logic
    // Make venue name question conditional on "No, I already have a venue" selection
    const pageQuestions = await makeRequest('GET', `/api/form-builder/pages/${page2.id}/questions`, null, cookie);
    
    const venueQuestionInstance = pageQuestions.data.find(q => q.libraryQuestionId === venueQuestion.id);
    const venueNameQuestionInstance = pageQuestions.data.find(q => q.libraryQuestionId === venueName.id);
    
    if (venueQuestionInstance && venueNameQuestionInstance) {
      await makeRequest('PUT', `/api/form-builder/page-questions/${venueNameQuestionInstance.id}`, {
        conditionalLogic: {
          targetQuestionKey: venueQuestionInstance.questionKey,
          operator: "equals",
          value: "no"
        }
      }, cookie);
      console.log(`Added conditional logic to venue name question`);
    }

    console.log('Form seeding completed successfully!');
    console.log(`Form ID: ${formId}`);
    console.log(`Pages: ${[page1.id, page2.id, page3.id].join(', ')}`);
    console.log(`Created with ${pageQuestions.data.length} questions`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

seedTestForm();