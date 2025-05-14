import { storage } from './server/storage.js';

async function testUpdateDeleteMethods() {
  try {
    // Test update on contactIdentifier ID 3 (the one we just created for the client)
    const updated = await storage.updateContactIdentifier(3, {
      isPrimary: true,
      source: "updated_source"
    });
    console.log('Updated contact identifier:', updated);
    
    // Create a temporary identifier to test deletion
    const tempIdentifier = await storage.createContactIdentifier({
      leadId: 2, // Using the lead ID we tested earlier
      type: "email",
      value: "temp-to-delete@example.com",
      isPrimary: false,
      source: "temp"
    });
    console.log('Created temporary identifier for deletion:', tempIdentifier);
    
    // Now delete it
    const deleteResult = await storage.deleteContactIdentifier(tempIdentifier.id);
    console.log('Delete result:', deleteResult);
    
    // Verify it's deleted by trying to get identifiers for the lead
    const identifiers = await storage.getContactIdentifiers({ leadId: 2 });
    console.log('After deletion, contact identifiers for lead 2:', identifiers);
    
    console.log('All update/delete tests completed successfully!');
  } catch (error) {
    console.error('Error during update/delete tests:', error);
  }
}

testUpdateDeleteMethods();
