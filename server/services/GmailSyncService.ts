import { storage } from '../storage';
import { GoogleApiService } from './GoogleApiService';

/**
 * Service for synchronizing emails from Gmail
 */
export class GmailSyncService {
  private googleApiService: GoogleApiService;
  private intervalId: NodeJS.Timeout | null = null;
  private syncIntervalMinutes: number = 5; // Default sync interval in minutes
  private syncRunning: boolean = false;
  
  constructor(private storageInterface: any) {
    this.googleApiService = new GoogleApiService();
  }
  
  /**
   * Start the sync service with periodic checks
   * @param intervalMinutes Optional custom interval in minutes
   */
  startSyncService(intervalMinutes?: number): { status: string, interval: number } {
    if (this.intervalId) {
      return { 
        status: 'already_running',
        interval: this.syncIntervalMinutes
      };
    }
    
    if (intervalMinutes && intervalMinutes > 0) {
      this.syncIntervalMinutes = intervalMinutes;
    }
    
    // Convert minutes to milliseconds
    const intervalMs = this.syncIntervalMinutes * 60 * 1000;
    
    // Start the interval
    this.intervalId = setInterval(() => {
      this.runSync().catch(error => {
        console.error('Error in scheduled Gmail sync:', error);
      });
    }, intervalMs);
    
    console.log(`Gmail sync service started with ${this.syncIntervalMinutes} minute interval`);
    
    // Run an initial sync
    this.runSync().catch(error => {
      console.error('Error in initial Gmail sync:', error);
    });
    
    return { 
      status: 'started',
      interval: this.syncIntervalMinutes
    };
  }
  
  /**
   * Stop the sync service
   */
  stopSyncService(): { status: string } {
    if (!this.intervalId) {
      return { status: 'not_running' };
    }
    
    clearInterval(this.intervalId);
    this.intervalId = null;
    
    console.log('Gmail sync service stopped');
    
    return { status: 'stopped' };
  }
  
  /**
   * Get the current status of the sync service
   */
  getSyncStatus(): { 
    running: boolean, 
    interval: number,
    lastSync?: Date,
    nextSync?: Date
  } {
    const running = this.intervalId !== null;
    const interval = this.syncIntervalMinutes;
    
    return {
      running,
      interval,
      // Additional status info could be added here
    };
  }
  
  /**
   * Run a manual synchronization
   * @param targetEmail Optional specific email to sync
   */
  async manualSync(targetEmail?: string): Promise<{ 
    status: string, 
    syncedEmails: number 
  }> {
    // If a sync is already running, don't start another
    if (this.syncRunning) {
      return { 
        status: 'already_running',
        syncedEmails: 0
      };
    }
    
    try {
      // Mark sync as running
      this.syncRunning = true;
      
      // If no specific email provided, use the configured one
      const emailToSync = targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS;
      
      if (!emailToSync) {
        console.error('No target email address configured or provided for sync');
        return { 
          status: 'error', 
          syncedEmails: 0 
        };
      }
      
      // Initialize counters
      let syncedCount = 0;
      
      // Run the sync process
      const result = await this.syncEmailsFromGmail(emailToSync);
      syncedCount += result.processedCount;
      
      return { 
        status: 'completed', 
        syncedEmails: syncedCount 
      };
    } catch (error) {
      console.error('Error running manual Gmail sync:', error);
      return { 
        status: 'error', 
        syncedEmails: 0 
      };
    } finally {
      // Always mark sync as complete
      this.syncRunning = false;
    }
  }
  
  /**
   * Internal method to run the sync process
   */
  private async runSync(): Promise<void> {
    // If already running, skip this execution
    if (this.syncRunning) {
      console.log('Gmail sync already in progress, skipping this cycle');
      return;
    }
    
    try {
      this.syncRunning = true;
      
      // Get the target email from environment variables
      const targetEmail = process.env.SYNC_TARGET_EMAIL_ADDRESS;
      
      if (!targetEmail) {
        console.error('No target email address configured for sync');
        return;
      }
      
      // Run the sync process
      await this.syncEmailsFromGmail(targetEmail);
      
      console.log(`Completed Gmail sync for ${targetEmail}`);
    } catch (error) {
      console.error('Error in Gmail sync process:', error);
    } finally {
      this.syncRunning = false;
    }
  }
  
