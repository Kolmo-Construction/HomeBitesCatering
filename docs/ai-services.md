# AI Services Documentation

## Overview

This document provides comprehensive information about the AI services implemented in the Home Bites Catering platform, focusing on the lead analysis capabilities that help identify and qualify potential clients.

## Table of Contents
1. [AI Service Architecture](#ai-service-architecture)
2. [Lead Analysis Service](#lead-analysis-service)
3. [Calendar Integration](#calendar-integration)
4. [API Integration](#api-integration)
5. [Model Cascade and Fallbacks](#model-cascade-and-fallbacks)
6. [Troubleshooting](#troubleshooting)

## AI Service Architecture

The AI system uses a model cascade approach with three primary AI models:

- **Primary Model**: DeepSeek Chat v3 0324 (via OpenRouter)
- **First Fallback**: Google Gemini 2.0 Flash (via OpenRouter)
- **Final Fallback**: Claude 3 Haiku (via OpenRouter)

This cascade ensures reliability and prevents service disruptions if one AI provider experiences issues.

### Configuration Details

- **API Provider**: OpenRouter
- **Authentication**: Via API key (stored in environment variable `OPENROUTER_API_KEY`)
- **Base URL**: `https://openrouter.ai/api/v1`
- **Headers**:
  - `HTTP-Referer`: 'https://catering-cms.replit.app'
  - `X-Title`: 'Catering CMS'

## Lead Analysis Service

The Lead Analysis Service is responsible for analyzing incoming client inquiries, particularly from vendor platforms like Zola or WeddingWire.

### Key Features

- Extracts prospect details (name, email, phone) from email bodies
- Distinguishes between vendor information and actual client information
- Analyzes event details (date, time, venue, guest count)
- Assesses budget parameters
- Provides lead quality assessment
- Recommends next steps based on inquiry content
- Evaluates calendar conflicts with existing events

### Method: analyzeLeadMessage

**Purpose**: Analyzes an email or message to extract structured information and insights about a potential catering lead.

**Parameters**:
- `message`: String - The email content to analyze
- `calendarConflictContext`: String (optional) - Context about potential calendar conflicts

**Return Value**: JSON object containing:

```typescript
{
  extractedProspectName?: string;       // Full name of the inquiring prospect
  extractedProspectEmail?: string;      // Direct email address of the prospect
  extractedProspectPhone?: string;      // Direct phone number of the prospect
  extractedEventType?: string;          // Type of event (e.g., Wedding, Corporate)
  extractedEventDate?: string;          // Event date (YYYY-MM-DD format if possible)
  extractedEventTime?: string;          // Event time if mentioned
  extractedGuestCount?: number;         // Number of guests (numeric)
  extractedVenue?: string;              // Venue name or location
  extractedBudgetIndication?: string;   // Budget indication ('not_mentioned'|'low'|'medium'|'high'|'specific_amount')
  extractedBudgetValue?: number;        // Exact budget amount in dollars (if specified)
  extractedServicesNeeded?: string[];   // Array of specific services requested
  extractedMessageSummary?: string;     // 2-3 sentence summary of the core request
  aiLeadTemperature?: string;           // Lead temperature ('hot'|'warm'|'cold')
  aiUrgencyScore?: string;              // Urgency level ('1' to '5', 5 being most urgent)
  aiClarityOfRequestScore?: string;     // Clarity score ('1' to '5', 5 being very clear)
  aiCalendarConflictAssessment?: string; // Assessment of calendar conflicts
  aiPotentialRedFlags?: string[];       // Array of potential concerns or red flags
  aiOverallLeadQuality?: string;        // Overall quality ('hot'|'warm'|'cold'|'nurture')
  aiSuggestedNextStep?: string;         // Recommended immediate next action
  aiSentiment?: string;                 // Message sentiment ('positive'|'neutral'|'negative'|'urgent')
  aiConfidenceScore?: number;           // AI confidence from 0.0 to 1.0
}
```

### Usage Examples

```typescript
// Basic usage
const result = await aiService.analyzeLeadMessage(emailContent);

// With calendar context
const calendarContext = "Existing wedding booking on June 15, 2025";
const result = await aiService.analyzeLeadMessage(emailContent, calendarContext);
```

### Integration Points

The Lead Analysis Service is integrated with:

1. **Email Sync Service**: Processes forwarded vendor emails
2. **VendorLeadIntakeService**: Handles lead data from Gmail webhook
3. **CommunicationSyncService**: Tracks communication history
4. **LeadGenerationService**: Manages lead lifecycle

## Calendar Integration

The AI service can consider existing calendar entries when analyzing new lead requests.

### Calendar Conflict Assessment

When analyzing a lead message, you can provide calendar context:

```typescript
const calendarContext = "Existing bookings: Wedding (75 guests) on May 15, 2025; Corporate lunch (30 guests) on May 16, 2025";
const result = await aiService.analyzeLeadMessage(emailContent, calendarContext);
```

The AI will assess potential conflicts and suggest appropriate responses in the `aiCalendarConflictAssessment` field.

## API Integration

### Webhook Integration

The system includes a Gmail webhook endpoint that processes notifications and feeds them into the AI analysis pipeline:

```typescript
app.post('/api/gmail/vendor-lead-webhook', express.json({ type: '*/*' }), async (req, res) => {
  // Process webhook data
  // Call vendorLeadIntakeService.processGmailNotification
});
```

### Environment Variables

The following environment variables are used by the AI services:

- `OPENROUTER_API_KEY`: API key for OpenRouter
- `SYNC_TARGET_EMAIL_ADDRESS`: Email address monitored for lead notifications
- `GOOGLE_CLOUD_PROJECT_ID`: For Gmail API integration

## Model Cascade and Fallbacks

The system implements a resilient approach using multiple AI models:

1. Attempts to use DeepSeek first (primary model)
2. Falls back to Gemini if DeepSeek fails
3. Finally falls back to Claude if both previous attempts fail

This cascade is implemented in the lead analysis, sentiment analysis, and summary generation features.

### Example Cascade Implementation

```typescript
try {
  // Try primary model (DeepSeek)
  const response = await openRouter.chat.completions.create({
    model: OPENROUTER_MODEL_ID,
    // Configuration
  });
  return this.processLeadAnalysisResponse(response.choices[0]?.message?.content?.trim() || "{}");
} catch (primaryError) {
  console.error("Primary model error:", primaryError);
  
  try {
    // First fallback (Gemini)
    // Similar implementation
  } catch (fallbackError) {
    // Final fallback (Claude)
    // Implementation
  }
}
```

## Troubleshooting

### Common Issues

1. **Invalid JSON Response**: If the AI returns malformed JSON, the system will return a default response with:
   ```json
   {
     "extractedMessageSummary": "Error parsing AI response.",
     "aiOverallLeadQuality": "cold",
     "aiConfidenceScore": 0
   }
   ```

2. **API Authentication Failures**: Check that the `OPENROUTER_API_KEY` environment variable is set correctly.

3. **Empty Responses**: If no message content is provided, the service returns an empty object.

### Logging

The system logs extensive diagnostic information:

- `AI Lead Analysis: Sending message of length ${length} to DeepSeek via OpenRouter...`
- `AI Lead Analysis DeepSeek Error: ${error}`
- `AI Lead Analysis: Falling back to Gemini...`
- `AI Lead Analysis: Analysis completed successfully.`

### Field Compatibility

The system maintains backward compatibility between old and new field names:

- `extractedName` → `extractedProspectName`
- `extractedEmail` → `extractedProspectEmail`
- `extractedPhone` → `extractedProspectPhone`
- `aiBudgetIndication` → `extractedBudgetIndication`
- `aiBudgetValue` → `extractedBudgetValue`

This ensures that older parts of the system will continue to function properly with the enhanced lead analysis.