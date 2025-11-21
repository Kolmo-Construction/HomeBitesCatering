# Email Parsing Setup Guide
## Parsing interface@eathomebites.com for Lead Generation

### Quick Start

Your Home Bites app now has email parsing enabled! Here's what you need to do:

#### Step 1: Configure Environment Variables

Add these to your `.env` file:

```bash
# Email address to monitor for leads
SYNC_TARGET_EMAIL_ADDRESS=interface@eathomebites.com

# Google Cloud Project ID (required for Gmail API)
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Gmail Pub/Sub topic for webhook notifications
GMAIL_PUBSUB_TOPIC_ID=homebites-vendor-lead-notifications

# Path to Google service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Step 2: Set Up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Gmail API and Pub/Sub API
4. Create a service account with email access
5. Download service account JSON and save it securely
6. Share service account with interface@eathomebites.com or configure delegated access

#### Step 3: Use the API Endpoints

**Get Available Leads (Unreviewed Emails):**
```bash
GET /api/email-parser/available-leads

Response:
[
  {
    "id": 1,
    "prospectName": "Samantha Johnson",
    "prospectEmail": "samantha@example.com",
    "prospectPhone": "(206) 555-1234",
    "eventType": "Wedding",
    "eventDate": "2025-08-15",
    "guestCount": 120,
    "venue": "The Overlook Venue, Seattle",
    "summary": "Wedding inquiry for 120 guests...",
    "requirements": ["Mediterranean cuisine", "Plated dinner"],
    "redFlags": ["Short timeline"],
    "budget": 9000,
    "quality": "hot",
    "receivedAt": "2025-01-15T10:30:00Z"
  }
]
```

**Get Form Pre-Fill Data for Specific Lead:**
```bash
GET /api/email-parser/lead-form-data/:leadId

Response: {
  "id": 1,
  "prospectName": "Samantha Johnson",
  "prospectEmail": "samantha@example.com",
  "prospectPhone": "(206) 555-1234",
  "eventType": "Wedding",
  "eventDate": "2025-08-15",
  "eventTime": "18:00",
  "guestCount": 120,
  "venue": "The Overlook Venue, Seattle",
  "messageSummary": "Wedding inquiry for 120 guests...",
  "keyRequirements": ["Mediterranean cuisine", "Plated dinner", "Late-night snacks"],
  "potentialRedFlags": ["Short timeline", "Budget constraints"],
  "budget": 9000,
  "quality": "hot",
  "urgency": "4",
  "clarity": "5",
  "sentiment": "positive",
  "suggestedNextStep": "Send wedding packages and call for consultation",
  "calendarConflict": "No conflicts detected for August 15, 2025"
}
```

**Manually Sync Emails Now:**
```bash
POST /api/email-parser/sync-now

Response:
{
  "message": "Email sync completed successfully",
  "success": true,
  "timestamp": "2025-01-15T10:35:00Z"
}
```

### How It Works

1. **Extract** - Gmail API pulls raw emails from interface@eathomebites.com inbox
2. **Transform** - mailparser library cleans HTML and extracts text content
3. **Summarize** - AI service (DeepSeek/Gemini/Claude) analyzes content:
   - Extracts prospect info (name, email, phone)
   - Identifies event details (type, date, time, guest count, venue)
   - Assesses lead quality (hot/warm/cold)
   - Scores urgency and clarity
   - Flags potential concerns
4. **Load** - Structured data stored in `raw_leads` table in database

### Frontend Integration

To display parsed emails and pre-fill forms:

```typescript
// Get available leads
const leads = await fetch('/api/email-parser/available-leads').then(r => r.json());

// When user selects a lead, get form data
const formData = await fetch(`/api/email-parser/lead-form-data/${leadId}`).then(r => r.json());

// Use formData to pre-fill form fields
```

### Troubleshooting

**No emails appearing?**
1. Check `SYNC_TARGET_EMAIL_ADDRESS` is set correctly
2. Verify Google credentials are configured
3. Manually trigger sync with: `POST /api/email-parser/sync-now`

**Authentication errors?**
1. Verify service account has Gmail API access
2. Check service account has been added to Google Workspace domain
3. Regenerate and download new service account key

**Parsing issues?**
1. Check server logs for AI analysis errors
2. Falls back to multiple AI models if primary fails
3. Lead status shows parsing errors in raw_leads table

### AI Models Used (in order)

1. **Primary:** DeepSeek (via OpenRouter)
2. **Fallback 1:** Gemini (via OpenRouter)
3. **Fallback 2:** Claude (via OpenRouter)

### Next Steps

1. ✅ Configure environment variables (SYNC_TARGET_EMAIL_ADDRESS, GOOGLE_CLOUD_PROJECT_ID)
2. ✅ Set up Google Cloud service account and credentials
3. ✅ Test endpoints: `/api/email-parser/available-leads`
4. ✅ Build UI component to display parsed emails
5. ✅ Create form that auto-fills from lead data
6. ✅ Convert leads to opportunities when form is submitted
