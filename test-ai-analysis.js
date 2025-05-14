// Test script for the AI service
const { aiService } = require('./server/services/aiService');

// A sample message to analyze (simulating an email)
const testMessage = `
Hello!

I'm reaching out because we're planning our annual corporate holiday party on December
15th, 2025. We're looking for a caterer who can handle approximately 75-100 people
at our office in downtown Seattle. Our budget is around $4,000-5,000, and we'd like
to have a mix of appetizers, a main course, and desserts.

Could you provide a quote and tell me what your availability is for that date?
We'll need service from 6 PM to 9 PM.

I'd also like to know if you can accommodate dietary restrictions (we have several
vegetarians and a few people with gluten allergies).

Thank you,
Sarah Johnson
Marketing Director
Acme Technologies
Phone: 206-555-7890
`;

// A second test with different characteristics
const testMessage2 = `
Hi,

Need food for a thing next week. Maybe 20 people? Not sure yet.
Let me know what you've got.

Thanks
`;

async function runTest() {
  try {
    console.log('Running AI analysis test...');
    
    console.log('\n--- Test 1: Detailed Corporate Request ---');
    console.log('Sample message:\n', testMessage.slice(0, 150) + '...');
    
    const result1 = await aiService.analyzeLeadMessage(testMessage);
    console.log('\nAI Analysis Result:');
    console.log(JSON.stringify(result1, null, 2));
    
    console.log('\n--- Test 2: Vague Request ---');
    console.log('Sample message:\n', testMessage2);
    
    const result2 = await aiService.analyzeLeadMessage(testMessage2);
    console.log('\nAI Analysis Result:');
    console.log(JSON.stringify(result2, null, 2));
    
    console.log('\n--- Testing Summary Generation ---');
    const summary = await aiService.generateSummary(testMessage);
    console.log('Summary of Test Message 1:');
    console.log(summary);
    
  } catch (error) {
    console.error('Error during AI analysis test:', error);
  }
}

// Run the test
runTest();