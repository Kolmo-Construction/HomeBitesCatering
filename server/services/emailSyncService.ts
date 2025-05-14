// server/services/emailSyncService.ts
import { google, Auth, gmail_v1 } from 'googleapis';
import { storage } from '../storage'; // Your existing storage instance
import { InsertCommunication, InsertContactIdentifier } from '@shared/schema';
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
// This should be called after obtaining tokens or if they are already stored
function setOAuthCredentials() {
  if (tokenStore.accessToken && tokenStore.refreshToken) {
    oauth2Client.setCredentials({
      access_token: tokenStore.accessToken,
      refresh_token: tokenStore.refreshToken,
      expiry_date: tokenStore.expiryDate,
    });
  }
}
setOAuthCredentials(); // Initialize if tokens are present from env

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


// Placeholder for AI Summarization
async function getAISummary(text: string): Promise<string> {
  console.log("AI Summarization (Gmail): Input length -", text.length);
  if (!text) return "No content to summarize.";
  const summary = text.substring(0, Math.min(text.length, 150)).replace(/\s+/g, ' ') + (text.length > 150 ? "..." : "");
  console.log("AI Summarization (Gmail): Output -", summary);
  return summary;
}

export class GmailSyncService {
  private gmail: gmail_v1.Gmail | null = null;
  private isRunning: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;
  private processingInterval: number;
  private aiSummaryEnabled: boolean;
  private targetEmail: string;

  constructor(intervalMs: number = 5 * 60 * 1000, aiEnabled: boolean = true) {
    this.processingInterval = intervalMs;
    this.aiSummaryEnabled = aiEnabled;
    this.targetEmail = tokenStore.targetEmail || process.env.SYNC_TARGET_EMAIL_ADDRESS || '';

    if (!this.targetEmail) {
        console.error("GmailSyncService: SYNC_TARGET_EMAIL_ADDRESS is not configured.");
    }
    if (oauth2Client.credentials.access_token) {
        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    } else {
        console.warn("GmailSyncService: No access token available. Authorization needed.");
    }
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
    if (!this.gmail && oauth2Client.credentials.access_token) {
        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    }
    if (!this.gmail) {
      console.warn('GmailSyncService: Gmail API client not initialized (likely missing auth). Cannot start.');
      console.log('To authorize, visit: /api/auth/google/initiate then follow the redirect.');
      return;
    }
    if (this.isRunning) {
      console.log('GmailSyncService is already running.');
      return;
    }
    this.isRunning = true;
    console.log(`GmailSyncService started. Checking mailbox for "${this.targetEmail}" every ${this.processingInterval / 1000} seconds.`);
    this.scheduleNextFetch();
  }

  public stop(): void {
    // ... (same as IMAP version)
    if (!this.isRunning) {
        console.log('GmailSyncService is not running.');
        return;
      }
      this.isRunning = false;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      console.log('GmailSyncService stopped.');
  }

  private scheduleNextFetch(): void {
    if (!this.isRunning || !this.gmail) return;
    this.timeoutId = setTimeout(async () => {
      await this.fetchAndProcessEmails();
      this.scheduleNextFetch();
    }, this.processingInterval);
  }

