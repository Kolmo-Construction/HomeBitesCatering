# AI Services Quick Reference Guide

## Overview
This quick reference provides at-a-glance information for working with the AI lead analysis features in Home Bites Catering platform.

## Key Functions

### Lead Analysis

```typescript
// Basic usage
const result = await aiService.analyzeLeadMessage(emailContent);

// With calendar context
const result = await aiService.analyzeLeadMessage(emailContent, "Existing wedding booking on June 15, 2025");
```

### Sentiment Analysis

```typescript
const result = await aiService.analyzeSentiment(messageText);
// Returns: { sentiment: 'positive' | 'neutral' | 'negative' | 'urgent', confidence: number }
```

### Summary Generation

```typescript
const summary = await aiService.generateSummary(longText);
// Returns a 2-3 sentence summary of the provided text
```

## Response Structure

### Lead Analysis Response Fields

| Field | Type | Description |
|-------|------|-------------|
| extractedProspectName | string | Prospect's full name |
| extractedProspectEmail | string | Prospect's email address |
| extractedProspectPhone | string | Prospect's phone number |
| extractedEventType | string | Type of event (wedding, corporate, etc.) |
| extractedEventDate | string | Event date (YYYY-MM-DD when possible) |
| extractedEventTime | string | Event time |
| extractedGuestCount | number | Number of guests |
| extractedVenue | string | Venue name or location |
| extractedBudgetIndication | string | Budget category ('not_mentioned', 'low', 'medium', 'high', 'specific_amount') |
| extractedBudgetValue | number | Specific budget amount in dollars |
| extractedServicesNeeded | string[] | Array of specific services requested |
| extractedMessageSummary | string | 2-3 sentence summary of request |
| aiLeadTemperature | string | Lead quality ('hot', 'warm', 'cold') |
| aiUrgencyScore | string | Urgency level ('1' to '5', with 5 most urgent) |
| aiClarityOfRequestScore | string | Clarity score ('1' to '5', with 5 most clear) |
| aiCalendarConflictAssessment | string | Assessment of calendar conflicts |
| aiPotentialRedFlags | string[] | Array of potential concerns |
| aiOverallLeadQuality | string | Quality assessment ('hot', 'warm', 'cold', 'nurture') |
| aiSuggestedNextStep | string | Recommended follow-up action |
| aiSentiment | string | Message sentiment ('positive', 'neutral', 'negative', 'urgent') |
| aiConfidenceScore | number | AI confidence level (0.0 to 1.0) |

## Common Patterns

### Extracting Lead Info from Emails

```typescript
// Process an email for lead information
const emailBody = `
Subject: Wedding Inquiry - Smith Wedding
From: sarah@gmail.com

Hi, we're looking for catering for our wedding on June 15, 2025.
We'll have about 100 guests at The Grand Hotel.
`;

const leadInfo = await aiService.analyzeLeadMessage(emailBody);
console.log(`New lead: ${leadInfo.extractedProspectName} for a ${leadInfo.extractedEventType}`);
console.log(`Event date: ${leadInfo.extractedEventDate}, Guests: ${leadInfo.extractedGuestCount}`);
console.log(`Lead quality: ${leadInfo.aiOverallLeadQuality}`);
```

### Checking Calendar Conflicts

```typescript
// Check if a new lead conflicts with existing bookings
const emailBody = "We're interested in booking for July 4th, 2025";
const existingBookings = "July 4, 2025: Large corporate event (120 guests)";

const analysis = await aiService.analyzeLeadMessage(emailBody, existingBookings);

if (analysis.aiCalendarConflictAssessment.includes("conflict")) {
  console.log("Potential conflict detected: " + analysis.aiCalendarConflictAssessment);
  console.log("Suggested action: " + analysis.aiSuggestedNextStep);
}
```

### Prioritizing High-Value Leads

```typescript
// Example of prioritizing leads by quality
async function prioritizeLeads(emails) {
  const analyzePromises = emails.map(email => aiService.analyzeLeadMessage(email));
  const results = await Promise.all(analyzePromises);
  
  // Sort by lead quality
  const hotLeads = results.filter(lead => lead.aiOverallLeadQuality === 'hot');
  const warmLeads = results.filter(lead => lead.aiOverallLeadQuality === 'warm');
  
  console.log(`Found ${hotLeads.length} hot leads to prioritize`);
  
  return { hotLeads, warmLeads, coldLeads: results.filter(lead => 
    lead.aiOverallLeadQuality === 'cold' || lead.aiOverallLeadQuality === 'nurture') };
}
```

## Environment Setup

### Required Environment Variables

```
OPENROUTER_API_KEY=your_openrouter_api_key
SYNC_TARGET_EMAIL_ADDRESS=leads@yourdomain.com  # For email integration
GOOGLE_CLOUD_PROJECT_ID=your_project_id         # For Gmail API integration
```

## Troubleshooting

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| "Error analyzing message with AI" | API key issues or service unavailable | Check OPENROUTER_API_KEY value |
| "Error parsing AI response" | Invalid JSON from AI model | Check prompt format or try a different model |
| Empty response | No message content provided | Ensure message content is not empty |

### Logging

The service logs detailed diagnostic information to the console:

```
AI Lead Analysis: Sending message of length 1250 to DeepSeek via OpenRouter...
AI Lead Analysis: Analysis completed successfully.
```

## Related Documentation

For more detailed information, refer to:
- [Full AI Services Documentation](./ai-services.md)
- [AI Services Testing Guide](./ai-services-testing-guide.md)
- [API Reference](./api-reference.md) (if available)