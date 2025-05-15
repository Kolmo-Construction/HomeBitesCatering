// server/services/communicationSyncService.ts
import { google, Auth, gmail_v1 } from 'googleapis';
import { simpleParser, ParsedMail } from 'mailparser';
import { storage } from '../storage';
import { aiService } from './aiService';
import {
  InsertCommunication,
  Communication,
  sentimentEnum,
} from '@shared/schema';

// Use the same token store as emailSyncService
import { tokenStore, oauth2Client, setOAuthCredentials } from './emailSyncService';

export class CommunicationSyncService {
  private gmail: gmail_v1.Gmail | null = null;
  private _isRunning: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private processingInterval: number;
  private aiEnabled: boolean;
  private targetEmail: string = "";
  private lastSyncTimestamp: number | null = null;
  private customLabelId: string | null = null;

  constructor(intervalMs: number = 10 * 60 * 1000, aiEnabled: boolean = true) {
    this.processingInterval = intervalMs;
    this.aiEnabled = aiEnabled;
    this.targetEmail = tokenStore.targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS || '';

    if (!this.targetEmail) {
      console.error("CommunicationSyncService: SYNC_TARGET_EMAIL_ADDRESS is not configured. Service cannot start.");
    }
  }

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
      aiEnabled: this.aiEnabled,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp * 1000).toISOString() : null,
    };
  }

  public start(): void {
    if (!this.targetEmail) {
      console.error("CommunicationSyncService: Cannot start, SYNC_TARGET_EMAIL_ADDRESS not set.");
      return;
    }
    
    // Initialize OAuth credentials when starting the service
    const credentialsInitialized = setOAuthCredentials();
    if (!credentialsInitialized) {
      console.warn('CommunicationSyncService: OAuth credentials could not be initialized. Cannot start service.');
      console.log('To authorize, visit: /api/auth/google/initiate then follow the redirect.');
      return;
    }
    
    // Initialize Gmail client only after credentials are set
    if (!this.gmail && oauth2Client.credentials.access_token) {
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log("CommunicationSyncService: Gmail API client initialized.");
      
      // Create or get our custom label for processing
      this.ensureCustomLabel();
    }

    if (!this.gmail) {
      console.warn('CommunicationSyncService: Gmail API client not initialized (missing auth). Cannot start.');
      return;
    }

    if (this._isRunning) {
      console.log('CommunicationSyncService is already running.');
      return;
    }

    this._isRunning = true;
    console.log(`CommunicationSyncService started. Syncing communications for "${this.targetEmail}" every ${this.processingInterval / 1000} seconds.`);
    this.scheduleNextFetch();
  }

  public stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._isRunning = false;
    console.log('CommunicationSyncService stopped.');
  }

  private scheduleNextFetch(): void {
    if (!this._isRunning) return;
    
    this.timeoutId = setTimeout(async () => {
      try {
        await this.fetchAndProcessEmails();
      } catch (error) {
        console.error('CommunicationSyncService error during fetch cycle:', error);
      } finally {
        // Schedule next run only if service is still running
        if (this._isRunning) {
          this.scheduleNextFetch();
        }
      }
    }, this.processingInterval);
  }

  private async ensureCustomLabel(): Promise<void> {
    if (!this.gmail) return;
    
    try {
      // Try to find our custom label
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });
      
      const labels = response.data.labels || [];
      const customLabel = labels.find(label => label.name === 'PROCESSED_BY_COMM_SYNC');
      
      if (customLabel && customLabel.id) {
        this.customLabelId = customLabel.id;
        console.log('CommunicationSyncService: Found existing custom label:', this.customLabelId);
      } else {
        // Create the label if it doesn't exist
        const createResponse = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'PROCESSED_BY_COMM_SYNC',
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
          }
        });
        
        this.customLabelId = createResponse.data.id || null;
        console.log('CommunicationSyncService: Created new custom label:', this.customLabelId);
      }
    } catch (error) {
      console.error('CommunicationSyncService: Error ensuring custom label:', error);
    }
  }

  private async fetchAndProcessEmails(): Promise<void> {
    if (!this._isRunning || !this.gmail) {
      console.warn('CommunicationSyncService: Cannot fetch emails, service stopped or client unavailable.');
      return;
    }

    // Query for all emails related to business communications, excluding those already processed
    // Avoid specific labels used by lead generation service to prevent duplicates
    let query = 'is:unread label:INBOX -label:PROCESSED_BY_COMM_SYNC -label:PROCESSED_BY_LEAD_GEN';
    
    if (this.lastSyncTimestamp) {
      const lastSyncDate = new Date(this.lastSyncTimestamp * 1000);
      const formattedDate = `${lastSyncDate.getFullYear()}/${(lastSyncDate.getMonth() + 1).toString().padStart(2, '0')}/${lastSyncDate.getDate().toString().padStart(2, '0')}`;
      query += ` after:${formattedDate}`;
      
      console.log(`[${new Date().toISOString()}] CommunicationSyncService: Fetching new emails since ${lastSyncDate.toISOString()}...`);
    } else {
      console.log(`[${new Date().toISOString()}] CommunicationSyncService: Fetching all unprocessed emails (first sync)...`);
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20, // Process more emails per cycle
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        console.log('CommunicationSyncService: No new emails found to process.');
        return;
      }

      console.log(`CommunicationSyncService: Found ${messages.length} emails to process.`);

      for (const messageEntry of messages) {
        if (!this._isRunning) {
          console.log(`CommunicationSyncService: Stopping processing early due to service stop.`);
          break;
        }

        if (!messageEntry.id) continue;

        try {
          const msg = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageEntry.id,
            format: 'raw',
          });

          if (msg.data.raw) {
            const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
            const parsedMail = await simpleParser(rawEmail);
            
            // Generate a message ID for tracking
            const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
            const messageId = messageIdHeader || `generated-${Date.now()}-${messageEntry.id}`;
            
            // Check if this email has already been processed
            try {
              const communications = await storage.getCommunicationsByExternalId(messageId);
              if (communications && communications.length > 0) {
                console.log(`CommunicationSyncService: Email with message ID ${messageId} was already processed. Skipping.`);
                await this.markEmailAsProcessed(messageEntry.id);
                continue;
              }
            } catch (error) {
              console.error(`CommunicationSyncService: Error during duplicate check for message ID ${messageId}. Attempting to process anyway.`, error);
            }
            
            // Process the email to log communication
            await this.processEmailCommunication(parsedMail, messageId, messageEntry.id);
          }
        } catch (err) {
          console.error(`CommunicationSyncService: Error processing message ID ${messageEntry.id}:`, err);
        } finally {
          try {
            await this.markEmailAsProcessed(messageEntry.id);
          } catch (markProcessedErr) {
            console.error(`CommunicationSyncService: Failed to mark message ID ${messageEntry.id} as processed:`, markProcessedErr);
          }
        }
      }
    } catch (err: any) {
      console.error('CommunicationSyncService: API Error during fetch cycle:', err.message || err);
      if (err.code === 401 || (err.response && err.response.status === 401)) {
        console.error("CommunicationSyncService: Authentication error (401). Please re-authorize.");
        this.stop();
      }
    } finally {
      this.lastSyncTimestamp = Math.floor(Date.now() / 1000);
      console.log(`[${new Date().toISOString()}] CommunicationSyncService: Finished email fetch cycle.`);
    }
  }

  private async markEmailAsProcessed(messageId: string): Promise<void> {
    if (!this.gmail || !this.customLabelId) return;
    
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
          addLabelIds: [this.customLabelId],
        },
      });
    } catch (error) {
      console.error(`CommunicationSyncService: Error marking email ${messageId} as processed:`, error);
      throw error;
    }
  }

  private async processEmailCommunication(parsedMail: ParsedMail, messageId: string, gmailId: string): Promise<void> {
    const subject = parsedMail.subject || '(No Subject)';
    
    // Extract email addresses
    const getAddressesFrom = (addressField: any): { address?: string; name?: string }[] => {
      if (!addressField) return [];
      if (Array.isArray(addressField)) return addressField;
      if (addressField.value && Array.isArray(addressField.value)) return addressField.value;
      return [addressField];
    };

    const fromAddresses = getAddressesFrom(parsedMail.from);
    const toAddresses = getAddressesFrom(parsedMail.to);
    const ccAddresses = getAddressesFrom(parsedMail.cc);

    const fromHeader = fromAddresses[0];
    const fromEmail = fromHeader?.address?.toLowerCase();
    const toEmails = toAddresses.map(addr => addr?.address?.toLowerCase()).filter(Boolean) as string[];
    const ccEmails = ccAddresses.map(addr => addr?.address?.toLowerCase()).filter(Boolean) as string[];

    if (!fromEmail) {
      console.warn(`CommunicationSyncService: Cannot process email ID ${messageId}, no sender email found.`);
      return;
    }

    const emailDate = parsedMail.date || new Date();
    
    let bodyText = parsedMail.text || '';
    if (!bodyText && parsedMail.html) {
      bodyText = parsedMail.html
        .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\\s+/g, ' ').trim();
    }
    if (!bodyText) bodyText = '(No Content)';

    console.log(`CommunicationSyncService: Processing email - Subject: "${subject}", From: ${fromEmail}`);

    const isOutgoing = fromEmail === this.targetEmail.toLowerCase();
    const direction: Communication['direction'] = isOutgoing ? 'outgoing' : 'incoming';

    // Determine the contact email to search/associate with
    let contactEmailToSearch = direction === 'incoming' ? fromEmail : (toEmails.find(email => email !== this.targetEmail.toLowerCase()) || ccEmails.find(email => email !== this.targetEmail.toLowerCase()));

    if (!contactEmailToSearch) {
      console.warn(`CommunicationSyncService: Could not determine a contact email to search for opportunities/clients. Skipping.`);
      return;
    }

    let opportunityId: number | undefined = undefined;
    let clientId: number | undefined = undefined;

    // Find existing contact if a search email was determined
    try {
      const existingContact = await storage.findOpportunityOrClientByContactIdentifier(contactEmailToSearch, 'email');
      if (existingContact?.client) {
        clientId = existingContact.client.id;
      } else if (existingContact?.opportunity) {
        opportunityId = existingContact.opportunity.id;
      }

      // Only proceed if we found a matching opportunity or client
      if (opportunityId || clientId) {
        console.log(`CommunicationSyncService: Email matched to ${opportunityId ? 'opportunity ID ' + opportunityId : 'client ID ' + clientId}`);
        
        // Generate a summary and sentiment analysis if AI is enabled
        let summary = subject;
        let sentiment: typeof sentimentEnum.enumValues[number] | undefined = undefined;
        let sentimentConfidence: number | undefined = undefined;
        
        if (this.aiEnabled && bodyText !== '(No Content)') {
          try {
            // Get AI summary of email
            summary = await this.getAISummary(bodyText);
            
            // Get sentiment analysis
            const sentimentAnalysis = await this.analyzeEmailSentiment(bodyText, subject);
            sentiment = sentimentAnalysis.sentiment;
            sentimentConfidence = sentimentAnalysis.confidence;
            
            console.log(`CommunicationSyncService: AI analysis complete for email ID ${messageId} - Sentiment: ${sentiment}`);
          } catch (aiError) {
            console.error(`CommunicationSyncService: AI analysis failed for email ID ${messageId}:`, aiError);
            // Continue with basic summary
          }
        }

        // Create the communication record
        const communicationData: InsertCommunication = {
          opportunityId,
          clientId,
          type: 'email',
          direction,
          timestamp: emailDate,
          source: 'communication_sync',
          externalId: messageId,
          subject,
          fromAddress: fromEmail,
          toAddress: toEmails.join(', '),
          bodyRaw: bodyText.length > 50000 ? bodyText.substring(0, 50000) + '...' : bodyText,
          bodySummary: summary.length > 1000 ? summary.substring(0, 1000) + '...' : summary,
          metaData: {
            cc: ccEmails,
            processedAt: new Date().toISOString(),
            gmailId,
            aiProcessing: this.aiEnabled ? 'completed' : 'disabled',
            sentiment,
            sentimentConfidence,
          },
        };

        await storage.createCommunication(communicationData);
        console.log(`CommunicationSyncService: Successfully logged communication for ${opportunityId ? 'opportunity' : 'client'}`);
      } else {
        console.log(`CommunicationSyncService: No matching opportunity/client found for ${contactEmailToSearch}. Skipping.`);
      }
    } catch (error) {
      console.error(`CommunicationSyncService: Error processing email communication (ID: ${messageId}):`, error);
    }
  }

  // AI methods
  private async getAISummary(text: string): Promise<string> {
    console.log(`AI Summarization: Processing email content of length ${text.length}`);
    if (!text) return "No content to summarize.";
    
    try {
      const summary = await aiService.generateSummary(text);
      return summary;
    } catch (error) {
      console.error("AI Summarization Error:", error);
      // Fallback to basic trimming
      return text.substring(0, Math.min(text.length, 150)).replace(/\s+/g, ' ') + (text.length > 150 ? "..." : "");
    }
  }

  private async analyzeEmailSentiment(text: string, subject: string): Promise<{sentiment: typeof sentimentEnum.enumValues[number], confidence: number}> {
    console.log(`AI Sentiment Analysis: Analyzing email with subject "${subject}"`);
    
    try {
      const result = await aiService.analyzeSentiment(text);
      
      // Map the sentiment to our enum values
      let sentiment: typeof sentimentEnum.enumValues[number] = 'neutral';
      
      if (result.sentiment === 'positive') sentiment = 'positive';
      else if (result.sentiment === 'negative') sentiment = 'negative';
      else if (result.sentiment === 'urgent') sentiment = 'urgent';
      else sentiment = 'neutral';
      
      return {
        sentiment,
        confidence: result.confidence || 0.5
      };
    } catch (error) {
      console.error("AI Sentiment Analysis Error:", error);
      // Return neutral as fallback
      return {
        sentiment: 'neutral',
        confidence: 0
      };
    }
  }
}