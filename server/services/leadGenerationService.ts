// server/services/leadGenerationService.ts
import { google, Auth, gmail_v1 } from 'googleapis';
import { simpleParser, ParsedMail } from 'mailparser';
import { storage } from '../storage';
import { aiService } from './aiService';
import {
  InsertRawLead,
  rawLeadStatusEnum,
  leadScoreEnum,
  leadQualityCategoryEnum,
  budgetIndicationEnum,
  sentimentEnum,
  InsertProcessedEmail
} from '@shared/schema';

// Use the same token store as emailSyncService
import { tokenStore, oauth2Client, setOAuthCredentials } from './emailSyncService';

export class LeadGenerationService {
  private static readonly CUSTOM_LABEL_NAME = 'PROCESSED_BY_LEAD_GEN';
  
  private gmail: gmail_v1.Gmail | null = null;
  private _isRunning: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private processingInterval: number;
  private aiEnabled: boolean;
  private targetEmail: string = "";
  private lastSyncTimestamp: number | null = null;
  private customLabelId: string | null = null;

  constructor(intervalMs: number = 15 * 60 * 1000, aiEnabled: boolean = true) {
    this.processingInterval = intervalMs;
    this.aiEnabled = aiEnabled;
    this.targetEmail = tokenStore.targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS || '';

    if (!this.targetEmail) {
      console.error("LeadGenerationService: SYNC_TARGET_EMAIL_ADDRESS is not configured. Service cannot start.");
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
      console.error("LeadGenerationService: Cannot start, SYNC_TARGET_EMAIL_ADDRESS not set.");
      return;
    }
    
    // Initialize OAuth credentials when starting the service
    const credentialsInitialized = setOAuthCredentials();
    if (!credentialsInitialized) {
      console.warn('LeadGenerationService: OAuth credentials could not be initialized. Cannot start service.');
      console.log('To authorize, visit: /api/auth/google/initiate then follow the redirect.');
      return;
    }
    
    // Initialize Gmail client only after credentials are set
    if (!this.gmail && oauth2Client.credentials.access_token) {
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      console.log("LeadGenerationService: Gmail API client initialized.");
    }

    if (!this.gmail) {
      console.warn('LeadGenerationService: Gmail API client not initialized (missing auth). Cannot start.');
      return;
    }

    if (this._isRunning) {
      console.log('LeadGenerationService is already running.');
      return;
    }

    this._isRunning = true;
    console.log(`LeadGenerationService started. Checking for lead emails for "${this.targetEmail}" every ${this.processingInterval / 1000} seconds.`);
    this.scheduleNextFetch();
  }