  /**
   * Sync emails from Gmail for a specific account
   * @param targetEmail The email address to sync
   */
  private async syncEmailsFromGmail(targetEmail: string): Promise<{ 
    processedCount: number 
  }> {
    try {
      console.log(`Starting Gmail sync for ${targetEmail}`);
      
      // Get the current sync state
      const syncState = await this.storageInterface.getGmailSyncState(targetEmail);
      
      // If no sync state exists, we need to initialize one
      if (!syncState) {
        console.log(`No sync state found for ${targetEmail}, initializing`);
        
        // Get the starting history ID from Gmail
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
        
        if (!refreshToken) {
          throw new Error('No refresh token available for Gmail API');
        }
        
        // TODO: Implement a method to get current historyId
        const initialHistoryId = '0'; // Default fallback
        
        // Create the initial sync state
        await this.storageInterface.saveGmailSyncState({
          targetEmail,
          lastHistoryId: initialHistoryId,
          watchExpirationTimestamp: null,
          lastWatchAttemptTimestamp: new Date()
        });
        
        console.log(`Initialized sync state for ${targetEmail} with history ID ${initialHistoryId}`);
        
        return { processedCount: 0 };
      }
      
      // Get the last history ID
      const lastHistoryId = syncState.lastHistoryId;
      
      // Get all changes since the last history ID
      const historyResults = await this.googleApiService.getHistorySinceId(
        targetEmail,
        lastHistoryId
      );
      
      // If no history results, we're done
      if (!historyResults || !historyResults.history || historyResults.history.length === 0) {
        console.log(`No new history found for ${targetEmail} since ${lastHistoryId}`);
        return { processedCount: 0 };
      }
      
      console.log(`Found ${historyResults.history.length} history entries to process`);
      
      // Process each history entry
      let processedCount = 0;
      const messageIds: string[] = [];
      
      // Extract message IDs from history
      for (const historyEntry of historyResults.history) {
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
      
      console.log(`Found ${uniqueMessageIds.length} unique messages to process`);
      
      // Process each message
      for (const messageId of uniqueMessageIds) {
        // Check if we've already processed this message
        const isProcessed = await this.storageInterface.isEmailProcessed(messageId, 'gmail_sync');
        
        if (isProcessed) {
          console.log(`Message ${messageId} already processed, skipping`);
          continue;
        }
        
        try {
          // Get the full message
          const message = await this.googleApiService.getMessage(targetEmail, messageId);
          
          if (!message) {
            console.warn(`Couldn't retrieve message ${messageId}`);
            continue;
          }
          
          // Extract message data
          const bodyContent = this.googleApiService.getMessageBody(message);
          const subject = this.googleApiService.getHeaderValue(message, 'Subject') || 'No Subject';
          const fromHeader = this.googleApiService.getHeaderValue(message, 'From');
          const fromEmail = this.googleApiService.extractEmailFromHeader(fromHeader || '');
          
          // Record that we've processed this email
          await this.storageInterface.recordProcessedEmail({
            messageId,
            service: 'gmail_sync',
            receivedAt: new Date(parseInt(message.internalDate || '0')),
            processed: true,
            leadGenerated: false,
            reason: 'sync_processed',
            labelApplied: false
          });
          
          processedCount++;
          
        } catch (messageError) {
          console.error(`Error processing message ${messageId}:`, messageError);
        }
      }
      
      // Update the sync state with the latest history ID
      if (historyResults.historyId) {
        await this.storageInterface.saveGmailSyncState({
          targetEmail,
          lastHistoryId: historyResults.historyId,
          watchExpirationTimestamp: syncState.watchExpirationTimestamp,
          lastWatchAttemptTimestamp: new Date()
        });
        
        console.log(`Updated sync state for ${targetEmail} with history ID ${historyResults.historyId}`);
      }
      
      return { processedCount };
      
    } catch (error) {
      console.error('Error in Gmail sync process:', error);
      throw error;
    }
  }
}