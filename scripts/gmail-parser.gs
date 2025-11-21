/**
 * Google Apps Script - Email Parser for Home Bites Catering
 * 
 * This script polls Gmail every 3 minutes, extracts unread emails from your
 * catering inbox, and sends them to your Replit API for AI processing.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Copy this entire file into the script editor
 * 4. Replace YOUR_REPLIT_URL below with your actual Replit app URL
 * 5. Replace YOUR_API_KEY with a secure API key (you'll set this in Replit)
 * 6. Set up a time-driven trigger:
 *    - Click on the clock icon (Triggers)
 *    - Add Trigger: processIncomingEmails
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 3 minutes
 * 7. Run the script once manually to authorize Gmail access
 */

// ===== CONFIGURATION =====
const CONFIG = {
  // Your Replit app URL (e.g., "https://your-app.replit.app")
  REPLIT_API_URL: "YOUR_REPLIT_URL",
  
  // API key for authentication (set this in your Replit secrets)
  API_KEY: "YOUR_API_KEY",
  
  // Gmail search query to find catering inquiry emails
  // Modify this to match how your inquiry emails arrive
  GMAIL_SEARCH_QUERY: "is:unread in:inbox",
  
  // Label to mark processed emails (will be created automatically)
  PROCESSED_LABEL_NAME: "Parsed by HomeBites",
  
  // Maximum emails to process per run (prevents quota issues)
  MAX_EMAILS_PER_RUN: 10
};

/**
 * Main function - processes incoming emails
 * This is called by the time-driven trigger every 3 minutes
 */
function processIncomingEmails() {
  try {
    Logger.log("Starting email processing run at " + new Date());
    
    // Get or create the processed label
    const processedLabel = getOrCreateLabel(CONFIG.PROCESSED_LABEL_NAME);
    
    // Search for unread emails
    const threads = GmailApp.search(CONFIG.GMAIL_SEARCH_QUERY, 0, CONFIG.MAX_EMAILS_PER_RUN);
    
    if (threads.length === 0) {
      Logger.log("No new emails to process");
      return;
    }
    
    Logger.log(`Found ${threads.length} email thread(s) to process`);
    
    // Process each thread
    let successCount = 0;
    let errorCount = 0;
    
    threads.forEach((thread, index) => {
      try {
        const messages = thread.getMessages();
        
        // Process each message in the thread
        messages.forEach(message => {
          if (message.isUnread()) {
            const result = processEmail(message);
            
            if (result.success) {
              // Mark as processed
              message.markRead();
              thread.addLabel(processedLabel);
              successCount++;
              Logger.log(`✓ Processed: ${message.getSubject()}`);
            } else {
              errorCount++;
              Logger.log(`✗ Failed: ${message.getSubject()} - ${result.error}`);
            }
          }
        });
        
      } catch (error) {
        errorCount++;
        Logger.log(`Error processing thread ${index + 1}: ${error.message}`);
      }
    });
    
    Logger.log(`Processing complete. Success: ${successCount}, Errors: ${errorCount}`);
    
  } catch (error) {
    Logger.log("Fatal error in processIncomingEmails: " + error.message);
  }
}

/**
 * Process a single email message
 */
function processEmail(message) {
  try {
    // Extract email metadata
    const emailData = {
      gmailMessageId: message.getId(),
      subject: message.getSubject(),
      from: message.getFrom(),
      to: message.getTo(),
      receivedDate: message.getDate().toISOString(),
      body: {
        plainText: message.getPlainBody(),
        htmlBody: message.getBody()
      }
    };
    
    // Clean and prepare the email text
    const cleanedText = cleanEmailText(emailData.body.plainText);
    
    // Send to Replit API
    const apiResponse = sendToReplitAPI(emailData, cleanedText);
    
    return {
      success: true,
      leadId: apiResponse.leadId
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean email text by removing headers, footers, and unnecessary content
 */
function cleanEmailText(plainText) {
  // Remove excessive newlines
  let cleaned = plainText.replace(/\n{3,}/g, '\n\n');
  
  // Remove email thread markers
  cleaned = cleaned.replace(/^On.*wrote:$/gm, '');
  cleaned = cleaned.replace(/^From:.*$/gm, '');
  cleaned = cleaned.replace(/^Sent:.*$/gm, '');
  cleaned = cleaned.replace(/^To:.*$/gm, '');
  
  // Remove common email signatures
  cleaned = cleaned.split('--')[0]; // Common signature separator
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Send email data to Replit API for AI processing
 */
function sendToReplitAPI(emailData, cleanedText) {
  const url = `${CONFIG.REPLIT_API_URL}/api/gas-email-intake`;
  
  const payload = {
    gmailMessageId: emailData.gmailMessageId,
    subject: emailData.subject,
    from: emailData.from,
    to: emailData.to,
    receivedDate: emailData.receivedDate,
    cleanedText: cleanedText,
    rawHtml: emailData.body.htmlBody
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-API-Key": CONFIG.API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 200 || responseCode === 201) {
      const result = JSON.parse(responseBody);
      Logger.log(`API Success: Created lead ID ${result.leadId}`);
      return result;
    } else {
      throw new Error(`API returned ${responseCode}: ${responseBody}`);
    }
    
  } catch (error) {
    Logger.log(`API Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get or create a Gmail label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log(`Created new label: ${labelName}`);
  }
  
  return label;
}

/**
 * Test function - run this manually to test the script
 */
function testEmailProcessing() {
  Logger.log("Running test...");
  
  // Search for one unread email
  const threads = GmailApp.search("is:unread", 0, 1);
  
  if (threads.length === 0) {
    Logger.log("No unread emails found for testing");
    return;
  }
  
  const message = threads[0].getMessages()[0];
  Logger.log(`Testing with email: ${message.getSubject()}`);
  
  const result = processEmail(message);
  Logger.log(`Test result: ${JSON.stringify(result)}`);
}

/**
 * Manual trigger function - processes all unread emails now
 * Run this manually when you first set up the script
 */
function processAllUnreadNow() {
  Logger.log("Manual processing of all unread emails...");
  processIncomingEmails();
}
