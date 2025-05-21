/**
 * Script to configure a complete wedding questionnaire form
 * Adds multiple pages and questions to the existing wedding form
 */

const fetch = require('node-fetch');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const COOKIE_FILE = './cookie.txt';

// Helper function to read the cookie file
function readCookieFile() {
  try {
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  } catch (e) {
    console.error('Error reading cookie file. Please make sure to log in first.');
    process.exit(1);
  }
}

// Helper for making authenticated requests
async function makeRequest(method, endpoint, data = null) {
  const cookie = readCookieFile();
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const json = await response.json();
    return { status: response.status, data: json };
  } else {
    const text = await response.text();
    return { status: response.status, data: text };
  }
}

// Find the wedding form
async function findWeddingForm() {
  const response = await makeRequest('GET', '/form-builder/forms?formKey=wedding-questionnaire');
  
  if (response.status !== 200 || !response.data.data || response.data.data.length === 0) {
    console.error('Wedding form not found. Please create it first.');
    process.exit(1);
  }
  
  return response.data.data[0].id;
}

// Get existing pages to avoid duplicates
async function getExistingPages(formId) {
  const response = await makeRequest('GET', `/form-builder/forms/${formId}/pages`);
  
  if (response.status !== 200) {
    console.error('Failed to get pages for form');
    return [];
  }
  
  return response.data || [];
}

// Create a page for the form
async function createPage(formId, title, description, order) {
  const response = await makeRequest('POST', `/form-builder/forms/${formId}/pages`, {
    pageTitle: title,
    pageOrder: order,
    description: description
  });
  
  if (response.status !== 201) {
    console.error(`Failed to create page "${title}":`, response.data);
    return null;
  }
  
  console.log(`Created page: ${title}`);
  return response.data.id;
}

// Add a question to a page
async function addQuestionToPage(pageId, libraryQuestionId, displayOrder, overrides = {}) {
  const data = {
    libraryQuestionId,
    displayOrder,
    displayTextOverride: overrides.displayText || null,
    isRequiredOverride: overrides.isRequired === undefined ? null : overrides.isRequired,
    isHiddenOverride: null,
    helperTextOverride: overrides.helperText || null,
    placeholderOverride: overrides.placeholder || null,
    metadataOverrides: overrides.metadata || {},
    optionsOverrides: overrides.options || []
  };
  
  const response = await makeRequest('POST', `/form-builder/pages/${pageId}/questions`, data);
  
  if (response.status !== 201) {
    console.error(`Failed to add question to page:`, response.data);
    return null;
  }
  
  console.log(`Added question: ${overrides.displayText || 'Library question ' + libraryQuestionId}`);
  return response.data.id;
}

// Create a custom question in the library
async function createLibraryQuestion(questionType, displayText, options = [], metadata = {}, isRequired = true) {
  const data = {
    questionType,
    displayText,
    isRequired,
    options,
    metadata
  };
  
  const response = await makeRequest('POST', '/form-builder/library-questions', data);
  
  if (response.status !== 201) {
    console.error(`Failed to create library question "${displayText}":`, response.data);
    return null;
  }
  
  console.log(`Created library question: ${displayText}`);
  return response.data.id;
}

// Main function to set up a wedding form
async function setupWeddingForm() {
  try {
    console.log('Setting up wedding form...');
    
    // Find the wedding form
    const formId = await findWeddingForm();
    console.log(`Found wedding form with ID: ${formId}`);
    
    // Get existing pages
    const existingPages = await getExistingPages(formId);
    const pageNames = existingPages.map(p => p.pageTitle.trim().toLowerCase());
    
    // Define pages with their questions
    const pages = [
      {
        title: "Wedding Details",
        description: "Basic information about your wedding",
        order: 1,
        questions: [
          { 
            type: "date", 
            text: "Wedding Date", 
            helper: "When will your wedding take place?",
            required: true
          },
          { 
            type: "textbox", 
            text: "Wedding Venue", 
            placeholder: "Enter venue name and address",
            required: true
          },
          { 
            type: "time", 
            text: "Ceremony Start Time", 
            helper: "What time will your ceremony begin?",
            required: true
          },
          { 
            type: "time", 
            text: "Reception Start Time", 
            helper: "What time will your reception begin?",
            required: true
          },
          { 
            type: "number", 
            text: "Expected Guest Count", 
            placeholder: "Enter number of guests",
            required: true,
            metadata: { min: 1, max: 1000 }
          },
          { 
            type: "dropdown", 
            text: "Wedding Style", 
            options: [
              { text: "Traditional", value: "traditional", order: 0 },
              { text: "Modern", value: "modern", order: 1 },
              { text: "Rustic", value: "rustic", order: 2 },
              { text: "Garden", value: "garden", order: 3 },
              { text: "Beach", value: "beach", order: 4 },
              { text: "Destination", value: "destination", order: 5 }
            ],
            required: true
          }
        ]
      },
      {
        title: "Couple Information",
        description: "Information about the soon-to-be-married couple",
        order: 2,
        questions: [
          { 
            type: "textbox", 
            text: "Partner 1 Full Name", 
            required: true
          },
          { 
            type: "textbox", 
            text: "Partner 2 Full Name", 
            required: true
          },
          { 
            type: "email", 
            text: "Primary Contact Email", 
            helper: "We'll use this email for all communication",
            required: true
          },
          { 
            type: "phone", 
            text: "Primary Contact Phone", 
            required: true
          },
          { 
            type: "phone", 
            text: "Alternative Phone", 
            required: false
          },
          { 
            type: "textbox", 
            text: "Wedding Planner Contact", 
            helper: "If you have a wedding planner, please provide their name and contact information",
            required: false
          }
        ]
      },
      {
        title: "Catering Preferences",
        description: "Food and beverage preferences for your reception",
        order: 3,
        questions: [
          { 
            type: "dropdown", 
            text: "Meal Service Style", 
            options: [
              { text: "Plated Service", value: "plated", order: 0 },
              { text: "Buffet Style", value: "buffet", order: 1 },
              { text: "Family Style", value: "family", order: 2 },
              { text: "Food Stations", value: "stations", order: 3 },
              { text: "Cocktail Style (Heavy Appetizers)", value: "cocktail", order: 4 }
            ],
            helper: "How would you like your meal to be served?",
            required: true
          },
          { 
            type: "dropdown", 
            text: "Bar Service Option", 
            options: [
              { text: "Full Open Bar", value: "open", order: 0 },
              { text: "Beer & Wine Only", value: "beer-wine", order: 1 },
              { text: "Cash Bar", value: "cash", order: 2 },
              { text: "Signature Cocktails", value: "signature", order: 3 },
              { text: "No Bar Service", value: "none", order: 4 }
            ],
            required: true
          },
          { 
            type: "checkbox_group", 
            text: "Dietary Restrictions to Accommodate", 
            options: [
              { text: "Vegetarian", value: "vegetarian", order: 0 },
              { text: "Vegan", value: "vegan", order: 1 },
              { text: "Gluten-Free", value: "gluten-free", order: 2 },
              { text: "Dairy-Free", value: "dairy-free", order: 3 },
              { text: "Nut Allergies", value: "nut-free", order: 4 },
              { text: "Shellfish Allergies", value: "shellfish-free", order: 5 }
            ],
            required: false
          },
          { 
            type: "dropdown", 
            text: "Cuisine Preference", 
            options: [
              { text: "American", value: "american", order: 0 },
              { text: "Italian", value: "italian", order: 1 },
              { text: "Mediterranean", value: "mediterranean", order: 2 },
              { text: "Asian Fusion", value: "asian-fusion", order: 3 },
              { text: "Mexican", value: "mexican", order: 4 },
              { text: "French", value: "french", order: 5 },
              { text: "Custom (describe in notes)", value: "custom", order: 6 }
            ],
            required: true
          },
          { 
            type: "dropdown", 
            text: "Budget Range (Per Person)", 
            options: [
              { text: "$40-75 per person", value: "standard", order: 0 },
              { text: "$75-125 per person", value: "premium", order: 1 },
              { text: "$125-200 per person", value: "luxury", order: 2 },
              { text: "$200+ per person", value: "elite", order: 3 }
            ],
            required: true
          }
        ]
      },
      {
        title: "Special Requests",
        description: "Additional details about your wedding reception",
        order: 4,
        questions: [
          { 
            type: "dropdown", 
            text: "Wedding Cake Service", 
            options: [
              { text: "Please provide wedding cake", value: "provide", order: 0 },
              { text: "We'll bring cake from outside vendor", value: "outside", order: 1 },
              { text: "Alternative desserts instead", value: "dessert", order: 2 },
              { text: "No cake/dessert needed", value: "none", order: 3 }
            ],
            required: true
          },
          { 
            type: "checkbox_group", 
            text: "Additional Services Needed", 
            options: [
              { text: "Table & Chair Rental", value: "tables-chairs", order: 0 },
              { text: "Linens & Tableware", value: "linens-tableware", order: 1 },
              { text: "Servers & Staff", value: "servers", order: 2 },
              { text: "Bartenders", value: "bartenders", order: 3 }
            ],
            required: false
          },
          { 
            type: "textarea", 
            text: "Special Accommodations", 
            placeholder: "Please describe any special needs or accommodations required",
            required: false
          },
          { 
            type: "textarea", 
            text: "Additional Notes or Requests", 
            placeholder: "Any additional details or requests for your wedding catering",
            required: false
          }
        ]
      }
    ];
    
    // Create pages and add questions
    for (const page of pages) {
      const pageExists = pageNames.includes(page.title.toLowerCase());
      
      if (pageExists) {
        console.log(`Page "${page.title}" already exists. Skipping...`);
        continue;
      }
      
      const pageId = await createPage(formId, page.title, page.description, page.order);
      
      if (!pageId) {
        console.error(`Failed to create page "${page.title}". Skipping questions...`);
        continue;
      }
      
      // Add questions to the page
      for (let i = 0; i < page.questions.length; i++) {
        const q = page.questions[i];
        
        // Create the library question first
        const libraryQuestionId = await createLibraryQuestion(
          q.type, 
          q.text, 
          q.options || [], 
          q.metadata || {}, 
          q.required || false
        );
        
        if (!libraryQuestionId) {
          console.error(`Failed to create library question "${q.text}". Skipping...`);
          continue;
        }
        
        // Then add it to the page
        await addQuestionToPage(pageId, libraryQuestionId, i + 1, {
          displayText: q.text,
          isRequired: q.required,
          helperText: q.helper,
          placeholder: q.placeholder,
          options: q.options
        });
      }
    }
    
    console.log('Wedding form setup complete!');
  } catch (error) {
    console.error('Error setting up wedding form:', error);
  }
}

// Run the function
setupWeddingForm();