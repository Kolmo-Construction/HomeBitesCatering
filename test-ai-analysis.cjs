// Test script for the AI service with CommonJS syntax
const { OpenAI } = require('openai');

// Create a client for Open Router
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://catering-cms.replit.app',
    'X-Title': 'Catering CMS'
  }
});

// Model ID for Open Router
// Original model: deepseek/deepseek-v3-0324
// Let's try the Claude Haiku model which is widely available on OpenRouter
const MODEL_ID = 'anthropic/claude-3-haiku';

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

async function analyzeLeadMessage(message) {
  try {
    if (!message || message.trim().length === 0) {
      return {};
    }

    console.log(`AI Lead Analysis: Sending message of length ${message.length} to DeepSeek...`);
    
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
${message}`;

    const response = await openRouter.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content?.trim() || "{}";
    console.log("\nAPI Response:\n", resultText);
    
    try {
      // Parse the JSON response
      const result = JSON.parse(resultText);
      return result;
    } catch (parseError) {
      console.error("AI Lead Analysis JSON Parsing Error:", parseError);
      return {
        extractedMessageSummary: "Error parsing AI response."
      };
    }
  } catch (error) {
    console.error("AI Lead Analysis Error:", error);
    return {
      extractedMessageSummary: "Error analyzing message with AI."
    };
  }
}

async function generateSummary(text) {
  try {
    console.log(`AI Summarization: Sending text of length ${text.length} to DeepSeek...`);
    
    const response = await openRouter.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes texts concisely. Create a brief summary that captures the main points. Be factual and direct.'
        },
        {
          role: 'user',
          content: `Please summarize the following text in 2-3 sentences:\n\n${text}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const summary = response.choices[0]?.message?.content?.trim() || "Unable to generate summary.";
    return summary;
  } catch (error) {
    console.error("AI Summarization Error:", error);
    return "Error generating summary.";
  }
}

async function runTest() {
  try {
    console.log('Running AI analysis test...');
    
    console.log('\n--- Test 1: Detailed Corporate Request ---');
    console.log('Sample message:\n', testMessage.slice(0, 150) + '...');
    
    const result = await analyzeLeadMessage(testMessage);
    console.log('\nAI Analysis Result:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n--- Testing Summary Generation ---');
    const summary = await generateSummary(testMessage);
    console.log('Summary:');
    console.log(summary);
    
  } catch (error) {
    console.error('Error during AI analysis test:', error);
  }
}

// Run the test
runTest();