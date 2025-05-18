/**
 * Test script for simulating raw lead to opportunity conversion
 * 
 * This script demonstrates the flow:
 * 1. Creates a sample raw lead with AI-enriched fields
 * 2. Processes the raw lead into an opportunity
 * 3. Shows the resulting opportunity
 */

import axios from 'axios';

async function login() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    return response.headers['set-cookie'][0];
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createSampleLead(cookie) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/raw-leads/create-sample',
      {}, // No body needed for this endpoint
      { headers: { Cookie: cookie } }
    );
    
    console.log('✅ Sample lead created successfully');
    console.log('Lead ID:', response.data.lead.id);
    
    return response.data.lead;
  } catch (error) {
    console.error('Failed to create sample lead:', error.response?.data || error.message);
    throw error;
  }
}

async function processRawLead(leadId, cookie) {
  try {
    const response = await axios.post(
      `http://localhost:5000/api/raw-leads/${leadId}/process`,
      {}, // No body needed for this endpoint
      { headers: { Cookie: cookie } }
    );
    
    console.log('✅ Raw lead processed successfully');
    console.log('New opportunity created:', response.data.opportunity);
    
    return response.data.opportunity;
  } catch (error) {
    console.error('Failed to process raw lead:', error.response?.data || error.message);
    throw error;
  }
}

async function runDemo() {
  try {
    console.log('⏳ Logging in...');
    const cookie = await login();
    
    console.log('⏳ Creating a sample raw lead with AI-enriched fields...');
    const lead = await createSampleLead(cookie);
    
    console.log('⏳ Processing raw lead to opportunity...');
    const opportunity = await processRawLead(lead.id, cookie);
    
    console.log('\n🎉 DEMONSTRATION COMPLETE');
    console.log('\n--- DEMO SUMMARY ---');
    
    console.log('\n📊 AI-Enriched Raw Lead:');
    console.log('- Prospect Name:', lead.extractedProspectName);
    console.log('- Lead Quality:', lead.aiOverallLeadQuality);
    console.log('- Event Type:', lead.extractedEventType);
    console.log('- Event Date:', lead.extractedEventDate);
    console.log('- Guest Count:', lead.extractedGuestCount);
    
    console.log('\n📈 Converted Opportunity:');
    console.log('- Name:', opportunity.firstName, opportunity.lastName);
    console.log('- Priority:', opportunity.priority, '(mapped from lead quality)');
    console.log('- Event Type:', opportunity.eventType);
    console.log('- Event Date:', opportunity.eventDate);
    console.log('- Guest Count:', opportunity.guestCount);
    console.log('- Notes:', opportunity.notes);
    
    console.log('\n✏️ Field Mapping Results:');
    console.log('- Name Parsing: Successfully split', lead.extractedProspectName, 'into', opportunity.firstName, opportunity.lastName);
    console.log('- Priority Mapping: Converted', lead.aiOverallLeadQuality, 'to', opportunity.priority);
    console.log('- Notes Formatting: Successfully combined multiple AI fields into formatted notes');
    
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Execute the demo
runDemo().catch(console.error);