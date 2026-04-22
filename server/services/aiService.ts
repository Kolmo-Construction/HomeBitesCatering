import { createChatCompletion, hasLlmProvider, LlmProvider } from "./llmClient";

function providerLabel(provider: LlmProvider): string {
  return provider === "gemini-2.0-flash" ? "Gemini 2.0 Flash (Google direct)" : "DeepSeek V3 (native API)";
}

export class AIService {
  async generateSummary(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return "No content to summarize.";
    }

    try {
      console.log(`AI Summarization: Sending text of length ${text.length} to DeepSeek...`);
      const { content, provider } = await createChatCompletion({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes texts concisely. Create a brief summary that captures the main points. Be factual and direct.",
          },
          {
            role: "user",
            content: `Please summarize the following text in 2-3 sentences:\n\n${text}`,
          },
        ],
        maxTokens: 300,
        temperature: 0.3,
      });

      console.log(`AI Summarization: Summary generated via ${provider}.`);
      return content || "Unable to generate summary.";
    } catch (error) {
      console.error("AI Summarization Error:", error);
      return "Error generating summary.";
    }
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "urgent";
    confidence: number;
  }> {
    if (!text || text.trim().length === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    console.log(`AI Sentiment Analysis: Processing text of length ${text.length}`);

    try {
      const { content, provider } = await createChatCompletion({
        messages: [
          {
            role: "system",
            content: `You are a sentiment analysis expert focusing on business communications.
Analyze the sentiment of emails and messages, categorizing them as one of:
- positive: Email/message expresses satisfaction, agreement, enthusiasm, happiness
- negative: Email/message expresses dissatisfaction, complaints, anger, frustration
- urgent: Email/message requires immediate attention, indicates time-sensitivity or emergencies
- neutral: Email/message is informational, has balanced sentiment, or is purely transactional

Your response must be in JSON format with two fields:
- sentiment: one of "positive", "neutral", "negative", or "urgent"
- confidence: a number from 0 to 1 representing your confidence in the analysis

Be extremely sparing with marking things as "urgent" - only use for true time-sensitive matters.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        json: true,
      });

      try {
        const result = JSON.parse(content);
        if (result.sentiment && typeof result.confidence === "number") {
          console.log(
            `AI Sentiment Analysis: ${provider} detected sentiment: ${result.sentiment} (confidence: ${result.confidence})`,
          );
          return {
            sentiment: result.sentiment as "positive" | "neutral" | "negative" | "urgent",
            confidence: result.confidence,
          };
        }
        console.warn("AI Sentiment Analysis: Invalid response format, using fallback");
        return { sentiment: "neutral", confidence: 0.5 };
      } catch (parseError) {
        console.error("AI Sentiment Analysis Parsing Error:", parseError);
        return { sentiment: "neutral", confidence: 0 };
      }
    } catch (error) {
      console.error("AI Sentiment Analysis Error:", error);
      return { sentiment: "neutral", confidence: 0 };
    }
  }

  private processLeadAnalysisResponse(resultText: string) {
    try {
      const result = JSON.parse(resultText);

      if (result.extractedGuestCount && typeof result.extractedGuestCount === "string") {
        const parsedCount = parseInt(result.extractedGuestCount, 10);
        if (!isNaN(parsedCount)) {
          result.extractedGuestCount = parsedCount;
        }
      }

      if (result.extractedBudgetValue && typeof result.extractedBudgetValue === "string") {
        const parsedBudget = parseInt(result.extractedBudgetValue, 10);
        if (!isNaN(parsedBudget)) {
          result.extractedBudgetValue = parsedBudget;
        }
      }

      if (!Array.isArray(result.extractedServicesNeeded)) {
        result.extractedServicesNeeded = [];
      }

      if (!Array.isArray(result.aiPotentialRedFlags)) {
        result.aiPotentialRedFlags = [];
      }

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
        aiConfidenceScore: 0,
      };
    }
  }

  async analyzeLeadMessage(message: string): Promise<{
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
    aiUrgencyReason?: string;
    aiClarityOfRequestScore?: string;
    aiClarityReason?: string;
    aiBudgetReason?: string;
    aiPotentialRedFlags?: string[];
    aiOverallLeadQuality?: string;
    aiSuggestedNextStep?: string;
    aiSentiment?: string;
    aiConfidenceScore?: number;
  }> {
    if (!message || message.trim().length === 0) {
      return {};
    }

    console.log(`AI Lead Analysis: Sending message of length ${message.length} to DeepSeek...`);

    const prompt = `
You are an expert lead analysis assistant for 'Home Bites Catering'.
Your task is to meticulously extract all relevant information from vendor lead emails and assess the lead's quality.
The email provided might be from a vendor (e.g., Zola, WeddingWire) forwarding a prospect's inquiry.

Priority: Extract the actual PROSPECT'S details (name, email, phone) from the email body/content, NOT the vendor's.

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
  "aiUrgencyReason": "Brief 1-sentence explanation of WHY you assigned this urgency score",
  "aiClarityOfRequestScore": "one of '1' (vague) to '5' (very clear)",
  "aiClarityReason": "Brief 1-sentence explanation of WHY you assigned this clarity score",
  "aiBudgetReason": "Brief 1-sentence explanation of what budget signals you detected (or lack thereof)",
  "aiPotentialRedFlags": ["Array of potential concerns or red flags (e.g., 'Very low budget for guest count', 'Unrealistic expectations', 'Vague inquiry')"],
  "aiOverallLeadQuality": "one of 'hot', 'warm', 'cold', 'nurture' (overall assessment)",
  "aiSuggestedNextStep": "Your concise recommendation for the BEST immediate next step for Home Bites Catering (e.g., 'Reply asking for guest count', 'Send standard wedding package info', 'Propose a consultation call', 'Politely decline due to date conflict, offer alternatives')",
  "aiSentiment": "one of 'positive', 'neutral', 'negative', 'urgent' (sentiment of the prospect's message)",
  "aiConfidenceScore": "Confidence in your analysis from 0.0 to 1.0"
}

Email to analyze:
${message}`;

    try {
      const { content } = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 1500,
        temperature: 0.2,
        json: true,
      });
      return this.processLeadAnalysisResponse(content);
    } catch (error) {
      console.error("AI Lead Analysis Error:", error);
      return {
        extractedMessageSummary: "Error analyzing message with AI.",
        aiOverallLeadQuality: "cold",
        aiConfidenceScore: 0,
      };
    }
  }

  async extractLeadDataFromEmail(emailData: {
    subject: string;
    from: string;
    bodyText: string;
    bodyHtml?: string;
    receivedDate: Date;
  }): Promise<any> {
    console.log(`AI Email Extraction: Processing email "${emailData.subject}" from ${emailData.from}`);

    const prompt = `You are an expert at analyzing catering inquiry emails. Extract structured data from this email.

Email Details:
Subject: ${emailData.subject}
From: ${emailData.from}
Received: ${emailData.receivedDate.toISOString()}

Email Body:
${emailData.bodyText}

Extract the following information and return it as JSON:

{
  "parser_metadata": {
    "source_system": "string (e.g., 'WeddingWire', 'The Knot', 'Direct Email', etc. - try to detect from email content)",
    "received_timestamp": "${emailData.receivedDate.toISOString()}",
    "forwarded_by": "string or null (if this appears to be forwarded)",
    "internal_sender_email": "${emailData.from}",
    "extracted_by_model": "DeepSeek V3"
  },
  "inquiry_data": {
    "client_name": "string (full name of person inquiring)",
    "client_email": "string (email address)",
    "client_phone": "string or null (phone number if mentioned)",
    "event_type": "string (Wedding, Corporate Event, Birthday Party, etc.)",
    "event_date": "YYYY-MM-DD format or null",
    "event_time": "string or null (e.g., '6:00 PM')",
    "guest_count_range": "string or null (e.g., '75-125')",
    "guest_count_min": number or null,
    "guest_count_max": number or null,
    "estimated_budget": number or null (if mentioned)",
    "service_requested": "string (what they're asking for)",
    "service_location": "string or null (venue, city, or location)"
  },
  "analysis": {
    "lead_quality": "hot | warm | cold (based on urgency, clarity, budget)",
    "urgency_score": number (1-5, where 5 is most urgent)",
    "clarity_score": number (1-5, where 5 is very clear request)",
    "sentiment": "positive | neutral | negative | urgent",
    "budget_indication": "high | medium | low | not_mentioned | specific_amount",
    "key_requirements": ["array of specific requirements mentioned"],
    "potential_concerns": ["array of any red flags or concerns"],
    "suggested_next_step": "string (what to do next with this lead)"
  },
  "summary_text": "string (2-3 sentence summary of the inquiry)"
}

Be thorough and accurate. If information is not present, use null. Infer the source system from email content, headers, or domain.`;

    try {
      const { content, provider } = await createChatCompletion({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 2000,
        temperature: 0.2,
        json: true,
      });

      const parsed = JSON.parse(content);
      if (parsed.parser_metadata) {
        parsed.parser_metadata.extracted_by_model = providerLabel(provider);
      }
      console.log(`AI Email Extraction: Successfully extracted data via ${provider}`);
      return parsed;
    } catch (error) {
      console.error("AI Email Extraction Error:", error);
      return {
        parser_metadata: {
          source_system: "Unknown",
          received_timestamp: emailData.receivedDate.toISOString(),
          internal_sender_email: emailData.from,
          extracted_by_model: "Error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        inquiry_data: {
          client_name: "",
          client_email: emailData.from,
          event_type: "Unknown",
        },
        analysis: {
          lead_quality: "cold",
          urgency_score: 1,
          clarity_score: 1,
          sentiment: "neutral",
          budget_indication: "not_mentioned",
          key_requirements: [],
          potential_concerns: ["Failed to extract data - AI service unavailable"],
          suggested_next_step: "Manual review required",
        },
        summary_text: `Email from ${emailData.from} with subject "${emailData.subject}" - AI extraction failed, manual review needed`,
      };
    }
  }
}

export const aiService = new AIService();

export { hasLlmProvider };
