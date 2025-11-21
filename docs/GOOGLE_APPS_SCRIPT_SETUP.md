# Google Apps Script Email Parser Setup Guide

This guide will help you set up the Google Apps Script (GAS) email parser that polls Gmail every 3 minutes and sends catering inquiry emails to your Replit application for AI processing.

## Overview

The GAS approach provides:
- ✅ **Zero operational maintenance** - No OAuth flows, no token refresh, no watch renewals
- ✅ **Simple deployment** - Just script in Google Workspace
- ✅ **3-minute polling** - Emails processed automatically every 3 minutes
- ✅ **Better data structure** - Organized `parser_metadata` and `inquiry_data`
- ✅ **Free** - Stays within Google Apps Script free tier

## Prerequisites

1. A Google Workspace account (Gmail)
2. Your Replit application URL
3. An API key for authentication (you'll create this)

## Step 1: Set Up API Key in Replit

1. Go to your Replit project
2. Click on the "Secrets" tab (lock icon) in the left sidebar
3. Create a new secret:
   - **Key**: `GAS_API_KEY`
   - **Value**: A strong random string (e.g., generate one at https://randomkeygen.com/)
   - Click "Add secret"

**Important**: Keep this API key secure! It authenticates requests from Google Apps Script to your Replit app.

## Step 2: Deploy the Google Apps Script

1. Go to https://script.google.com
2. Click **"New project"**
3. Name your project (e.g., "Home Bites Email Parser")
4. Delete any existing code in the editor
5. Copy the entire contents of `/scripts/gmail-parser.gs` from your Replit project
6. Paste it into the Apps Script editor
7. Click the save icon (💾)

## Step 3: Configure the Script

In the script editor, find the `CONFIG` object at the top and update these values:

```javascript
const CONFIG = {
  // Replace with your actual Replit app URL
  REPLIT_API_URL: "https://your-app-name.replit.app",
  
  // Replace with the API key you created in Step 1
  API_KEY: "your-gas-api-key-from-replit-secrets",
  
  // Modify this Gmail search query to match your needs
  // Examples:
  // - "is:unread from:(*@weddingwire.com OR *@theknot.com)"
  // - "is:unread subject:(inquiry OR catering OR quote)"
  GMAIL_SEARCH_QUERY: "is:unread in:inbox",
  
  // Label to mark processed emails (will be created automatically)
  PROCESSED_LABEL_NAME: "Parsed by HomeBites",
  
  // Maximum emails to process per run
  MAX_EMAILS_PER_RUN: 10
};
```

**Important**: Make sure to replace:
- `YOUR_REPLIT_URL` with your actual Replit app URL
- `YOUR_API_KEY` with the exact same value you set in Replit secrets

## Step 4: Authorize Gmail Access

1. In the Apps Script editor, select the `testEmailProcessing` function from the function dropdown at the top
2. Click the **Run** button (▶️)
3. You'll see a permission dialog:
   - Click **"Review Permissions"**
   - Select your Google account
   - Click **"Advanced"**
   - Click **"Go to [Your Project Name] (unsafe)"**
   - Click **"Allow"**

This gives the script permission to read and label your Gmail messages.

## Step 5: Set Up 3-Minute Trigger

1. In the Apps Script editor, click the **clock icon** (⏰) on the left sidebar to open "Triggers"
2. Click **"+ Add Trigger"** button in the bottom right
3. Configure the trigger:
   - **Choose which function to run**: `processIncomingEmails`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 3 minutes`
4. Click **"Save"**

The script will now run automatically every 3 minutes!

## Step 6: Test the Integration

### Test Manually First

1. In the Apps Script editor, select the `processAllUnreadNow` function
2. Click **Run** (▶️)
3. Check the "Execution log" at the bottom for output
4. Go to your Replit app and check the Raw Leads page to see if leads were created

### Monitor Automatic Runs

1. In Apps Script, click the **clock icon** (⏰) to view "Triggers"
2. Click on **"Executions"** to see the run history
3. Check if runs are happening every 3 minutes
4. Look for any errors in the execution log

## Step 7: Verify in Replit

1. Open your Replit app
2. Navigate to **Raw Leads** (or `/raw-leads`)
3. You should see new leads appearing with:
   - Source: `google_apps_script`
   - Detailed extracted data in the notes
   - Structured `parser_metadata` and `inquiry_data` in the raw data

## Customizing Email Detection

You can customize which emails get processed by modifying the `GMAIL_SEARCH_QUERY` in the CONFIG:

### Examples:

**Only process emails from specific services:**
```javascript
GMAIL_SEARCH_QUERY: "is:unread from:(*@weddingwire.com OR *@theknot.com OR *@eventective.com)"
```

**Filter by subject keywords:**
```javascript
GMAIL_SEARCH_QUERY: "is:unread subject:(inquiry OR catering OR event OR wedding)"
```

**Specific label:**
```javascript
GMAIL_SEARCH_QUERY: "is:unread label:catering-inquiries"
```

**Combine multiple criteria:**
```javascript
GMAIL_SEARCH_QUERY: "is:unread (from:*@weddingwire.com OR subject:catering OR subject:inquiry)"
```

## Monitoring and Maintenance

### Check Logs in Apps Script

1. Go to script.google.com and open your project
2. Click **View** → **Logs** or **Executions**
3. Review recent runs for errors

### Check Logs in Replit

1. Open your Replit app console
2. Look for lines starting with `GAS Email Intake:`
3. Verify emails are being processed successfully

### Common Issues

**No emails being processed:**
- Check your `GMAIL_SEARCH_QUERY` - try making it less restrictive
- Verify the trigger is set up and running (check Executions)
- Make sure you have unread emails matching the query

**API key errors:**
- Verify the `GAS_API_KEY` secret exists in Replit
- Make sure the `API_KEY` in the script matches exactly

**Permission errors:**
- Re-run Step 4 to reauthorize Gmail access
- Check that you granted all required permissions

## Data Structure

Emails processed through GAS will have this structured format:

```json
{
  "parser_metadata": {
    "source_system": "WeddingWire",
    "received_timestamp": "2025-11-16T14:58:00Z",
    "forwarded_by": "Home Bites",
    "internal_sender_email": "events@eathomebites.com",
    "extracted_by_model": "DeepSeek V3"
  },
  "inquiry_data": {
    "client_name": "Juliet Paola",
    "client_email": "paola.juliet@gmail.com",
    "event_type": "Wedding",
    "event_date": "2026-09-17",
    "guest_count_range": "75-125",
    "guest_count_min": 75,
    "guest_count_max": 125,
    "service_requested": "Wedding Caterers",
    "service_location": "Seattle"
  },
  "analysis": {
    "lead_quality": "warm",
    "urgency_score": 3,
    "clarity_score": 4,
    "key_requirements": [...],
    "potential_concerns": [...],
    "suggested_next_step": "..."
  },
  "summary_text": "Brief summary of the inquiry"
}
```

## Stopping the Parser

To stop automatic email processing:

1. Go to script.google.com and open your project
2. Click the **clock icon** (⏰) to view Triggers
3. Find the trigger for `processIncomingEmails`
4. Click the **three dots** menu (⋮) on the right
5. Click **"Delete trigger"**

## Support

If you encounter issues:

1. Check the Apps Script execution log
2. Check the Replit application logs
3. Verify your API key is correct in both places
4. Test with the `testEmailProcessing` function to debug a single email

## Advantages Over Previous System

| Feature | GAS Approach | Old Gmail API |
|---------|-------------|---------------|
| Setup Complexity | Low (just copy/paste script) | High (OAuth, Pub/Sub, watch) |
| Maintenance | None | High (token refresh, watch renewal) |
| Failure Points | Few (just GAS + API) | Many (OAuth, Pub/Sub, watch, API) |
| Cost | Free | Free but more complex |
| Real-time | Every 3 min | Real-time (but fragile) |
| Data Quality | Structured & clean | Variable |

For a catering business receiving inquiries throughout the day, 3-minute polling is more than sufficient and much more reliable!