  public stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._isRunning = false;
    console.log('LeadGenerationService stopped.');
  }

  private scheduleNextFetch(): void {
    if (!this._isRunning) return;
    
    this.timeoutId = setTimeout(async () => {
      try {
        await this.fetchAndProcessLeadEmails();
      } catch (error) {
        console.error('LeadGenerationService error during fetch cycle:', error);
      } finally {
        // Schedule next run only if service is still running
        if (this._isRunning) {
          this.scheduleNextFetch();
        }
      }
    }, this.processingInterval);
  }

  private async fetchAndProcessLeadEmails(): Promise<void> {
    if (!this._isRunning || !this.gmail) {
      console.warn('LeadGenerationService: Cannot fetch emails, service stopped or client unavailable.');
      return;
    }

    // Lead-specific query to target potential lead sources
    // No date filtering necessary - we use database tracking and Gmail labels for deduplication
    const query = 'is:unread label:INBOX -label:PROCESSED_BY_LEAD_GEN (from:weddingvendors@zola.com OR from:projects@kolmo.io)';
    
    console.log(`[${new Date().toISOString()}] LeadGenerationService: Fetching unprocessed lead emails from specific sources...`);

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10,
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        console.log('LeadGenerationService: No new potential lead emails found.');
        return;
      }

      console.log(`LeadGenerationService: Found ${messages.length} potential lead emails.`);

      for (const messageEntry of messages) {
        if (!this._isRunning) {
          console.log(`LeadGenerationService: Stopping processing early due to service stop.`);
          break;
        }

        if (!messageEntry.id) continue;

        // Define messageId in broader scope for access in the finally block
        let messageId: string = '';
        
        try {
          const msg = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageEntry.id,
            format: 'raw',
          });

          if (msg.data.raw) {
            const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
            const parsedMail = await simpleParser(rawEmail);
            
            // Extract message ID for tracking
            const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
            messageId = messageIdHeader || `generated-${Date.now()}-${messageEntry.id}`;
            
            // --- Database Duplicate Check ---
            try {
              const isProcessed = await storage.isEmailProcessed(messageId, 'lead_generation');
              if (isProcessed) {
                console.log(`LeadGenerationService: Email with message ID ${messageId} (Gmail ID: ${messageEntry.id}) was already processed according to database. Skipping.`);
                
                // Always try to mark as read and labeled, even if it's a duplicate
                // This covers cases where the database recorded it but label application failed
                try {
                  await this.markEmailAsRead(messageEntry.id);
                  // Update the record to show label was applied
                  await storage.updateProcessedEmailLabel(messageId, true);
                } catch (labelError) {
                  console.error(`LeadGenerationService: Error applying label to already processed message ${messageId}:`, labelError);
                }
                
                continue; // Skip to the next message
              } else {
                console.log(`LeadGenerationService: Message ID ${messageId} is not in processed database. Continuing with processing.`);
              }
            } catch (dbError) {
              // If database check fails, log but continue processing
              // Better to risk duplicate processing than missing emails
              console.error(`LeadGenerationService: Database duplicate check failed for message ID ${messageId}:`, dbError);
            }
            
            // Legacy check against communications table (for backward compatibility)
            try {
              const communications = await storage.getCommunicationsByExternalId(messageId);
              if (communications && communications.length > 0) {
                console.log(`LeadGenerationService: Email with message ID ${messageId} was already processed in communications. Recording in tracking DB & skipping.`);
                
                // Record in our processed emails table for future reference
                await storage.recordProcessedEmail({
                  messageId,
                  gmailId: messageEntry.id,
                  service: 'lead_generation',
                  email: parsedMail.from?.value[0]?.address || 'unknown',
                  subject: parsedMail.subject || 'No Subject',
                  labelApplied: false // Will be updated after markEmailAsRead
                });
                
                await this.markEmailAsRead(messageEntry.id);
                
                // Update to show label was applied
                await storage.updateProcessedEmailLabel(messageId, true);
                continue;
              }
            } catch (error) {
              console.error(`LeadGenerationService: Error during duplicate check for message ID ${messageId}. Attempting to process anyway.`, error);
            }
            
            // Record this email in our processed database BEFORE processing
            // This ensures it's recorded even if processing fails
            const fromAddress = parsedMail.from?.value[0]?.address || 'unknown';
            const emailSubject = parsedMail.subject || 'No Subject';
            
            try {
              await storage.recordProcessedEmail({
                messageId,
                gmailId: messageEntry.id,
                service: 'lead_generation',
                email: fromAddress,
                subject: emailSubject,
                labelApplied: false // Will be updated after markEmailAsRead is successful
              });
              console.log(`LeadGenerationService: Recorded message ID ${messageId} in processed emails database`);
            } catch (recordError) {
              console.error(`LeadGenerationService: Failed to record in processed emails database:`, recordError);
              // Continue processing - better to have duplicate processing than missing emails
            }
            
            // Process the email to generate a lead
            await this.processLeadEmail(parsedMail, messageId);
          }
        } catch (err) {
          console.error(`LeadGenerationService: Error processing message ID ${messageEntry.id}:`, err);
        } finally {
          try {
            await this.markEmailAsRead(messageEntry.id);
            
            // Update the processed email record to show label was applied
            try {
              await storage.updateProcessedEmailLabel(messageId, true);
            } catch (updateError) {
              console.error(`LeadGenerationService: Failed to update label status in database:`, updateError);
            }
          } catch (markReadErr) {
            console.error(`LeadGenerationService: Failed to mark message ID ${messageEntry.id} as read:`, markReadErr);
          }
        }
      }
    } catch (err: any) {
      console.error('LeadGenerationService: API Error during fetch cycle:', err.message || err);
      if (err.code === 401 || (err.response && err.response.status === 401)) {
        console.error("LeadGenerationService: Authentication error (401). Please re-authorize.");
        this.stop();
      }
    } finally {
      this.lastSyncTimestamp = Math.floor(Date.now() / 1000);
      console.log(`[${new Date().toISOString()}] LeadGenerationService: Finished lead email fetch cycle.`);
    }
  }

  /**
   * Ensures our custom label exists in Gmail
   * Will create the label if it doesn't exist
   */
  private async ensureCustomLabelExists(): Promise<string | null> {
    if (!this.gmail) {
      console.warn('LeadGenerationService: Cannot check/create label, Gmail client not available.');
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
        label => label.name === LeadGenerationService.CUSTOM_LABEL_NAME
      );
      
      if (existingLabel && existingLabel.id) {
        console.log(`LeadGenerationService: Found existing label '${LeadGenerationService.CUSTOM_LABEL_NAME}' with ID ${existingLabel.id}`);
        this.customLabelId = existingLabel.id;
        return existingLabel.id;
      }
      
      // If not found, create the label
      console.log(`LeadGenerationService: Label '${LeadGenerationService.CUSTOM_LABEL_NAME}' not found, creating it now...`);
      const createResponse = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: LeadGenerationService.CUSTOM_LABEL_NAME,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });
      
      if (createResponse.data.id) {
        console.log(`LeadGenerationService: Successfully created label '${LeadGenerationService.CUSTOM_LABEL_NAME}' with ID ${createResponse.data.id}`);
        this.customLabelId = createResponse.data.id;
        return createResponse.data.id;
      }
      
      return null;
    } catch (error) {
      console.error(`LeadGenerationService: Error ensuring custom label exists:`, error);
      return null;
    }
  }
  
  private async markEmailAsRead(messageId: string): Promise<void> {
    if (!this.gmail) {
      console.warn(`LeadGenerationService: Cannot mark message ${messageId} as read, Gmail client not available.`);
      return;
    }
    
    try {
      // First check if we're in read-only mode (no modify permissions)
      const scopes = oauth2Client.credentials.scope;
      const hasModifyScope = scopes && typeof scopes === 'string' && scopes.includes('https://www.googleapis.com/auth/gmail.modify');
      
      if (!hasModifyScope) {
        console.log(`LeadGenerationService: Skipping marking message ${messageId} as read - no modify permission.`);
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
        id: messageId,
        requestBody
      });
      
      console.log(`LeadGenerationService: Successfully marked message ${messageId} as read and applied custom label.`);
    } catch (error) {
      console.error(`LeadGenerationService: Error marking email ${messageId} as read:`, error);
      throw error;
    }
  }

  private async processLeadEmail(parsedMail: ParsedMail, messageId: string): Promise<void> {
    const subject = parsedMail.subject || '(No Subject)';
    
    // Extract email addresses
    const getAddressesFrom = (addressField: any): { address?: string; name?: string }[] => {
      if (!addressField) return [];
      if (Array.isArray(addressField)) return addressField;
      if (addressField.value && Array.isArray(addressField.value)) return addressField.value;
      return [addressField];
    };

    const fromAddresses = getAddressesFrom(parsedMail.from);
    const fromHeader = fromAddresses[0];
    const fromEmail = fromHeader?.address?.toLowerCase();
    
    if (!fromEmail) {
      console.warn(`LeadGenerationService: Cannot process email ID ${messageId}, no sender email found.`);
      return;
    }

    // Skip emails from our own address
    if (fromEmail === this.targetEmail.toLowerCase()) {
      console.log(`LeadGenerationService: Skipping email from our own address: ${fromEmail}`);
      return;
    }

    const emailDate = parsedMail.date || new Date();
    
    let bodyText = parsedMail.text || '';
    if (!bodyText && parsedMail.html) {
      bodyText = parsedMail.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ').trim();
    }
    if (!bodyText) bodyText = '(No Content)';

    console.log(`LeadGenerationService: Processing lead email - Subject: "${subject}", From: ${fromEmail}`);

    try {
      // Check if this sender already exists in our system
      const existingContact = await storage.findOpportunityOrClientByContactIdentifier(fromEmail, 'email');
      
      // Only create a lead if the email doesn't match an existing opportunity or client
      if (!existingContact) {
        console.log(`LeadGenerationService: Creating new lead from email from ${fromEmail}`);
        
        // Extract lead data using AI
        const extractedData = this.aiEnabled
          ? await this.extractLeadDataWithAI(bodyText, subject, fromEmail, emailDate)
          : {
              success: true,
              source: 'gmail_lead_gen',
              extractedName: fromHeader?.name || '',
              extractedEmail: fromEmail,
              extractedPhone: null,
              eventSummary: subject,
              status: 'new' as const,
              notes: `Auto-created from lead email with subject: ${subject} (AI disabled)`,
              receivedAt: emailDate,
              rawData: {
                subject,
                from: fromEmail,
                date: emailDate,
                bodyPreview: bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''),
              }
            };

        if (!extractedData.success && fromEmail) {
          // Create a fallback lead with basic info if AI extraction failed
          const fallbackLeadData: InsertRawLead = {
            source: 'gmail_lead_gen_fallback',
            extractedProspectName: fromHeader?.name || '',
            extractedProspectEmail: fromEmail,
            extractedProspectPhone: null,
            eventSummary: subject,
            status: 'needs_manual_review' as const,
            notes: `Lead creation with AI failed for email with subject: "${subject}"`,
            receivedAt: emailDate,
            rawData: { 
              error: extractedData.error, 
              emailSubject: subject, 
              fromAddress: fromEmail, 
              bodyPreview: bodyText.substring(0, 500) 
            },
            leadSourcePlatform: 'email',
          };
          
          const rawLead = await storage.createRawLead(fallbackLeadData);
          console.log(`LeadGenerationService: Created minimal lead ID ${rawLead.id} due to AI failure.`);
        } 
        else if (extractedData.success) {
          // Create the lead with successfully extracted data
          const leadData: InsertRawLead = {
            source: extractedData.source || 'gmail_lead_gen',
            extractedProspectName: extractedData.extractedProspectName || extractedData.extractedName,
            extractedProspectEmail: extractedData.extractedProspectEmail || extractedData.extractedEmail,
            extractedProspectPhone: extractedData.extractedProspectPhone || extractedData.extractedPhone,
            eventSummary: extractedData.eventSummary,
            status: extractedData.status || 'under_review',
            notes: extractedData.notes,
            receivedAt: emailDate,
            rawData: extractedData.rawData,
            // Include the AI-extracted fields
            extractedEventType: extractedData.extractedEventType,
            extractedEventDate: extractedData.extractedEventDate,
            extractedEventTime: extractedData.extractedEventTime,
            extractedGuestCount: extractedData.extractedGuestCount,
            extractedVenue: extractedData.extractedVenue,
            extractedMessageSummary: extractedData.extractedMessageSummary,
            leadSourcePlatform: 'email',
            // Include AI assessment fields
            aiUrgencyScore: extractedData.aiUrgencyScore,
            aiBudgetIndication: extractedData.aiBudgetIndication,
            aiBudgetValue: extractedData.aiBudgetValue,
            aiClarityOfRequestScore: extractedData.aiClarityOfRequestScore,
            aiDecisionMakerLikelihood: extractedData.aiDecisionMakerLikelihood,
            aiKeyRequirements: extractedData.aiKeyRequirements,
            aiPotentialRedFlags: extractedData.aiPotentialRedFlags,
            aiOverallLeadQuality: extractedData.aiOverallLeadQuality,
            aiSuggestedNextStep: extractedData.aiSuggestedNextStep,
            aiSentiment: extractedData.aiSentiment,
            aiConfidenceScore: extractedData.aiConfidenceScore
          };
          
          const rawLead = await storage.createRawLead(leadData);
          console.log(`LeadGenerationService: Created new lead ID ${rawLead.id} from ${fromEmail}`);
        } 
        else {
          console.error(`LeadGenerationService: Failed to create lead for message ID ${messageId}. Extraction unsuccessful.`);
        }
      } else {
        console.log(`LeadGenerationService: Email from ${fromEmail} matches existing ${existingContact.opportunity ? 'opportunity' : 'client'}. Not creating lead.`);
      }
    } catch (error) {
      console.error(`LeadGenerationService: Error processing lead email (ID: ${messageId}):`, error);
    }
  }

  // Helper method to extract lead data with AI
  private async extractLeadDataWithAI(
    emailContent: string,
    emailSubject: string,
    fromAddress?: string,
    emailDate?: Date
  ): Promise<Partial<InsertRawLead> & { success: boolean; error?: string }> {
    console.log(`Lead Data Extraction: Processing email with subject "${emailSubject}"`);

    try {
      const fullContent = `
Subject: ${emailSubject}
${fromAddress ? `From: ${fromAddress}` : ''}

${emailContent}
      `.trim();

      try {
        const aiResults = await aiService.analyzeLeadMessage(fullContent);
        console.log("Lead Data Extraction: Successfully processed with AI service");

        // Helper function to validate score against enum values
        const validateLeadScore = (score: string | undefined): typeof leadScoreEnum.enumValues[number] | undefined => {
          if (!score || !leadScoreEnum.enumValues.includes(score as any)) return undefined;
          return score as typeof leadScoreEnum.enumValues[number];
        };

        const validateLeadQuality = (quality: string | undefined): typeof leadQualityCategoryEnum.enumValues[number] | undefined => {
          if (!quality || !leadQualityCategoryEnum.enumValues.includes(quality as any)) return undefined;
          return quality as typeof leadQualityCategoryEnum.enumValues[number];
        };

        const validateBudgetIndication = (budget: string | undefined): typeof budgetIndicationEnum.enumValues[number] | undefined => {
          if (!budget || !budgetIndicationEnum.enumValues.includes(budget as any)) return undefined;
          return budget as typeof budgetIndicationEnum.enumValues[number];
        };

        const validateSentiment = (sentiment: string | undefined): typeof sentimentEnum.enumValues[number] | undefined => {
          if (!sentiment || !sentimentEnum.enumValues.includes(sentiment as any)) return undefined;
          return sentiment as typeof sentimentEnum.enumValues[number];
        };

        // Form the result object that aligns with InsertRawLead schema
        return {
          success: true,
          source: 'email_ai_extraction',
          extractedProspectName: aiResults.extractedProspectName || aiResults.extractedName || '',
          extractedProspectEmail: aiResults.extractedProspectEmail || aiResults.extractedEmail || fromAddress || '',
          extractedProspectPhone: aiResults.extractedProspectPhone || aiResults.extractedPhone || null,
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
            aiProvider: 'AI Service',
            aiOutput: aiResults,
            timestamp: new Date().toISOString()
          }
        };
      } catch (aiError: unknown) {
        const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
        console.error("Lead Data Extraction: AI service error:", aiError);
        return {
          success: false,
          error: `AI service error: ${errorMessage}`,
          extractedEmail: fromAddress,
          eventSummary: emailSubject,
          status: 'needs_manual_review' as const,
          notes: `AI extraction failed for email with subject: "${emailSubject}"`,
          rawData: {
            emailSubject,
            emailPreview: emailContent.substring(0, 500),
            fromAddress,
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Lead Data Extraction: Critical error:", error);
      return {
        success: false,
        error: `Lead extraction error: ${errorMessage}`,
        status: 'needs_manual_review' as const
      };
    }
  }
}