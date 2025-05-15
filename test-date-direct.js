// Direct test script for database date handling
import pkg from '@neondatabase/serverless';
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test date (a specific date in the past)
const testDate = new Date('2025-01-15T10:30:00Z');

async function testDateHandling() {
  try {
    console.log('=== Testing Database Date Handling ===');
    console.log(`Test date: ${testDate.toISOString()}`);
    console.log(`Current time: ${new Date().toISOString()}`);
    
    // Insert a test record with our specific date
    console.log('\nInserting test record with fixed date...');
    const insertResult = await pool.query(
      `INSERT INTO raw_leads (
        source, 
        extracted_name,
        extracted_email,
        event_summary,
        status,
        internal_notes,
        received_at,
        raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        'test_script', 
        'Test User',
        'test@example.com',
        'Test Event',
        'new',
        'Test notes',
        testDate,
        JSON.stringify({ test: 'data' })
      ]
    );
    
    const insertedRow = insertResult.rows[0];
    console.log('Inserted record:');
    console.log(` - ID: ${insertedRow.id}`);
    console.log(` - received_at: ${insertedRow.received_at.toISOString()}`);
    console.log(` - Original date preserved: ${insertedRow.received_at.toISOString() === testDate.toISOString()}`);
    
    // Select the record to see if date is preserved in retrieval
    console.log('\nRetrieving record to verify...');
    const selectResult = await pool.query(
      `SELECT * FROM raw_leads WHERE id = $1`,
      [insertedRow.id]
    );
    
    const retrievedRow = selectResult.rows[0];
    console.log('Retrieved record:');
    console.log(` - ID: ${retrievedRow.id}`);
    console.log(` - received_at: ${retrievedRow.received_at.toISOString()}`);
    console.log(` - Original date preserved: ${retrievedRow.received_at.toISOString() === testDate.toISOString()}`);
    
    // Clean up
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM raw_leads WHERE id = $1', [insertedRow.id]);
    console.log('Test record deleted.');
    
    await pool.end();
    console.log('\nTest complete!');
    
  } catch (error) {
    console.error('Error during test:', error);
    await pool.end();
  }
}

// Run the test
testDateHandling();