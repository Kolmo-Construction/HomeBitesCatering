import { storage } from './server/storage.ts';

async function testMethods() {
  try {
    // First, check if we have an opportunity to work with
    const opportunities = await storage.listOpportunities();
    console.log('Available opportunities:', opportunities.length > 0 ? 'Found opportunities' : 'No opportunities found');
    
    if (opportunities.length === 0) {
      console.log('No opportunities to test with. Creating a test opportunity...');
      const newOpportunity = await storage.createOpportunity({
        firstName: "Test",
        lastName: "Opportunity",
        email: "test@example.com",
        phone: "555-1234",
        eventType: "Test Event",
        status: "new"
      });
      console.log('Created test opportunity:', newOpportunity);
      
      // Test 1: Create a contact identifier for the opportunity
      const contactIdentifier = await storage.createContactIdentifier({
        opportunityId: newOpportunity.id,
        type: "email",
        value: "secondary@example.com",
        isPrimary: false,
        source: "test"
      });
      console.log('Created contact identifier:', contactIdentifier);
      
      // Test 2: Find opportunity by contact identifier
      const foundEntity = await storage.findOpportunityOrClientByContactIdentifier("secondary@example.com", "email");
      console.log('Found by contact identifier:', foundEntity);
      
      // Test 3: Get contact identifiers for an opportunity
      const identifiers = await storage.getContactIdentifiers({ opportunityId: newOpportunity.id });
      console.log('Contact identifiers for opportunity:', identifiers);
      
      // Test 4: Create a communication for the opportunity
      const communication = await storage.createCommunication({
        opportunityId: newOpportunity.id,
        type: "email",
        direction: "outgoing",
        subject: "Test communication",
        bodyRaw: "This is a test message",
        timestamp: new Date()
      });
      console.log('Created communication:', communication);
      
      // Test 5: Get communications for the opportunity
      const communications = await storage.getCommunicationsForOpportunity(newOpportunity.id);
      console.log('Communications for opportunity:', communications);
    } else {
      // Use the first opportunity for testing
      const opportunity = opportunities[0];
      console.log('Using existing opportunity for tests:', opportunity.id);
      
      // Test 1: Create a contact identifier for the opportunity
      const contactIdentifier = await storage.createContactIdentifier({
        opportunityId: opportunity.id,
        type: "email",
        value: "secondary-test@example.com",
        isPrimary: false,
        source: "test"
      });
      console.log('Created contact identifier:', contactIdentifier);
      
      // Test 2: Find opportunity by contact identifier
      const foundEntity = await storage.findOpportunityOrClientByContactIdentifier("secondary-test@example.com", "email");
      console.log('Found by contact identifier:', foundEntity);
      
      // Test 3: Get contact identifiers for an opportunity
      const identifiers = await storage.getContactIdentifiers({ opportunityId: opportunity.id });
      console.log('Contact identifiers for opportunity:', identifiers);
      
      // Test 4: Create a communication for the opportunity
      const communication = await storage.createCommunication({
        opportunityId: opportunity.id,
        type: "email",
        direction: "outgoing",
        subject: "Test communication",
        bodyRaw: "This is a test message",
        timestamp: new Date()
      });
      console.log('Created communication:', communication);
      
      // Test 5: Get communications for the opportunity
      const communications = await storage.getCommunicationsForOpportunity(opportunity.id);
      console.log('Communications for opportunity:', communications);
    }
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

testMethods();
