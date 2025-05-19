/**
 * This script seeds one question of each type in the question library for testing purposes
 */

import fetch from 'node-fetch';
import fs from 'fs';
const cookie = fs.readFileSync('./cookie.txt', 'utf8');

async function makeRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

async function login() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin'
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function seedQuestionTypes() {
  console.log('Seeding question library with one question of each type...');
  
  const questionTypes = [
    {
      type: 'textbox',
      displayText: 'Simple Text Question',
      key: 'test_textbox_' + Date.now(),
      metadata: {
        helperText: 'Enter some text',
        placeholder: 'Type here...',
        defaultRequired: true
      }
    },
    {
      type: 'textarea',
      displayText: 'Long Text Question',
      key: 'test_textarea_' + Date.now(),
      metadata: {
        helperText: 'Write a detailed response',
        placeholder: 'Type your detailed answer here...',
        defaultRequired: false
      }
    },
    {
      type: 'number',
      displayText: 'Number Input Question',
      key: 'test_number_' + Date.now(),
      metadata: {
        helperText: 'Enter a number',
        placeholder: '0',
        defaultRequired: true,
        validation: {
          min: 0,
          max: 100
        }
      }
    },
    {
      type: 'email',
      displayText: 'Email Address Question',
      key: 'test_email_' + Date.now(),
      metadata: {
        helperText: 'Enter your email address',
        placeholder: 'email@example.com',
        defaultRequired: true
      }
    },
    {
      type: 'phone',
      displayText: 'Phone Number Question',
      key: 'test_phone_' + Date.now(),
      metadata: {
        helperText: 'Enter your phone number',
        placeholder: '(123) 456-7890',
        defaultRequired: false
      }
    },
    {
      type: 'checkbox_group',
      displayText: 'Multiple Choice Question',
      key: 'test_checkbox_' + Date.now(),
      metadata: {
        helperText: 'Select all that apply',
        defaultRequired: true,
        validation: {
          minSelected: 1,
          maxSelected: 3
        }
      },
      options: [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
        { label: 'Option C', value: 'c' },
        { label: 'Option D', value: 'd' }
      ]
    },
    {
      type: 'radio_group',
      displayText: 'Single Choice Question',
      key: 'test_radio_' + Date.now(),
      metadata: {
        helperText: 'Select one option',
        defaultRequired: true
      },
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
        { label: 'Maybe', value: 'maybe' }
      ]
    },
    {
      type: 'dropdown',
      displayText: 'Dropdown Selection',
      key: 'test_dropdown_' + Date.now(),
      metadata: {
        helperText: 'Choose from the dropdown',
        placeholder: 'Select an option',
        defaultRequired: true
      },
      options: [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
        { label: 'Option 3', value: '3' }
      ]
    },
    {
      type: 'date',
      displayText: 'Date Selection',
      key: 'test_date_' + Date.now(),
      metadata: {
        helperText: 'Select a date',
        defaultRequired: true,
        validation: {
          minDate: '2023-01-01',
          maxDate: '2026-12-31'
        }
      }
    },
    {
      type: 'datetime',
      displayText: 'Date and Time Selection',
      key: 'test_datetime_' + Date.now(),
      metadata: {
        helperText: 'Select a date and time',
        defaultRequired: false
      }
    },
    {
      type: 'matrix',
      displayText: 'Matrix Rating Question',
      key: 'test_matrix_' + Date.now(),
      metadata: {
        helperText: 'Rate each item',
        defaultRequired: true,
        rows: [
          { id: 'r1', label: 'Service Quality' },
          { id: 'r2', label: 'Price' },
          { id: 'r3', label: 'Customer Support' }
        ],
        columns: [
          { id: 'c1', label: 'Poor' },
          { id: 'c2', label: 'Fair' },
          { id: 'c3', label: 'Good' },
          { id: 'c4', label: 'Excellent' }
        ]
      }
    },
    {
      type: 'address',
      displayText: 'Address Input',
      key: 'test_address_' + Date.now(),
      metadata: {
        helperText: 'Enter your address',
        defaultRequired: false
      }
    },
    {
      type: 'file_upload',
      displayText: 'File Upload',
      key: 'test_file_' + Date.now(),
      metadata: {
        helperText: 'Upload a file',
        defaultRequired: false,
        validation: {
          maxSize: 5, // in MB
          allowedTypes: ['pdf', 'jpg', 'png']
        }
      }
    },
    {
      type: 'signature',
      displayText: 'Signature Field',
      key: 'test_signature_' + Date.now(),
      metadata: {
        helperText: 'Sign here',
        defaultRequired: true
      }
    },
    {
      type: 'rating',
      displayText: 'Star Rating',
      key: 'test_rating_' + Date.now(),
      metadata: {
        helperText: 'Rate from 1-5 stars',
        defaultRequired: true,
        maxRating: 5
      }
    },
    {
      type: 'scale',
      displayText: 'Scale Rating Question',
      key: 'test_scale_' + Date.now(),
      metadata: {
        helperText: 'Rate on a scale of 1-10',
        defaultRequired: true,
        minLabel: 'Not satisfied',
        maxLabel: 'Very satisfied',
        min: 1,
        max: 10
      }
    },
    {
      type: 'color',
      displayText: 'Color Selection',
      key: 'test_color_' + Date.now(),
      metadata: {
        helperText: 'Choose a color',
        defaultRequired: false
      }
    },
    {
      type: 'consent',
      displayText: 'Terms & Conditions Consent',
      key: 'test_consent_' + Date.now(),
      metadata: {
        helperText: 'Please agree to our terms',
        defaultRequired: true,
        consentText: 'I agree to the terms and conditions of this service.'
      }
    },
    {
      type: 'name',
      displayText: 'Name Input',
      key: 'test_name_' + Date.now(),
      metadata: {
        helperText: 'Enter your name',
        placeholder: 'John Doe',
        defaultRequired: true
      }
    },
    {
      type: 'full_name',
      displayText: 'Full Name Input',
      key: 'test_fullname_' + Date.now(),
      metadata: {
        helperText: 'Enter your full name',
        defaultRequired: true,
        separateFields: true
      }
    }
  ];

  for (const question of questionTypes) {
    try {
      const result = await makeRequest('POST', '/api/question-library', {
        questionType: question.type,
        questionKey: question.key,
        displayText: question.displayText,
        metadata: question.metadata,
        options: question.options || []
      });

      if (result.status === 201 || result.status === 200) {
        console.log(`✅ Created ${question.type} question: ${question.displayText}`);
      } else {
        console.error(`❌ Failed to create ${question.type} question:`, result);
      }
    } catch (error) {
      console.error(`Error creating ${question.type} question:`, error);
    }
  }

  console.log('Done seeding question library!');
}

async function runTest() {
  try {
    // Login and get cookie
    const cookies = await login();
    console.log('Logged in successfully');
    
    // Save cookie for future requests
    fs.writeFileSync('./cookie.txt', cookies);
    
    // Seed questions
    await seedQuestionTypes();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();