import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CodeBlock } from '@/components/ui/code-block';
import { InfoCircledIcon } from '@radix-ui/react-icons';

// Documentation examples for the Unified Form Builder API
const UnifiedFormBuilderDocs: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <Helmet>
        <title>Unified Form Builder API Documentation</title>
        <meta name="description" content="Documentation for the unified form builder API with examples and usage guides" />
      </Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Unified Form Builder API Documentation</h1>
        <p className="text-muted-foreground">
          Comprehensive guide to using the unified form builder API for creating complex questionnaires
        </p>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Basic Examples</TabsTrigger>
          <TabsTrigger value="complex">Complex Forms</TabsTrigger>
          <TabsTrigger value="llm-prompts">LLM Prompts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What is the Unified Form Builder API?</CardTitle>
              <CardDescription>
                A streamlined approach to form building through a single API endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Unified Form Builder API provides a single endpoint that uses an action-based architecture to create, update, and manage 
                complex questionnaires and forms. Instead of using multiple endpoints with different URL patterns, all operations are 
                performed through a single endpoint that accepts a JSON payload with an "action" parameter.
              </p>
              
              <Alert>
                <InfoCircledIcon className="h-4 w-4" />
                <AlertTitle>Key Design Principles</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>All operations go through a single endpoint: <code>/api/questionnaires/builder</code></li>
                    <li>The "action" parameter determines what operation to perform</li>
                    <li>All IDs and references are passed in the JSON payload</li>
                    <li>Simplified workflow for sequentially building forms page by page</li>
                    <li>Support for conditional logic and validation rules</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <h3 className="text-lg font-medium mt-4">Benefits of the Unified Approach</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Consistent interface for all form operations</li>
                <li>Simplified client-side code with a single API call pattern</li>
                <li>Easier integration with AI assistants and code generators</li>
                <li>Better state management between form creation steps</li>
                <li>Reduced API surface area and simpler documentation</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Reference</CardTitle>
              <CardDescription>
                Detailed information about the available actions and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Base Endpoint</h3>
              <div className="bg-muted p-3 rounded-md">
                <code>POST /api/questionnaires/builder</code>
              </div>
              
              <h3 className="text-lg font-medium mt-6">Authentication</h3>
              <p>
                All requests to the form builder API require authentication. The user must have admin privileges
                to use most actions (the isAdmin middleware is applied to this endpoint).
              </p>
              
              <h3 className="text-lg font-medium mt-6">Request Format</h3>
              <p>All requests must include:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>action</strong>: The operation to perform (string)</li>
                <li><strong>data</strong>: The data specific to the action (object)</li>
              </ul>
              
              <h3 className="text-lg font-medium mt-6">Available Actions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Data Fields</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>createDefinition</code></td>
                      <td className="px-4 py-3">Creates a new questionnaire definition</td>
                      <td className="px-4 py-3"><code>title, description, status</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>addPage</code></td>
                      <td className="px-4 py-3">Adds a page to a questionnaire</td>
                      <td className="px-4 py-3"><code>definitionId, title, order</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>addQuestions</code></td>
                      <td className="px-4 py-3">Adds questions to a page</td>
                      <td className="px-4 py-3"><code>pageId, questions[]</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>updatePage</code></td>
                      <td className="px-4 py-3">Updates an existing page</td>
                      <td className="px-4 py-3"><code>pageId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>updateQuestion</code></td>
                      <td className="px-4 py-3">Updates an existing question</td>
                      <td className="px-4 py-3"><code>questionId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>deletePage</code></td>
                      <td className="px-4 py-3">Deletes a page and all its questions</td>
                      <td className="px-4 py-3"><code>pageId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>deleteQuestion</code></td>
                      <td className="px-4 py-3">Deletes a question and its options</td>
                      <td className="px-4 py-3"><code>questionId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>addConditionalLogic</code></td>
                      <td className="px-4 py-3">Adds conditional display logic</td>
                      <td className="px-4 py-3"><code>definitionId, sourceQuestionId, targetQuestionId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>updateConditionalLogic</code></td>
                      <td className="px-4 py-3">Updates existing conditional logic</td>
                      <td className="px-4 py-3"><code>ruleId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>deleteConditionalLogic</code></td>
                      <td className="px-4 py-3">Deletes conditional logic rule</td>
                      <td className="px-4 py-3"><code>ruleId</code></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap"><code>getFullQuestionnaire</code></td>
                      <td className="px-4 py-3">Retrieves the full questionnaire structure</td>
                      <td className="px-4 py-3"><code>definitionId</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Examples</CardTitle>
              <CardDescription>
                Step-by-step examples of creating forms with the unified API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">1. Creating a Questionnaire Definition</h3>
              <CodeBlock
                language="json"
                code={`{
  "action": "createDefinition",
  "data": {
    "title": "Customer Feedback Form",
    "description": "Help us improve our service",
    "status": "draft",
    "version": "1.0"
  }
}`}
              />
              
              <h3 className="text-lg font-medium mt-6">2. Adding a Page</h3>
              <p>After getting the definition ID from the previous step:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Basic Information",
    "description": "Tell us about yourself",
    "order": 1
  }
}`}
              />
              
              <h3 className="text-lg font-medium mt-6">3. Adding Questions to a Page</h3>
              <p>After getting the page ID from the previous step:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "What is your name?",
        "questionKey": "customer_name",
        "questionType": "text",
        "isRequired": true,
        "order": 1,
        "helpText": "Please enter your full name"
      },
      {
        "questionText": "Email Address",
        "questionKey": "email",
        "questionType": "email",
        "isRequired": true,
        "order": 2,
        "helpText": "We will send a confirmation email",
        "validationRules": {
          "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        }
      },
      {
        "questionText": "How did you hear about us?",
        "questionKey": "referral_source",
        "questionType": "select",
        "isRequired": false,
        "order": 3,
        "options": [
          {
            "optionText": "Search Engine",
            "optionValue": "search",
            "order": 1
          },
          {
            "optionText": "Social Media",
            "optionValue": "social",
            "order": 2
          },
          {
            "optionText": "Word of Mouth",
            "optionValue": "referral",
            "order": 3
          },
          {
            "optionText": "Other",
            "optionValue": "other",
            "order": 4
          }
        ]
      }
    ]
  }
}`}
              />
              
              <h3 className="text-lg font-medium mt-6">4. Adding Conditional Logic</h3>
              <p>After getting the question IDs from the previous step:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 3,
    "targetQuestionId": 4,
    "condition": "equals",
    "value": "other",
    "action": "show"
  }
}`}
              />
              
              <h3 className="text-lg font-medium mt-6">5. Getting the Full Questionnaire</h3>
              <CodeBlock
                language="json"
                code={`{
  "action": "getFullQuestionnaire",
  "data": {
    "definitionId": 1
  }
}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="complex" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complex Form Example</CardTitle>
              <CardDescription>
                Building a multi-page form with calculations and conditional logic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This example demonstrates how to build a complex event planning questionnaire with branching logic,
                calculations, and multiple sections. We'll build a form with several pages and show how to implement
                conditional logic between them.
              </p>
              
              <h3 className="text-lg font-medium mt-4">Example Scenario: Event Planning Questionnaire</h3>
              
              <h4 className="font-medium mt-4">Step 1: Create the Form Definition</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "createDefinition",
  "data": {
    "title": "Corporate Event Planning Questionnaire",
    "description": "Complete this form to help us plan your perfect corporate event",
    "status": "active",
    "version": "1.0"
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 2: Add Initial Pages</h4>
              <p>First page - Event Basics:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Event Basics",
    "description": "Tell us about your event",
    "order": 1
  }
}`}
              />
              
              <p className="mt-4">Second page - Venue Selection:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Venue Selection",
    "description": "Help us understand your venue requirements",
    "order": 2
  }
}`}
              />
              
              <p className="mt-4">Third page - Food and Beverage:</p>
              <CodeBlock
                language="json"
                code={`{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Food and Beverage",
    "description": "Plan your catering needs",
    "order": 3
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 3: Add Questions to Page 1</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "Event Name",
        "questionKey": "event_name",
        "questionType": "text",
        "isRequired": true,
        "order": 1
      },
      {
        "questionText": "Event Date",
        "questionKey": "event_date",
        "questionType": "date",
        "isRequired": true,
        "order": 2,
        "validationRules": {
          "minDate": "currentDate"
        }
      },
      {
        "questionText": "Event Type",
        "questionKey": "event_type",
        "questionType": "radio",
        "isRequired": true,
        "order": 3,
        "options": [
          {
            "optionText": "Conference",
            "optionValue": "conference",
            "order": 1
          },
          {
            "optionText": "Corporate Party",
            "optionValue": "party",
            "order": 2
          },
          {
            "optionText": "Product Launch",
            "optionValue": "product_launch",
            "order": 3
          },
          {
            "optionText": "Team Building",
            "optionValue": "team_building",
            "order": 4
          },
          {
            "optionText": "Other",
            "optionValue": "other",
            "order": 5
          }
        ]
      },
      {
        "questionText": "Estimated Number of Attendees",
        "questionKey": "attendee_count",
        "questionType": "number",
        "isRequired": true,
        "order": 4,
        "validationRules": {
          "min": 5,
          "max": 1000
        }
      },
      {
        "questionText": "Event Duration (hours)",
        "questionKey": "event_duration",
        "questionType": "number",
        "isRequired": true,
        "order": 5,
        "validationRules": {
          "min": 1,
          "max": 72
        }
      }
    ]
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 4: Add Questions to Page 2 (Venue Selection)</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Do you need us to provide a venue?",
        "questionKey": "needs_venue",
        "questionType": "radio",
        "isRequired": true,
        "order": 1,
        "options": [
          {
            "optionText": "Yes, please help find a venue",
            "optionValue": "yes",
            "order": 1
          },
          {
            "optionText": "No, we already have a venue",
            "optionValue": "no",
            "order": 2
          }
        ]
      },
      {
        "questionText": "Venue Preferences",
        "questionKey": "venue_preferences",
        "questionType": "checkbox",
        "isRequired": false,
        "order": 2,
        "options": [
          {
            "optionText": "Indoor",
            "optionValue": "indoor",
            "order": 1
          },
          {
            "optionText": "Outdoor",
            "optionValue": "outdoor",
            "order": 2
          },
          {
            "optionText": "Hotel",
            "optionValue": "hotel",
            "order": 3
          },
          {
            "optionText": "Restaurant",
            "optionValue": "restaurant",
            "order": 4
          },
          {
            "optionText": "Conference Center",
            "optionValue": "conference_center",
            "order": 5
          }
        ]
      },
      {
        "questionText": "Venue Address (if already selected)",
        "questionKey": "venue_address",
        "questionType": "textarea",
        "isRequired": false,
        "order": 3
      }
    ]
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 5: Add Conditional Logic for Venue Questions</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 6,
    "targetQuestionId": 7,
    "condition": "equals",
    "value": "yes", 
    "action": "show"
  }
}`}
              />
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 6,
    "targetQuestionId": 8,
    "condition": "equals",
    "value": "no",
    "action": "show"
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 6: Add Food and Beverage Questions</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "addQuestions",
  "data": {
    "pageId": 3,
    "questions": [
      {
        "questionText": "Catering Service Needed?",
        "questionKey": "needs_catering",
        "questionType": "radio",
        "isRequired": true,
        "order": 1,
        "options": [
          {
            "optionText": "Yes",
            "optionValue": "yes",
            "order": 1
          },
          {
            "optionText": "No",
            "optionValue": "no",
            "order": 2
          }
        ]
      },
      {
        "questionText": "Meal Types",
        "questionKey": "meal_types",
        "questionType": "checkbox",
        "isRequired": false,
        "order": 2,
        "options": [
          {
            "optionText": "Breakfast",
            "optionValue": "breakfast",
            "order": 1
          },
          {
            "optionText": "Lunch",
            "optionValue": "lunch",
            "order": 2
          },
          {
            "optionText": "Dinner",
            "optionValue": "dinner",
            "order": 3
          },
          {
            "optionText": "Snacks/Breaks",
            "optionValue": "snacks",
            "order": 4
          }
        ]
      },
      {
        "questionText": "Dietary Restrictions",
        "questionKey": "dietary_restrictions",
        "questionType": "checkbox",
        "isRequired": false,
        "order": 3,
        "options": [
          {
            "optionText": "Vegetarian",
            "optionValue": "vegetarian",
            "order": 1
          },
          {
            "optionText": "Vegan",
            "optionValue": "vegan",
            "order": 2
          },
          {
            "optionText": "Gluten-Free",
            "optionValue": "gluten_free",
            "order": 3
          },
          {
            "optionText": "Dairy-Free",
            "optionValue": "dairy_free",
            "order": 4
          },
          {
            "optionText": "Nut Allergies",
            "optionValue": "nut_allergies",
            "order": 5
          }
        ]
      },
      {
        "questionText": "Bar Service Required?",
        "questionKey": "needs_bar",
        "questionType": "radio",
        "isRequired": true,
        "order": 4,
        "options": [
          {
            "optionText": "Yes",
            "optionValue": "yes",
            "order": 1
          },
          {
            "optionText": "No",
            "optionValue": "no",
            "order": 2
          }
        ]
      },
      {
        "questionText": "Bar Service Type",
        "questionKey": "bar_type",
        "questionType": "radio",
        "isRequired": false,
        "order": 5,
        "options": [
          {
            "optionText": "Cash Bar",
            "optionValue": "cash",
            "order": 1
          },
          {
            "optionText": "Open Bar",
            "optionValue": "open",
            "order": 2
          },
          {
            "optionText": "Limited Open Bar",
            "optionValue": "limited",
            "order": 3
          }
        ]
      }
    ]
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 7: Add Conditional Logic for Food Questions</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 9,
    "targetQuestionId": 10,
    "condition": "equals",
    "value": "yes",
    "action": "show"
  }
}`}
              />
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 9,
    "targetQuestionId": 11,
    "condition": "equals",
    "value": "yes",
    "action": "show"
  }
}`}
              />
              <CodeBlock
                language="json"
                code={`{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "sourceQuestionId": 12,
    "targetQuestionId": 13,
    "condition": "equals",
    "value": "yes",
    "action": "show"
  }
}`}
              />
              
              <h4 className="font-medium mt-4">Step 8: Get the Full Questionnaire</h4>
              <CodeBlock
                language="json"
                code={`{
  "action": "getFullQuestionnaire",
  "data": {
    "definitionId": 1
  }
}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="llm-prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>LLM Prompts for Form Generation</CardTitle>
              <CardDescription>
                Example prompts to instruct AI systems to generate complex form JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="mb-6">
                <InfoCircledIcon className="h-4 w-4" />
                <AlertTitle>How to use these prompts</AlertTitle>
                <AlertDescription>
                  The following prompts are designed to work with modern LLMs (like GPT-4, Claude, etc.)
                  to generate complete JSON API calls for complex form building.
                  Copy and adapt these prompts based on your specific form requirements.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                <h3 className="text-xl font-medium">Prompt 1: Generating a Complete Multi-Page Form</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-medium mb-2">Basic Form Generation Prompt Template</p>
                  <div className="text-sm whitespace-pre-wrap">
{`I need to create a multi-page questionnaire using a unified form builder API. The API uses a single endpoint with an "action" parameter in the JSON body to determine the operation.

I need to create a 33-page form for {purpose of the form}. The form should include various question types including text fields, multi-select, radio buttons, date fields, and numerical inputs with validation.

Specifically, I need:
1. A single JSON payload to create the questionnaire definition
2. A series of JSON payloads to create each page (33 pages total)
3. JSON payloads for adding questions to each page
4. JSON payloads for establishing conditional logic between questions

Here's what I know about the API:
- Endpoint: POST /api/questionnaires/builder
- All JSON payloads must include "action" and "data" fields
- Available actions: createDefinition, addPage, addQuestions, updatePage, updateQuestion, addConditionalLogic, etc.
- For conditional logic, I need to reference the IDs of questions that I've created

For questions that involve calculations, I specifically need to collect:
{list calculation-dependent fields}

For conditional logic, I need the following rules:
{describe conditional logic rules}

Please generate the complete series of API calls I would need to make to build this form. Make sure to:
1. Use proper JSON formatting
2. Keep track of IDs between calls (assuming IDs start at 1 and increment)
3. Include detailed validation rules where appropriate
4. Handle complex conditional logic correctly

Generate each API call individually and label them clearly so I can execute them in sequence.`}
                  </div>
                </div>
                
                <h3 className="text-xl font-medium mt-6">Prompt 2: Specialized Prompt for Complex Event Registration Form</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-medium mb-2">Event Registration Form Generation</p>
                  <div className="text-sm whitespace-pre-wrap">
{`I need to create a 33-page corporate event registration questionnaire using a JSON API. This form will be used to collect detailed information about large corporate events with complex requirements.

The API uses a single endpoint (/api/questionnaires/builder) with different "action" parameters in the JSON body.

The event registration form needs to cover these main sections (each with multiple pages):
1. Basic event information (name, date, type, duration)
2. Attendee information (estimated counts, demographics, VIP guests)
3. Venue requirements (space, layout, AV needs)
4. Catering and meals (menu options, dietary restrictions)
5. Registration process (ticketing, check-in requirements)
6. Marketing materials (branding requirements, signage)
7. Budget and payment information (pricing calculator, payment options)
8. Staffing requirements (staff counts, special needs)
9. Security considerations (access control, secured areas)
10. Technical requirements (wifi, streaming, recording)
11. Compliance and legal (permits, insurance, contracts)

For calculating costs, I need to gather:
- Base venue cost
- Per-attendee catering costs
- Equipment rental costs
- Staffing costs
- Add-on service costs

I need complex conditional logic, including:
- If outdoor event is selected, show weather contingency pages
- If attendance > 100, show additional security questions
- If AV requirements include streaming, show streaming platform questions
- Based on event type selection, show different room layout options
- Based on meal selections, show different dietary restriction options
- If budget is below calculated cost, show cost-saving option pages

Generate the complete sequence of API calls I would need, with properly formatted JSON for each call. Make sure to:
1. Start with creating the questionnaire definition
2. Add each page in sequence
3. Add all questions to each page
4. Add all necessary conditional logic
5. Track and reference IDs correctly between calls

For brevity, you can show the first 5 pages in detail, then summarize the pattern for the remaining pages, then show the last 2 pages in detail.`}
                  </div>
                </div>
                
                <h3 className="text-xl font-medium mt-6">Prompt 3: Specialized Prompt for Forms with Calculations</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-medium mb-2">Form with Financial Calculations</p>
                  <div className="text-sm whitespace-pre-wrap">
{`I need to create a comprehensive financial planning questionnaire with calculation capabilities using a JSON-based form builder API. The API uses a single endpoint (/api/questionnaires/builder) with an "action" parameter that determines the operation.

The form needs to collect detailed financial information across multiple areas and perform calculations based on the inputs. It should be 33 pages long, covering:

1. Personal information (name, contact details, etc.)
2. Current income sources (salary, investments, rental income, etc.)
3. Current expenses (housing, transportation, utilities, etc.)
4. Assets (property, investments, cash, etc.)
5. Liabilities (mortgages, loans, credit cards, etc.)
6. Retirement goals and planning
7. Investment preferences and risk tolerance
8. Insurance coverage
9. Estate planning considerations
10. Tax planning information
11. Business interests (if applicable)

Key calculations that need to be performed:
- Net worth calculation (assets minus liabilities)
- Monthly cash flow (income minus expenses)
- Retirement savings projections
- Debt-to-income ratio
- Emergency fund adequacy
- Insurance coverage adequacy
- Investment allocation recommendations
- Tax efficiency calculations

Complex conditional logic requirements:
- If self-employed, show additional business income and expense sections
- If homeowner, show mortgage and property-related questions
- If has dependents, show college planning and life insurance sections
- Based on age, show different retirement planning sections
- Based on net worth, show different estate planning options
- Based on risk tolerance, show different investment strategy questions

Please generate the complete series of API calls needed to build this form, ensuring proper:
1. Sequential API call structure (definition → pages → questions → conditional logic)
2. Question types appropriate for numerical calculations
3. Validation rules for ensuring calculation accuracy
4. Conditional display logic that references previously created questions
5. Proper tracking of IDs between calls

For each section with calculations, ensure there are questions to gather all required inputs and explicit instructions about how the calculations should be performed.`}
                  </div>
                </div>
                
                <h3 className="text-xl font-medium mt-6">Prompt 4: Detailed Technical Prompt for Developers</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-medium mb-2">Developer-Focused API Implementation</p>
                  <div className="text-sm whitespace-pre-wrap">
{`I need to programmatically build a complex 33-page questionnaire using a RESTful JSON API that follows an action-based architecture. The API endpoint is /api/questionnaires/builder, and all operations use the same POST endpoint with an "action" field that determines the operation type.

Technical details of the API:
- Authentication: Bearer token (admin privileges required)
- Content-Type: application/json
- Request format: { "action": string, "data": object }
- IDs are auto-generated and must be tracked between requests
- Actions: createDefinition, addPage, addQuestions, addConditionalLogic, etc.

Form requirements:
1. 33 pages total, organized in a logical flow
2. Question types needed: text, textarea, email, phone, date, number, select, radio, checkbox, time
3. Complex validation rules for numerical inputs (min/max, patterns)
4. Conditional logic that references questions across different pages
5. Calculation capabilities for financial projections

Implementation approach:
1. First create the questionnaire definition (returns definitionId)
2. For each page:
   a. Create the page (returns pageId)
   b. Add all questions to the page (returns questionIds)
3. After all pages and questions are created, add conditional logic rules

For maintaining ID references:
- Store definitionId from first call
- Store pageIds in an array as they're created
- Store questionIds in a nested map by page
- Reference these IDs when creating conditional logic

I need a complete implementation plan with specific JSON payloads for:
1. Creating the definition
2. Creating each page (first 3 and last 3 pages as examples)
3. Adding questions to pages (with proper validation rules)
4. Setting up conditional logic
5. Any necessary error handling considerations

Include code comments explaining the structure and what each API call accomplishes. The questionnaire will be for a complex insurance application with multiple calculation dependencies.`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedFormBuilderDocs;