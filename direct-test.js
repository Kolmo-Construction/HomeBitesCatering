// Direct Testing Script - This bypasses the API and tests the storage layer directly
import { storage } from './server/storage.js';

async function testContactIdentifiers() {
  console.log('\n========== TESTING CONTACT IDENTIFIERS ==========');

  try {
    // Test 1: Create Contact Identifier for Opportunity
    console.log('\nTest 1: Create Contact Identifier for Opportunity');
    const opportunityId = 2; // Use an existing opportunity ID
    const identifier1 = await storage.createContactIdentifier({
      opportunityId,
      type: 'email',
      value: 'direct-test-opportunity@example.com',
      isPrimary: true,
      source: 'direct_test'
    });
    console.log('Created identifier for opportunity:', identifier1);

    // Test 2: Create Contact Identifier for Client
    console.log('\nTest 2: Create Contact Identifier for Client');
    const clientId = 1; // Use an existing client ID
    const identifier2 = await storage.createContactIdentifier({
      clientId,
      type: 'phone',
      value: '555-123-4567',
      isPrimary: false,
      source: 'direct_test'
    });
    console.log('Created identifier for client:', identifier2);

    // Test 3: Get Identifiers for Opportunity
    console.log('\nTest 3: Get Identifiers for Opportunity');
    const opportunityIdentifiers = await storage.getContactIdentifiers({ opportunityId });
    console.log(`Found ${opportunityIdentifiers.length} identifiers for opportunity:`, opportunityIdentifiers);

    // Test 4: Get Identifiers for Client
    console.log('\nTest 4: Get Identifiers for Client');
    const clientIdentifiers = await storage.getContactIdentifiers({ clientId });
    console.log(`Found ${clientIdentifiers.length} identifiers for client:`, clientIdentifiers);

    // Test 5: Find Opportunity by Contact Identifier
    console.log('\nTest 5: Find Opportunity by Contact Identifier');
    const foundOpportunity = await storage.findOpportunityOrClientByContactIdentifier('direct-test-opportunity@example.com', 'email');
    console.log('Found entity by contact identifier:', foundOpportunity);

    // Test 6: Update Contact Identifier
    console.log('\nTest 6: Update Contact Identifier');
    const updatedIdentifier = await storage.updateContactIdentifier(identifier1.id, {
      isPrimary: false,
      source: 'updated_source'
    });
    console.log('Updated identifier:', updatedIdentifier);

    // Test 7: Delete Contact Identifier
    console.log('\nTest 7: Delete Contact Identifier');
    const deleteResult = await storage.deleteContactIdentifier(identifier1.id);
    console.log('Delete result:', deleteResult);

    // Verify deletion
    const verifyDelete = await storage.getContactIdentifiers({ opportunityId });
    console.log('Identifiers after deletion:', verifyDelete.map(i => ({ id: i.id, value: i.value })));

    console.log('\nContact Identifiers Tests: ✅ PASSED');
  } catch (error) {
    console.error('Error in Contact Identifiers Tests:', error);
    console.log('\nContact Identifiers Tests: ❌ FAILED');
  }
}

async function testCommunications() {
  console.log('\n========== TESTING COMMUNICATIONS ==========');

  try {
    // Test 1: Create Communication for Opportunity
    console.log('\nTest 1: Create Communication for Opportunity');
    const opportunityId = 2; // Use an existing opportunity ID
    const comm1 = await storage.createCommunication({
      opportunityId,
      type: 'email',
      direction: 'outgoing',
      timestamp: new Date(),
      subject: 'Direct Test Email',
      bodyRaw: 'This is a test communication created directly',
      source: 'direct_test'
    });
    console.log('Created communication for opportunity:', comm1);

    // Test 2: Create Communication for Client
    console.log('\nTest 2: Create Communication for Client');
    const clientId = 1; // Use an existing client ID
    const comm2 = await storage.createCommunication({
      clientId,
      type: 'call',
      direction: 'incoming',
      timestamp: new Date(),
      durationMinutes: 15,
      bodyRaw: 'This is a test call logged directly',
      source: 'direct_test'
    });
    console.log('Created communication for client:', comm2);

    // Test 3: Get Communications for Opportunity
    console.log('\nTest 3: Get Communications for Opportunity');
    const opportunityComms = await storage.getCommunicationsForOpportunity(opportunityId);
    console.log(`Found ${opportunityComms.length} communications for opportunity.`);
    if (opportunityComms.length > 0) {
      console.log('Latest opportunity communication:', opportunityComms[0]);
    }

    // Test 4: Get Communications for Client
    console.log('\nTest 4: Get Communications for Client');
    const clientComms = await storage.getCommunicationsForClient(clientId);
    console.log(`Found ${clientComms.length} communications for client.`);
    if (clientComms.length > 0) {
      console.log('Latest client communication:', clientComms[0]);
    }

    console.log('\nCommunications Tests: ✅ PASSED');
  } catch (error) {
    console.error('Error in Communications Tests:', error);
    console.log('\nCommunications Tests: ❌ FAILED');
  }
}

async function runAllTests() {
  try {
    await testContactIdentifiers();
    await testCommunications();
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('Error running tests:', error);
    console.log('\n❌ TESTS FAILED');
  }
}

runAllTests();