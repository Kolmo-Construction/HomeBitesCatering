/**
 * This script seeds one question of each type directly in the database
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { libraryQuestions } = require('./shared/schema');

// Connect to the database using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

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
    }
  ];

  for (const question of questionTypes) {
    try {
      await db.insert(libraryQuestions).values({
        questionType: question.type,
        questionKey: question.key,
        displayText: question.displayText,
        metadata: question.metadata,
        options: question.options || []
      });
      console.log(`✅ Created ${question.type} question: ${question.displayText}`);
    } catch (error) {
      console.error(`❌ Failed to create ${question.type} question:`, error);
    }
  }

  console.log('Done seeding question library!');
  process.exit(0);
}

seedQuestionTypes();