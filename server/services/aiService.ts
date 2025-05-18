import { OpenAI } from 'openai';

// Open Router integration with the latest client format
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://catering-cms.replit.app',
    'X-Title': 'Catering CMS'
  }
});

// OpenRouter model IDs
// Primary model: DeepSeek V3 0324 as specified by user
const OPENROUTER_MODEL_ID = 'deepseek/deepseek-chat-v3-0324:free';
// First fallback: Gemini 2.0 Flash via OpenRouter
const GEMINI_MODEL_ID = 'google/gemini-2.0-flash-exp:free';
// Final fallback: Claude Haiku via OpenRouter
const CLAUDE_MODEL_ID = 'anthropic/claude-3-haiku';

/**
 * AI Service that provides various AI capabilities using 
 * DeepSeek as primary model, with Gemini and Claude as fallbacks
 */
export class AIService {
  /**
   * Generates a summary of a text using the AI model cascade
   */
  async generateSummary(text: string): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        return "No content to summarize.";
      }

      console.log(`AI Summarization: Sending text of length ${text.length} to DeepSeek via OpenRouter...`);

      const response = await openRouter.chat.completions.create({
        model: OPENROUTER_MODEL_ID,
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
      
      // Fallback to Claude if DeepSeek fails
      try {
        console.log("AI Summarization: Falling back to Claude...");
        const response = await openRouter.chat.completions.create({
          model: CLAUDE_MODEL_ID,
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
        console.log("AI Summarization: Summary generated successfully with fallback model.");
        return summary;
      } catch (fallbackError) {
        console.error("AI Summarization Fallback Error:", fallbackError);
        return "Error generating summary.";
      }
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
      
      // Try DeepSeek model via OpenRouter first
      try {
        console.log("AI Sentiment Analysis: Using DeepSeek via OpenRouter for sentiment analysis");
        
        const response = await openRouter.chat.completions.create({
          model: OPENROUTER_MODEL_ID,
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
          console.log(`AI Sentiment Analysis: DeepSeek detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`);
          return {
            sentiment: result.sentiment as 'positive' | 'neutral' | 'negative' | 'urgent',
            confidence: result.confidence
          };
        }
        throw new Error("Invalid response format from DeepSeek");
      } catch (deepseekError) {
        console.error("DeepSeek Sentiment Analysis Error:", deepseekError);
        
        // Try Gemini via OpenRouter as first fallback
        try {
          console.log("AI Sentiment Analysis: Falling back to Gemini via OpenRouter for sentiment analysis");
          
          const response = await openRouter.chat.completions.create({
            model: GEMINI_MODEL_ID,
            messages: [
              {
                role: 'user',
                content: `You are a sentiment analysis expert focusing on business communications. 
                Analyze the sentiment of emails and messages, categorizing them as one of:
                - positive: Email/message expresses satisfaction, agreement, enthusiasm, happiness
                - negative: Email/message expresses dissatisfaction, complaints, anger, frustration
                - urgent: Email/message requires immediate attention, indicates time-sensitivity or emergencies
                - neutral: Email/message is informational, has balanced sentiment, or is purely transactional
                
                Your response must be in JSON format with two fields:
                - sentiment: one of "positive", "neutral", "negative", or "urgent"
                - confidence: a number from 0 to 1 representing your confidence in the analysis
                
                Be extremely sparing with marking things as "urgent" - only use for true time-sensitive matters.
                
                Here's the text to analyze:
                ${text}`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
          
          const resultText = response.choices[0]?.message?.content?.trim() || "{}";
          const result = JSON.parse(resultText);
          
          if (result.sentiment && typeof result.confidence === 'number') {
            console.log(`AI Sentiment Analysis: Gemini detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`);
            return {
              sentiment: result.sentiment as 'positive' | 'neutral' | 'negative' | 'urgent',
              confidence: result.confidence
            };
          }
          throw new Error("Invalid response format from Gemini");
        } catch (geminiError) {
          console.error("Gemini Sentiment Analysis Error:", geminiError);
          // Fall back to Claude via OpenRouter
        }
      }
      
      // Final fallback to Claude
      console.log("AI Sentiment Analysis: Falling back to Claude via OpenRouter for sentiment analysis");
      
      const response = await openRouter.chat.completions.create({
        model: CLAUDE_MODEL_ID,
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
          console.log(`AI Sentiment Analysis: Claude detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`);
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
   * Helper method to process lead analysis response from any model
   */
  private processLeadAnalysisResponse(resultText: string) {
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
      if (result.extractedBudgetValue && typeof result.extractedBudgetValue === 'string') {
        const parsedBudget = parseInt(result.extractedBudgetValue, 10);
        if (!isNaN(parsedBudget)) {
          result.extractedBudgetValue = parsedBudget;
        }
      }

      // Ensure arrays are actually arrays
      if (!Array.isArray(result.extractedServicesNeeded)) {
        result.extractedServicesNeeded = [];
      }

      if (!Array.isArray(result.aiPotentialRedFlags)) {
        result.aiPotentialRedFlags = [];
      }

      // Handle backward compatibility with previous field names
      if (result.extractedName && !result.extractedProspectName) {
        result.extractedProspectName = result.extractedName;
      }
      
      if (result.extractedEmail && !result.extractedProspectEmail) {
        result.extractedProspectEmail = result.extractedEmail;
      }
      
      if (result.extractedPhone && !result.extractedProspectPhone) {
        result.extractedProspectPhone = result.extractedPhone;
      }
      
      if (result.aiBudgetIndication && !result.extractedBudgetIndication) {
        result.extractedBudgetIndication = result.aiBudgetIndication;
      }
      
      if (result.aiBudgetValue && !result.extractedBudgetValue) {
        result.extractedBudgetValue = result.aiBudgetValue;
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
  }

  /**
   * Analyzes an email or message to extract structured information and insights
   * @param message The email or message content to analyze
   * @param calendarConflictContext Optional context about calendar conflicts for the potential event date
   */
  async analyzeLeadMessage(message: string, calendarConflictContext?: string): Promise<{
    extractedProspectName?: string;
    extractedProspectEmail?: string;
    extractedProspectPhone?: string;
    extractedEventType?: string;
    extractedEventDate?: string;
    extractedEventTime?: string;
    extractedGuestCount?: number;
    extractedVenue?: string;
    extractedBudgetIndication?: string;
    extractedBudgetValue?: number;
    extractedServicesNeeded?: string[];
    extractedMessageSummary?: string;
    aiLeadTemperature?: string;
    aiUrgencyScore?: string;
    aiClarityOfRequestScore?: string;
    aiCalendarConflictAssessment?: string;
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

      console.log(`AI Lead Analysis: Sending message of length ${message.length} to DeepSeek via OpenRouter...`);

      const prompt = `
You are an expert lead analysis assistant for 'Home Bites Catering'.
Your task is to meticulously extract all relevant information from vendor lead emails and assess the lead's quality.
The email provided might be from a vendor (e.g., Zola, WeddingWire) forwarding a prospect's inquiry.

Priority: Extract the actual PROSPECT'S details (name, email, phone) from the email body/content, NOT the vendor's.

Calendar Context: ${calendarConflictContext || "No specific calendar conflicts provided for the proposed date."} 

Provide your output ONLY in the following JSON format. Fill fields with null if not found or not applicable.
{
  "extractedProspectName": "Full name of the inquiring prospect (e.g., Jane Doe)",
  "extractedProspectEmail": "Direct email address of the prospect, if found in the body",
  "extractedProspectPhone": "Direct phone number of the prospect, if found in the body",
  "extractedEventType": "Type of event (e.g., Wedding, Corporate Dinner, Birthday Party)",
  "extractedEventDate": "Event date (YYYY-MM-DD if possible, otherwise as mentioned)",
  "extractedEventTime": "Event time if mentioned",
  "extractedGuestCount": "Number of guests (numeric), if mentioned",
  "extractedVenue": "Venue name or location, if mentioned",
  "extractedBudgetIndication": "one of 'not_mentioned', 'low', 'medium', 'high', 'specific_amount'",
  "extractedBudgetValue": "Exact budget amount (numeric, in dollars), if specified",
  "extractedServicesNeeded": ["Specific services prospect is asking for (e.g., 'Full Catering', 'Taco Truck Option', 'Buffet Style')"],
  "extractedMessageSummary": "A 2-3 sentence summary of the PROSPECT'S core request or message.",
  "aiLeadTemperature": "one of 'hot', 'warm', 'cold' (based on urgency, specificity, budget, clarity)",
  "aiUrgencyScore": "one of '1' (low) to '5' (very urgent)",
  "aiClarityOfRequestScore": "one of '1' (vague) to '5' (very clear)",
  "aiCalendarConflictAssessment": "Brief assessment of calendar conflict based on provided context (e.g., 'No conflict', 'Potential conflict: Wedding on same day', 'Date flexible, check availability')",
  "aiPotentialRedFlags": ["Array of potential concerns or red flags (e.g., 'Very low budget for guest count', 'Unrealistic expectations', 'Vague inquiry')"],
  "aiOverallLeadQuality": "one of 'hot', 'warm', 'cold', 'nurture' (overall assessment)",
  "aiSuggestedNextStep": "Your concise recommendation for the BEST immediate next step for Home Bites Catering (e.g., 'Reply asking for guest count', 'Send standard wedding package info', 'Propose a consultation call', 'Politely decline due to date conflict, offer alternatives')",
  "aiSentiment": "one of 'positive', 'neutral', 'negative', 'urgent' (sentiment of the prospect's message)",
  "aiConfidenceScore": "Confidence in your analysis from 0.0 to 1.0"
}

Email to analyze:
${message}`;

      // Try DeepSeek first (primary model)
      try {
        const response = await openRouter.chat.completions.create({
          model: OPENROUTER_MODEL_ID,
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
        
        return this.processLeadAnalysisResponse(response.choices[0]?.message?.content?.trim() || "{}");
      } catch (deepseekError) {
        console.error("AI Lead Analysis DeepSeek Error:", deepseekError);
        console.log("AI Lead Analysis: Falling back to Gemini...");
        
        // Try Gemini as first fallback
        try {
          const response = await openRouter.chat.completions.create({
            model: GEMINI_MODEL_ID,
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
          
          return this.processLeadAnalysisResponse(response.choices[0]?.message?.content?.trim() || "{}");
        } catch (geminiError) {
          console.error("AI Lead Analysis Gemini Error:", geminiError);
          console.log("AI Lead Analysis: Falling back to Claude...");
          
          // Finally try Claude
          const response = await openRouter.chat.completions.create({
            model: CLAUDE_MODEL_ID,
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
          
          return this.processLeadAnalysisResponse(response.choices[0]?.message?.content?.trim() || "{}");
        }
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