// server/services/VendorLeadIntakeService.ts
import { google, gmail_v1 } from 'googleapis';
import { simpleParser, ParsedMail } from 'mailparser';
import { storage } from '../storage';
import { aiService } from './aiService';
import { oauth2Client, tokenStore, setOAuthCredentials } from './googleAuth'; // Use shared Google Auth utilities
import {
    InsertRawLead,
    rawLeadStatusEnum,
    leadScoreEnum,
    leadQualityCategoryEnum,
    budgetIndicationEnum,
    sentimentEnum,
    InsertGmailSyncState,
    InsertCommunication,
    InsertOpportunityEmailThread
} from '@shared/schema';
import { db } from '../db';
import { gmailSyncState as gmailSyncStateTable } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { uploadEmailToGCP, EmailData, isGCPConfigured } from './gcpStorageService';

const GMAIL_WATCH_LABEL_ID = 'INBOX'; // Or a more specific label if vendors use one consistently
const VENDOR_LEAD_PROCESSED_LABEL_NAME = 'PROCESSED_BY_VENDOR_INTAKE'; // New label for this service

// Helper to format dates consistently
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

export class VendorLeadIntakeService {
    private gmail: gmail_v1.Gmail | null = null;
    public targetEmail: string = "";
    private project_id = process.env.GOOGLE_CLOUD_PROJECT_ID;
    private pubsub_topic_name = process.env.GMAIL_PUBSUB_TOPIC_ID || 'homebites-vendor-lead-notifications';
    private topicName: string = `projects/${this.project_id}/topics/${this.pubsub_topic_name}`;
    private webhookProcessedLabelId: string | null = null;

    constructor() {
        this.targetEmail = tokenStore.targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS || '';
        if (!this.targetEmail || !this.project_id) {
            console.error("VendorLeadIntakeService: SYNC_TARGET_EMAIL_ADDRESS or GOOGLE_CLOUD_PROJECT_ID is not configured.");
        }
    }

    private async initializeGmailClient(): Promise<gmail_v1.Gmail> {
        if (this.gmail) return this.gmail;

        const credentialsInitialized = setOAuthCredentials();
        if (credentialsInitialized && oauth2Client.credentials.access_token) {
            this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            console.log("VendorLeadIntakeService: Gmail API client initialized.");
            this.webhookProcessedLabelId = await this.ensureLabelExists(VENDOR_LEAD_PROCESSED_LABEL_NAME);
            return this.gmail;
        } else {
            const errorMsg = "VendorLeadIntakeService: Failed to initialize Gmail client (OAuth credentials missing or failed to set).";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    private async ensureLabelExists(labelName: string): Promise<string | null> {
        if (!this.gmail) await this.initializeGmailClient();
        if (!this.gmail) return null;

        try {
            const res = await this.gmail.users.labels.list({ userId: 'me' });
            const existingLabel = res.data.labels?.find(l => l.name === labelName);
            if (existingLabel?.id) return existingLabel.id;

            const createdLabel = await this.gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            });
            console.log(`Label "${labelName}" created with ID: ${createdLabel.data.id}`);
            return createdLabel.data.id || null;
        } catch (error) {
            console.error(`Error ensuring label "${labelName}" exists:`, error);
            return null;
        }
    }

    public async startOrRenewWatch(): Promise<void> {
        if (!this.targetEmail) {
            console.error("VendorLeadIntakeService: Cannot start/renew watch, SYNC_TARGET_EMAIL_ADDRESS not set.");
            return;
        }
        const gmail = await this.initializeGmailClient();

        try {
            const request = {
                userId: 'me',
                requestBody: {
                    labelIds: [GMAIL_WATCH_LABEL_ID],
                    topicName: this.topicName,
                },
            };
            const response = await gmail.users.watch(request);
            console.log(`VendorLeadIntakeService: Gmail watch initiated/renewed for ${this.targetEmail}. Response:`, response.data);

            if (response.data.historyId && response.data.expiration) {
                await storage.saveGmailSyncState({
                    targetEmail: this.targetEmail,
                    lastHistoryId: response.data.historyId,
                    watchExpirationTimestamp: new Date(Number(response.data.expiration)),
                    lastWatchAttemptTimestamp: new Date(),
                });
                console.log(`VendorLeadIntakeService: Saved new watch state. History ID: ${response.data.historyId}, Expires: ${new Date(Number(response.data.expiration)).toISOString()}`);
            }
        } catch (error) {
            console.error(`VendorLeadIntakeService: Error starting/renewing Gmail watch for ${this.targetEmail}:`, error);
        }
    }

