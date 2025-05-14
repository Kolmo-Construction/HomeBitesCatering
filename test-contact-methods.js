import { storage } from './server/storage.js';

async function testMethods() {
  try {
    // First, check if we have a lead to work with
    const leads = await storage.listLeads();
    console.log('Available leads:', leads.length > 0 ? 'Found leads' : 'No leads found');
    
    if (leads.length === 0) {
      console.log('No leads to test with. Creating a test lead...');
      const newLead = await storage.createLead({
        firstName: "Test",
        lastName: "Lead",
        email: "test@example.com",
        phone: "555-1234",
        eventType: "Test Event",
        status: "new"
      });
      console.log('Created test lead:', newLead);
      
      // Test 1: Create a contact identifier for the lead
      const contactIdentifier = await storage.createContactIdentifier({
        leadId: newLead.id,
        type: "email",
        value: "secondary@example.com",
        isPrimary: false,
        source: "test"
      });
      console.log('Created contact identifier:', contactIdentifier);
      
      // Test 2: Find lead by contact identifier
      const foundEntity = await storage.findLeadOrClientByContactIdentifier("secondary@example.com", "email");
      console.log('Found by contact identifier:', foundEntity);
      
      // Test 3: Get contact identifiers for a lead
      const identifiers = await storage.getContactIdentifiers({ leadId: newLead.id });
      console.log('Contact identifiers for lead:', identifiers);
      
      // Test 4: Create a communication for the lead
      const communication = await storage.createCommunication({
        leadId: newLead.id,
        type: "email",
        direction: "outgoing",
        subject: "Test communication",
        bodyRaw: "This is a test message",
        timestamp: new Date()
      });
      console.log('Created communication:', communication);
      
      // Test 5: Get communications for the lead
      const communications = await storage.getCommunicationsForLead(newLead.id);
      console.log('Communications for lead:', communications);
    } else {
      // Use the first lead for testing
      const lead = leads[0];
      console.log('Using existing lead for tests:', lead.id);
      
      // Test 1: Create a contact identifier for the lead
      const contactIdentifier = await storage.createContactIdentifier({
        leadId: lead.id,
        type: "email",
        value: "secondary-test@example.com",
        isPrimary: false,
        source: "test"
      });
      console.log('Created contact identifier:', contactIdentifier);
      
      // Test 2: Find lead by contact identifier
      const foundEntity = await storage.findLeadOrClientByContactIdentifier("secondary-test@example.com", "email");
      console.log('Found by contact identifier:', foundEntity);
      
      // Test 3: Get contact identifiers for a lead
      const identifiers = await storage.getContactIdentifiers({ leadId: lead.id });
      console.log('Contact identifiers for lead:', identifiers);
      
      // Test 4: Create a communication for the lead
      const communication = await storage.createCommunication({
        leadId: lead.id,
        type: "email",
        direction: "outgoing",
        subject: "Test communication",
        bodyRaw: "This is a test message",
        timestamp: new Date()
      });
      console.log('Created communication:', communication);
      
      // Test 5: Get communications for the lead
      const communications = await storage.getCommunicationsForLead(lead.id);
      console.log('Communications for lead:', communications);
    }
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

testMethods();
