import { Anthropic } from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '', // Will be provided later
});

/**
 * Generates questionnaire content based on user prompts
 */
export async function generateQuestionnaireContent(
  userPrompt: string, 
  questionnaireContext?: any
): Promise<any> {
  try {
    // Build system message with detailed instructions
    const systemMessage = `You are an expert questionnaire designer assistant for a catering system. 
Your job is to create well-structured, logical questionnaire content based on the user's request.

The JSON format for questionnaire content must be the following structure:
{
  "definition": {
    "versionName": string,
    "description": string,
    "isActive": boolean
  },
  "pages": [
    {
      "title": string,
      "description": string,
      "order": number,
      "questions": [
        {
          "questionText": string,
          "questionKey": string,
          "questionType": string (one of: "text", "textarea", "email", "phone", "number", "date", "select", "radio", "checkbox", "matrix"),
          "isRequired": boolean,
          "order": number,
          "helpText": string (optional),
          "placeholderText": string (optional),
          "options": [ // only for select, radio, checkbox types
            { 
              "optionText": string,
              "optionValue": string,
              "order": number 
            }
          ],
          "matrixColumns": [ // only for matrix type
            {
              "columnText": string,
              "columnKey": string,
              "order": number
            }
          ],
          "matrixRows": [ // only for matrix type
            {
              "rowText": string,
              "rowKey": string,
              "order": number
            }
          ]
        }
      ]
    }
  ]
}

Key rules to follow:
1. Generate content that is professional and contextually appropriate for catering questionnaires
2. Create question keys that are snake_case (e.g., "food_preference", "dietary_restrictions")
3. For select/radio/checkbox questions, always include options array with at least 2 options
4. For matrix questions, include both matrixColumns and matrixRows arrays with at least 2 of each
5. Ensure all required fields are provided
6. Make sure all order values are sequential starting from 1
7. Use appropriate question types for the information being requested

${questionnaireContext ? 'Current questionnaire context: ' + JSON.stringify(questionnaireContext) : ''}`;

    // Make request to Anthropic API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: systemMessage,
      messages: [
        { 
          role: 'user', 
          content: `Please generate a questionnaire about: ${userPrompt}
          
Return ONLY valid JSON that follows the specified structure, with no additional text or explanations.`
        }
      ],
    });

    // Extract and parse the JSON from the response
    const content = response.content[0].text;
    
    try {
      // Try to parse as JSON
      return JSON.parse(content);
    } catch (parseError) {
      // If we can't parse directly, try to extract JSON from the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse AI-generated content as JSON');
    }
  } catch (error) {
    console.error('Error generating questionnaire content:', error);
    throw error;
  }
}