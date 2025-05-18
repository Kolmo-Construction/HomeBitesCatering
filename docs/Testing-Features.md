# Testing Features

## AI-Enhanced Raw Lead to Opportunity Conversion

The system now intelligently converts AI-analyzed raw leads into opportunities with comprehensive data mapping.

### Testing the Feature

You can test this feature in two ways:

#### Option 1: Using the Test Script

1. Run the following command from the terminal:
   ```
   node test-raw-lead-conversion.js
   ```

2. This will:
   - Create a sample AI-enriched lead
   - Convert it to an opportunity 
   - Show the field mapping results

#### Option 2: Through the Web Interface

1. Log in to the system with:
   - Username: admin
   - Password: admin123

2. Navigate to Raw Leads from the sidebar menu

3. Look for the sample lead created by the test script
   - It will have the name "Samantha Johnson" 
   - It will be marked as "new"

4. Click the "Convert to Opportunity" button

5. The system will process the lead and create a new opportunity with:
   - Names split into first and last name components
   - AI lead quality mapped to opportunity priority
   - All extracted data properly mapped to opportunity fields
   - Comprehensive notes combining all AI insights

### Key Features

1. **Smart Field Mapping**: 
   - AI-extracted field values are intelligently mapped to opportunity fields
   - No data loss when converting from raw lead to opportunity

2. **Name Parsing**:
   - Full names are correctly split into first and last name components
   - Handles various name formats intelligently

3. **Quality to Priority Mapping**:
   - "hot" leads become "high" priority opportunities
   - "warm" leads become "medium" priority opportunities
   - "cold" and "nurture" leads become "low" priority opportunities

4. **Comprehensive Notes Formatting**:
   - Client message summary
   - Key requirements as bullet points
   - Potential concerns as bullet points
   - Budget information
   - Calendar conflict assessment
   - Original lead notes

## Viewing the Code

The key implementation files are:

1. `server/routes.ts` - Contains the `/api/raw-leads/:id/process` endpoint that handles the conversion
2. `server/testData.ts` - Contains sample AI-enriched lead data
3. `docs/Raw-Lead-to-Opportunity-Conversion.md` - Comprehensive documentation

## Additional Test Resources

- `test-raw-lead-conversion.js` - Test script that demonstrates the complete conversion flow