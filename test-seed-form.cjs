// Script to seed a form with questions, pages, and conditional logic
const axios = require('axios');
const fs = require('fs');

// Initialize axios with cookies jar for session persistence
let cookie = null;

async function login() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password'
    }, {
      withCredentials: true
    });
    
    cookie = response.headers['set-cookie'][0];
    console.log('Login successful');
    return cookie;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `http://localhost:5000${url}`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`${method} ${url} failed:`, error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

async function seedForm() {
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Create a new form or use existing
    console.log('Creating a new form');
    const form = await makeRequest('POST', '/api/form-builder/forms', {
      form_title: "Customer Event Survey",
      form_key: "customer-event-survey",
      description: "Please help us improve our event services by completing this survey",
      status: "draft"
    });
    
    console.log(`Created form with ID: ${form.id}`);
    const formId = form.id;
    
    // Step 3: Create pages
    console.log('Creating pages');
    const page1 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Event Experience",
      description: "Tell us about your experience at the event",
      pageOrder: 1
    });
    
    const page2 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Food & Service",
      description: "Rate our food and service quality",
      pageOrder: 2
    });
    
    const page3 = await makeRequest('POST', `/api/form-builder/forms/${formId}/pages`, {
      title: "Additional Feedback",
      description: "Share any additional thoughts or suggestions",
      pageOrder: 3
    });
    
    console.log(`Created pages with IDs: ${page1.id}, ${page2.id}, ${page3.id}`);
    
    // Step 4: Create library questions
    console.log('Creating library questions');
    
    // Page 1 Questions
    const overallRating = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "How would you rate your overall event experience?",
      questionType: "radio_group",
      helperText: "Please select one option",
      isRequired: true,
      defaultOptions: [
        { label: "Excellent", value: "excellent" },
        { label: "Good", value: "good" },
        { label: "Average", value: "average" },
        { label: "Poor", value: "poor" },
        { label: "Very Poor", value: "very_poor" }
      ]
    });
    
    const recommendationQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Would you recommend our services to others?",
      questionType: "radio_group",
      helperText: "Please select one option",
      isRequired: true,
      defaultOptions: [
        { label: "Definitely", value: "definitely" },
        { label: "Probably", value: "probably" },
        { label: "Not Sure", value: "not_sure" },
        { label: "Probably Not", value: "probably_not" },
        { label: "Definitely Not", value: "definitely_not" }
      ]
    });
    
    // Page 2 Questions
    const foodQualityQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "How would you rate the quality of the food?",
      questionType: "radio_group",
      helperText: "Please select one option",
      isRequired: true,
      defaultOptions: [
        { label: "Excellent", value: "excellent" },
        { label: "Good", value: "good" },
        { label: "Average", value: "average" },
        { label: "Poor", value: "poor" },
        { label: "Very Poor", value: "very_poor" }
      ]
    });
    
    const dietaryQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Did you have any dietary restrictions?",
      questionType: "radio_group",
      helperText: "Please select one option",
      isRequired: true,
      defaultOptions: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    });
    
    const dietaryDetailsQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Please describe your dietary restrictions",
      questionType: "textarea",
      helperText: "Provide details about your dietary needs",
      isRequired: false
    });
    
    // Page 3 Questions
    const additionalFeedbackQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Do you have any additional feedback or suggestions?",
      questionType: "textarea",
      helperText: "Please share any thoughts on how we could improve our services",
      isRequired: false
    });
    
    const emailQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Would you like to be contacted about your feedback?",
      questionType: "radio_group",
      helperText: "We may reach out to discuss your experience",
      isRequired: true,
      defaultOptions: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    });
    
    const contactInfoQuestion = await makeRequest('POST', '/api/question-library/questions', {
      displayText: "Please provide your email address",
      questionType: "textbox",
      helperText: "We'll use this to contact you about your feedback",
      isRequired: false
    });
    
    console.log('Created all library questions');
    
    // Step 5: Add questions to pages
    console.log('Adding questions to pages');
    
    // Page 1
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page1.id,
      libraryQuestionId: overallRating.id,
      displayOrder: 1
    });
    
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page1.id,
      libraryQuestionId: recommendationQuestion.id,
      displayOrder: 2
    });
    
    // Page 2
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page2.id,
      libraryQuestionId: foodQualityQuestion.id,
      displayOrder: 1
    });
    
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page2.id,
      libraryQuestionId: dietaryQuestion.id,
      displayOrder: 2
    });
    
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page2.id,
      libraryQuestionId: dietaryDetailsQuestion.id,
      displayOrder: 3
    });
    
    // Page 3
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page3.id,
      libraryQuestionId: additionalFeedbackQuestion.id,
      displayOrder: 1
    });
    
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page3.id,
      libraryQuestionId: emailQuestion.id,
      displayOrder: 2
    });
    
    await makeRequest('POST', '/api/form-builder/page-questions', {
      pageId: page3.id,
      libraryQuestionId: contactInfoQuestion.id,
      displayOrder: 3
    });
    
    console.log('Added all questions to pages');
    
    // Step 6: Add conditional logic
    console.log('Setting up conditional logic');
    
    // Get page questions to set up conditional logic
    const page2Questions = await makeRequest('GET', `/api/form-builder/pages/${page2.id}/questions`);
    const page3Questions = await makeRequest('GET', `/api/form-builder/pages/${page3.id}/questions`);
    
    // Find the specific question instances for conditional logic
    const dietaryQuestionInstance = page2Questions.data.find(q => q.libraryQuestionId === dietaryQuestion.id);
    const dietaryDetailsQuestionInstance = page2Questions.data.find(q => q.libraryQuestionId === dietaryDetailsQuestion.id);
    
    const emailQuestionInstance = page3Questions.data.find(q => q.libraryQuestionId === emailQuestion.id);
    const contactInfoQuestionInstance = page3Questions.data.find(q => q.libraryQuestionId === contactInfoQuestion.id);
    
    // Set up conditional logic for dietary details
    if (dietaryQuestionInstance && dietaryDetailsQuestionInstance) {
      await makeRequest('PUT', `/api/form-builder/page-questions/${dietaryDetailsQuestionInstance.id}`, {
        conditionalLogic: {
          targetQuestionKey: dietaryQuestionInstance.questionKey,
          operator: "equals",
          value: "yes"
        }
      });
      console.log('Added conditional logic to dietary details question');
    }
    
    // Set up conditional logic for contact info
    if (emailQuestionInstance && contactInfoQuestionInstance) {
      await makeRequest('PUT', `/api/form-builder/page-questions/${contactInfoQuestionInstance.id}`, {
        conditionalLogic: {
          targetQuestionKey: emailQuestionInstance.questionKey,
          operator: "equals",
          value: "yes"
        }
      });
      console.log('Added conditional logic to contact info question');
    }
    
    console.log('Form seeding completed successfully!');
    console.log(`Form ID: ${formId}`);
    console.log(`Pages: ${[page1.id, page2.id, page3.id].join(', ')}`);
    
  } catch (error) {
    console.error('Error in seeding process:', error.message);
  }
}

seedForm().then(() => {
  console.log('Script completed');
}).catch(err => {
  console.error('Script failed:', err);
});