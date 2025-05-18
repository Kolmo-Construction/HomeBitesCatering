# Raw Lead to Opportunity Conversion

## Overview

This document explains how the system converts AI-enriched raw leads into opportunities. The process leverages advanced AI analysis to extract valuable information from raw leads and intelligently map it to new opportunities, providing a more effective lead qualification workflow.

## Feature Description

The raw lead to opportunity conversion system automatically transforms AI-analyzed lead data into actionable opportunities. This process includes:

1. **Smart Field Mapping:** Automatically maps AI-extracted fields from raw leads to appropriate opportunity fields
2. **Name Parsing:** Intelligently separates extracted names into first and last name components
3. **Priority Assignment:** Translates AI lead quality assessments into opportunity priority levels
4. **Comprehensive Notes:** Consolidates AI insights, requirements, and potential concerns into structured notes

## Field Mapping Details

When a raw lead is converted to an opportunity, the following field mappings occur:

| Raw Lead Field | Opportunity Field | Notes |
|----------------|-------------------|-------|
| `extractedProspectName` | `firstName` & `lastName` | Name is intelligently parsed into components |
| `extractedProspectEmail` | `email` | Direct mapping |
| `extractedProspectPhone` | `phone` | Direct mapping |
| `extractedEventType` | `eventType` | Direct mapping |
| `extractedEventDate` | `eventDate` | Converted to proper Date object |
| `extractedGuestCount` | `guestCount` | Direct mapping |
| `extractedVenue` | `venue` | Direct mapping |
| `leadSourcePlatform` / `source` | `opportunitySource` | Uses leadSourcePlatform when available, falls back to source |
| `aiOverallLeadQuality` | `priority` | Mapped from lead quality to priority level |
| Various AI fields | `notes` | Structured combination of multiple AI insights |

### Priority Mapping

AI-analyzed lead quality is mapped to opportunity priority as follows:

| Lead Quality | Opportunity Priority |
|--------------|----------------------|
| "hot" | "high" |
| "warm" | "medium" |
| "cold" | "low" |
| "nurture" | "low" |

## Notes Formatting

When converting a raw lead to an opportunity, the system creates structured notes from various AI-enriched fields:

1. **Client Message:** From `extractedMessageSummary`
2. **Key Requirements:** Formatted bullet points from `aiKeyRequirements`
3. **Potential Concerns:** Formatted bullet points from `aiPotentialRedFlags`
4. **Budget Information:** Combined from `aiBudgetIndication` and `aiBudgetValue`
5. **Calendar Assessment:** From `aiCalendarConflictAssessment` 
6. **Internal Notes:** Any existing `notes` field from the raw lead

This creates a comprehensive and well-organized summary of all the important information extracted by the AI.

## Example

### Raw Lead (Input)
```json
{
  "extractedProspectName": "Samantha Johnson",
  "extractedProspectEmail": "samantha.johnson@example.com",
  "extractedProspectPhone": "(206) 555-1234",
  "extractedEventType": "Wedding",
  "extractedEventDate": "2025-08-15",
  "extractedGuestCount": 120,
  "extractedVenue": "The Overlook Venue, Seattle",
  "extractedMessageSummary": "Wedding inquiry for 120 guests",
  "aiOverallLeadQuality": "hot",
  "aiKeyRequirements": [
    "Mediterranean cuisine",
    "Plated dinner service"
  ],
  "aiPotentialRedFlags": [
    "Short timeline"
  ],
  "aiBudgetValue": 9000,
  "aiCalendarConflictAssessment": "No conflicts detected for August 15, 2025"
}
```

### Opportunity (Output)
```json
{
  "firstName": "Samantha",
  "lastName": "Johnson",
  "email": "samantha.johnson@example.com",
  "phone": "(206) 555-1234",
  "eventType": "Wedding",
  "eventDate": "2025-08-15T00:00:00.000Z",
  "guestCount": 120,
  "venue": "The Overlook Venue, Seattle",
  "opportunitySource": "website_form",
  "status": "new",
  "priority": "high",
  "notes": "Client Message: Wedding inquiry for 120 guests\n\nKey Requirements:\n• Mediterranean cuisine\n• Plated dinner service\n\nPotential Concerns:\n• Short timeline\n\nBudget: $9000\n\nCalendar Assessment: No conflicts detected for August 15, 2025"
}
```

## How to Use

### For Administrators

1. **Create Sample Lead:** 
   - Use the API endpoint `POST /api/raw-leads/create-sample` to create a sample lead with AI-enriched fields

2. **Process a Raw Lead:**
   - Navigate to Raw Leads in the dashboard
   - Select a lead you want to convert
   - Click the "Convert to Opportunity" button
   - The system will automatically apply the AI-enriched field mapping

### For Developers

#### Converting a Raw Lead

```typescript
// To manually convert a raw lead to an opportunity in code
async function convertRawLeadToOpportunity(leadId) {
  const response = await fetch(`/api/raw-leads/${leadId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Converted opportunity:', result.opportunity);
    return result.opportunity;
  } else {
    throw new Error('Failed to process raw lead');
  }
}
```

#### Field Mapping Logic

The core mapping logic that transforms a raw lead into an opportunity is implemented in the `POST /api/raw-leads/:id/process` endpoint in `server/routes.ts`. The key functions are:

1. **Name Parsing**: Extracts first and last name from the full name
2. **Priority Mapping**: Maps lead quality to opportunity priority with `mapLeadQualityToPriority()`
3. **Notes Formatting**: Formats comprehensive notes from multiple AI fields with `formatNotes()`

## Benefits

1. **Improved Data Quality:** AI-enriched fields provide more accurate and complete information
2. **Enhanced Prioritization:** Lead quality assessment helps prioritize the best opportunities
3. **Comprehensive Context:** Structured notes provide all relevant information at a glance
4. **Time Savings:** Automated field mapping reduces manual data entry
5. **Consistent Processing:** Standardized conversion ensures no important information is missed

## Troubleshooting

If you encounter issues with the raw lead to opportunity conversion:

1. **Field Mapping Problems:**
   - Ensure the raw lead has the expected AI-enriched fields
   - Check the console logs for any errors during processing

2. **Missing Data:**
   - The system provides fallback values for required fields
   - Check that the AI analysis was completed successfully on the raw lead

3. **Format Issues:**
   - If notes formatting appears incorrect, verify the structure of `aiKeyRequirements` and `aiPotentialRedFlags`
   - These fields should be either string arrays or JSON strings that can be parsed into arrays