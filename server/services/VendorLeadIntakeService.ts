import { storage } from '../storage';
import { GoogleApiService } from './GoogleApiService';
import { aiService } from './aiService';
import { LeadGenerationService } from './leadGenerationService';
import { GmailSyncService } from './GmailSyncService';
import { InsertRawLead } from '@shared/schema';

/**
 * Service for handling vendor lead emails from webhook notifications
 */
class VendorLeadIntakeService {
  private googleApiService: GoogleApiService;
  private leadGenerationService: LeadGenerationService;
  private gmailSyncService: GmailSyncService;
  
  constructor() {
    this.googleApiService = new GoogleApiService();
    this.leadGenerationService = new LeadGenerationService(storage);
    this.gmailSyncService = new GmailSyncService(storage);
  }
  
  /**
   * Process a Gmail notification from webhook
   * @param historyId The historyId from the Gmail notification
   */
  async processGmailNotification(historyId: string): Promise<void> {
    try {
      console.log(`VendorLeadIntakeService: Processing Gmail notification with historyId ${historyId}`);
      
      // Get the target email address from environment variable
      const targetEmail = process.env.SYNC_TARGET_EMAIL_ADDRESS;
      if (!targetEmail) {
        console.error('VendorLeadIntakeService: No target email address configured');
        return;
      }
      
      // Check if we need to update our sync state
      const currentSyncState = await storage.getGmailSyncState(targetEmail);
      
      if (!currentSyncState) {
        console.warn(`VendorLeadIntakeService: No sync state found for ${targetEmail}, initiating full sync`);
        // If we don't have sync state, do a full sync
        await this.gmailSyncService.manualSync(targetEmail);
        return;
      }
      
      // Convert historyId to number for comparison 
      const newHistoryId = historyId;
      const currentHistoryId = currentSyncState.lastHistoryId;
      
      // If the historyId is the same or older, we've already processed this
      if (newHistoryId <= currentHistoryId) {
        console.log(`VendorLeadIntakeService: HistoryId ${newHistoryId} already processed (current: ${currentHistoryId})`);
        return;
      }
      
      // Get history of changes since last sync
      const historyResults = await this.googleApiService.getHistorySinceId(
        targetEmail,
        currentHistoryId
      );
      
      if (!historyResults || !historyResults.history || historyResults.history.length === 0) {
        console.log('VendorLeadIntakeService: No new history entries found');
        
        // Update the history ID even if no changes to stay in sync
        await storage.saveGmailSyncState({
          targetEmail,
          lastHistoryId: newHistoryId
        });
        
        return;
      }
      
      console.log(`VendorLeadIntakeService: Found ${historyResults.history.length} history entries to process`);
      
      // Extract message IDs from history to process
      const messageIds: string[] = [];
      
      for (const historyEntry of historyResults.history) {
        // Check for new messages
        if (historyEntry.messagesAdded) {
          for (const messageAdded of historyEntry.messagesAdded) {
            if (messageAdded.message && messageAdded.message.id) {
              messageIds.push(messageAdded.message.id);
            }
          }
        }
      }
      
      // Remove duplicates
      const uniqueMessageIds = [...new Set(messageIds)];
      
      // Process each unique message
      for (const messageId of uniqueMessageIds) {
        // Check if we've already processed this message
        const isProcessed = await storage.isEmailProcessed(messageId, 'gmail_webhook');
        
        if (isProcessed) {
          console.log(`VendorLeadIntakeService: Message ${messageId} already processed, skipping`);
          continue;
        }
        
        try {
          // Get full message
          const message = await this.googleApiService.getMessage(targetEmail, messageId);
          
          if (!message) {
            console.warn(`VendorLeadIntakeService: Couldn't retrieve message ${messageId}`);
            continue;
          }
          
          // Basic filtering - check if it's from a vendor source
          const fromHeader = this.googleApiService.getHeaderValue(message, 'From');
          
          if (!this.isFromVendorSource(fromHeader)) {
            console.log(`VendorLeadIntakeService: Message ${messageId} not from a vendor source (${fromHeader}), skipping`);
            await storage.recordProcessedEmail({
              messageId,
              service: 'gmail_webhook',
              receivedAt: new Date(),
              processed: true,
              leadGenerated: false,
              reason: 'not_vendor_source',
              labelApplied: false
            });
            continue;
          }
          
          console.log(`VendorLeadIntakeService: Processing vendor message ${messageId} from ${fromHeader}`);
          
          // Extract message content
          const bodyContent = this.googleApiService.getMessageBody(message);
          const subject = this.googleApiService.getHeaderValue(message, 'Subject') || 'No Subject';
          const fromEmail = this.googleApiService.extractEmailFromHeader(fromHeader);
          
          // Use LeadGenerationService to process the message into a lead
          const success = await this.leadGenerationService.processLeadEmailContent(
            bodyContent,
            subject,
            fromHeader,
            fromEmail,
            new Date(parseInt(message.internalDate || '0')),
            messageId
          );
          
          // Record the processed email
          await storage.recordProcessedEmail({
            messageId,
            service: 'gmail_webhook',
            receivedAt: new Date(parseInt(message.internalDate || '0')),
            processed: true,
            leadGenerated: success,
            reason: success ? 'lead_generated' : 'processing_failed',
            labelApplied: false
          });
          
          console.log(`VendorLeadIntakeService: Successfully processed message ${messageId}, lead generation ${success ? 'succeeded' : 'failed'}`);
          
        } catch (messageError) {
          console.error(`VendorLeadIntakeService: Error processing message ${messageId}:`, messageError);
          
          // Record as processed but failed
          await storage.recordProcessedEmail({
            messageId,
            service: 'gmail_webhook',
            receivedAt: new Date(),
            processed: true,
            leadGenerated: false,
            reason: `error: ${messageError instanceof Error ? messageError.message : 'unknown error'}`,
            labelApplied: false
          });
        }
      }
      
      // Update the history ID after processing all messages
      await storage.saveGmailSyncState({
        targetEmail,
        lastHistoryId: newHistoryId
      });
      
      console.log(`VendorLeadIntakeService: Completed processing Gmail notification with historyId ${newHistoryId}`);
      
    } catch (error) {
      console.error('VendorLeadIntakeService: Error processing Gmail notification:', error);
      throw error; // Rethrow to be caught by the webhook handler
    }
  }
  
  /**
   * Simple check if the email is from a known vendor source
   */
  private isFromVendorSource(fromHeader: string | null): boolean {
    if (!fromHeader) return false;
    fromHeader = fromHeader.toLowerCase();
    
    // List of vendor domains to check
    const vendorDomains = [
      'zola.com',
      'weddingwire.com',
      'theknot.com',
      'kolmo',
      'wedding-spot.com',
      'eventective.com',
      'thumbtack.com'
    ];
    
    return vendorDomains.some(domain => fromHeader!.includes(domain));
  }
}

// Export a singleton instance
export const vendorLeadIntakeService = new VendorLeadIntakeService();