// Test script for email lead data extraction with AI
const { OpenAI } = require('openai');

async function extractLeadDataWithAI(emailContent, emailSubject, fromAddress) {
  console.log(`Testing Lead Data Extraction: Processing email with subject "${emailSubject}"`);
  
  try {
    // Prepare the full content for analysis
    const fullContent = `
Subject: ${emailSubject}
${fromAddress ? `From: ${fromAddress}` : ''}

${emailContent}
    `.trim();
    
    // Create a client for Open Router API
    const openRouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://catering-cms.replit.app',
        'X-Title': 'Catering CMS'
      }
    });
    
    // Define model ID for Open Router
    const MODEL_ID = 'anthropic/claude-3-haiku';
    
    console.log(`Sending request to AI model: ${MODEL_ID}`);
    
    const prompt = `
You are a lead analysis assistant for a catering business. 
Extract all relevant information from this message and analyze its quality as a lead.

Provide your output in the following JSON format ONLY, with empty or null values for fields you can't detect:
{
  "extractedName": "Full name of the sender if available",
  "extractedEmail": "Email address if present",
  "extractedPhone": "Phone number if present",
  "extractedEventType": "Type of event mentioned (wedding, corporate, etc.)",
  "extractedEventDate": "Event date in any format mentioned",
  "extractedEventTime": "Event time if mentioned",
  "extractedGuestCount": number of guests if mentioned (return as number, not string),
  "extractedVenue": "Venue name or location if mentioned",
  "extractedMessageSummary": "2-3 sentence summary of the message",
  "aiUrgencyScore": one of "1", "2", "3", "4", "5" (5 being most urgent),
  "aiBudgetIndication": one of "not_mentioned", "low", "medium", "high", "specific_amount",
  "aiBudgetValue": exact budget amount if mentioned (in whole dollar amount, numeric only),
  "aiClarityOfRequestScore": one of "1", "2", "3", "4", "5" (5 being very clear),
  "aiDecisionMakerLikelihood": one of "1", "2", "3", "4", "5" (5 being definitely a decision maker),
  "aiKeyRequirements": [array of key requirements mentioned],
  "aiPotentialRedFlags": [array of potential concerns or red flags],
  "aiOverallLeadQuality": one of "hot", "warm", "cold", "nurture",
  "aiSuggestedNextStep": "Your recommendation for how to follow up with this lead",
  "aiSentiment": one of "positive", "neutral", "negative", "urgent",
  "aiConfidenceScore": confidence in your analysis from 0.0 to 1.0
}

Here's the message to analyze:
${fullContent}`;

    const response = await openRouter.chat.completions.create({
      model: MODEL_ID,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content?.trim() || "{}";
    console.log("API Raw Response:", resultText);
    
    try {
      // Parse the JSON response
      const aiResults = JSON.parse(resultText);
      console.log("Lead Data Extraction: Successfully processed with AI");
      
      // Return the extracted data
      return {
        success: true,
        aiResults,
        rawResponse: resultText
      };
    } catch (jsonParseError) {
      console.error("Lead Data Extraction: JSON parsing error:", jsonParseError);
      console.error("Lead Data Extraction: Raw AI response:", resultText);
      
      return {
        success: false,
        error: jsonParseError.message,
        rawResponse: resultText
      };
    }
  } catch (error) {
    console.error("Lead Data Extraction: Critical error:", error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

// A sample message to analyze (simulating an email)
const testMessage1 = `
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

// A second test with different characteristics - vague request
const testMessage2 = `
Hi,

Need food for a wedding next month. Maybe 20-30 people? Not sure yet.
Let me know options and pricing.

Thanks
`;

// A third test with an urgent request
const testMessage3 = `
URGENT - Need catering for tomorrow

Our regular caterer cancelled on us and we desperately need someone 
to provide lunch for our business meeting tomorrow. It's for 15 people
at our downtown office. We need food by noon. 

Can you help? Please call me ASAP at 555-123-4567.

- Jennifer
`;

async function runTest() {
  try {
    console.log('Running lead extraction tests...');
    
    console.log('\n\n--- Test 1: Detailed Corporate Request ---');
    console.log('Sample message:\n', testMessage1.slice(0, 150) + '...');
    
    const result1 = await extractLeadDataWithAI(
      testMessage1,
      "Annual Corporate Holiday Party Inquiry",
      "sarah.johnson@acmetech.com"
    );
    
    console.log('\nAI Extraction Result:');
    console.log(JSON.stringify(result1.aiResults, null, 2));
    
    console.log('\n\n--- Test 2: Vague Wedding Request ---');
    console.log('Sample message:\n', testMessage2);
    
    const result2 = await extractLeadDataWithAI(
      testMessage2,
      "Wedding catering question",
      "unknown@mail.com"
    );
    
    console.log('\nAI Extraction Result:');
    console.log(JSON.stringify(result2.aiResults, null, 2));
    
    console.log('\n\n--- Test 3: Urgent Last-Minute Request ---');
    console.log('Sample message:\n', testMessage3);
    
    const result3 = await extractLeadDataWithAI(
      testMessage3,
      "URGENT - Need catering for tomorrow",
      "jennifer@company.com"
    );
    
    console.log('\nAI Extraction Result:');
    console.log(JSON.stringify(result3.aiResults, null, 2));
    
  } catch (error) {
    console.error('Error during lead extraction test:', error);
  }
}

// Run the test
runTest();