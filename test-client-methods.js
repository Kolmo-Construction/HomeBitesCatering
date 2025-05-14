import { storage } from './server/storage.js';

async function testClientMethods() {
  try {
    // First, check if we have a client to work with
    const clients = await storage.listClients();
    console.log('Available clients:', clients.length > 0 ? 'Found clients' : 'No clients found');
    
    if (clients.length === 0) {
      console.log('No clients to test with.');
      return;
    }
    
    // Use the first client for testing
    const client = clients[0];
    console.log('Using existing client for tests:', client.id);
    
    // Test 1: Create a contact identifier for the client
    const contactIdentifier = await storage.createContactIdentifier({
      clientId: client.id,
      type: "email",
      value: "client-secondary@example.com",
      isPrimary: false,
      source: "test"
    });
    console.log('Created contact identifier for client:', contactIdentifier);
    
    // Test 2: Find client by contact identifier
    const foundEntity = await storage.findLeadOrClientByContactIdentifier("client-secondary@example.com", "email");
    console.log('Found by contact identifier:', foundEntity);
    
    // Test 3: Get contact identifiers for a client
    const identifiers = await storage.getContactIdentifiers({ clientId: client.id });
    console.log('Contact identifiers for client:', identifiers);
    
    // Test 4: Create a communication for the client
    const communication = await storage.createCommunication({
      clientId: client.id,
      type: "email",
      direction: "outgoing",
      subject: "Test client communication",
      bodyRaw: "This is a test message for a client",
      timestamp: new Date()
    });
    console.log('Created communication for client:', communication);
    
    // Test 5: Get communications for the client
    const communications = await storage.getCommunicationsForClient(client.id);
    console.log('Communications for client:', communications);
    
    console.log('All client tests completed successfully!');
  } catch (error) {
    console.error('Error during client tests:', error);
  }
}

testClientMethods();
