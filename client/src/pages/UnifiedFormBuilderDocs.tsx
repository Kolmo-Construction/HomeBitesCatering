import React from 'react';
import { Helmet } from 'react-helmet';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CodeBlockWithCopy } from "@/components/ui/code-block";
import { CopyIcon } from "@radix-ui/react-icons";
import { useToast } from "@/hooks/use-toast";

const UnifiedFormBuilderDocs: React.FC = () => {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The code example has been copied to your clipboard",
      duration: 3000,
    });
  };

  const actions = [
    { 
      id: "createDefinition", 
      name: "Create Form Definition",
      description: "Creates a new form definition that acts as a container for pages and questions",
      example: `{
  "action": "createDefinition",
  "data": {
    "title": "Catering Inquiry Form",
    "description": "A form to collect information about catering inquiries",
    "status": "draft",
    "version": "1.0",
    "versionName": "catering-inquiry-v1"
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "title": "Catering Inquiry Form",
    "description": "A form to collect information about catering inquiries",
    "status": "draft",
    "version": "1.0",
    "versionName": "catering-inquiry-v1",
    "createdAt": "2024-05-16T12:30:00.000Z",
    "updatedAt": "2024-05-16T12:30:00.000Z"
  }
}`
    },
    { 
      id: "addPage", 
      name: "Add Page to Form",
      description: "Adds a new page to an existing form definition",
      example: `{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Client Information",
    "description": "Please provide your contact information",
    "order": 1
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "definitionId": 1,
    "title": "Client Information",
    "description": "Please provide your contact information",
    "order": 1,
    "createdAt": "2024-05-16T12:32:00.000Z",
    "updatedAt": "2024-05-16T12:32:00.000Z"
  }
}`
    },
    { 
      id: "addQuestions", 
      name: "Add Questions to Page",
      description: "Adds one or more questions to a page",
      example: `{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "What is your full name?",
        "questionKey": "fullName",
        "questionType": "text",
        "order": 1,
        "isRequired": true,
        "placeholderText": "John Doe",
        "helpText": "Please enter your full name as it appears on official documents"
      },
      {
        "questionText": "What is your email address?",
        "questionKey": "email",
        "questionType": "email",
        "order": 2,
        "isRequired": true,
        "placeholderText": "john.doe@example.com"
      },
      {
        "questionText": "What is your phone number?",
        "questionKey": "phone",
        "questionType": "phone",
        "order": 3,
        "isRequired": true,
        "placeholderText": "(555) 123-4567"
      }
    ]
  }
}`,
      response: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "pageId": 1,
      "questionText": "What is your full name?",
      "questionKey": "fullName",
      "questionType": "text",
      "order": 1,
      "isRequired": true,
      "placeholderText": "John Doe",
      "helpText": "Please enter your full name as it appears on official documents",
      "createdAt": "2024-05-16T12:34:00.000Z",
      "updatedAt": "2024-05-16T12:34:00.000Z"
    },
    {
      "id": 2,
      "pageId": 1,
      "questionText": "What is your email address?",
      "questionKey": "email",
      "questionType": "email",
      "order": 2,
      "isRequired": true,
      "placeholderText": "john.doe@example.com",
      "createdAt": "2024-05-16T12:34:00.000Z",
      "updatedAt": "2024-05-16T12:34:00.000Z"
    },
    {
      "id": 3,
      "pageId": 1,
      "questionText": "What is your phone number?",
      "questionKey": "phone",
      "questionType": "phone",
      "order": 3,
      "isRequired": true,
      "placeholderText": "(555) 123-4567",
      "createdAt": "2024-05-16T12:34:00.000Z",
      "updatedAt": "2024-05-16T12:34:00.000Z"
    }
  ]
}`
    },
    { 
      id: "updatePage", 
      name: "Update Page",
      description: "Updates an existing page's properties",
      example: `{
  "action": "updatePage",
  "data": {
    "pageId": 1,
    "title": "Updated Client Information",
    "description": "Updated description for client information page"
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "definitionId": 1,
    "title": "Updated Client Information",
    "description": "Updated description for client information page",
    "order": 1,
    "createdAt": "2024-05-16T12:32:00.000Z",
    "updatedAt": "2024-05-16T12:36:00.000Z"
  }
}`
    },
    { 
      id: "updateQuestion", 
      name: "Update Question",
      description: "Updates an existing question's properties",
      example: `{
  "action": "updateQuestion",
  "data": {
    "questionId": 1,
    "questionText": "Updated question text",
    "helpText": "Updated help text for this question",
    "isRequired": false
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "pageId": 1,
    "questionText": "Updated question text",
    "questionKey": "fullName",
    "questionType": "text",
    "order": 1,
    "isRequired": false,
    "placeholderText": "John Doe",
    "helpText": "Updated help text for this question",
    "createdAt": "2024-05-16T12:34:00.000Z",
    "updatedAt": "2024-05-16T12:38:00.000Z"
  }
}`
    },
    { 
      id: "addQuestionOptions", 
      name: "Add Options to Question",
      description: "Adds options to a select, radio, or checkbox question",
      example: `{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 4,
    "options": [
      {
        "optionText": "Wedding",
        "optionValue": "wedding",
        "order": 1
      },
      {
        "optionText": "Corporate Event",
        "optionValue": "corporate",
        "order": 2
      },
      {
        "optionText": "Birthday Party",
        "optionValue": "birthday",
        "order": 3
      },
      {
        "optionText": "Other",
        "optionValue": "other",
        "order": 4
      }
    ]
  }
}`,
      response: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "questionId": 4,
      "optionText": "Wedding",
      "optionValue": "wedding",
      "order": 1,
      "createdAt": "2024-05-16T12:40:00.000Z",
      "updatedAt": "2024-05-16T12:40:00.000Z"
    },
    {
      "id": 2,
      "questionId": 4,
      "optionText": "Corporate Event",
      "optionValue": "corporate",
      "order": 2,
      "createdAt": "2024-05-16T12:40:00.000Z",
      "updatedAt": "2024-05-16T12:40:00.000Z"
    },
    {
      "id": 3,
      "questionId": 4,
      "optionText": "Birthday Party",
      "optionValue": "birthday",
      "order": 3,
      "createdAt": "2024-05-16T12:40:00.000Z",
      "updatedAt": "2024-05-16T12:40:00.000Z"
    },
    {
      "id": 4,
      "questionId": 4,
      "optionText": "Other",
      "optionValue": "other",
      "order": 4,
      "createdAt": "2024-05-16T12:40:00.000Z",
      "updatedAt": "2024-05-16T12:40:00.000Z"
    }
  ]
}`
    },
    { 
      id: "updateQuestionOption", 
      name: "Update Question Option",
      description: "Updates an existing option for a question",
      example: `{
  "action": "updateQuestionOption",
  "data": {
    "optionId": 1,
    "optionText": "Wedding Ceremony",
    "optionValue": "wedding_ceremony"
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "questionId": 4,
    "optionText": "Wedding Ceremony",
    "optionValue": "wedding_ceremony",
    "order": 1,
    "createdAt": "2024-05-16T12:40:00.000Z",
    "updatedAt": "2024-05-16T12:42:00.000Z"
  }
}`
    },
    { 
      id: "addConditionalLogic", 
      name: "Add Conditional Logic",
      description: "Adds conditional logic to show/hide questions or pages based on responses",
      example: `{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "eventType",
    "triggerCondition": "equals",
    "triggerValue": "wedding",
    "targetType": "question",
    "targetKey": "weddingDetails",
    "action": "show"
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "definitionId": 1,
    "triggerQuestionKey": "eventType",
    "triggerCondition": "equals",
    "triggerValue": "wedding",
    "targetType": "question",
    "targetKey": "weddingDetails",
    "action": "show",
    "createdAt": "2024-05-16T12:44:00.000Z",
    "updatedAt": "2024-05-16T12:44:00.000Z"
  }
}`
    },
    { 
      id: "updateConditionalLogic", 
      name: "Update Conditional Logic",
      description: "Updates existing conditional logic rule",
      example: `{
  "action": "updateConditionalLogic",
  "data": {
    "ruleId": 1,
    "triggerCondition": "contains",
    "triggerValue": "wedding"
  }
}`,
      response: `{
  "success": true,
  "data": {
    "id": 1,
    "definitionId": 1,
    "triggerQuestionKey": "eventType",
    "triggerCondition": "contains",
    "triggerValue": "wedding",
    "targetType": "question",
    "targetKey": "weddingDetails",
    "action": "show",
    "createdAt": "2024-05-16T12:44:00.000Z",
    "updatedAt": "2024-05-16T12:46:00.000Z"
  }
}`
    },
    { 
      id: "deletePage", 
      name: "Delete Page",
      description: "Deletes an existing page and all its questions",
      example: `{
  "action": "deletePage",
  "data": {
    "pageId": 2
  }
}`,
      response: `{
  "success": true,
  "message": "Page deleted successfully"
}`
    },
    { 
      id: "deleteQuestion", 
      name: "Delete Question",
      description: "Deletes an existing question and its options",
      example: `{
  "action": "deleteQuestion",
  "data": {
    "questionId": 4
  }
}`,
      response: `{
  "success": true,
  "message": "Question deleted successfully"
}`
    },
    { 
      id: "deleteQuestionOption", 
      name: "Delete Question Option",
      description: "Deletes an option from a question",
      example: `{
  "action": "deleteQuestionOption",
  "data": {
    "optionId": 4
  }
}`,
      response: `{
  "success": true,
  "message": "Question option deleted successfully"
}`
    },
    { 
      id: "deleteConditionalLogic", 
      name: "Delete Conditional Logic",
      description: "Deletes a conditional logic rule",
      example: `{
  "action": "deleteConditionalLogic",
  "data": {
    "ruleId": 1
  }
}`,
      response: `{
  "success": true,
  "message": "Conditional logic rule deleted successfully"
}`
    },
    { 
      id: "getFullQuestionnaire", 
      name: "Get Full Questionnaire",
      description: "Retrieves the complete questionnaire with all pages, questions, options and logic",
      example: `{
  "action": "getFullQuestionnaire",
  "data": {
    "definitionId": 1
  }
}`,
      response: `{
  "success": true,
  "data": {
    "definition": {
      "id": 1,
      "title": "Catering Inquiry Form",
      "description": "A form to collect information about catering inquiries",
      "status": "draft",
      "version": "1.0",
      "versionName": "catering-inquiry-v1",
      "createdAt": "2024-05-16T12:30:00.000Z",
      "updatedAt": "2024-05-16T12:30:00.000Z"
    },
    "pages": [
      {
        "id": 1,
        "definitionId": 1,
        "title": "Updated Client Information",
        "description": "Updated description for client information page",
        "order": 1,
        "createdAt": "2024-05-16T12:32:00.000Z",
        "updatedAt": "2024-05-16T12:36:00.000Z",
        "questions": [
          {
            "id": 1,
            "pageId": 1,
            "questionText": "Updated question text",
            "questionKey": "fullName",
            "questionType": "text",
            "order": 1,
            "isRequired": false,
            "placeholderText": "John Doe",
            "helpText": "Updated help text for this question",
            "createdAt": "2024-05-16T12:34:00.000Z",
            "updatedAt": "2024-05-16T12:38:00.000Z"
          },
          {
            "id": 2,
            "pageId": 1,
            "questionText": "What is your email address?",
            "questionKey": "email",
            "questionType": "email",
            "order": 2,
            "isRequired": true,
            "placeholderText": "john.doe@example.com",
            "createdAt": "2024-05-16T12:34:00.000Z",
            "updatedAt": "2024-05-16T12:34:00.000Z"
          },
          {
            "id": 3,
            "pageId": 1,
            "questionText": "What is your phone number?",
            "questionKey": "phone",
            "questionType": "phone",
            "order": 3,
            "isRequired": true,
            "placeholderText": "(555) 123-4567",
            "createdAt": "2024-05-16T12:34:00.000Z",
            "updatedAt": "2024-05-16T12:34:00.000Z"
          }
        ]
      }
    ],
    "conditionalLogic": []
  }
}`
    }
  ];

  const llmPrompts = [
    {
      title: "Basic Form Creation",
      description: "Creating a simple contact form with multiple fields",
      prompt: `Create the JSON payload for a unified form builder API to create a contact form with the following specifications:
- Form title: "Contact Us Form"
- Form description: "Please fill out this form to get in touch with our team"
- Page 1 title: "Contact Information"
- Fields needed: Full Name (required), Email Address (required), Phone Number (optional), Message (textarea, required)
- Add placeholder text and help text for each field

The API expects a JSON structure where each action is a separate request with an "action" field and a "data" field containing the relevant information. Create all necessary requests in sequence:
1. First create the form definition
2. Then add a page to the form
3. Then add all the questions to the page`,
      response: `# Request 1: Create Form Definition
\`\`\`json
{
  "action": "createDefinition",
  "data": {
    "title": "Contact Us Form",
    "description": "Please fill out this form to get in touch with our team",
    "status": "draft",
    "version": "1.0",
    "versionName": "contact-us-v1"
  }
}
\`\`\`

# Request 2: Add Page to Form
\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Contact Information",
    "description": "Please provide your contact details so we can respond to your inquiry",
    "order": 1
  }
}
\`\`\`

# Request 3: Add Questions to Page
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "What is your full name?",
        "questionKey": "fullName",
        "questionType": "text",
        "order": 1,
        "isRequired": true,
        "placeholderText": "John Doe",
        "helpText": "Please enter your first and last name"
      },
      {
        "questionText": "What is your email address?",
        "questionKey": "email",
        "questionType": "email",
        "order": 2,
        "isRequired": true,
        "placeholderText": "john.doe@example.com",
        "helpText": "We'll use this email to respond to your inquiry"
      },
      {
        "questionText": "What is your phone number?",
        "questionKey": "phone",
        "questionType": "phone",
        "order": 3,
        "isRequired": false,
        "placeholderText": "(555) 123-4567",
        "helpText": "Optional - provide your phone number if you'd prefer us to call you"
      },
      {
        "questionText": "How can we help you?",
        "questionKey": "message",
        "questionType": "textarea",
        "order": 4,
        "isRequired": true,
        "placeholderText": "Please describe how we can assist you...",
        "helpText": "Please provide details about your inquiry so we can better assist you"
      }
    ]
  }
}
\`\`\``
    },
    {
      title: "Multi-Page Form with Logic",
      description: "Creating a multi-page form with conditional logic",
      prompt: `Create the JSON payload for a unified form builder API to create a wedding catering questionnaire with conditional logic:
- Form title: "Wedding Catering Questionnaire"
- Form has 3 pages:
  1. "Client Information" with name, email, phone fields
  2. "Event Details" with date, venue, guest count, and food preferences dropdown (Options: Regular, Vegetarian, Vegan, Gluten-Free, Custom)
  3. "Custom Menu Preferences" page that should only show if "Custom" is selected in food preferences

Use the unified form builder API that accepts different actions in the JSON structure. Create the complete sequence of API requests:
1. Create the form definition
2. Add all three pages
3. Add questions to each page
4. Add options to the food preferences dropdown
5. Add conditional logic to show/hide the "Custom Menu Preferences" page`,
      response: `# Request 1: Create Form Definition
\`\`\`json
{
  "action": "createDefinition",
  "data": {
    "title": "Wedding Catering Questionnaire",
    "description": "Please provide details about your wedding catering needs",
    "status": "draft",
    "version": "1.0",
    "versionName": "wedding-catering-v1"
  }
}
\`\`\`

# Request 2: Add Pages to Form
\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Client Information",
    "description": "Please provide your contact information",
    "order": 1
  }
}
\`\`\`

\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Event Details",
    "description": "Please provide details about your wedding event",
    "order": 2
  }
}
\`\`\`

\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Custom Menu Preferences",
    "description": "Please tell us about your custom menu requirements",
    "order": 3
  }
}
\`\`\`

# Request 3: Add Questions to Page 1 (Client Information)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "What is your full name?",
        "questionKey": "fullName",
        "questionType": "text",
        "order": 1,
        "isRequired": true,
        "placeholderText": "John Doe"
      },
      {
        "questionText": "What is your email address?",
        "questionKey": "email",
        "questionType": "email",
        "order": 2,
        "isRequired": true,
        "placeholderText": "john.doe@example.com"
      },
      {
        "questionText": "What is your phone number?",
        "questionKey": "phone",
        "questionType": "phone",
        "order": 3,
        "isRequired": true,
        "placeholderText": "(555) 123-4567"
      }
    ]
  }
}
\`\`\`

# Request 4: Add Questions to Page 2 (Event Details)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "What is your wedding date?",
        "questionKey": "eventDate",
        "questionType": "date",
        "order": 1,
        "isRequired": true
      },
      {
        "questionText": "What is the venue for your wedding?",
        "questionKey": "venue",
        "questionType": "text",
        "order": 2,
        "isRequired": true,
        "placeholderText": "Venue name and address"
      },
      {
        "questionText": "How many guests will be attending?",
        "questionKey": "guestCount",
        "questionType": "number",
        "order": 3,
        "isRequired": true,
        "placeholderText": "E.g., 100"
      },
      {
        "questionText": "What are your food preferences?",
        "questionKey": "foodPreferences",
        "questionType": "select",
        "order": 4,
        "isRequired": true
      }
    ]
  }
}
\`\`\`

# Request 5: Add Options to Food Preferences Dropdown
\`\`\`json
{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 7,
    "options": [
      {
        "optionText": "Regular Menu",
        "optionValue": "regular",
        "order": 1
      },
      {
        "optionText": "Vegetarian",
        "optionValue": "vegetarian",
        "order": 2
      },
      {
        "optionText": "Vegan",
        "optionValue": "vegan",
        "order": 3
      },
      {
        "optionText": "Gluten-Free",
        "optionValue": "gluten_free",
        "order": 4
      },
      {
        "optionText": "Custom",
        "optionValue": "custom",
        "order": 5
      }
    ]
  }
}
\`\`\`

# Request 6: Add Questions to Page 3 (Custom Menu Preferences)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 3,
    "questions": [
      {
        "questionText": "Please describe your custom menu requirements in detail",
        "questionKey": "customMenuDetails",
        "questionType": "textarea",
        "order": 1,
        "isRequired": true,
        "placeholderText": "List any specific dishes, dietary restrictions, or special requests",
        "helpText": "The more details you provide, the better we can accommodate your needs"
      },
      {
        "questionText": "Do you have any specific cultural or traditional dishes you would like included?",
        "questionKey": "culturalDishes",
        "questionType": "textarea",
        "order": 2,
        "isRequired": false,
        "placeholderText": "Please specify any cultural or traditional dishes"
      },
      {
        "questionText": "Any allergies or dietary restrictions we should be aware of?",
        "questionKey": "dietaryRestrictions",
        "questionType": "textarea",
        "order": 3,
        "isRequired": true,
        "placeholderText": "Please list all allergies and dietary restrictions"
      }
    ]
  }
}
\`\`\`

# Request 7: Add Conditional Logic
\`\`\`json
{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "foodPreferences",
    "triggerCondition": "equals",
    "triggerValue": "custom",
    "targetType": "page",
    "targetKey": "3",
    "action": "show"
  }
}
\`\`\``
    },
    {
      title: "Complex Form with Matrix Questions",
      description: "Creating a form with matrix questions and advanced conditional logic",
      prompt: `Design a complete event feedback survey for a corporate conference with matrix questions using the unified form builder API. The survey should:
- Have a form title "Conference Feedback Survey"
- Include 4 pages: Attendee Info, Session Ratings, Venue Feedback, and Additional Comments
- Use matrix questions for rating multiple sessions on a scale of 1-5
- Include conditional logic to show additional questions based on low ratings
- Have skip logic to bypass the venue feedback page for virtual attendees

Structure your response as a sequence of API calls with the following actions in order:
1. createDefinition - Create the form definition
2. addPage - Add all pages
3. addQuestions - Add questions to each page, including matrix questions
4. addQuestionOptions - Add options for any select/radio/checkbox questions
5. addConditionalLogic - Add all conditional logic rules`,
      response: `# Request 1: Create Form Definition
\`\`\`json
{
  "action": "createDefinition",
  "data": {
    "title": "Conference Feedback Survey",
    "description": "Please share your feedback about our recent corporate conference",
    "status": "draft",
    "version": "1.0",
    "versionName": "conference-feedback-v1"
  }
}
\`\`\`

# Request 2: Add Pages
\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Attendee Information",
    "description": "Please tell us a bit about yourself",
    "order": 1
  }
}
\`\`\`

\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Session Ratings",
    "description": "Please rate the sessions you attended",
    "order": 2
  }
}
\`\`\`

\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Venue Feedback",
    "description": "Please provide feedback about the conference venue",
    "order": 3
  }
}
\`\`\`

\`\`\`json
{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Additional Comments",
    "description": "Please share any additional thoughts or suggestions",
    "order": 4
  }
}
\`\`\`

# Request 3: Add Questions to Page 1 (Attendee Information)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "What is your full name?",
        "questionKey": "fullName",
        "questionType": "text",
        "order": 1,
        "isRequired": true,
        "placeholderText": "John Doe"
      },
      {
        "questionText": "What is your email address?",
        "questionKey": "email",
        "questionType": "email",
        "order": 2,
        "isRequired": true,
        "placeholderText": "john.doe@example.com"
      },
      {
        "questionText": "What is your job title?",
        "questionKey": "jobTitle",
        "questionType": "text",
        "order": 3,
        "isRequired": false,
        "placeholderText": "Marketing Manager"
      },
      {
        "questionText": "How did you attend the conference?",
        "questionKey": "attendanceType",
        "questionType": "radio",
        "order": 4,
        "isRequired": true
      }
    ]
  }
}
\`\`\`

# Request 4: Add Options for Attendance Type
\`\`\`json
{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 4,
    "options": [
      {
        "optionText": "In Person",
        "optionValue": "in_person",
        "order": 1
      },
      {
        "optionText": "Virtual",
        "optionValue": "virtual",
        "order": 2
      }
    ]
  }
}
\`\`\`

# Request 5: Add Matrix Questions to Page 2 (Session Ratings)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Please rate the following sessions on a scale of 1-5 (1 being poor, 5 being excellent)",
        "questionKey": "sessionRatings",
        "questionType": "matrix",
        "order": 1,
        "isRequired": true
      },
      {
        "questionText": "If you rated any session below 3, please tell us how we could improve",
        "questionKey": "lowRatingFeedback",
        "questionType": "textarea",
        "order": 2,
        "isRequired": false,
        "placeholderText": "Please provide specific feedback for low-rated sessions"
      }
    ]
  }
}
\`\`\`

# Request 6: Add Matrix Rows and Columns
\`\`\`json
{
  "action": "addMatrixRows",
  "data": {
    "questionId": 5,
    "rows": [
      {
        "rowText": "Keynote: Future of Technology",
        "rowKey": "keynote",
        "order": 1
      },
      {
        "rowText": "Workshop: Leadership Skills",
        "rowKey": "leadership_workshop",
        "order": 2
      },
      {
        "rowText": "Panel: Industry Trends",
        "rowKey": "industry_panel",
        "order": 3
      },
      {
        "rowText": "Networking Lunch",
        "rowKey": "networking",
        "order": 4
      },
      {
        "rowText": "Closing Remarks",
        "rowKey": "closing",
        "order": 5
      }
    ]
  }
}
\`\`\`

\`\`\`json
{
  "action": "addMatrixColumns",
  "data": {
    "questionId": 5,
    "columns": [
      {
        "columnText": "1 - Poor",
        "columnValue": "1",
        "order": 1
      },
      {
        "columnText": "2 - Below Average",
        "columnValue": "2",
        "order": 2
      },
      {
        "columnText": "3 - Average",
        "columnValue": "3",
        "order": 3
      },
      {
        "columnText": "4 - Good",
        "columnValue": "4",
        "order": 4
      },
      {
        "columnText": "5 - Excellent",
        "columnValue": "5",
        "order": 5
      }
    ]
  }
}
\`\`\`

# Request 7: Add Questions to Page 3 (Venue Feedback)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 3,
    "questions": [
      {
        "questionText": "How would you rate the conference venue overall?",
        "questionKey": "venueRating",
        "questionType": "select",
        "order": 1,
        "isRequired": true
      },
      {
        "questionText": "How would you rate the following aspects of the venue?",
        "questionKey": "venueAspectsRating",
        "questionType": "matrix",
        "order": 2,
        "isRequired": true
      },
      {
        "questionText": "Do you have any specific suggestions for improving the venue?",
        "questionKey": "venueSuggestions",
        "questionType": "textarea",
        "order": 3,
        "isRequired": false,
        "placeholderText": "Please share any suggestions for venue improvements"
      }
    ]
  }
}
\`\`\`

# Request 8: Add Options for Venue Rating
\`\`\`json
{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 7,
    "options": [
      {
        "optionText": "Excellent",
        "optionValue": "excellent",
        "order": 1
      },
      {
        "optionText": "Good",
        "optionValue": "good",
        "order": 2
      },
      {
        "optionText": "Average",
        "optionValue": "average",
        "order": 3
      },
      {
        "optionText": "Poor",
        "optionValue": "poor",
        "order": 4
      },
      {
        "optionText": "Very Poor",
        "optionValue": "very_poor",
        "order": 5
      }
    ]
  }
}
\`\`\`

# Request 9: Add Matrix Rows and Columns for Venue Aspects
\`\`\`json
{
  "action": "addMatrixRows",
  "data": {
    "questionId": 8,
    "rows": [
      {
        "rowText": "Accessibility",
        "rowKey": "accessibility",
        "order": 1
      },
      {
        "rowText": "Cleanliness",
        "rowKey": "cleanliness",
        "order": 2
      },
      {
        "rowText": "Comfort",
        "rowKey": "comfort",
        "order": 3
      },
      {
        "rowText": "Audio/Visual Equipment",
        "rowKey": "av_equipment",
        "order": 4
      },
      {
        "rowText": "Food and Beverages",
        "rowKey": "food",
        "order": 5
      }
    ]
  }
}
\`\`\`

\`\`\`json
{
  "action": "addMatrixColumns",
  "data": {
    "questionId": 8,
    "columns": [
      {
        "columnText": "1 - Poor",
        "columnValue": "1",
        "order": 1
      },
      {
        "columnText": "2 - Below Average",
        "columnValue": "2",
        "order": 2
      },
      {
        "columnText": "3 - Average",
        "columnValue": "3",
        "order": 3
      },
      {
        "columnText": "4 - Good",
        "columnValue": "4",
        "order": 4
      },
      {
        "columnText": "5 - Excellent",
        "columnValue": "5",
        "order": 5
      }
    ]
  }
}
\`\`\`

# Request 10: Add Questions to Page 4 (Additional Comments)
\`\`\`json
{
  "action": "addQuestions",
  "data": {
    "pageId": 4,
    "questions": [
      {
        "questionText": "Do you have any additional feedback about the conference?",
        "questionKey": "additionalFeedback",
        "questionType": "textarea",
        "order": 1,
        "isRequired": false,
        "placeholderText": "Please share any additional thoughts or suggestions"
      },
      {
        "questionText": "Would you attend this conference again next year?",
        "questionKey": "wouldAttendAgain",
        "questionType": "radio",
        "order": 2,
        "isRequired": true
      },
      {
        "questionText": "How likely are you to recommend this conference to a colleague?",
        "questionKey": "recommendationScore",
        "questionType": "select",
        "order": 3,
        "isRequired": true
      }
    ]
  }
}
\`\`\`

# Request 11: Add Options for Attendance Next Year
\`\`\`json
{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 10,
    "options": [
      {
        "optionText": "Yes, definitely",
        "optionValue": "yes_definitely",
        "order": 1
      },
      {
        "optionText": "Probably",
        "optionValue": "probably",
        "order": 2
      },
      {
        "optionText": "Not sure",
        "optionValue": "not_sure",
        "order": 3
      },
      {
        "optionText": "Probably not",
        "optionValue": "probably_not",
        "order": 4
      },
      {
        "optionText": "Definitely not",
        "optionValue": "definitely_not",
        "order": 5
      }
    ]
  }
}
\`\`\`

# Request 12: Add Options for Recommendation Score
\`\`\`json
{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 11,
    "options": [
      {
        "optionText": "0 - Not at all likely",
        "optionValue": "0",
        "order": 1
      },
      {
        "optionText": "1",
        "optionValue": "1",
        "order": 2
      },
      {
        "optionText": "2",
        "optionValue": "2",
        "order": 3
      },
      {
        "optionText": "3",
        "optionValue": "3",
        "order": 4
      },
      {
        "optionText": "4",
        "optionValue": "4",
        "order": 5
      },
      {
        "optionText": "5",
        "optionValue": "5",
        "order": 6
      },
      {
        "optionText": "6",
        "optionValue": "6",
        "order": 7
      },
      {
        "optionText": "7",
        "optionValue": "7",
        "order": 8
      },
      {
        "optionText": "8",
        "optionValue": "8",
        "order": 9
      },
      {
        "optionText": "9",
        "optionValue": "9",
        "order": 10
      },
      {
        "optionText": "10 - Extremely likely",
        "optionValue": "10",
        "order": 11
      }
    ]
  }
}
\`\`\`

# Request 13: Add Conditional Logic Rules
\`\`\`json
{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "attendanceType",
    "triggerCondition": "equals",
    "triggerValue": "virtual",
    "targetType": "page",
    "targetKey": "3",
    "action": "hide"
  }
}
\`\`\`

\`\`\`json
{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "sessionRatings",
    "triggerCondition": "less_than",
    "triggerValue": "3",
    "targetType": "question",
    "targetKey": "lowRatingFeedback",
    "action": "show"
  }
}
\`\`\`

\`\`\`json
{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "venueRating",
    "triggerCondition": "equals",
    "triggerValue": "poor",
    "targetType": "question",
    "targetKey": "venueSuggestions",
    "action": "show"
  }
}
\`\`\`

\`\`\`json
{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "venueRating",
    "triggerCondition": "equals",
    "triggerValue": "very_poor",
    "targetType": "question",
    "targetKey": "venueSuggestions",
    "action": "show"
  }
}
\`\`\``
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>Unified Form Builder API Documentation</title>
        <meta name="description" content="Comprehensive documentation for the Unified Form Builder API with examples and best practices" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Unified Form Builder API Documentation</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              The Unified Form Builder API provides a streamlined approach to building dynamic, multi-page forms with complex conditional logic through a single endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Instead of using multiple endpoints for different operations, this API consolidates all form building actions into a single endpoint that accepts an <code className="bg-slate-100 px-1 py-0.5 rounded">action</code> parameter in the request body to determine the operation to perform.
            </p>
            
            <h3 className="text-lg font-medium mb-2">Key Features</h3>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li>Single endpoint (<code className="bg-slate-100 px-1 py-0.5 rounded">/api/questionnaires/builder</code>) for all form operations</li>
              <li>Support for multi-page forms with complex question types</li>
              <li>Conditional logic to show/hide questions or pages based on responses</li>
              <li>Comprehensive validation of form structure and data</li>
              <li>JSON-based request and response format</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">Authentication</h3>
            <p className="mb-4">
              All requests to the Form Builder API require authentication. The API uses the same authentication mechanism as the rest of the application.
            </p>

            <h3 className="text-lg font-medium mb-2">Base URL</h3>
            <p className="mb-4">
              <code className="bg-slate-100 px-1 py-0.5 rounded">POST /api/questionnaires/builder</code>
            </p>

            <h3 className="text-lg font-medium mb-2">Request Format</h3>
            <CodeBlockWithCopy
              language="json"
              value={`{
  "action": "actionName",
  "data": {
    // Action-specific data
  }
}`}
              className="mb-4"
            />

            <h3 className="text-lg font-medium mb-2">Response Format</h3>
            <CodeBlockWithCopy
              language="json"
              value={`{
  "success": true,
  "data": {
    // Action-specific response data
  }
}

// Or in case of an error:
{
  "success": false,
  "message": "Error message describing what went wrong"
}`}
              className="mb-4"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="actions" className="mb-8">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="actions">API Actions</TabsTrigger>
            <TabsTrigger value="llm-prompts">LLM Prompt Examples</TabsTrigger>
          </TabsList>
          
          <TabsContent value="actions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Actions</CardTitle>
                <CardDescription>
                  The following actions are supported by the Unified Form Builder API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {actions.map((action) => (
                    <AccordionItem key={action.id} value={action.id}>
                      <AccordionTrigger className="text-lg font-medium">
                        {action.name}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">{action.description}</p>
                        
                        <div className="mb-4">
                          <h4 className="text-md font-medium mb-1">Request Example</h4>
                          <div className="relative">
                            <CodeBlockWithCopy
                              language="json"
                              value={action.example}
                              className="mb-2"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(action.example)}
                            >
                              <CopyIcon className="mr-1 h-4 w-4" /> Copy
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-md font-medium mb-1">Response Example</h4>
                          <CodeBlockWithCopy
                            language="json"
                            value={action.response}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="llm-prompts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>LLM Prompt Examples for Complex Forms</CardTitle>
                <CardDescription>
                  Use these examples to generate JSON requests for complex form structures using LLM tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {llmPrompts.map((prompt, index) => (
                    <AccordionItem key={index} value={`prompt-${index}`}>
                      <AccordionTrigger className="text-lg font-medium">
                        {prompt.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">{prompt.description}</p>
                        
                        <div className="mb-4">
                          <h4 className="text-md font-medium mb-1">Prompt for LLM</h4>
                          <div className="relative">
                            <CodeBlockWithCopy
                              language="markdown"
                              value={prompt.prompt}
                              className="mb-2"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(prompt.prompt)}
                            >
                              <CopyIcon className="mr-1 h-4 w-4" /> Copy
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-md font-medium mb-1">Expected Output</h4>
                          <CodeBlockWithCopy
                            language="markdown"
                            value={prompt.response}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Always create a form definition first before adding pages or questions</li>
              <li>Use unique <code className="bg-slate-100 px-1 py-0.5 rounded">questionKey</code> values for all questions to avoid conflicts</li>
              <li>Keep the order values sequential for pages, questions, and options to ensure proper rendering</li>
              <li>When using conditional logic, ensure that the target element exists before creating the rule</li>
              <li>Use the <code className="bg-slate-100 px-1 py-0.5 rounded">getFullQuestionnaire</code> action to verify the complete structure of your form</li>
              <li>Consider the user experience when designing multi-page forms and conditional logic</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The API returns detailed error messages when validation fails or when an operation cannot be completed. Always check the <code className="bg-slate-100 px-1 py-0.5 rounded">success</code> field in the response to determine if the request was successful.
            </p>
            
            <h3 className="text-lg font-medium mb-2">Common Error Codes</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>400 Bad Request</strong>: The request is malformed or contains invalid data</li>
              <li><strong>401 Unauthorized</strong>: Authentication is required or has failed</li>
              <li><strong>403 Forbidden</strong>: The authenticated user does not have permission to perform the requested action</li>
              <li><strong>404 Not Found</strong>: The requested resource (form, page, question, etc.) does not exist</li>
              <li><strong>500 Internal Server Error</strong>: An unexpected error occurred on the server</li>
            </ul>
            
            <Separator className="my-4" />
            
            <p>
              For additional assistance or to report issues, please contact the development team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedFormBuilderDocs;