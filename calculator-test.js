/**
 * Calculator Test Script
 * This script sets up a simple test form with a hidden calculation
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const apiUrl = 'http://localhost:5000';
const cookieFile = 'cookie.txt';

// Helper function to make authenticated API requests
async function makeRequest(method, endpoint, data = null) {
  try {
    // Read the authentication cookie
    const cookie = fs.readFileSync(cookieFile, 'utf8').trim();
    
    // Setup request options
    const options = {
      method,
      url: `${apiUrl}${endpoint}`,
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    };
    
    // Add data for POST/PUT/PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.data = data;
    }
    
    // Make the request
    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error(`Error making ${method} request to ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function login() {
  try {
    const response = await axios.post(`${apiUrl}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin'
    });
    
    // Extract and save the cookie
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      fs.writeFileSync(cookieFile, cookies[0].split(';')[0], 'utf8');
      console.log('Login successful, cookie saved');
      return true;
    } else {
      console.log('Login successful but no cookie received');
      return false;
    }
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Create a test form with a hidden calculation
async function createCalculatorTestForm() {
  try {
    // Step 1: Log in
    await login();

    // Step 2: Create a new form
    const formResponse = await makeRequest('POST', '/api/form-builder/forms', {
      name: 'Calculator Test Form',
      description: 'A simple form to test hidden calculations',
      formKey: 'calc-test',
      status: 'draft'
    });
    console.log('Created form:', formResponse);
    const formId = formResponse.id;

    // Step 3: Create a page in the form
    const pageResponse = await makeRequest('POST', '/api/form-builder/pages', {
      formId,
      title: 'Calculator Test',
      description: 'Enter values and see the calculation',
      pageOrder: 0
    });
    console.log('Created page:', pageResponse);
    const pageId = pageResponse.id;

    // Step 4: Create a quantity field in the library
    const quantityQuestion = await makeRequest('POST', '/api/form-builder/library/questions', {
      questionKey: 'quantity',
      defaultText: 'Quantity',
      questionType: 'number',
      category: 'Calculator Test',
      defaultRequired: true,
      defaultMetadata: {
        helperText: 'Enter the quantity',
        placeholder: 'Enter a number',
        validation: {
          min: 1,
          max: 100
        }
      }
    });
    console.log('Created quantity question:', quantityQuestion);

    // Step 5: Create a price field in the library
    const priceQuestion = await makeRequest('POST', '/api/form-builder/library/questions', {
      questionKey: 'price_per_unit',
      defaultText: 'Price Per Unit',
      questionType: 'number',
      category: 'Calculator Test',
      defaultRequired: true,
      defaultMetadata: {
        helperText: 'Enter the price per unit',
        placeholder: 'Enter a price',
        validation: {
          min: 0.01,
          max: 1000
        }
      }
    });
    console.log('Created price question:', priceQuestion);

    // Step 6: Create a calculation field in the library
    const calculationQuestion = await makeRequest('POST', '/api/form-builder/library/questions', {
      questionKey: 'total_cost',
      defaultText: 'Total Cost',
      questionType: 'hidden_calculation',
      category: 'Calculator Test',
      defaultRequired: false,
      defaultMetadata: {
        formula: '{quantity} * {price_per_unit}',
        dataType: 'currency',
        precision: 2,
        description: 'Calculates the total cost based on quantity and price per unit'
      }
    });
    console.log('Created calculation question:', calculationQuestion);

    // Step 7: Create a display field to show the calculation
    const displayQuestion = await makeRequest('POST', '/api/form-builder/library/questions', {
      questionKey: 'display_total',
      defaultText: 'Your total cost is: ${total_cost}',
      questionType: 'display_text',
      category: 'Calculator Test',
      defaultRequired: false,
      defaultMetadata: {
        textSize: 'large',
        textColor: 'primary'
      }
    });
    console.log('Created display question:', displayQuestion);

    // Step 8: Add all questions to the page
    const addQuantity = await makeRequest('POST', '/api/form-builder/questions', {
      pageId,
      libraryQuestionId: quantityQuestion.id,
      displayOrder: 0
    });
    console.log('Added quantity question to page:', addQuantity);

    const addPrice = await makeRequest('POST', '/api/form-builder/questions', {
      pageId,
      libraryQuestionId: priceQuestion.id,
      displayOrder: 1
    });
    console.log('Added price question to page:', addPrice);

    const addCalculation = await makeRequest('POST', '/api/form-builder/questions', {
      pageId,
      libraryQuestionId: calculationQuestion.id,
      displayOrder: 2
    });
    console.log('Added calculation question to page:', addCalculation);

    const addDisplay = await makeRequest('POST', '/api/form-builder/questions', {
      pageId,
      libraryQuestionId: displayQuestion.id,
      displayOrder: 3
    });
    console.log('Added display question to page:', addDisplay);

    // Step 9: Publish the form
    const publishForm = await makeRequest('PATCH', `/api/form-builder/forms/${formId}`, {
      status: 'published'
    });
    console.log('Published form:', publishForm);

    console.log('\nTest form created successfully!');
    console.log(`View the form at: ${apiUrl}/forms/calc-test`);
    console.log(`Edit the form at: ${apiUrl}/admin/form-builder/form/${formId}`);
    
    return {
      formId,
      formKey: 'calc-test'
    };
  } catch (error) {
    console.error('Error creating test form:', error);
  }
}

// Execute the script
createCalculatorTestForm();