  private async fetchAndProcessEmails(): Promise<void> {
    if (!this.gmail) {
      console.warn('GmailSyncService: Gmail client not available for fetching.');
      // Attempt to re-initialize if tokens might have become available
      if (oauth2Client.credentials.access_token) {
          this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          console.log("GmailSyncService: Re-initialized Gmail client.");
      } else {
          console.error('GmailSyncService: Still no access token. Please authorize.');
          this.stop(); // Stop polling if auth is missing
          return;
      }
    }
    console.log(`[${new Date().toISOString()}] GmailSyncService: Fetching new emails for ${this.targetEmail}...`);

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me', // 'me' refers to the authenticated user
        q: 'is:unread label:INBOX', // Example query: unread emails in inbox
        maxResults: 10, // Process a few at a time
      });

      const messages = response.data.messages;
      if (!messages || messages.length === 0) {
        console.log('GmailSyncService: No new unread emails found.');
        return;
      }

      console.log(`GmailSyncService: Found ${messages.length} new unread emails.`);

      for (const messageEntry of messages) {
        if (!messageEntry.id) continue;

        try {
            const msg = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageEntry.id,
                format: 'raw', // Get the full raw email
            });

            if (msg.data.raw) {
                const rawEmail = Buffer.from(msg.data.raw, 'base64').toString('utf-8');
                const parsedMail = await simpleParser(rawEmail);
                await this.processParsedEmail(parsedMail);

                // Mark as read (or apply a label)
                await this.gmail.users.messages.modify({
                    userId: 'me',
                    id: messageEntry.id,
                    requestBody: {
                        removeLabelIds: ['UNREAD'],
                        // addLabelIds: ['PROCESSED_BY_CRM'] // Optional: add a label
                    },
                });
            }
        } catch(err) {
            console.error(`GmailSyncService: Error processing message ID ${messageEntry.id}:`, err);
        }
      }
    } catch (err: any) {
      console.error('GmailSyncService: API Error:', err.message || err);
      if (err.code === 401 || (err.response && err.response.status === 401)) {
          console.error("GmailSyncService: Authentication error (401). Refresh token might be invalid or expired. Please re-authorize.");
          // Potentially try to refresh token here if oauth2Client is set up for it,
          // or stop the service and require manual re-auth.
          this.stop();
      }
    } finally {
        console.log(`[${new Date().toISOString()}] GmailSyncService: Finished email fetch cycle for ${this.targetEmail}.`);
    }
  }

  // processParsedEmail method would be very similar to the one in the IMAP example
  // Key differences: how you determine direction might need to check against this.targetEmail
  private async processParsedEmail(parsedMail: ParsedMail): Promise<void> {
    const subject = parsedMail.subject || '(No Subject)';
    const fromHeader = parsedMail.from?.value[0];
    const toHeader = parsedMail.to?.value;
    const ccHeader = parsedMail.cc?.value;

    const fromEmail = fromHeader?.address?.toLowerCase();
    const toEmails = toHeader?.map(addr => addr.address?.toLowerCase()).filter(Boolean) as string[] || [];
    const ccEmails = ccHeader?.map(addr => addr.address?.toLowerCase()).filter(Boolean) as string[] || [];

    const messageIdHeader = parsedMail.headers.get('message-id') as string | undefined;
    const messageId = messageIdHeader || parsedMail.messageId || `generated-${Date.now()}`;
    const emailDate = parsedMail.date || new Date();

    let bodyText = parsedMail.text || '';
    if (!bodyText && parsedMail.html) {
        // Basic HTML to text conversion, consider a library for robustness
        bodyText = parsedMail.html.replace(/<style[^>]*>.*<\/style>/gms, '') // Remove R\style> tags
                                 .replace(/<[^>]+>/g, ' ') // Remove all other HTML tags
                                 .replace(/\s+/g, ' ').trim();
    }
    if (!bodyText) bodyText = '(No Content)';


    console.log(`GmailSyncService: Processing email - Subject: "${subject}", From: ${fromEmail}`);

    const isOutgoing = fromEmail === this.targetEmail.toLowerCase();
    const direction: Communication['direction'] = isOutgoing ? 'outgoing' : 'incoming';

    let contactEmailToSearch = direction === 'incoming' ? fromEmail : (toEmails.find(email => email !== this.targetEmail.toLowerCase()) || ccEmails.find(email => email !== this.targetEmail.toLowerCase()));

    if (!contactEmailToSearch) {
        console.warn("GmailSyncService: Could not determine a contact email (from/to) to search for opportunity/client.", {fromEmail, toEmails, target: this.targetEmail});
        return;
    }

    let opportunityId: number | undefined = undefined;
    let clientId: number | undefined = undefined;

    const existingContact = await storage.findOpportunityOrClientByContactIdentifier(contactEmailToSearch, 'email');
    if (existingContact?.client) {
      clientId = existingContact.client.id;
    } else if (existingContact?.opportunity) {
      opportunityId = existingContact.opportunity.id;
    } else {
      if (direction === 'incoming' && fromEmail) { // Only create for incoming from new contacts
        console.log(`GmailSyncService: No existing contact found for ${fromEmail}. Creating new raw lead.`);
        try {
            // Create a raw lead instead of directly creating an opportunity
            const rawLead = await storage.createRawLead({
              source: 'gmail_sync',
              extractedName: fromHeader?.name || '',
              extractedEmail: fromEmail,
              extractedPhone: null,
              eventSummary: subject,
              rawData: parsedMail, // Store the full parsed email as raw data
              status: 'new',
              notes: `Auto-created from incoming email with subject: ${subject}`
            });
            
            console.log(`GmailSyncService: Created new raw lead ID ${rawLead.id} for ${fromEmail}`);
            
            // We'll still create a communication, but it will be linked to existing contact if found
            if (existingContact?.opportunity) {
              opportunityId = existingContact.opportunity.id;
            } else if (existingContact?.client) {
              clientId = existingContact.client.id;
            }
        } catch (rawLeadCreationError) {
            console.error("GmailSyncService: Error creating new raw lead:", rawLeadCreationError);
            return; // Stop processing this email if raw lead creation fails
        }
      } else {
        console.log(`GmailSyncService: Outgoing email to unknown contact ${contactEmailToSearch} or no 'fromEmail' for incoming. Skipping auto-raw lead creation.`);
      }
    }

    if (!opportunityId && !clientId) {
        console.log(`GmailSyncService: Skipping email as no associated opportunity/client found or created for contact ${contactEmailToSearch}.`);
        return;
    }

    const summary = this.aiSummaryEnabled ? await getAISummary(bodyText) : subject;

    const communicationData: InsertCommunication = {
      opportunityId: opportunityId,
      clientId: clientId,
      type: 'email',
      direction: direction,
      timestamp: emailDate,
      source: 'gmail_sync',
      externalId: messageId,
      subject: subject,
      fromAddress: fromEmail,
      toAddress: toEmails.join(', '),
      bodyRaw: bodyText.substring(0, 10000), // Truncate if necessary
      bodySummary: summary,
      metaData: { cc: ccEmails, originalHeaders: parsedMail.headers }, // Storing all headers might be verbose
    };

    try {
      await storage.createCommunication(communicationData);
      console.log(`GmailSyncService: Successfully logged email "${subject}" for opportunityId: ${opportunityId}, clientId: ${clientId}`);
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('duplicate key value violates unique constraint')) {
        console.warn(`GmailSyncService: Communication with externalId ${messageId} already exists. Skipping.`);
      } else {
        console.error('GmailSyncService: Error saving communication to DB:', dbError);
      }
    }
  }
}