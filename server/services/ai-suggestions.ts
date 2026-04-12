import OpenAI from "openai";

// Initialize the OpenAI client only if API key is provided
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

export interface SuggestionContext {
  questionType: string;
  questionText: string;
  currentValue?: string;
  formValues?: Record<string, any>;
  previousResponses?: Record<string, string>;
}

export interface SuggestionResponse {
  suggestion: string;
  examples?: string[];
  tips?: string[];
}

/**
 * Generate contextual suggestions based on the current question and form state
 */
export async function generateSuggestion(context: SuggestionContext): Promise<SuggestionResponse> {
  try {
    if (!openai) {
      return {
        suggestion: "AI suggestions are not available. Please configure OPENAI_API_KEY."
      };
    }

    // Build a prompt based on the context
    const prompt = buildPrompt(context);

    // Call OpenAI API for suggestions
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful questionnaire assistant that provides concise, relevant suggestions to help users complete form fields. 
          Your suggestions should be brief, helpful, and directly related to the question being asked.
          Your responses should be formatted as JSON with suggestion, examples, and tips fields.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    const content = response.choices[0].message.content;
    if (!content) {
      return {
        suggestion: "I don't have any specific suggestions for this question right now."
      };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating AI suggestion:", error);
    return {
      suggestion: "Unable to generate suggestions at this time."
    };
  }
}

/**
 * Build a prompt for the AI based on the question context
 */
function buildPrompt(context: SuggestionContext): string {
  const { questionType, questionText, currentValue, formValues, previousResponses } = context;
  
  let prompt = `Please provide a helpful suggestion for the following form question:
  
Question: "${questionText}"
Question Type: ${questionType}
`;

  if (currentValue) {
    prompt += `Current Value: ${currentValue}\n`;
  }

  if (formValues && Object.keys(formValues).length > 0) {
    prompt += `\nOther form values the user has already provided:\n`;
    for (const [key, value] of Object.entries(formValues)) {
      if (value && typeof value !== 'object') {
        prompt += `- ${key}: ${value}\n`;
      }
    }
  }

  prompt += `\nBased on this context, provide a JSON response with the following structure:
{
  "suggestion": "A concise, helpful suggestion for answering this question",
  "examples": ["Example 1", "Example 2"],
  "tips": ["Specific tip related to this question"]
}

The suggestion should be clear and direct guidance.
Examples should be realistic and helpful (2-3 examples).
Tips should offer valuable insights for this specific question type.

Tailor your response based on the question type:
- For addresses: Provide format tips
- For dates: Mention things like "select a future date" if it's an event date
- For phone numbers: Mention the expected format
- For text questions: Offer concise response strategies
- For selections: Help user understand what the options mean

Keep everything brief and helpful.`;

  return prompt;
}

/**
 * Get contextual help for a specific question type
 */
export function getQuestionTypeHelp(questionType: string): string {
  const helpText: Record<string, string> = {
    'text': 'Provide a clear, concise answer in the text field.',
    'email': 'Enter a valid email address (e.g., name@example.com).',
    'phone': 'Enter your phone number with area code. It will be automatically formatted.',
    'number': 'Enter a numeric value only.',
    'date': 'Select a date from the calendar or type in YYYY-MM-DD format.',
    'time': 'Enter a time in 24-hour format (e.g., 14:30) or use the time picker.',
    'time_picker': 'Select hours, minutes, and AM/PM from the dropdown menus.',
    'textarea': 'Provide more detailed information in this multi-line text area.',
    'select': 'Click to select one option from the dropdown menu.',
    'radio': 'Select one option from the list of choices.',
    'checkbox': 'Select one or more options by checking the boxes.',
    'slider': 'Drag the slider to select a value within the given range.',
    'incrementer': 'Use the plus and minus buttons to increase or decrease the value.',
    'matrix': 'For each row, select one option from each column.',
    'file': 'Click to upload a file from your device.',
    'name': 'Enter your first and last name in the respective fields.',
    'address': 'Fill in all parts of your address including street, city, state, and zip code.'
  };

  return helpText[questionType] || 'Answer the question as accurately as possible.';
}

/**
 * Analyze form data to identify potential issues or improvement opportunities
 */
export async function analyzeFormData(formData: Record<string, any>, questions: any[]): Promise<{
  completeness: number;
  suggestions: string[];
}> {
  try {
    if (!openai) {
      // Count completed required fields without AI
      const requiredFields = questions.filter(q => q.isRequired).length;
      const completedRequiredFields = questions
        .filter(q => q.isRequired)
        .filter(q => {
          const value = formData[q.questionKey];
          return value !== undefined && value !== '' &&
            !(Array.isArray(value) && value.length === 0);
        }).length;

      const completeness = requiredFields > 0
        ? Math.round((completedRequiredFields / requiredFields) * 100)
        : 100;

      return {
        completeness,
        suggestions: ["AI suggestions are not available. Please configure OPENAI_API_KEY."]
      };
    }

    // Count completed required fields
    const requiredFields = questions.filter(q => q.isRequired).length;
    const completedRequiredFields = questions
      .filter(q => q.isRequired)
      .filter(q => {
        const value = formData[q.questionKey];
        return value !== undefined && value !== '' && 
          !(Array.isArray(value) && value.length === 0);
      }).length;
    
    const completeness = requiredFields > 0 
      ? Math.round((completedRequiredFields / requiredFields) * 100) 
      : 100;
    
    // Generate helpful suggestions based on the current state
    const questionPrompt = questions.map(q => 
      `Question: "${q.questionText}" (${q.questionType})${q.isRequired ? ' (Required)' : ''} - Value: ${JSON.stringify(formData[q.questionKey] || 'Not answered')}`
    ).join('\n');
    
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful form analysis assistant. Based on the form data provided, give 2-3 concise, helpful suggestions for improvement or completion. Focus on missing required fields first, then on improving quality of responses.`
        },
        {
          role: "user",
          content: `Here is the current state of a questionnaire form:\n\n${questionPrompt}\n\nPlease provide 2-3 short, actionable suggestions for completing or improving this form. Return only an array of suggestions in JSON format.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      return {
        completeness,
        suggestions: ["Complete all required fields to finish the form."]
      };
    }
    
    const parsed = JSON.parse(content);
    return {
      completeness,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    };
    
  } catch (error) {
    console.error("Error analyzing form data:", error);
    return {
      completeness: 0,
      suggestions: ["Complete all required fields to finish the form."]
    };
  }
}