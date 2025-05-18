import { google, gmail_v1 } from 'googleapis';

/**
 * Service for interacting with the Google APIs, particularly Gmail
 */
export class GoogleApiService {
  private oauth2Client: any;
  
  constructor() {
    // Initialize OAuth client using environment variables
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  
  /**
   * Set credentials for the OAuth client
   * @param tokens The access and refresh tokens
   */
  setCredentials(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }
  
  /**
   * Checks if the token is expired and refresh if needed
   * @param refreshToken The refresh token to use
   */
  async ensureValidToken(refreshToken: string): Promise<any> {
    try {
      // Set the refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      
      // Get a new access token
      const { tokens } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Error refreshing Google API token:', error);
      throw error;
    }
  }
  
  /**
   * Get Gmail messages history since a specific historyId
   * @param userEmail The user's email address
   * @param startHistoryId The history ID to start from
   */
  async getHistorySinceId(userEmail: string, startHistoryId: string): Promise<gmail_v1.Schema$ListHistoryResponse> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Get refresh token from storage
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      
      if (!refreshToken) {
        throw new Error('No refresh token available for Gmail API');
      }
      
      // Ensure we have a valid token
      await this.ensureValidToken(refreshToken);
      
      // Fetch history
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: startHistoryId,
        historyTypes: ['messageAdded']
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting Gmail history:', error);
      throw error;
    }
  }
  
  /**
   * Get a full Gmail message by ID
   * @param userEmail The user's email address
   * @param messageId The message ID to get
   */
  async getMessage(userEmail: string, messageId: string): Promise<gmail_v1.Schema$Message> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Get refresh token from storage
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      
      if (!refreshToken) {
        throw new Error('No refresh token available for Gmail API');
      }
      
      // Ensure we have a valid token
      await this.ensureValidToken(refreshToken);
      
      // Fetch message with full format to get the body
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting Gmail message:', error);
      throw error;
    }
  }
  
  /**
   * Extract the value of a specific header from a Gmail message
   * @param message The Gmail message object
   * @param headerName The name of the header to extract
   */
  getHeaderValue(message: gmail_v1.Schema$Message, headerName: string): string | null {
    if (!message.payload || !message.payload.headers) {
      return null;
    }
    
    const header = message.payload.headers.find(
      (header) => header.name?.toLowerCase() === headerName.toLowerCase()
    );
    
    return header ? header.value || null : null;
  }
  
  /**
   * Extract an email address from a header value
   * Example: "John Doe <john@example.com>" -> "john@example.com"
   * @param headerValue The header value containing an email address
   */
  extractEmailFromHeader(headerValue: string | null): string | null {
    if (!headerValue) return null;
    
    // Match email pattern inside angle brackets if present
    const emailMatch = headerValue.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1];
    }
    
    // Otherwise try to match any email pattern
    const anyEmailMatch = headerValue.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i);
    if (anyEmailMatch && anyEmailMatch[1]) {
      return anyEmailMatch[1];
    }
    
    return null;
  }
  
  /**
   * Get the full body text of a Gmail message, handling various formats
   * @param message The Gmail message object
   */
  getMessageBody(message: gmail_v1.Schema$Message): string {
    if (!message.payload) {
      return '';
    }
    
    // Check if message has parts
    if (message.payload.parts && message.payload.parts.length > 0) {
      // Try to find a text/plain part first
      const textPart = message.payload.parts.find(
        (part) => part.mimeType === 'text/plain'
      );
      
      if (textPart && textPart.body && textPart.body.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
      
      // If no text/plain part, try text/html
      const htmlPart = message.payload.parts.find(
        (part) => part.mimeType === 'text/html'
      );
      
      if (htmlPart && htmlPart.body && htmlPart.body.data) {
        const htmlContent = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        // Simple HTML to text conversion
        return this.stripHtml(htmlContent);
      }
      
      // If still no content, try to process nested multipart
      for (const part of message.payload.parts) {
        if (part.parts) {
          for (const subPart of part.parts) {
            if (subPart.mimeType === 'text/plain' && subPart.body && subPart.body.data) {
              return Buffer.from(subPart.body.data, 'base64').toString('utf-8');
            }
          }
        }
      }
    }
    
    // If no parts or couldn't find content in parts, check the main body
    if (message.payload.body && message.payload.body.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }
    
    // If we still don't have content, return empty string
    return '';
  }
  
  /**
   * Simple HTML to text conversion by removing HTML tags
   * @param html The HTML content to strip
   */
  private stripHtml(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');
    // Replace multiple spaces with a single space
    text = text.replace(/\s+/g, ' ');
    // Remove special HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    return text.trim();
  }
}