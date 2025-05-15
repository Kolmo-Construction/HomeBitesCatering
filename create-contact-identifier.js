// create-contact-identifier.js
const { db } = require('./server/db');
const { contactIdentifiers } = require('./shared/schema');

async function createContactIdentifier() {
  try {
    // Create a contact identifier for Opportunity #1
    const [result] = await db.insert(contactIdentifiers).values({
      opportunityId: 1,
      type: 'email',
      value: 'projects@kolmo.io',
      isPrimary: true,
      source: 'manual'
    }).returning();
    
    console.log('Created contact identifier:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createContactIdentifier();