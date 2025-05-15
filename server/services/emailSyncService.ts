// server/services/emailSyncService.ts
import { google, Auth, gmail_v1 } from 'googleapis';
import { storage } from '../storage'; // Your existing storage instance
import {
  InsertCommunication,
  InsertContactIdentifier,
  Communication,
  InsertRawLead,
  rawLeadStatusEnum,
  leadScoreEnum,
  leadQualityCategoryEnum,
  budgetIndicationEnum,
  sentimentEnum
} from '@shared/schema';
import { simpleParser, ParsedMail } from 'mailparser'; // For parsing email content

// A simple in-memory or DB store for tokens (for a single-user backend service)
// In a real multi-tenant app, you'd store these per user/account securely.
interface TokenStore {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  targetEmail?: string;
}

// For a server-side app syncing one mailbox, tokens can be stored more simply.
// For a production app, consider a secure database table for these.
let tokenStore: TokenStore = {
    targetEmail: process.env.SYNC_TARGET_EMAIL_ADDRESS
};

// Load tokens from a persistent store if available (e.g., a config file, DB, or env vars)
// For simplicity, we'll try to load from env vars, but ideally, refresh token is stored securely after first auth.
if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
    tokenStore.accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    tokenStore.refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    tokenStore.expiryDate = process.env.GOOGLE_TOKEN_EXPIRY_DATE ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY_DATE, 10) : undefined;
}


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Function to set credentials for the oauth2Client
// This should be called only when explicitly starting the email sync service
function setOAuthCredentials() {
  if (tokenStore.accessToken && tokenStore.refreshToken) {
    oauth2Client.setCredentials({
      access_token: tokenStore.accessToken,
      refresh_token: tokenStore.refreshToken,
      expiry_date: tokenStore.expiryDate,
    });
    console.log("GmailSyncService: OAuth credentials initialized from stored tokens");
    return true;
  }
  console.warn("GmailSyncService: Cannot initialize OAuth - no tokens available");
  return false;
}
// IMPORTANT: We do NOT call setOAuthCredentials() at startup - we'll call it only when explicitly starting the service

// Handle token refresh
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in your secure persistent database
    console.log('New refresh token received:', tokens.refresh_token);
    tokenStore.refreshToken = tokens.refresh_token;
    // Update your persistent store (e.g., .env file or a DB)
    // For .env, this would be a manual update or a script.
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  }
  if (tokens.access_token) {
    console.log('New access token received:', tokens.access_token);
    tokenStore.accessToken = tokens.access_token;
    tokenStore.expiryDate = tokens.expiry_date || undefined;
     // Update your persistent store
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    process.env.GOOGLE_TOKEN_EXPIRY_DATE = tokens.expiry_date?.toString();
  }
   // Here you would typically save these tokens to a persistent store (DB, file)
   // For now, we are updating the in-memory tokenStore and assuming env vars might be manually updated for refresh token.
});


// Import the AI service and fetch for direct API calls
import { aiService } from './aiService';
import fetch from 'node-fetch';

/**
 * Extracts structured lead data from email content using AI
 * @param emailContent The body content of the email
 * @param emailSubject The subject line of the email
 * @param fromAddress The sender's email address (optional)
 * @returns A data object aligned with the InsertRawLead schema
 */
