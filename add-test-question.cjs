// This script directly adds a new test question to the database
// Run with: node add-test-question.cjs

const { Client } = require('pg');

async function main() {
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  try {
    // Get the form ID
    const formResult = await client.query(`SELECT id FROM forms LIMIT 1`);
    if (formResult.rows.length === 0) {
      console.error('No forms found in the database');
      return;
    }
    const formId = formResult.rows[0].id;
    
    // Get first page ID
    const pageResult = await client.query(`SELECT id FROM form_pages WHERE form_id = $1 LIMIT 1`, [formId]);
    if (pageResult.rows.length === 0) {
      console.error('No pages found for the form');
      return;
    }
    const pageId = pageResult.rows[0].id;
    
    // Create a radio button question in library
    const now = new Date();
    const uniqueKey = `test_radio_${now.getTime()}`;
    
    // Insert into question_library
    const libraryResult = await client.query(
      `INSERT INTO question_library 
      (question_type, question_key, display_text, metadata, options, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id`,
      [
        'radio_group', 
        uniqueKey, 
        'Test Radio Button Question', 
        JSON.stringify({
          helperText: 'Select one option below',
          placeholder: '',
          defaultRequired: true
        }),
        JSON.stringify([
          { label: 'Option One', value: '1' },
          { label: 'Option Two', value: '2' },
          { label: 'Option Three', value: '3' }
        ]),
        now,
        now
      ]
    );
    
    if (libraryResult.rows.length === 0) {
      console.error('Failed to create library question');
      return;
    }
    
    const libraryQuestionId = libraryResult.rows[0].id;
    console.log(`Created library question with ID: ${libraryQuestionId}`);
    
    // Get max display order
    const orderResult = await client.query(
      `SELECT MAX(display_order) as max_order FROM form_page_questions WHERE form_page_id = $1`,
      [pageId]
    );
    
    const maxOrder = orderResult.rows[0].max_order || 0;
    const newOrder = maxOrder + 1;
    
    // Add question to the page
    await client.query(
      `INSERT INTO form_page_questions 
      (form_page_id, library_question_id, display_order, 
       display_text_override, is_required_override, is_hidden_override,
       metadata_overrides, options_overrides, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        pageId,
        libraryQuestionId,
        newOrder,
        'This is a test radio button question',
        true,
        false,
        JSON.stringify({}),
        JSON.stringify([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Maybe', value: 'maybe' }
        ]),
        now,
        now
      ]
    );
    
    console.log(`Added radio button question to page ${pageId} at order ${newOrder}`);
    console.log('Success! Test the form preview to see the new radio button question.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();