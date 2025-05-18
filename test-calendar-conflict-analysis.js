/**
 * Test script for demonstrating the enhanced AI lead analysis with calendar conflict detection
 * 
 * This script shows how to use the enhanced AI lead analysis to extract information from
 * vendor emails while considering existing calendar bookings for better lead qualification.
 */

import { aiService } from './server/services/aiService.js';

// Sample vendor lead email
const testVendorEmail = `
Subject: [The Knot] New Lead - Sarah & Michael's Wedding - June 12th, 2025
From: vendor-notifications@theknot.com
To: info@homebitescatering.com

Hello Home Bites Catering,

A couple on The Knot is interested in your services for their wedding:

Couple: Sarah Johnson & Michael Smith
Event Date: June 12, 2025
Event Location: Willow Creek Estate, Portland
Guest Count: Approximately 125
Budget Range: $10,000-15,000

Message from Sarah:
"Hi! We're planning our wedding and love your farm-to-table approach to catering. We're especially interested in seasonal, locally-sourced menu options. We'd also need vegetarian and gluten-free options for some guests. Would love to schedule a tasting sometime next month if possible! You can reach me at sarah.j@email.com or 555-123-4567. Thanks, Sarah"

To respond to this inquiry, please log in to your vendor portal or reply directly to the couple.

The Knot - Vendor Success Team
`;

// Sample calendar conflict context
const calendarContext = `
Existing bookings:
- June 11, 2025: Corporate lunch (30 guests)
- June 12, 2025: Johnson-Williams Wedding (150 guests), all day
- June 13, 2025: Available
- June 14, 2025: Company Retreat (45 guests), evening only
- June 15, 2025: Available
`;

async function testVendorLeadWithCalendarContext() {
  try {
    console.log('\n=== Testing Enhanced Lead Analysis with Calendar Context ===\n');
    console.log('Sample Vendor Email:');
    console.log(testVendorEmail.substring(0, 150) + '...\n');
    
    console.log('Calendar Context:');
    console.log(calendarContext + '\n');
    
    console.log('Analyzing lead with calendar context...');
    
    // Call the enhanced AI lead analysis with calendar context
    const result = await aiService.analyzeLeadMessage(testVendorEmail, calendarContext);
    
    // Display key extracted information
    console.log('\nExtracted Information:');
    console.log('---------------------');
    console.log(`Prospect Name: ${result.extractedProspectName || 'Not found'}`);
    console.log(`Prospect Email: ${result.extractedProspectEmail || 'Not found'}`);
    console.log(`Prospect Phone: ${result.extractedProspectPhone || 'Not found'}`);
    console.log(`Event Type: ${result.extractedEventType || 'Not found'}`);
    console.log(`Event Date: ${result.extractedEventDate || 'Not found'}`);
    console.log(`Guest Count: ${result.extractedGuestCount || 'Not found'}`);
    console.log(`Budget: ${result.extractedBudgetIndication || 'Not mentioned'} ${result.extractedBudgetValue ? '($' + result.extractedBudgetValue + ')' : ''}`);
    
    // Display services needed
    if (result.extractedServicesNeeded && result.extractedServicesNeeded.length > 0) {
      console.log('\nServices Needed:');
      result.extractedServicesNeeded.forEach(service => console.log(`- ${service}`));
    }
    
    // Display AI analysis
    console.log('\nAI Analysis:');
    console.log('------------');
    console.log(`Lead Temperature: ${result.aiLeadTemperature || 'Not assessed'}`);
    console.log(`Urgency Score: ${result.aiUrgencyScore || 'Not assessed'} / 5`);
    console.log(`Clarity Score: ${result.aiClarityOfRequestScore || 'Not assessed'} / 5`);
    console.log(`Overall Quality: ${result.aiOverallLeadQuality || 'Not assessed'}`);
    
    // Display calendar conflict assessment
    console.log('\nCalendar Assessment:');
    console.log('-------------------');
    console.log(result.aiCalendarConflictAssessment || 'No assessment provided');
    
    // Display suggested next steps
    console.log('\nRecommended Next Step:');
    console.log('--------------------');
    console.log(result.aiSuggestedNextStep || 'No recommendation provided');
    
    // Display any potential red flags
    if (result.aiPotentialRedFlags && result.aiPotentialRedFlags.length > 0) {
      console.log('\nPotential Red Flags:');
      result.aiPotentialRedFlags.forEach(flag => console.log(`- ${flag}`));
    }
    
    console.log('\nMessage Summary:');
    console.log('---------------');
    console.log(result.extractedMessageSummary || 'No summary provided');
    
    // Display confidence score
    console.log(`\nAI Confidence Score: ${result.aiConfidenceScore ? (result.aiConfidenceScore * 100).toFixed(1) + '%' : 'Not provided'}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run without calendar context first
async function testVendorLeadWithoutCalendarContext() {
  try {
    console.log('\n=== Testing Basic Lead Analysis (No Calendar Context) ===\n');
    
    // Call the AI lead analysis without calendar context
    const result = await aiService.analyzeLeadMessage(testVendorEmail);
    
    // Display key extracted information
    console.log('\nExtracted Information:');
    console.log('---------------------');
    console.log(`Prospect Name: ${result.extractedProspectName || 'Not found'}`);
    console.log(`Event Date: ${result.extractedEventDate || 'Not found'}`);
    console.log(`Guest Count: ${result.extractedGuestCount || 'Not found'}`);
    
    // Display AI analysis
    console.log('\nAI Analysis:');
    console.log('------------');
    console.log(`Lead Temperature: ${result.aiLeadTemperature || 'Not assessed'}`);
    console.log(`Overall Quality: ${result.aiOverallLeadQuality || 'Not assessed'}`);
    
    // Note the absence of calendar assessment
    console.log('\nCalendar Assessment: Not available (no calendar context provided)');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the tests
async function runTests() {
  // First test without calendar context
  await testVendorLeadWithoutCalendarContext();
  
  // Then test with calendar context to show the difference
  await testVendorLeadWithCalendarContext();
  
  console.log('\n=== Test Summary ===');
  console.log('The test demonstrates how providing calendar context enhances lead analysis');
  console.log('by enabling conflict detection and more informed next-step recommendations.');
}

// Run all tests
runTests();