async function extractLeadDataWithAI(
  emailContent: string,
  emailSubject: string,
  fromAddress?: string,
  emailDate?: Date
): Promise<Partial<InsertRawLead> & { success: boolean; error?: string }> {
  console.log(`Lead Data Extraction: Processing email with subject "${emailSubject}"`);

  try {
    // Prepare the full content for analysis
    const fullContent = `
Subject: ${emailSubject}
${fromAddress ? `From: ${fromAddress}` : ''}

${emailContent}
    `.trim();

    // Try using our existing aiService first
    try {
      const aiResults = await aiService.analyzeLeadMessage(fullContent);
      console.log("Lead Data Extraction: Successfully processed with AI service");

      // Helper function to validate score against enum values
      const validateLeadScore = (score: string | undefined): typeof leadScoreEnum.enumValues[number] | undefined => {
        if (!score || !leadScoreEnum.enumValues.includes(score as any)) return undefined;
        return score as typeof leadScoreEnum.enumValues[number];
      };

      // Helper function to validate budget indication against enum values
      const validateBudgetIndication = (indication: string | undefined): typeof budgetIndicationEnum.enumValues[number] | undefined => {
        if (!indication || !budgetIndicationEnum.enumValues.includes(indication as any)) return undefined;
        return indication as typeof budgetIndicationEnum.enumValues[number];
      };

      // Helper function to validate lead quality against enum values
      const validateLeadQuality = (quality: string | undefined): typeof leadQualityCategoryEnum.enumValues[number] | undefined => {
        if (!quality || !leadQualityCategoryEnum.enumValues.includes(quality as any)) return undefined;
        return quality as typeof leadQualityCategoryEnum.enumValues[number];
      };

      // Helper function to validate sentiment against enum values
      const validateSentiment = (sentiment: string | undefined): typeof sentimentEnum.enumValues[number] | undefined => {
        if (!sentiment || !sentimentEnum.enumValues.includes(sentiment as any)) return undefined;
        return sentiment as typeof sentimentEnum.enumValues[number];
      };

      // Form the result object that aligns with InsertRawLead schema
      return {
        success: true,
        source: 'email_ai_extraction',
        extractedName: aiResults.extractedName || '',
        extractedEmail: aiResults.extractedEmail || fromAddress || '',
        extractedPhone: aiResults.extractedPhone || null,
        eventSummary: emailSubject,
        status: 'under_review' as const,
        notes: `Auto-extracted from email with subject: "${emailSubject}"`,
        receivedAt: emailDate,

        // Add AI-extracted fields
        extractedEventType: aiResults.extractedEventType,
        extractedEventDate: aiResults.extractedEventDate,
        extractedEventTime: aiResults.extractedEventTime,
        extractedGuestCount: aiResults.extractedGuestCount,
        extractedVenue: aiResults.extractedVenue,
        extractedMessageSummary: aiResults.extractedMessageSummary,
        leadSourcePlatform: 'email',

        // Add AI assessment fields (with type validation)
        aiUrgencyScore: validateLeadScore(aiResults.aiUrgencyScore),
        aiBudgetIndication: validateBudgetIndication(aiResults.aiBudgetIndication),
        aiBudgetValue: aiResults.aiBudgetValue,
        aiClarityOfRequestScore: validateLeadScore(aiResults.aiClarityOfRequestScore),
        aiDecisionMakerLikelihood: validateLeadScore(aiResults.aiDecisionMakerLikelihood),
        aiKeyRequirements: aiResults.aiKeyRequirements || [],
        aiPotentialRedFlags: aiResults.aiPotentialRedFlags || [],
        aiOverallLeadQuality: validateLeadQuality(aiResults.aiOverallLeadQuality),
        aiSuggestedNextStep: aiResults.aiSuggestedNextStep,
        aiSentiment: validateSentiment(aiResults.aiSentiment),
        aiConfidenceScore: aiResults.aiConfidenceScore,

        // Store the raw AI output for debugging
        rawData: {
          emailSubject,
          emailPreview: emailContent.substring(0, 500) + (emailContent.length > 500 ? '...' : ''),
          fromAddress,
          aiProvider: 'OpenRouter-Claude',
          aiOutput: aiResults,
          timestamp: new Date().toISOString()
        }
      };
    }
    // If our aiService fails, try direct API call as a fallback
    catch (aiServiceError) {
      console.error("Lead Data Extraction: AI service error, attempting direct API call:", aiServiceError);

      // Attempt direct API call to OpenRouter
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OpenRouter API key not configured");
      }

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

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://catering-cms.replit.app', // Replace with your app's URL
          'X-Title': 'Catering CMS' // Replace with your app's title
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // You can experiment with other models
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();
      const resultText = responseData.choices?.[0]?.message?.content?.trim() || "{}";

      try {
        // Parse the JSON response
        const aiResults = JSON.parse(resultText);
        console.log("Lead Data Extraction: Successfully processed with direct API call");

        // Helper functions for validation
        const validateLeadScore = (score: string | undefined): typeof leadScoreEnum.enumValues[number] | undefined => {
          if (!score || !leadScoreEnum.enumValues.includes(score as any)) return undefined;
          return score as typeof leadScoreEnum.enumValues[number];
        };

        const validateBudgetIndication = (indication: string | undefined): typeof budgetIndicationEnum.enumValues[number] | undefined => {
          if (!indication || !budgetIndicationEnum.enumValues.includes(indication as any)) return undefined;
          return indication as typeof budgetIndicationEnum.enumValues[number];
        };

        const validateLeadQuality = (quality: string | undefined): typeof leadQualityCategoryEnum.enumValues[number] | undefined => {
          if (!quality || !leadQualityCategoryEnum.enumValues.includes(quality as any)) return undefined;
          return quality as typeof leadQualityCategoryEnum.enumValues[number];
        };

        const validateSentiment = (sentiment: string | undefined): typeof sentimentEnum.enumValues[number] | undefined => {
          if (!sentiment || !sentimentEnum.enumValues.includes(sentiment as any)) return undefined;
          return sentiment as typeof sentimentEnum.enumValues[number];
        };

        return {
          success: true,
          source: 'email_direct_api',
          extractedName: aiResults.extractedName || '',
          extractedEmail: aiResults.extractedEmail || fromAddress || '',
          extractedPhone: aiResults.extractedPhone || null,
          eventSummary: emailSubject,
          status: 'under_review' as const,
          notes: `Auto-extracted from email with subject: "${emailSubject}" (direct API)`,

          // Add AI-extracted fields
          extractedEventType: aiResults.extractedEventType,
          extractedEventDate: aiResults.extractedEventDate,
          extractedEventTime: aiResults.extractedEventTime,
          extractedGuestCount: aiResults.extractedGuestCount,
          extractedVenue: aiResults.extractedVenue,
          extractedMessageSummary: aiResults.extractedMessageSummary,
          leadSourcePlatform: 'email',

          // Add AI assessment fields (with type validation)
          aiUrgencyScore: validateLeadScore(aiResults.aiUrgencyScore),
          aiBudgetIndication: validateBudgetIndication(aiResults.aiBudgetIndication),
          aiBudgetValue: aiResults.aiBudgetValue,
          aiClarityOfRequestScore: validateLeadScore(aiResults.aiClarityOfRequestScore),
          aiDecisionMakerLikelihood: validateLeadScore(aiResults.aiDecisionMakerLikelihood),
          aiKeyRequirements: aiResults.aiKeyRequirements || [],
          aiPotentialRedFlags: aiResults.aiPotentialRedFlags || [],
          aiOverallLeadQuality: validateLeadQuality(aiResults.aiOverallLeadQuality),
          aiSuggestedNextStep: aiResults.aiSuggestedNextStep,
          aiSentiment: validateSentiment(aiResults.aiSentiment),
          aiConfidenceScore: aiResults.aiConfidenceScore,

          // Store the raw AI output for debugging
          rawData: {
            emailSubject,
            emailPreview: emailContent.substring(0, 500) + (emailContent.length > 500 ? '...' : ''),
            fromAddress,
            aiProvider: 'OpenRouter-Direct-API',
            apiResponse: responseData,
            aiOutput: aiResults,
            timestamp: new Date().toISOString()
          }
        };
      } catch (jsonParseError) {
        console.error("Lead Data Extraction: JSON parsing error:", jsonParseError);
        console.error("Lead Data Extraction: Raw AI response:", resultText);

        // Return a partial result that can still be used to create a RawLead
        return {
          success: false,
          error: "JSON parsing error in AI response",
          source: 'email_ai_failed',
          extractedEmail: fromAddress || '',
          eventSummary: emailSubject,
          status: 'parsing_failed' as const,
          notes: `AI parsing failed for email with subject: "${emailSubject}". Error: ${jsonParseError.message}`,
          rawData: {
            emailSubject,
            emailPreview: emailContent.substring(0, 500) + (emailContent.length > 500 ? '...' : ''),
            fromAddress,
            aiProvider: 'OpenRouter-Direct-API-Failed',
            apiResponse: responseData,
            rawResponse: resultText,
            error: jsonParseError.message,
            timestamp: new Date().toISOString()
          }
        };
      }
    }
  } catch (error) {
    console.error("Lead Data Extraction: Critical error:", error);

    // Return minimal data that can be used to create a RawLead in an error state
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      source: 'email_ai_error',
      extractedEmail: fromAddress || '',
      eventSummary: emailSubject,
      status: 'parsing_failed' as const, // Set status to parsing_failed on critical errors too
      notes: `AI extraction error for email with subject: "${emailSubject}". Error: ${error instanceof Error ? error.message : String(error)}`,
      rawData: {
        emailSubject,
        emailPreview: emailContent.substring(0, 500) + (emailContent.length > 500 ? '...' : ''),
        fromAddress,
        aiProvider: 'Failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// AI Summarization using Claude via Open Router
async function getAISummary(text: string): Promise<string> {
  console.log("AI Summarization (Gmail): Input length -", text.length);
  if (!text) return "No content to summarize.";
  try {
    const summary = await aiService.generateSummary(text);
    console.log("AI Summarization (Gmail): Output -", summary);
    return summary;
  } catch (error) {
    console.error("AI Summarization (Gmail) Error:", error);
    // Fallback to basic trimming if AI summarization fails
    const fallbackSummary = text.substring(0, Math.min(text.length, 150)).replace(/\s+/g, ' ') + (text.length > 150 ? "..." : "");
    return fallbackSummary;
  }
}

export class GmailSyncService {
  private gmail: gmail_v1.Gmail | null = null;
  private _isRunning: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private processingInterval: number;
  private aiSummaryEnabled: boolean;
  public targetEmail: string = "";
  private lastSyncTimestamp: number | null = null; // Unix timestamp of the last successful email fetch

  // Accessor methods for external status checks
  public isRunning(): boolean {
    return this._isRunning;
  }

  public getTargetEmail(): string {
    return this.targetEmail;
  }
  
  public getTimerId(): NodeJS.Timeout | null {
    return this.timeoutId;
  }
  
  public inspectStatus(): any {
    return {
      isRunning: this._isRunning,
      hasTimeout: this.timeoutId !== null,
      hasGmailClient: this.gmail !== null,
      targetEmailConfigured: !!this.targetEmail,
      processingInterval: this.processingInterval,
      aiSummaryEnabled: this.aiSummaryEnabled,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp * 1000).toISOString() : null,
    };
  }

  constructor(intervalMs: number = 5 * 60 * 1000, aiEnabled: boolean = true) {
    this.processingInterval = intervalMs;
    this.aiSummaryEnabled = aiEnabled;
    this.targetEmail = tokenStore.targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS || '';

    if (!this.targetEmail) {
        console.error("GmailSyncService: SYNC_TARGET_EMAIL_ADDRESS is not configured. Sync cannot start.");
    }
    // Defer Gmail client initialization until start() is called and tokens are confirmed
    // if (oauth2Client.credentials.access_token) {
    //     this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    // } else {
    //     console.warn("GmailSyncService: No access token available. Authorization needed.");
    // }
  }

  public static getOAuthClient(): Auth.OAuth2Client {
    return oauth2Client;
  }

  public static async setTokensFromCode(code: string): Promise<boolean> {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      tokenStore.accessToken = tokens.access_token || undefined;
      tokenStore.refreshToken = tokens.refresh_token || undefined;
      tokenStore.expiryDate = tokens.expiry_date || undefined;

      console.log('GmailSyncService: Tokens obtained and set successfully!');
      // IMPORTANT: Persist tokens.refresh_token securely!
      // For this example, we are logging it. In production, save it to a secure DB or config.
      if (tokens.refresh_token) {
        console.log('IMPORTANT: Store this REFRESH TOKEN securely:', tokens.refresh_token);
        // Update environment variables or a secure store
        process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
      }
      if (tokens.access_token) process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
      if (tokens.expiry_date) process.env.GOOGLE_TOKEN_EXPIRY_DATE = tokens.expiry_date.toString();

      // Note: The running service instance needs to pick up these new credentials.
      // A simple way in this single-instance setup is to re-initialize the gmail client
      // in the start method or before a fetch if it's null.

      return true;
    } catch (error) {
      console.error('GmailSyncService: Error fetching OAuth tokens:', error);
      return false;
    }
  }

  public start(): void {
    if (!this.targetEmail) {
        console.error("GmailSyncService: Cannot start, SYNC_TARGET_EMAIL_ADDRESS not set.");
        return;
    }
    
    // CRITICAL FIX: Only initialize OAuth credentials when explicitly starting the service
    // This prevents emails from being fetched unless the user explicitly enables the service
    const credentialsInitialized = setOAuthCredentials();
    if (!credentialsInitialized) {
      console.warn('GmailSyncService: OAuth credentials could not be initialized. Cannot start service.');
      console.log('To authorize, visit: /api/auth/google/initiate then follow the redirect.');
      return;
    }
    
    // Initialize or re-initialize Gmail client only after credentials are set
    if (!this.gmail && oauth2Client.credentials.access_token) {
        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        console.log("GmailSyncService: Gmail API client initialized/re-initialized.");
    }

    if (!this.gmail) {
      console.warn('GmailSyncService: Gmail API client not initialized (missing auth). Cannot start.');
      console.log('To authorize, visit: /api/auth/google/initiate then follow the redirect.');
      return;
    }
    if (this._isRunning) {
      console.log('GmailSyncService is already running.');
      return;
    }
    this._isRunning = true;
    console.log(`GmailSyncService started. Checking mailbox for "${this.targetEmail}" every ${this.processingInterval / 1000} seconds.`);
    this.scheduleNextFetch();
  }

  public stop(): void {
    if (!this._isRunning) {
        console.log('GmailSyncService is not running.');
        return;
    }
    console.log('GmailSyncService stopping...');
    // First set the running flag to false to prevent new fetch cycles
    this._isRunning = false;
    
    // Clear any scheduled timeouts
    if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
    }
    
    // IMPORTANT SECURITY FIX: Clear the Gmail client to prevent any accidental API access
    // This ensures that if someone stops the service, we need to re-authenticate when starting again
    this.gmail = null;
    
    // ADDITIONAL SECURITY: We could also clear oauth2Client.credentials here for complete isolation
    // But leaving credentials in memory allows easier restart without re-authorization
    // oauth2Client.credentials = {};
    
    // Reset the lastSyncTimestamp when service stops
    // This ensures when the service starts again, it will fetch all emails since it was last running
    this.lastSyncTimestamp = null;
    
    // Additional logging to verify the service is really stopped
    console.log('GmailSyncService stopped. Running status:', this._isRunning, 'Gmail client cleared. Last sync timestamp reset.');
  }

  private scheduleNextFetch(): void {
    // Ensure we only schedule if the service is still running
    if (!this._isRunning || !this.gmail) {
      console.log("GmailSyncService: Not scheduling next fetch as service is stopped or not initialized.");
      return;
    }
    
    this.timeoutId = setTimeout(async () => {
      // Double-check _isRunning before executing the fetch cycle
      if (this._isRunning) {
         await this.fetchAndProcessEmails();
         
         // Only schedule the next fetch if the service is still running after the current cycle
         if (this._isRunning) {
           this.scheduleNextFetch();
         } else {
           console.log("GmailSyncService: Not scheduling next fetch as service was stopped during processing.");
         }
      } else {
         console.log("GmailSyncService: Fetch cycle skipped as service was stopped during timeout.");
      }
    }, this.processingInterval);
  }

  private async fetchAndProcessEmails(): Promise<void> {
    // Double-check running status at the beginning of the fetch cycle
    if (!this._isRunning) {
      console.log("GmailSyncService: fetchAndProcessEmails called but service is no longer running. Aborting fetch cycle.");
      return;
    }
    
    if (!this.gmail) {
      console.warn('GmailSyncService: Gmail client not available for fetching.');
      // Attempt to re-initialize if tokens might have become available
      if (oauth2Client.credentials.access_token) {
          this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          console.log("GmailSyncService: Re-initialized Gmail client.");
          // If successfully re-initialized, continue the fetch cycle
      } else {
          console.error('GmailSyncService: Still no access token. Please authorize.');
          this.stop(); // Stop polling if auth is missing
          return;
      }
    }

    // Add check here: if service was stopped while waiting for re-initialization
    if (!this._isRunning) {
        console.log("GmailSyncService: Stopping fetch cycle early as service is stopped.");
        return;
    }

    // Prepare a more targeted query if we have a last sync timestamp
    let query = 'is:unread label:INBOX (from:weddingvendors@zola.com OR from:projects@kolmo.io)';
    
    if (this.lastSyncTimestamp) {
      const lastSyncDate = new Date(this.lastSyncTimestamp * 1000);
      // Format the date for Gmail's search syntax: YYYY/MM/DD
      const formattedDate = `${lastSyncDate.getFullYear()}/${(lastSyncDate.getMonth() + 1).toString().padStart(2, '0')}/${lastSyncDate.getDate().toString().padStart(2, '0')}`;
      // Add an after:<date> filter to only get emails newer than last sync
      query += ` after:${formattedDate}`;
      
      console.log(`[${new Date().toISOString()}] GmailSyncService: Fetching new emails for ${this.targetEmail} since ${lastSyncDate.toISOString()}...`);
    } else {
      console.log(`[${new Date().toISOString()}] GmailSyncService: Fetching all new unread emails for ${this.targetEmail} (first sync)...`);
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me', // 'me' refers to the authenticated user
        q: query, // Use our constructed query with potential date filter
        maxResults: 10, // Process a few at a time
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        console.log('GmailSyncService: No new unread emails found.');
        return;
      }

      console.log(`GmailSyncService: Found ${messages.length} new unread emails.`);

      for (const messageEntry of messages) {
        // Add a check before processing each message in the batch
        if (!this._isRunning) {
          console.log(`GmailSyncService: Stopping message processing loop early due to service stop request.`);
          // Optionally, add logic here to handle messages that were fetched
          // but not processed, maybe add a label like 'UNPROCESSED_BY_CRM'
          break; // Exit the loop
        }

        if (!messageEntry.id) continue;

        let messageId: string | undefined; // Define messageId outside the try block to be available for markAsRead

        try {
            const msg = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageEntry.id,
                format: 'raw', // Get the full raw email
            });

            if (msg.data.raw) {
                const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
                const parsedMail = await simpleParser(rawEmail);

                // Extract messageId early
                const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
                // Generate a more robust fallback ID including the Gmail message ID
                messageId = messageIdHeader || parsedMail.messageId || `generated-${Date.now()}-${messageEntry.id}`;

                console.log(`GmailSyncService: Processing message (Gmail ID: ${messageEntry.id}, Message-ID: ${messageId})`);

                // --- Duplicate Check ---
                try {
                    const communications = await storage.getCommunicationsByExternalId(messageId);
                    if (communications && communications.length > 0) {
                        console.log(`GmailSyncService: Email with message ID ${messageId} (Gmail ID: ${messageEntry.id}) was already processed. Skipping.`);
                        // IMPORTANT: Mark as read *even if* it was already processed
                        await this.markEmailAsRead(messageEntry.id);
                        continue; // Skip to the next message in the loop
                    }
                } catch (error) {
                    // Log the error but *do not skip* processing if the duplicate check fails.
                    // It's safer to potentially process a duplicate than to get stuck
                    // or miss a new email if the DB is temporarily unreachable.
                    console.error(`GmailSyncService: Error during duplicate check for message ID ${messageId} (Gmail ID: ${messageEntry.id}). Attempting to process anyway.`, error);
                }

                // --- Process the email if not identified as a duplicate or if check failed ---
                await this.processParsedEmail(parsedMail, messageId);

            } else {
                console.warn(`GmailSyncService: No raw data found for message ID ${messageEntry.id}. Skipping processing.`);
            }
        } catch(err: any) {
            console.error(`GmailSyncService: Unhandled error during processing of message ID ${messageEntry.id}:`, err);
            // Continue to the finally block to attempt marking as read
        } finally {
             // --- Mark as Read After Attempting Processing ---
             // Mark as read regardless of processParsedEmail success or failure (within this message's try/catch/finally)
             try {
                 await this.markEmailAsRead(messageEntry.id);
             } catch (markReadErr) {
                 console.error(`GmailSyncService: Failed to mark message ID ${messageEntry.id} as read in finally block:`, markReadErr);
             }
        }
      } // End of for loop over messages

    } catch (err: any) {
      console.error('GmailSyncService: API Error during fetch cycle:', err.message || err);
      if (err.code === 401 || (err.response && err.response.status === 401)) {
          console.error("GmailSyncService: Authentication error (401). Refresh token might be invalid or expired. Please re-authorize.");
          this.stop(); // Stop polling on auth errors to avoid hammering API
      }
      // Other API errors might warrant alerting but don't necessarily stop the service immediately
    } finally {
        // Update the lastSyncTimestamp to the current time
        this.lastSyncTimestamp = Math.floor(Date.now() / 1000); // Convert to seconds (Unix timestamp)
        console.log(`[${new Date().toISOString()}] GmailSyncService: Finished email fetch cycle for ${this.targetEmail}. Next sync will only fetch emails after this time.`);
    }
  }

  /**
   * Marks a Gmail message as read by removing the 'UNREAD' label.
   * @param messageGmailId The Gmail ID of the message.
   */
  // Custom label we'll use to track processed messages
  private static readonly CUSTOM_LABEL_NAME = 'PROCESSED_BY_HOMEBITES_Digital_services';
  private customLabelId: string | null = null;

  /**
   * Ensures our custom label exists in Gmail
   * Will create the label if it doesn't exist
   */
  private async ensureCustomLabelExists(): Promise<string | null> {
    if (!this.gmail) {
      console.warn('GmailSyncService: Cannot check/create label, Gmail client not available.');
      return null;
    }
    
    if (this.customLabelId) {
      return this.customLabelId; // Use cached label ID if we've already found it
    }
    
    try {
      // First check if our label already exists
      const labelsResponse = await this.gmail.users.labels.list({
        userId: 'me'
      });
      
      const existingLabel = labelsResponse.data.labels?.find(
        label => label.name === GmailSyncService.CUSTOM_LABEL_NAME
      );
      
      if (existingLabel && existingLabel.id) {
        console.log(`GmailSyncService: Found existing label '${GmailSyncService.CUSTOM_LABEL_NAME}' with ID ${existingLabel.id}`);
        this.customLabelId = existingLabel.id;
        return existingLabel.id;
      }
      
      // If not found, create the label
      console.log(`GmailSyncService: Label '${GmailSyncService.CUSTOM_LABEL_NAME}' not found, creating it now...`);
      const createResponse = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: GmailSyncService.CUSTOM_LABEL_NAME,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      
      if (createResponse.data.id) {
        console.log(`GmailSyncService: Successfully created label '${GmailSyncService.CUSTOM_LABEL_NAME}' with ID ${createResponse.data.id}`);
        this.customLabelId = createResponse.data.id;
        return createResponse.data.id;
      }
      
      return null;
    } catch (error) {
      console.error(`GmailSyncService: Error ensuring custom label exists:`, error);
      return null;
    }
  }
  
  private async markEmailAsRead(messageGmailId: string): Promise<void> {
    if (!this.gmail) {
        console.warn(`GmailSyncService: Cannot mark message ${messageGmailId} as read, Gmail client not available.`);
        return;
    }
    try {
        // First check if we're in read-only mode (no modify permissions)
        const scopes = oauth2Client.credentials.scope;
        const hasModifyScope = scopes && scopes.includes('https://www.googleapis.com/auth/gmail.modify');
        
        if (!hasModifyScope) {
            console.log(`GmailSyncService: Skipping marking message ${messageGmailId} as read - no modify permission. Email will remain unread.`);
            return;
        }
        
        // Ensure our custom label exists and get its ID
        await this.ensureCustomLabelExists();
        
        // Build the modification request
        const requestBody: any = {
            removeLabelIds: ['UNREAD']
        };
        
        // Only add the custom label if we successfully got its ID
        if (this.customLabelId) {
            requestBody.addLabelIds = [this.customLabelId];
        }
        
        await this.gmail.users.messages.modify({
            userId: 'me',
            id: messageGmailId,
            requestBody: requestBody
        });
        
        const successMsg = this.customLabelId 
            ? `Successfully marked message ${messageGmailId} as read and added '${GmailSyncService.CUSTOM_LABEL_NAME}' label.`
            : `Successfully marked message ${messageGmailId} as read (custom label could not be applied).`;
        
        console.log(`GmailSyncService: ${successMsg}`);
      } catch (markReadError: any) {
          // Check if this is a permission error
          if (markReadError?.code === 403 || 
              (markReadError?.errors && 
               markReadError.errors.some((e: any) => e.reason === 'insufficientPermissions'))) {
              console.log(`GmailSyncService: Cannot mark message ${messageGmailId} as read due to insufficient permissions. The gmail.modify scope is required.`);
          } else {
              console.error(`GmailSyncService: Failed to mark message ${messageGmailId} as read:`, markReadError);
          }
      }
  }


  /**
   * Processes a single parsed email, extracts data, and creates records in the database.
   * @param parsedMail The parsed email object from mailparser.
   * @param messageId The determined Message-ID or generated ID for duplicate checking.
   */
  private async processParsedEmail(parsedMail: ParsedMail, messageId: string): Promise<void> {
    const subject = parsedMail.subject || '(No Subject)';
    // Safe extraction of email address fields with proper type checking
    // Handle both single address object and array of address objects
    const getAddressesFrom = (addressField: any): { address?: string; name?: string }[] => {
      if (!addressField) return [];
      // If it's an array, return it
      if (Array.isArray(addressField)) return addressField;
      // If it has a 'value' property that's an array, return that
      if (addressField.value && Array.isArray(addressField.value)) return addressField.value;
      // If it's a single address object, wrap it in an array
      return [addressField];
    };

    const fromAddresses = getAddressesFrom(parsedMail.from);
    const toAddresses = getAddressesFrom(parsedMail.to);
    const ccAddresses = getAddressesFrom(parsedMail.cc);

    const fromHeader = fromAddresses[0]; // First from address
    const fromEmail = fromHeader?.address?.toLowerCase();
    const toEmails = toAddresses.map(addr => addr?.address?.toLowerCase()).filter(Boolean) as string[];
    const ccEmails = ccAddresses.map(addr => addr?.address?.toLowerCase()).filter(Boolean) as string[];

    // messageId is now passed as an argument
    const emailDate = parsedMail.date || new Date();

    let bodyText = parsedMail.text || '';
    if (!bodyText && parsedMail.html) {
        // Basic HTML to text conversion, consider a library for robustness
        bodyText = parsedMail.html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '') // Remove style tags and their content
          .replace(/<[^>]+>/g, ' ') // Remove all other HTML tags
          .replace(/\s+/g, ' ').trim();
    }
    if (!bodyText) bodyText = '(No Content)';


    console.log(`GmailSyncService: Processing email - Subject: "${subject}", From: ${fromEmail}, Message-ID: ${messageId}`);

    const isOutgoing = fromEmail === this.targetEmail.toLowerCase();
    const direction: Communication['direction'] = isOutgoing ? 'outgoing' : 'incoming';

    // Determine the contact email to search/associate with
    let contactEmailToSearch = direction === 'incoming' ? fromEmail : (toEmails.find(email => email !== this.targetEmail.toLowerCase()) || ccEmails.find(email => email !== this.targetEmail.toLowerCase()));

    if (!contactEmailToSearch) {
        console.warn("GmailSyncService: Could not determine a contact email (from/to) to search for opportunity/client for message ID:", messageId, {fromEmail, toEmails, target: this.targetEmail});
        // We will still log the communication below if possible, but no raw lead/contact will be created.
    }

    let opportunityId: number | undefined = undefined;
    let clientId: number | undefined = undefined;

    // Find existing contact if a search email was determined
    if (contactEmailToSearch) {
        const existingContact = await storage.findOpportunityOrClientByContactIdentifier(contactEmailToSearch, 'email');
        if (existingContact?.client) {
            clientId = existingContact.client.id;
        } else if (existingContact?.opportunity) {
            opportunityId = existingContact.opportunity.id;
        }
    }


    // Create Raw Lead only for incoming emails from new contacts (where no opportunityId or clientId was found)
    // and if a contact email was successfully determined.
    if (direction === 'incoming' && fromEmail && !opportunityId && !clientId) {
        console.log(`GmailSyncService: No existing contact found for ${fromEmail}. Creating new raw lead for message ID:`, messageId);
        try {
            // Use our dedicated extraction function for more robust handling
            // This includes fallbacks, error handling, and complete data extraction
            const extractedData = this.aiSummaryEnabled
              ? await extractLeadDataWithAI(bodyText, subject, fromEmail, emailDate)
              : {
                  success: true, // Even without AI, consider it successful extraction of basic info
                  source: 'gmail_sync',
                  extractedName: fromHeader?.name || '',
                  extractedEmail: fromEmail,
                  extractedPhone: null, // Basic extraction doesn't get phone
                  eventSummary: subject,
                  status: 'new' as const,
                  notes: `Auto-created from incoming email with subject: ${subject} (AI disabled)`,
                  receivedAt: emailDate,
                  rawData: {
                      subject,
                      from: fromEmail,
                      to: toEmails.join(', '),
                      cc: ccEmails.join(', '),
                      date: emailDate,
                      bodyPreview: bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''),
                      // Consider adding more raw data fields as needed
                  }
                };

            // If AI extraction failed but basic info was extracted, we can still create a raw lead
             if (!extractedData.success && fromEmail) {
                  console.warn(`GmailSyncService: AI extraction failed for message ID ${messageId}, creating minimal raw lead.`);
                  // Create a fallback raw lead with basic info if AI extraction failed
                  const fallbackRawLeadData: InsertRawLead = {
                      source: extractedData.source || 'gmail_sync_failed',
                      extractedName: extractedData.extractedName || fromHeader?.name || '',
                      extractedEmail: extractedData.extractedEmail || fromEmail,
                      extractedPhone: extractedData.extractedPhone || null,
                      eventSummary: extractedData.eventSummary || subject,
                      status: 'needs_manual_review' as const, // Mark for review if AI failed
                      notes: extractedData.notes || `Raw lead creation failed (AI error) for email with subject: "${subject}"`,
                      receivedAt: emailDate, // Use the original email date instead of the current time
                      rawData: extractedData.rawData || { error: extractedData.error, emailSubject: subject, fromAddress: fromEmail, bodyPreview: bodyText.substring(0, 500) },
                      // Set AI fields to null/undefined on failure
                       aiUrgencyScore: undefined,
                       aiBudgetIndication: undefined,
                       aiBudgetValue: undefined,
                       aiClarityOfRequestScore: undefined,
                       aiDecisionMakerLikelihood: undefined,
                       aiKeyRequirements: undefined,
                       aiPotentialRedFlags: undefined,
                       aiOverallLeadQuality: undefined,
                       aiSuggestedNextStep: undefined,
                       aiSentiment: undefined,
                       aiConfidenceScore: undefined,
                       extractedEventType: undefined,
                       extractedEventDate: undefined,
                       extractedEventTime: undefined,
                       extractedGuestCount: undefined,
                       extractedVenue: undefined,
                       extractedMessageSummary: undefined,
                       leadSourcePlatform: 'email',
                  };
                 const rawLead = await storage.createRawLead(fallbackRawLeadData);
                 console.log(`GmailSyncService: Created minimal raw lead ID ${rawLead.id} for ${fromEmail} (message ID: ${messageId}) due to AI failure.`);

             } else if (extractedData.success) {
                 // Create the raw lead with successfully extracted data
                 // Ensure source is set
                 if (!extractedData.source) {
                     extractedData.source = 'gmail_sync';
                 }
                 const rawLead = await storage.createRawLead(extractedData);
                 console.log(`GmailSyncService: Created new raw lead ID ${rawLead.id} for ${fromEmail} (message ID: ${messageId})`);

                 // Optionally, if you want to link the communication to the newly created raw lead
                 // you would need to add a rawLeadId field to the communications table.
                 // For now, the communication is linked to opportunity/client, and raw lead is separate
                 // until it's qualified.
             } else {
                  // If extraction failed and couldn't even create a minimal lead (e.g., no from email)
                  console.error(`GmailSyncService: Failed to create raw lead for message ID ${messageId}. Extraction unsuccessful and no fallback possible.`);
             }

        } catch (rawLeadCreationError) {
            console.error(`GmailSyncService: Error creating new raw lead for message ID ${messageId}:`, rawLeadCreationError);
            // Do not return here, continue to log the communication if possible
        }
    }


    // Log the communication regardless if a raw lead was created or an existing contact was found
    // We log it even if no opportunity/client is associated initially,
    // as it's still a touchpoint that might become relevant later.
    const summary = this.aiSummaryEnabled && bodyText !== '(No Content)' ? await getAISummary(bodyText) : subject;

    const communicationData: InsertCommunication = {
      opportunityId: opportunityId, // Will be undefined if no existing opportunity found
      clientId: clientId,         // Will be undefined if no existing client found
      type: 'email',
      direction: direction,
      timestamp: emailDate,
      source: 'gmail_sync',
      externalId: messageId, // Use the validated/generated messageId
      subject: subject,
      fromAddress: fromEmail,
      toAddress: toEmails.join(', '), // Store as comma-separated string
      // bodyRaw: bodyText.substring(0, 10000), // Truncate if necessary (10000 chars) - Check your DB schema limit
      bodyRaw: bodyText.length > 50000 ? bodyText.substring(0, 50000) + '...' : bodyText, // Truncate raw body for DB, check column limit (e.g., 50k chars)
      bodySummary: summary.length > 1000 ? summary.substring(0, 1000) + '...' : summary, // Truncate summary for DB, check column limit (e.g., 1k chars)
      metaData: {
          cc: ccEmails,
          // Consider limiting the size/detail of originalHeaders if storing them,
          // as they can be very large. Maybe just store key headers or a subset.
          // originalHeaders: parsedMail.headers // Potentially very large
          processedAt: new Date().toISOString(),
          aiProcessing: this.aiSummaryEnabled ? 'attempted' : 'disabled',
          // Store AI extraction outcome in metadata if needed, although it's on rawLead
      },
    };

    try {
      await storage.createCommunication(communicationData);
      console.log(`GmailSyncService: Successfully logged communication for message ID: ${messageId} (Subject: "${subject}")`);
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('duplicate key value violates unique constraint')) {
        console.warn(`GmailSyncService: Communication with externalId ${messageId} already exists. Skipping DB insert.`);
        // This should ideally be caught by the check earlier, but this is a safety net.
      } else {
        console.error(`GmailSyncService: Error saving communication with externalId ${messageId} to DB:`, dbError);
      }
    }
  }
}