    public async processGmailNotification(newHistoryId: string): Promise<void> {
        const gmail = await this.initializeGmailClient();
        console.log(`VendorLeadIntakeService: Processing Gmail notification for ${this.targetEmail}, new history ID: ${newHistoryId}`);

        const syncState = await storage.getGmailSyncState(this.targetEmail);
        if (!syncState || !syncState.lastHistoryId) {
            console.warn(`VendorLeadIntakeService: No last known history ID for ${this.targetEmail}. Using notification history ID. Consider initial sync or re-watch if issues persist.`);
            await storage.saveGmailSyncState({
                targetEmail: this.targetEmail,
                lastHistoryId: newHistoryId,
                watchExpirationTimestamp: syncState?.watchExpirationTimestamp || new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
                lastWatchAttemptTimestamp: new Date(),
            });
        }

        const startHistoryId = syncState?.lastHistoryId || newHistoryId;

        try {
            const response = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: startHistoryId,
                historyTypes: ['messageAdded'],
            });

            const historyRecords = response.data.history;
            if (historyRecords && historyRecords.length > 0) {
                for (const record of historyRecords) {
                    if (record.messagesAdded) {
                        for (const msgAdded of record.messagesAdded) {
                            if (msgAdded.message && msgAdded.message.id) {
                                const msgDetails = await gmail.users.messages.get({
                                    userId: 'me',
                                    id: msgAdded.message.id,
                                    format: 'metadata',
                                    fields: 'id,labelIds,internalDate',
                                });

                                const isUnread = msgDetails.data.labelIds?.includes('UNREAD');
                                const isAlreadyProcessedByThis = this.webhookProcessedLabelId && msgDetails.data.labelIds?.includes(this.webhookProcessedLabelId);

                                if (isUnread && !isAlreadyProcessedByThis) {
                                    console.log(`VendorLeadIntakeService: Processing new message ID from history: ${msgAdded.message.id}`);
                                    await this.processSingleVendorEmail(msgAdded.message.id, Number(msgDetails.data.internalDate));
                                } else {
                                    console.log(`VendorLeadIntakeService: Skipping message ${msgAdded.message.id} (Read or already processed by this service). Labels: ${msgDetails.data.labelIds?.join(', ')}`);
                                }
                            }
                        }
                    }
                }
            }
            await storage.saveGmailSyncState({
                targetEmail: this.targetEmail,
                lastHistoryId: newHistoryId,
                watchExpirationTimestamp: syncState?.watchExpirationTimestamp,
                lastWatchAttemptTimestamp: syncState?.lastWatchAttemptTimestamp
            });
            console.log(`VendorLeadIntakeService: Successfully processed history up to ${newHistoryId} for ${this.targetEmail}.`);

        } catch (error: any) {
            console.error(`VendorLeadIntakeService: Error processing history records for ${this.targetEmail}:`, error);
            if (error.code === 404 && error.message?.includes("notFound") && error.message?.includes("historyId")) {
                console.warn(`VendorLeadIntakeService: History ID ${startHistoryId} not found for ${this.targetEmail}. It might be too old. Attempting to re-establish watch and get current historyId.`);
                try {
                    const profile = await gmail.users.getProfile({ userId: 'me' });
                    const currentMailboxHistoryId = profile.data.historyId;
                    if (currentMailboxHistoryId) {
                        await storage.saveGmailSyncState({
                           targetEmail: this.targetEmail,
                           lastHistoryId: currentMailboxHistoryId,
                           watchExpirationTimestamp: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
                           lastWatchAttemptTimestamp: new Date()
                        });
                        console.log(`VendorLeadIntakeService: Reset lastHistoryId for ${this.targetEmail} to current mailbox historyId: ${currentMailboxHistoryId}. Please retry notification or wait for next one.`);
                    }
                    await this.startOrRenewWatch();
                } catch (profileError) {
                    console.error(`VendorLeadIntakeService: Failed to get profile or re-watch for ${this.targetEmail} after historyId notFound:`, profileError);
                }
            }
        }
    }

    private async handleEmailThreadAndStorage(
        gmailThreadId: string,
        gmailMessageId: string,
        opportunityId: number | undefined,
        rawLeadId: number | undefined,
        parsedMail: ParsedMail,
        emailDate: Date,
        fromEmail: string
    ): Promise<{ gcpStoragePath: string | null; threadRecord: any | null }> {
        let gcpStoragePath: string | null = null;
        let threadRecord: any = null;

        // 1. Handle Gmail thread tracking
        const existingThread = await storage.getOpportunityEmailThread(gmailThreadId);
        
        if (!existingThread && (opportunityId || rawLeadId)) {
            // Create new thread mapping
            const participantEmails = [
                fromEmail,
                this.targetEmail
            ];

            const threadData: InsertOpportunityEmailThread = {
                gmailThreadId: gmailThreadId,
                opportunityId: opportunityId || null,
                rawLeadId: rawLeadId || null,
                primaryEmailAddress: fromEmail,
                participantEmails: participantEmails,
                isActive: true
            };

            threadRecord = await storage.createOpportunityEmailThread(threadData);
            console.log(`Created new email thread mapping: ${gmailThreadId} -> ${opportunityId ? `Opportunity ${opportunityId}` : `Raw Lead ${rawLeadId}`}`);
        } else if (existingThread) {
            threadRecord = existingThread;
            
            // If the thread was linked to a raw lead but now has an opportunity, update it
            if (opportunityId && !existingThread.opportunityId) {
                await storage.updateOpportunityEmailThread(gmailThreadId, { opportunityId });
                console.log(`Updated email thread ${gmailThreadId} to link to Opportunity ${opportunityId}`);
            }
        }

        // 2. Upload email to GCP Storage (if configured)
        if ((opportunityId || rawLeadId) && isGCPConfigured()) {
            try {
                const emailData: EmailData = {
                    subject: parsedMail.subject || '(No Subject)',
                    from: fromEmail,
                    to: this.targetEmail,
                    receivedDate: emailDate.toISOString(),
                    htmlBody: parsedMail.html || undefined,
                    plainTextBody: parsedMail.text || undefined,
                    headers: Object.fromEntries(parsedMail.headers),
                    gmailThreadId: gmailThreadId,
                    gmailMessageId: gmailMessageId,
                    attachments: parsedMail.attachments?.map(att => ({
                        filename: att.filename || 'unnamed',
                        mimeType: att.contentType,
                        size: att.size,
                        contentId: att.cid
                    }))
                };

                const targetId = opportunityId || rawLeadId || 0;
                gcpStoragePath = await uploadEmailToGCP(targetId, gmailMessageId, emailData);
                console.log(`Uploaded email to GCP Storage: ${gcpStoragePath}`);
            } catch (error) {
                console.error('Failed to upload email to GCP Storage:', error);
                // Continue without GCP storage - don't fail the entire process
            }
        } else if ((opportunityId || rawLeadId) && !isGCPConfigured()) {
            console.log('GCP Storage not configured. Skipping email upload to cloud storage.');
        }

        return { gcpStoragePath, threadRecord };
    }

    private async processSingleVendorEmail(messageGmailId: string, internalDateMs: number): Promise<void> {
        const gmail = await this.initializeGmailClient();
        console.log(`VendorLeadIntakeService: Fetching full email for Gmail ID: ${messageGmailId}`);

        try {
            const msg = await gmail.users.messages.get({ userId: 'me', id: messageGmailId, format: 'raw' });
            if (!msg.data.raw) {
                console.warn(`VendorLeadIntakeService: No raw data for message ${messageGmailId}.`);
                return;
            }

            // Extract Gmail thread ID for conversation tracking
            const gmailThreadId = msg.data.threadId || `thread-${messageGmailId}`;

            const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
            const parsedMail = await simpleParser(rawEmail);
            const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
            const uniqueMessageId = messageIdHeader || parsedMail.messageId || `generated-${Date.now()}-${messageGmailId}`;

            // 1. Robust Duplicate Check
            const isAlreadyProcessedGlobally = await storage.isEmailProcessed(uniqueMessageId, null);
            if (isAlreadyProcessedGlobally) {
                console.log(`VendorLeadIntakeService: Email ${uniqueMessageId} (Gmail ID: ${messageGmailId}) already processed by another service. Marking and skipping.`);
                await this.markEmailAsProcessedInGmail(messageGmailId);
                return;
            }

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
                console.warn(`VendorLeadIntakeService: Cannot process email ID ${uniqueMessageId}, no sender email found.`);
                return;
            }

            // Skip emails from our own address
            if (fromEmail === this.targetEmail.toLowerCase()) {
                console.log(`VendorLeadIntakeService: Skipping email from our own address: ${fromEmail}`);
                return;
            }

            const emailDate = parsedMail.date || new Date(internalDateMs);
            const subject = parsedMail.subject || '(No Subject)';
            let bodyText = parsedMail.text || '';
            if (!bodyText && parsedMail.html) {
                bodyText = parsedMail.html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            }
            if (!bodyText) bodyText = '(No Content)';

            console.log(`VendorLeadIntakeService: Processing lead email - Subject: "${subject}", From: ${fromEmail}`);

            // Check if this sender already exists in our system
            const existingContact = await storage.findOpportunityOrClientByContactIdentifier(fromEmail, 'email');
            
            // Only create a lead if the email doesn't match an existing opportunity or client
            if (!existingContact) {
                console.log(`VendorLeadIntakeService: Creating new lead from email from ${fromEmail}`);
                
                // Calendar Conflict Data Retrieval preparation
                let calendarConflictContext = "No potential event date found in email for calendar check.";
                
                // Intelligent Parsing & Analysis with AI
                const extractedData = await this.extractLeadDataWithAI(bodyText, subject, fromEmail, emailDate);

                // After AI analysis, check for calendar conflicts
                let calendarConflictDetails = "Calendar check not performed (no date from AI).";
                if (extractedData.success && extractedData.extractedEventDate) {
                    const eventsAroundDate = await storage.getEventsAroundDate(new Date(extractedData.extractedEventDate));
                    if (eventsAroundDate.length > 0) {
                        calendarConflictDetails = `Potential conflict: ${eventsAroundDate.length} event(s) near ${extractedData.extractedEventDate}. Example: ${eventsAroundDate[0].eventType} on ${formatDate(eventsAroundDate[0].eventDate)}`;
                        (extractedData as any).aiCalendarConflictDetails = calendarConflictDetails;
                    } else {
                        calendarConflictDetails = `No immediate calendar conflicts found for ${extractedData.extractedEventDate}.`;
                        (extractedData as any).aiCalendarConflictDetails = calendarConflictDetails;
                    }
                }

                // Create RawLead Record based on extractedData
                if (!extractedData.success && fromEmail) {
                    // Create a fallback lead with basic info if AI extraction failed
                    const fallbackLeadData: InsertRawLead = {
                        source: 'gmail_vendor_lead_fallback',
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
                            bodyPreview: bodyText.substring(0, 500),
                            gmailId: messageGmailId
                        },
                        leadSourcePlatform: 'email',
                    };
                    
                    const rawLead = await storage.createRawLead(fallbackLeadData);
                    console.log(`VendorLeadIntakeService: Created minimal lead ID ${rawLead.id} due to AI failure.`);
                } 
                else if (extractedData.success) {
                    // Create the lead with successfully extracted data
                    const leadData: InsertRawLead = {
                        source: extractedData.source || 'gmail_vendor_lead',
                        extractedProspectName: extractedData.extractedProspectName || extractedData.extractedName || '',
                        extractedProspectEmail: extractedData.extractedProspectEmail || extractedData.extractedEmail || fromEmail,
                        extractedProspectPhone: extractedData.extractedProspectPhone || extractedData.extractedPhone || null,
                        eventSummary: extractedData.eventSummary || subject,
                        status: extractedData.status || 'under_review',
                        notes: extractedData.notes || `AI-Analyzed Vendor Lead | Vendor: ${fromEmail} | Conflict Check: ${calendarConflictDetails}`,
                        receivedAt: emailDate,
                        rawData: {
                            gmailId: messageGmailId,
                            subject: subject,
                            from: fromEmail,
                            date: emailDate.toISOString(),
                            bodyPreview: bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''),
                            originalEmail: rawEmail.substring(0, 20000),
                            aiAnalysis: extractedData
                        },
                        extractedEventType: extractedData.extractedEventType,
                        extractedEventDate: extractedData.extractedEventDate,
                        extractedEventTime: extractedData.extractedEventTime,
                        extractedGuestCount: extractedData.extractedGuestCount,
                        extractedVenue: extractedData.extractedVenue,
                        extractedMessageSummary: extractedData.extractedMessageSummary,
                        leadSourcePlatform: 'email',
                        aiUrgencyScore: extractedData.aiUrgencyScore,
                        aiBudgetIndication: extractedData.aiBudgetIndication,
                        aiBudgetValue: extractedData.aiBudgetValue,
                        aiClarityOfRequestScore: extractedData.aiClarityOfRequestScore,
                        aiDecisionMakerLikelihood: extractedData.aiDecisionMakerLikelihood,
                        aiKeyRequirements: extractedData.aiKeyRequirements || [],
                        aiPotentialRedFlags: extractedData.aiPotentialRedFlags || [],
                        aiOverallLeadQuality: extractedData.aiOverallLeadQuality,
                        aiSuggestedNextStep: extractedData.aiSuggestedNextStep,
                        aiSentiment: extractedData.aiSentiment,
                        aiConfidenceScore: extractedData.aiConfidenceScore
                    };

                    const newRawLead = await storage.createRawLead(leadData);
                    console.log(`VendorLeadIntakeService: Created RawLead ID ${newRawLead.id} for email ${uniqueMessageId}`);

                    // Record the email processing
                    await storage.recordProcessedEmail({
                        messageId: uniqueMessageId,
                        gmailId: messageGmailId,
                        service: 'vendor_lead_intake',
                        email: fromEmail,
                        subject: subject,
                        labelApplied: false
                    });

                    // Handle Gmail thread tracking and GCP storage upload
                    const { gcpStoragePath, threadRecord } = await this.handleEmailThreadAndStorage(
                        gmailThreadId,
                        messageGmailId,
                        undefined, // No opportunity ID yet (this is a raw lead)
                        newRawLead.id,
                        parsedMail,
                        emailDate,
                        fromEmail
                    );

                    // Log this initial email as a communication
                    const communicationData: InsertCommunication = {
                        rawLeadId: newRawLead.id,
                        type: 'email',
                        direction: 'incoming',
                        timestamp: emailDate,
                        source: 'gmail_sync',
                        externalId: uniqueMessageId,
                        gmailThreadId: gmailThreadId,
                        gmailMessageId: messageGmailId,
                        gcpStoragePath: gcpStoragePath || undefined,
                        subject: subject,
                        fromAddress: fromEmail,
                        toAddress: this.targetEmail,
                        bodyRaw: bodyText.substring(0, 5000), // Store limited preview in DB
                        bodySummary: extractedData.extractedMessageSummary || subject.substring(0, 255),
                        metaData: { 
                            gmailId: messageGmailId,
                            gmailThreadId: gmailThreadId,
                            aiSentiment: extractedData.aiSentiment,
                            hasFullEmailInStorage: !!gcpStoragePath
                        }
                    };
                    await storage.createCommunication(communicationData);
                }
            }
            
            // Mark email as processed in Gmail
            await this.markEmailAsProcessedInGmail(messageGmailId, uniqueMessageId);
            
        } catch (error) {
            console.error(`VendorLeadIntakeService: Error processing email ID ${messageGmailId}:`, error);
        }
    }

    private async markEmailAsProcessedInGmail(messageGmailId: string, uniqueMessageIdForDb?: string): Promise<void> {
        const gmail = await this.initializeGmailClient();
        try {
            const requestBody: any = { removeLabelIds: ['UNREAD'] };
            if (this.webhookProcessedLabelId) {
                requestBody.addLabelIds = [this.webhookProcessedLabelId];
            }
            await gmail.users.messages.modify({
                userId: 'me',
                id: messageGmailId,
                requestBody,
            });
            console.log(`VendorLeadIntakeService: Marked ${messageGmailId} as read and applied ${VENDOR_LEAD_PROCESSED_LABEL_NAME}.`);
            if (uniqueMessageIdForDb) {
              await storage.updateProcessedEmailLabel(uniqueMessageIdForDb, true);
            }
        } catch (error) {
            console.error(`VendorLeadIntakeService: Error marking email ${messageGmailId} as processed in Gmail:`, error);
        }
    }

    // Method to renew watch periodically
    public async scheduleRenewal(): Promise<void> {
        const syncState = await storage.getGmailSyncState(this.targetEmail);
        if (!syncState || !syncState.watchExpirationTimestamp) return;
        
        const expirationTime = syncState.watchExpirationTimestamp.getTime();
        const nowTime = Date.now();
        const timeUntilExpiration = expirationTime - nowTime;
        
        // Renew watch 12 hours before expiration
        const renewalThreshold = 12 * 60 * 60 * 1000; // 12 hours in ms
        
        if (timeUntilExpiration < renewalThreshold) {
            console.log(`VendorLeadIntakeService: Watch expires soon (${new Date(expirationTime).toISOString()}), renewing now.`);
            await this.startOrRenewWatch();
        } else {
            console.log(`VendorLeadIntakeService: Watch active until ${new Date(expirationTime).toISOString()}, no renewal needed yet.`);
        }
    }
    
    /**
     * Ensures the Gmail watch is active and valid
     * Called periodically to maintain Gmail watch
     */
    public async ensureWatchIsActive(): Promise<void> {
        console.log(`VendorLeadIntakeService: Checking if Gmail watch is active for ${this.targetEmail}`);
        
        try {
            const syncState = await storage.getGmailSyncState(this.targetEmail);
            
            // If we have no sync state or the watch is expired/will expire soon, renew it
            if (!syncState || !syncState.watchExpirationTimestamp) {
                console.log(`VendorLeadIntakeService: No existing watch found for ${this.targetEmail}. Starting new watch.`);
                await this.startOrRenewWatch();
                return;
            }
            
            const now = new Date();
            const expirationTime = syncState.watchExpirationTimestamp.getTime();
            const timeRemaining = expirationTime - now.getTime();
            
            // Renew if less than 24 hours remaining
            const renewalThreshold = 24 * 60 * 60 * 1000; // 24 hours in ms
            
            if (timeRemaining < renewalThreshold) {
                console.log(`VendorLeadIntakeService: Watch expires soon (${syncState.watchExpirationTimestamp.toISOString()}). Renewing now.`);
                await this.startOrRenewWatch();
            } else {
                console.log(`VendorLeadIntakeService: Watch is active until ${syncState.watchExpirationTimestamp.toISOString()}. No renewal needed.`);
            }
        } catch (error) {
            console.error(`VendorLeadIntakeService: Error ensuring Gmail watch is active for ${this.targetEmail}:`, error);
            throw error;
        }
    }

    // Integrated AI lead data extraction
    private async extractLeadDataWithAI(
        emailContent: string,
        emailSubject: string,
        fromAddress?: string,
        emailDate?: Date
    ): Promise<Partial<InsertRawLead> & { success: boolean; error?: string }> {
        console.log(`VendorLeadIntakeService: Extracting lead data with AI for email with subject "${emailSubject}"`);

        try {
            const fullContent = `
Subject: ${emailSubject}
${fromAddress ? `From: ${fromAddress}` : ''}

${emailContent}
            `.trim();

            try {
                const aiResults = await aiService.analyzeLeadMessage(fullContent);
                console.log("VendorLeadIntakeService: Successfully processed with AI service");

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
                console.error("VendorLeadIntakeService: AI service error:", aiError);
                return {
                    success: false,
                    error: `AI service error: ${errorMessage}`,
                    extractedProspectEmail: fromAddress,
                    eventSummary: emailSubject,
                    status: 'needs_manual_review' as const,
                    notes: `AI extraction failed for email with subject: "${emailSubject}"`,
                    receivedAt: emailDate,
                };
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error("VendorLeadIntakeService: Unexpected error during lead extraction:", error);
            return {
                success: false,
                error: `Unexpected error: ${errorMessage}`,
                extractedProspectEmail: fromAddress,
                eventSummary: emailSubject,
                status: 'needs_manual_review' as const,
                notes: `Failed to process email with subject: "${emailSubject}"`,
                receivedAt: emailDate,
            };
        }
    }
}