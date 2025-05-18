# AI Services Testing Guide

This guide provides instructions for testing the AI lead analysis capabilities in the Home Bites Catering system.

## Test Environment Setup

### Prerequisites
- Access to the development environment
- Valid OpenRouter API key configured
- At least one test email account or message samples

### Configuration Verification
Before testing, ensure these environment variables are set:
- `OPENROUTER_API_KEY`: Required for AI model access
- `SYNC_TARGET_EMAIL_ADDRESS`: Email monitored for lead notifications (optional for local testing)
- `GOOGLE_CLOUD_PROJECT_ID`: For Gmail API integration (optional for local testing)

## Manual Testing Procedures

### 1. Basic Lead Analysis Testing

The simplest way to test the AI lead analysis is using the `test-ai-analysis.js` script:

```bash
node test-ai-analysis.js
```

This script tests both detailed and vague lead requests to verify the system can:
- Extract information from structured inquiries
- Handle ambiguous or incomplete messages
- Generate appropriate summaries

### 2. Testing with Sample Emails

Use sample vendor emails with different structures and data points:

**Wedding Inquiry Sample**
```
Subject: New Wedding Inquiry from Zola - Sarah & Michael - July 2025

From: notifications@vendors.zola.com
To: info@homebitescatering.com

You have a new wedding inquiry from Sarah Johnson and Michael Smith!

Event Details:
- Date: July 15, 2025
- Guest Count: 125
- Venue: Lakeside Gardens, Portland
- Budget: $10,000-$15,000

Message from couple:
"Hi there! We're planning our wedding next summer and love your farm-to-table menu options. We're especially interested in the seasonal menu and cocktail hour appetizers. Do you offer vegetarian options? We'd like to schedule a tasting soon. Looking forward to hearing from you! - Sarah (555-123-4567, sarah.johnson@email.com)"
```

**Corporate Inquiry Sample**
```
Subject: WeddingWire Lead - Corporate Event Inquiry - Thompson Inc.

Hi,

Need catering for a corporate meeting next week. Maybe 20 people? Not sure yet. Low budget.
Let me know what you've got.

Thanks,
John
Marketing Director
john.t@thompson-inc.com
(555) 987-6543
```

### 3. Calendar Conflict Testing

Test the calendar awareness function by including calendar conflict context:

```javascript
// In test script
const calendarContext = "Existing bookings: Wedding (150 guests) on July 15, 2025; Corporate lunch (40 guests) on July 16, 2025";
const result = await aiService.analyzeLeadMessage(emailContent, calendarContext);
console.log(result.aiCalendarConflictAssessment);
```

Expected outcomes:
- For date conflicts: Recommendation to suggest alternative dates
- For non-conflicts: Confirmation of availability
- For partial conflicts: Analysis of capacity and feasibility

### 4. Field Extraction Accuracy Testing

Test how accurately the system extracts these critical fields:

1. **Contact information**: How accurately does it extract:
   - Prospect's name (vs. vendor's name)
   - Direct email
   - Phone number

2. **Event details**: Extraction accuracy for:
   - Date and time
   - Guest count
   - Venue
   - Event type

3. **Budget information**:
   - Budget range detection
   - Specific amount extraction
   - Budget categorization

### 5. Model Fallback Testing

To test the model fallback cascade:

1. Temporarily modify the primary model ID to an invalid value
2. Run a lead analysis test to verify fallback to Gemini
3. Modify both primary and first fallback IDs
4. Verify final fallback to Claude

## Automated Testing

The system includes automated test scripts:

### Test Scripts
- `test-ai-analysis.js`: Basic functionality tests
- `test-client-methods.js`: Integration with client data
- `test-contact-identifiers-api.js`: Integration with contact systems

### Running Continuous Integration Tests
```bash
npm run test:ai
```

## Troubleshooting Tests

### Test Error Handling

1. **Invalid JSON responses**:
   - Temporarily modify the AI prompt to generate invalid JSON
   - Verify the system handles parsing errors gracefully
   - Confirm default values are returned

2. **Empty message handling**:
   - Test with an empty message string
   - Verify the service returns an empty object

3. **API failure handling**:
   - Temporarily use an invalid API key
   - Confirm appropriate error logging
   - Verify fallback behavior

## Performance Metrics

During testing, monitor these key performance indicators:

1. **Response Time**: 
   - Average time to analyze a lead message (typically 2-5 seconds)
   - Note any significant delays (>10 seconds)

2. **Accuracy Metrics**:
   - Field extraction precision
   - Lead quality assessment accuracy
   - Calendar conflict detection accuracy

3. **Model Preference**:
   - Percentage of successful analyses using primary model
   - Fallback frequency

## Test Results Documentation

For each test case, document:

1. Input message
2. Expected output
3. Actual output
4. Any discrepancies
5. Response time
6. AI model used (primary or fallback)

## Common Test Failures and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Empty result | API key issue | Verify OPENROUTER_API_KEY |
| Missing fields | Prompt not matching returned fields | Check field names in prompt against processing |
| Slow response times | Model availability | Try during lower usage periods |
| Incorrect sentiment | Message ambiguity | Add more context in test case |
| Calendar conflicts not detected | Format of calendar context | Use consistent date format (YYYY-MM-DD) |