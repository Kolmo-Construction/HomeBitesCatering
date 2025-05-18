// server/services/VendorLeadIntakeService.ts
import { google, gmail_v1 } from 'googleapis';
import { simpleParser, ParsedMail } from 'mailparser';
import { storage } // Assuming your storage methods for gmailSyncState are added here
from '../storage';
import { aiService } from './aiService';
import { oauth2Client, tokenStore, setOAuthCredentials } from './googleAuth'; // Use shared Google Auth utilities
import {
    InsertRawLead,
    rawLeadStatusEnum,
    // ... other necessary types from shared/schema
    GmailSyncState, // Assuming you've added this type
    InsertGmailSyncState,
    InsertCommunication
} from '@shared/schema';
import { db } from '../db'; // For direct DB access if needed for gmailSyncState
import { gmailSyncState as gmailSyncStateTable } from '@shared/schema'; // Drizzle table
import { eq } from 'drizzle-orm';

const GMAIL_WATCH_LABEL_ID = 'INBOX'; // Or a more specific label if vendors use one consistently
const VENDOR_LEAD_PROCESSED_LABEL_NAME = 'PROCESSED_BY_VENDOR_INTAKE'; // New label for this service

export class VendorLeadIntakeService {
    private gmail: gmail_v1.Gmail | null = null;
    public targetEmail: string = "";
    private project_id = process.env.GOOGLE_CLOUD_PROJECT_ID;
    private pubsub_topic_name = process.env.GMAIL_PUBSUB_TOPIC_ID || 'homebites-vendor-lead-notifications'; // Set in .env
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
            // Optional: Fetch current user profile to get initial historyId if none exists
            // const profile = await gmail.users.getProfile({ userId: 'me' });
            // const initialHistoryId = profile.data.historyId;

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
            // If this happens, it might be good to call users.getProfile to get the current historyId
            // and process messages since then, or simply use the newHistoryId and acknowledge some messages might be missed
            // if the webhook was down for an extended period before the first successful watch.
            // For now, we'll use the newHistoryId as the an_history_id for the history.list call,
            // and update it after processing.
            await storage.saveGmailSyncState({ // Save it so we have a baseline
                targetEmail: this.targetEmail,
                lastHistoryId: newHistoryId, // Use the new one as a starting point
                watchExpirationTimestamp: syncState?.watchExpirationTimestamp || new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Default to 6 days if unknown
                lastWatchAttemptTimestamp: new Date(),
            });
        }

        const startHistoryId = syncState?.lastHistoryId || newHistoryId; // Fallback to newHistoryId if none stored

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
                                // Check if message has UNREAD label and NOT our PROCESSED_BY_VENDOR_INTAKE label
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
            // Update the last known history ID to the one from this notification payload
            await storage.saveGmailSyncState({
                targetEmail: this.targetEmail,
                lastHistoryId: newHistoryId, // Use the historyId from the Pub/Sub notification
                watchExpirationTimestamp: syncState?.watchExpirationTimestamp, // Keep existing expiration
                lastWatchAttemptTimestamp: syncState?.lastWatchAttemptTimestamp // Keep existing attempt time
            });
            console.log(`VendorLeadIntakeService: Successfully processed history up to ${newHistoryId} for ${this.targetEmail}.`);

        } catch (error: any) {
            console.error(`VendorLeadIntakeService: Error processing history records for ${this.targetEmail}:`, error);
            if (error.code === 404 && error.message?.includes("notFound") && error.message?.includes("historyId")) {
                console.warn(`VendorLeadIntakeService: History ID ${startHistoryId} not found for ${this.targetEmail}. It might be too old. Attempting to re-establish watch and get current historyId.`);
                // Attempt to get current historyId and re-watch.
                try {
                    const profile = await gmail.users.getProfile({ userId: 'me' });
                    const currentMailboxHistoryId = profile.data.historyId;
                    if (currentMailboxHistoryId) {
                        await storage.saveGmailSyncState({
                           targetEmail: this.targetEmail,
                           lastHistoryId: currentMailboxHistoryId,
                           watchExpirationTimestamp: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Default to 6 days
                           lastWatchAttemptTimestamp: new Date()
                        });
                        console.log(`VendorLeadIntakeService: Reset lastHistoryId for ${this.targetEmail} to current mailbox historyId: ${currentMailboxHistoryId}. Please retry notification or wait for next one.`);
                        // Optionally, re-trigger a history.list from this new ID if desired, or just wait for next pub/sub
                    }
                    await this.startOrRenewWatch(); // Re-initiate watch
                } catch (profileError) {
                    console.error(`VendorLeadIntakeService: Failed to get profile or re-watch for ${this.targetEmail} after historyId notFound:`, profileError);
                }
            }
        }
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

            const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
            const parsedMail = await simpleParser(rawEmail);
            const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
            const uniqueMessageId = messageIdHeader || parsedMail.messageId || `generated-${Date.now()}-${messageGmailId}`;

            // 1. Robust Duplicate Check (against your central processed_emails table)
            //    This checks if *any* service has touched this email.
            const isAlreadyProcessedGlobally = await storage.isEmailProcessed(uniqueMessageId, null); // null means any service
            if (isAlreadyProcessedGlobally) {
                console.log(`VendorLeadIntakeService: Email ${uniqueMessageId} (Gmail ID: ${messageGmailId}) already processed by another service. Marking and skipping.`);
                await this.markEmailAsProcessedInGmail(messageGmailId); // Mark it by this service too
                return;
            }

            const fromAddress = parsedMail.from?.value[0]?.address?.toLowerCase();
            const emailDate = parsedMail.date || new Date(internalDateMs); // Use Gmail's internalDate if mailparser fails
            const subject = parsedMail.subject || '(No Subject)';
            let bodyText = parsedMail.text || '';
            if (!bodyText && parsedMail.html) {
                bodyText = parsedMail.html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            }
            if (!bodyText) bodyText = '(No Content)';

            // 2. Calendar Conflict Data Retrieval
            let calendarConflictContext = "No potential event date found in email for calendar check.";
            // Basic date extraction (can be improved or done by AI first pass)
            // For simplicity, assume AI will extract the date needed for conflict check.
            // In a more advanced flow, you might do a quick regex for dates here.

            // 3. Intelligent Parsing & Analysis (using aiService.ts)
            const fullContentForAI = `Subject: ${subject}\nFrom: ${fromAddress}\nDate: ${emailDate.toISOString()}\n\n${bodyText}`;

            // Simulating calendar context fetching - in reality, you'd query your DB
            // For now, we'll pass a placeholder or make it part of the AI's job to identify event dates.
            // A more robust way: AI extracts date first, then you query DB, then make a second AI call for full analysis + response suggestion.
            // Or, provide recent bookings list to AI.
            // For this example, let AI try to find date and then we'd manually check calendar after.

            const aiAnalysisResults = await aiService.analyzeLeadMessage(fullContentForAI /*, calendarConflictContext - if fetched prior */);

            // After AI analysis, if aiAnalysisResults.extractedEventDate is present, THEN perform calendar check:
            let calendarConflictDetails = "Calendar check not performed (no date from AI).";
            if (aiAnalysisResults.extractedEventDate) {
                const eventsAroundDate = await storage.getEventsAroundDate(new Date(aiAnalysisResults.extractedEventDate)); // You'll need to implement getEventsAroundDate
                if (eventsAroundDate.length > 0) {
                    calendarConflictDetails = `Potential conflict: ${eventsAroundDate.length} event(s) near ${aiAnalysisResults.extractedEventDate}. Example: ${eventsAroundDate[0].eventType} on ${formatDate(eventsAroundDate[0].eventDate)}`;
                    // Update AI results or add to raw lead data
                    (aiAnalysisResults as any).aiCalendarConflictDetails = calendarConflictDetails; // Cast to add temp field or ensure it's in schema
                } else {
                    calendarConflictDetails = `No immediate calendar conflicts found for ${aiAnalysisResults.extractedEventDate}.`;
                     (aiAnalysisResults as any).aiCalendarConflictDetails = calendarConflictDetails;
                }
            }


            // 4. Create RawLead Record
            const leadData: InsertRawLead = {
                source: fromAddress || 'gmail_vendor_lead', // Or more specific based on vendor
                rawData: {
                    gmailId: messageGmailId,
                    subject: subject,
                    from: fromAddress,
                    date: emailDate.toISOString(),
                    bodyPreview: bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''),
                    originalEmail: rawEmail.substring(0, 20000), // Store a large chunk if needed
                    aiAnalysis: aiAnalysisResults // Store all AI results
                },
                extractedProspectName: aiAnalysisResults.extractedProspectName || aiAnalysisResults.extractedName || parsedMail.from?.value[0]?.name || '',
                extractedProspectEmail: aiAnalysisResults.extractedProspectEmail || aiAnalysisResults.extractedEmail || fromAddress || '', // Prefer AI extracted prospect email
                extractedProspectPhone: aiAnalysisResults.extractedProspectPhone || aiAnalysisResults.extractedPhone || null,
                eventSummary: aiAnalysisResults.extractedMessageSummary || subject,
                receivedAt: emailDate,
                status: (aiAnalysisResults.aiOverallLeadQuality === 'hot' ? 'under_review' : 'new') as rawLeadStatusEnum,
                // Populate all AI fields from aiAnalysisResults
                extractedEventType: aiAnalysisResults.extractedEventType,
                extractedEventDate: aiAnalysisResults.extractedEventDate,
                extractedEventTime: aiAnalysisResults.extractedEventTime,
                extractedGuestCount: aiAnalysisResults.extractedGuestCount,
                extractedVenue: aiAnalysisResults.extractedVenue,
                leadSourcePlatform: fromAddress, // Or parse from email content if vendor specifies
                aiUrgencyScore: aiAnalysisResults.aiUrgencyScore as any, // Cast if enums don't match perfectly yet
                aiBudgetIndication: aiAnalysisResults.aiBudgetIndication as any,
                aiBudgetValue: aiAnalysisResults.aiBudgetValue,
                aiClarityOfRequestScore: aiAnalysisResults.aiClarityOfRequestScore as any,
                aiDecisionMakerLikelihood: aiAnalysisResults.aiDecisionMakerLikelihood as any,
                aiKeyRequirements: aiAnalysisResults.aiKeyRequirements || [],
                aiPotentialRedFlags: aiAnalysisResults.aiPotentialRedFlags || [],
                aiOverallLeadQuality: aiAnalysisResults.aiOverallLeadQuality as any,
                aiSuggestedNextStep: aiAnalysisResults.aiSuggestedNextStep,
                aiSentiment: aiAnalysisResults.aiSentiment as any,
                aiConfidenceScore: aiAnalysisResults.aiConfidenceScore,
                internal_notes: calendarConflictDetails // Store calendar check result here or in a dedicated field
            };

            const newRawLead = await storage.createRawLead(leadData);
            console.log(`VendorLeadIntakeService: Created RawLead ID ${newRawLead.id} for email ${uniqueMessageId}`);

            // 5. Post-Processing
            await storage.recordProcessedEmail({ // Record in your central processed_emails table
                messageId: uniqueMessageId,
                gmailId: messageGmailId,
                service: 'vendor_lead_intake', // Specific service name
                email: fromAddress || 'unknown',
                subject: subject,
                labelApplied: false // Will be updated by markAsProcessed
            });

            // Log this initial email as a communication linked to the new RawLead
            const communicationData: InsertCommunication = {
                rawLeadId: newRawLead.id, // Link to the new RawLead
                type: 'email',
                direction: 'incoming',
                timestamp: emailDate,
                source: 'vendor_lead_intake',
                externalId: uniqueMessageId, // Gmail's Message-ID
                subject: subject,
                fromAddress: fromAddress,
                toAddress: this.targetEmail, // Assuming it was sent to the target email
                bodyRaw: bodyText,
                bodySummary: aiAnalysisResults.extractedMessageSummary || subject.substring(0, 255),
                metaData: { gmailId: messageGmailId, aiSentiment: aiAnalysisResults.aiSentiment }
            };
            await storage.createCommunication(communicationData);

            await this.markEmailAsProcessedInGmail(messageGmailId, uniqueMessageId);


        } catch (error) {
            console.error(`VendorLeadIntakeService: Error processing email ID ${messageGmailId}:`, error);
            // Consider adding to a dead-letter queue or specific error logging
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

    // Method to be called periodically (e.g. by a cron job or an interval within server/index.ts)
    public async ensureWatchIsActive(): Promise<void> {
        console.log(`VendorLeadIntakeService: Checking watch status for ${this.targetEmail}...`);
        const syncState = await storage.getGmailSyncState(this.targetEmail);
        let needsRenewal = true;
        if (syncState && syncState.watchExpirationTimestamp) {
            const expirationDate = new Date(syncState.watchExpirationTimestamp);
            // Renew if expiring within, say, the next 24 hours
            if (expirationDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
                needsRenewal = false;
                console.log(`VendorLeadIntakeService: Watch for ${this.targetEmail} is still active, expires ${expirationDate.toISOString()}. No renewal needed now.`);
            } else {
                 console.log(`VendorLeadIntakeService: Watch for ${this.targetEmail} expires soon (${expirationDate.toISOString()}) or has expired. Renewing.`);
            }
        } else {
            console.log(`VendorLeadIntakeService: No existing watch state found for ${this.targetEmail} or expiration unknown. Initiating watch.`);
        }

        if (needsRenewal) {
            await this.startOrRenewWatch();
        }
    }
}

export const vendorLeadIntakeService = new VendorLeadIntakeService();