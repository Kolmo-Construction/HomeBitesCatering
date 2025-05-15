// Test script to verify date handling in raw leads
import { storage } from './server/storage.js';

// Test date (a specific date in the past)
const testDate = new Date('2025-01-15T10:30:00Z');

async function testRawLeadDateHandling() {
  try {
    console.log('=== Testing Raw Lead Date Handling ===');
    console.log(`Test date: ${testDate.toISOString()}`);
    
    // Create a raw lead with our test date
    const rawLeadData = {
      source: 'test_script',
      extractedName: 'Test Name',
      extractedEmail: 'test@example.com',
      status: 'new',
      eventSummary: 'Test Event',
      notes: 'Created by test script',
      receivedAt: testDate,
      rawData: { testField: 'test value' }
    };
    
    // Log current time for comparison
    console.log(`Current time: ${new Date().toISOString()}`);
    
    // Create the lead
    console.log('\nCreating raw lead with test date...');
    const createdLead = await storage.createRawLead(rawLeadData);
    console.log(`Created raw lead ID: ${createdLead.id}`);
    console.log(`Stored receivedAt: ${createdLead.receivedAt.toISOString()}`);
    console.log(`Original date matches stored date: ${createdLead.receivedAt.toISOString() === testDate.toISOString()}`);
    
    // Retrieve the lead to double-check
    console.log('\nRetrieving the created lead to verify date preservation...');
    const retrievedLead = await storage.getRawLeadById(createdLead.id);
    console.log(`Retrieved lead receivedAt: ${retrievedLead.receivedAt.toISOString()}`);
    console.log(`Original date preserved: ${retrievedLead.receivedAt.toISOString() === testDate.toISOString()}`);
    
    // Cleanup
    console.log('\nCleaning up test data...');
    const deleteResult = await storage.deleteRawLead(createdLead.id);
    console.log(`Lead deleted: ${deleteResult}`);
    console.log('Test complete!');
    
  } catch (error) {
    console.error('Error during date handling test:', error);
  }
}

// Run the test
testRawLeadDateHandling();