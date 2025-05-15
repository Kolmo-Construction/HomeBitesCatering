import { OpenAI } from 'openai';

// Open Router needs an OpenAI-compatible client with a different baseURL
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://catering-cms.replit.app',
    'X-Title': 'Catering CMS'
  }
});

// Check for OpenAI API key
const openaiEnabled = !!process.env.OPENAI_API_KEY;
// OpenAI client for direct API calls
const openai = openaiEnabled ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Model ID for Open Router
// Initial choice was DeepSeek V3 0324, but switched to Claude Haiku for availability
const AI_MODEL_ID = 'anthropic/claude-3-haiku';
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL_ID = 'gpt-4o';

/**
 * AI Service that provides various AI capabilities using Claude via Open Router
 * and OpenAI for specialized tasks
 */
export class AIService { // <-- ADDED export keyword here
  /**
   * Generates a summary of a text using Claude
   */
  async generateSummary(text: string): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        return "No content to summarize.";
      }

      console.log(`AI Summarization: Sending text of length ${text.length} to Claude via OpenRouter...`);

      const response = await openRouter.chat.completions.create({
        model: AI_MODEL_ID,
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
      console.log("AI Summarization: Summary generated successfully.");
      return summary;
    } catch (error) {
      console.error("AI Summarization Error:", error);
      return "Error generating summary.";
    }
  }
  
  /**
   * Analyzes the sentiment of a text and returns a sentiment category and confidence score
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
    confidence: number;
  }> {
    try {
      if (!text || text.trim().length === 0) {
        return { sentiment: 'neutral', confidence: 0 };
      }
      
      console.log(`AI Sentiment Analysis: Processing text of length ${text.length}`);
      
      // Prefer using OpenAI if available as it handles sentiment better
      if (openaiEnabled && openai) {
        try {
          console.log("AI Sentiment Analysis: Using OpenAI for sentiment analysis");
          
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL_ID,
            messages: [
              {
                role: 'system',
                content: `You are a sentiment analysis expert focusing on business communications. 
                Analyze the sentiment of emails and messages, categorizing them as one of:
                - positive: Email/message expresses satisfaction, agreement, enthusiasm, happiness
                - negative: Email/message expresses dissatisfaction, complaints, anger, frustration
                - urgent: Email/message requires immediate attention, indicates time-sensitivity or emergencies
                - neutral: Email/message is informational, has balanced sentiment, or is purely transactional
                
                Your response must be in JSON format with two fields:
                - sentiment: one of "positive", "neutral", "negative", or "urgent"
                - confidence: a number from 0 to 1 representing your confidence in the analysis
                
                Be extremely sparing with marking things as "urgent" - only use for true time-sensitive matters.`
              },
              {
                role: 'user',
                content: text
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
          
          const resultText = response.choices[0]?.message?.content?.trim() || "{}";
          const result = JSON.parse(resultText);
          
          if (result.sentiment && typeof result.confidence === 'number') {
            console.log(`AI Sentiment Analysis: OpenAI detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`);
            return {
              sentiment: result.sentiment as 'positive' | 'neutral' | 'negative' | 'urgent',
              confidence: result.confidence
            };
          }
          throw new Error("Invalid response format from OpenAI");
        } catch (openaiError) {
          console.error("OpenAI Sentiment Analysis Error:", openaiError);
          // Fall back to Claude via OpenRouter
        }
      }
      
      // Fallback to OpenRouter/Claude if OpenAI is unavailable or had an error
      console.log("AI Sentiment Analysis: Using Claude via OpenRouter for sentiment analysis");
      
      const response = await openRouter.chat.completions.create({
        model: AI_MODEL_ID,
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert focusing on business communications. 
            Your task is to analyze the sentiment of emails and messages.`
          },
          {
            role: 'user',
            content: `Analyze the sentiment of the following text. Respond ONLY with a JSON object with two fields:
            - sentiment: one of "positive", "neutral", "negative", or "urgent"
            - confidence: a number from 0 to 1 representing your confidence
            
            Text to analyze:
            ${text}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      const resultText = response.choices[0]?.message?.content?.trim() || "{}";
      
      try {
        const result = JSON.parse(resultText);
        
        if (result.sentiment && typeof result.confidence === 'number') {
          console.log(`AI Sentiment Analysis: Detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`);
          return {
            sentiment: result.sentiment as 'positive' | 'neutral' | 'negative' | 'urgent',
            confidence: result.confidence
          };
        }
        
        console.warn("AI Sentiment Analysis: Invalid response format, using fallback");
        return { sentiment: 'neutral', confidence: 0.5 };
      } catch (parseError) {
        console.error("AI Sentiment Analysis Parsing Error:", parseError);
        return { sentiment: 'neutral', confidence: 0 };
      }
    } catch (error) {
      console.error("AI Sentiment Analysis Error:", error);
      return { sentiment: 'neutral', confidence: 0 };
    }
  }

  /**
   * Analyzes an email or message to extract structured information and insights
   */
  async analyzeLeadMessage(message: string): Promise<{
    extractedName?: string;
    extractedEmail?: string;
    extractedPhone?: string;
    extractedEventType?: string;
    extractedEventDate?: string;
    extractedEventTime?: string;
    extractedGuestCount?: number;
    extractedVenue?: string;
    extractedMessageSummary?: string;
    aiUrgencyScore?: string;
    aiBudgetIndication?: string;
    aiBudgetValue?: number;
    aiClarityOfRequestScore?: string;
    aiDecisionMakerLikelihood?: string;
    aiKeyRequirements?: string[];
    aiPotentialRedFlags?: string[];
    aiOverallLeadQuality?: string;
    aiSuggestedNextStep?: string;
    aiSentiment?: string;
    aiConfidenceScore?: number;
  }> {
    try {
      if (!message || message.trim().length === 0) {
        return {};
      }

      console.log(`AI Lead Analysis: Sending message of length ${message.length} to Claude via OpenRouter...`);

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
        model: AI_MODEL_ID,
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

      try {
        // Parse the JSON response
        const result = JSON.parse(resultText);

        // Convert guest count to number if present
        if (result.extractedGuestCount && typeof result.extractedGuestCount === 'string') {
          const parsedCount = parseInt(result.extractedGuestCount, 10);
          if (!isNaN(parsedCount)) {
            result.extractedGuestCount = parsedCount;
          }
        }

        // Convert budget value to number if present
        if (result.aiBudgetValue && typeof result.aiBudgetValue === 'string') {
          const parsedBudget = parseInt(result.aiBudgetValue, 10);
          if (!isNaN(parsedBudget)) {
            result.aiBudgetValue = parsedBudget;
          }
        }

        // Ensure arrays are actually arrays
        if (!Array.isArray(result.aiKeyRequirements)) {
          result.aiKeyRequirements = [];
        }

        if (!Array.isArray(result.aiPotentialRedFlags)) {
          result.aiPotentialRedFlags = [];
        }

        console.log("AI Lead Analysis: Analysis completed successfully.");
        return result;
      } catch (parseError) {
        console.error("AI Lead Analysis JSON Parsing Error:", parseError);
        return {
          extractedMessageSummary: "Error parsing AI response.",
          aiOverallLeadQuality: "cold",
          aiConfidenceScore: 0
        };
      }
    } catch (error) {
      console.error("AI Lead Analysis Error:", error);
      return {
        extractedMessageSummary: "Error analyzing message with AI.",
        aiOverallLeadQuality: "cold",
        aiConfidenceScore: 0
      };
    }
  }
}

// Export a singleton instance
export const aiService = new AIService();