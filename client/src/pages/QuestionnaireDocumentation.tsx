import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const QuestionnaireDocumentation = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">Questionnaire System Documentation</h1>
      <p className="text-muted-foreground mb-8">
        Complete guide to using the dynamic questionnaire system for catering inquiries
      </p>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admin-api">Admin API</TabsTrigger>
          <TabsTrigger value="public-api">Public API</TabsTrigger>
          <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Understanding the questionnaire system architecture and components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Core Components</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The questionnaire system consists of several interconnected components:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Questionnaire Definitions</strong> - The top-level container for a questionnaire</li>
                  <li><strong>Pages</strong> - Groups of related questions that can be displayed together</li>
                  <li><strong>Questions</strong> - Individual form elements that collect specific pieces of information</li>
                  <li><strong>Conditional Logic</strong> - Rules that control the visibility or requirements of questions</li>
                  <li><strong>Submissions</strong> - Customer responses that can be linked to leads and opportunities</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Data Flow</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  How information flows through the questionnaire system:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Administrators create questionnaire definitions with pages and questions</li>
                  <li>One questionnaire can be designated as "active" for public display</li>
                  <li>Customers access the active questionnaire through the public API</li>
                  <li>Submissions are processed and stored, with contact information extracted</li>
                  <li>New raw leads are created based on questionnaire submissions</li>
                  <li>Raw leads can be converted to opportunities for follow-up</li>
                </ol>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Question Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The system supports the following question types:
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Options Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>text</code></TableCell>
                      <TableCell>Single-line text input</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>email</code></TableCell>
                      <TableCell>Email address input with validation</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>phone</code></TableCell>
                      <TableCell>Phone number input</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>number</code></TableCell>
                      <TableCell>Numeric input with optional validation</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>date</code></TableCell>
                      <TableCell>Date picker</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>textarea</code></TableCell>
                      <TableCell>Multi-line text input</TableCell>
                      <TableCell>No</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>select</code></TableCell>
                      <TableCell>Dropdown menu with options</TableCell>
                      <TableCell>Yes</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>radio</code></TableCell>
                      <TableCell>Radio button group (single selection)</TableCell>
                      <TableCell>Yes</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>checkbox</code></TableCell>
                      <TableCell>Checkbox group (multiple selection)</TableCell>
                      <TableCell>Yes</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin API Tab */}
        <TabsContent value="admin-api">
          <Card>
            <CardHeader>
              <CardTitle>Admin API Reference</CardTitle>
              <CardDescription>
                API endpoints for administrative management of questionnaires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Definitions API */}
              <div>
                <h3 className="text-lg font-medium mb-2">Questionnaire Definitions</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">POST /api/admin/questionnaires/definitions</h4>
                    <p className="text-sm mt-1">Create a new questionnaire definition</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Request Body:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "versionName": "Customer Intake Form v1", // Required
  "description": "Collect catering inquiry details", // Optional
  "isActive": true // Optional, defaults to false
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/admin/questionnaires/definitions</h4>
                    <p className="text-sm mt-1">List all questionnaire definitions</p>
                  </div>
                </div>
              </div>

              {/* Pages API */}
              <div>
                <h3 className="text-lg font-medium mb-2">Questionnaire Pages</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">POST /api/admin/questionnaires/definitions/:definitionId/pages</h4>
                    <p className="text-sm mt-1">Create a new page in a questionnaire</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Request Body:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "title": "Contact Information", // Required
  "order": 0 // Required, determines display order
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/admin/questionnaires/definitions/:definitionId/pages</h4>
                    <p className="text-sm mt-1">List all pages in a questionnaire</p>
                  </div>
                </div>
              </div>

              {/* Questions API */}
              <div>
                <h3 className="text-lg font-medium mb-2">Questionnaire Questions</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">POST /api/admin/questionnaires/pages/:pageId/questions</h4>
                    <p className="text-sm mt-1">Create a new question in a page</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Request Body:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "questionText": "What is your name?", // Required
  "questionKey": "name", // Required, unique identifier
  "questionType": "text", // Required: text, email, phone, etc.
  "order": 0, // Required, determines display order
  "isRequired": true, // Optional, defaults to false
  "placeholderText": "Enter your full name", // Optional
  "helpText": "Please provide your legal name", // Optional
  "options": [ // Required for select, radio, checkbox
    {
      "optionText": "Display Text",
      "optionValue": "stored_value",
      "order": 0
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/admin/questionnaires/pages/:pageId/questions</h4>
                    <p className="text-sm mt-1">List all questions in a page</p>
                  </div>
                </div>
              </div>

              {/* Conditional Logic API */}
              <div>
                <h3 className="text-lg font-medium mb-2">Conditional Logic</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">POST /api/admin/questionnaires/definitions/:definitionId/conditional-logic</h4>
                    <p className="text-sm mt-1">Create a conditional logic rule</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Request Body:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "triggerQuestionKey": "eventType", // Required, the question key that triggers the rule
  "triggerCondition": "equals", // Required: equals, not_equals, contains, etc.
  "triggerValue": "wedding", // Required for most conditions (except is_answered)
  "actionType": "show_question", // Required: show_question, hide_question, etc.
  "targetQuestionKey": "weddingDetails" // Required, the question affected by this rule
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/admin/questionnaires/definitions/:definitionId/conditional-logic</h4>
                    <p className="text-sm mt-1">List all conditional logic rules for a questionnaire</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public API Tab */}
        <TabsContent value="public-api">
          <Card>
            <CardHeader>
              <CardTitle>Public API Reference</CardTitle>
              <CardDescription>
                API endpoints for public access to questionnaires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-2">Retrieving Questionnaires</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/questionnaires/active</h4>
                    <p className="text-sm mt-1">Get the currently active questionnaire</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Response:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "success": true,
  "questionnaire": {
    "definition": {
      "id": 1,
      "versionName": "Customer Intake Form v1",
      "description": "Collect catering inquiry details",
      "isActive": true,
      "createdAt": "2025-05-15T12:00:00.000Z",
      "updatedAt": "2025-05-15T12:00:00.000Z"
    },
    "pages": [
      {
        "page": {
          "id": 1,
          "definitionId": 1,
          "title": "Contact Information",
          "order": 0,
          "createdAt": "2025-05-15T12:00:00.000Z",
          "updatedAt": "2025-05-15T12:00:00.000Z"
        },
        "questions": [
          {
            "question": {
              "id": 1,
              "pageId": 1,
              "questionText": "What is your name?",
              "questionKey": "name",
              "questionType": "text",
              "order": 0,
              "isRequired": true,
              "placeholderText": "Enter your full name",
              "helpText": null,
              "validationRules": null,
              "createdAt": "2025-05-15T12:00:00.000Z",
              "updatedAt": "2025-05-15T12:00:00.000Z"
            },
            "options": [],
            "matrixColumns": []
          }
        ]
      }
    ],
    "conditionalLogic": []
  }
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">GET /api/questionnaires/:definitionId</h4>
                    <p className="text-sm mt-1">Get a specific questionnaire by ID</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Submitting Responses</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-mono text-sm font-bold">POST /api/questionnaires/submit</h4>
                    <p className="text-sm mt-1">Submit a response to a questionnaire</p>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Request Body:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "definitionId": 1, // Required, the questionnaire being answered
  "submittedData": { // Required, the answers to questions
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "eventType": "wedding",
    "guestCount": 150,
    "eventDate": "2025-12-31",
    "message": "Looking for catering services for my wedding"
  },
  "clientIdentifier": "session-123", // Optional, for tracking anonymous users
  "userId": 1, // Optional, if the user is logged in
  "rawLeadId": 123, // Optional, if this is updating an existing lead
  "status": "submitted" // Optional, defaults to "submitted"
}`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold">Response:</p>
                      <pre className="bg-slate-200 p-2 rounded text-xs mt-1 overflow-auto">
{`{
  "success": true,
  "message": "Questionnaire submitted successfully",
  "submission": {
    "id": 1,
    "definitionId": 1,
    "status": "submitted",
    "submittedAt": "2025-05-15T12:00:00.000Z",
    "rawLeadId": 123
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk-import">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import Guide</CardTitle>
              <CardDescription>
                How to bulk import questionnaires and questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Import Script Example</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Below is an example script for bulk importing questionnaire data using the API endpoints:
                </p>
                <pre className="bg-slate-200 p-4 rounded text-xs overflow-auto">
{`// questionnaire-import.js
import fetch from 'node-fetch';

// Authentication
async function login() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  if (!response.ok) {
    throw new Error('Authentication failed');
  }
  
  return response.headers.get('set-cookie');
}

// Import function
async function importQuestionnaire(authCookie, template) {
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': authCookie
  };
  
  // 1. Create questionnaire definition
  console.log('Creating questionnaire definition...');
  const definitionRes = await fetch('http://localhost:5000/api/admin/questionnaires/definitions', {
    method: 'POST',
    headers,
    body: JSON.stringify(template.definition)
  });
  
  if (!definitionRes.ok) {
    throw new Error(\`Failed to create definition: \${await definitionRes.text()}\`);
  }
  
  const definition = await definitionRes.json();
  const definitionId = definition.id;
  console.log(\`Created definition with ID: \${definitionId}\`);
  
  // 2. Create pages
  const pageIds = [];
  console.log('Creating pages...');
  
  for (const page of template.pages) {
    const pageRes = await fetch(\`http://localhost:5000/api/admin/questionnaires/definitions/\${definitionId}/pages\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: page.title,
        order: page.order
      })
    });
    
    if (!pageRes.ok) {
      throw new Error(\`Failed to create page '\${page.title}': \${await pageRes.text()}\`);
    }
    
    const createdPage = await pageRes.json();
    pageIds.push(createdPage.id);
    console.log(\`Created page '\${page.title}' with ID: \${createdPage.id}\`);
    
    // 3. Create questions for this page
    for (const question of page.questions) {
      const questionRes = await fetch(\`http://localhost:5000/api/admin/questionnaires/pages/\${createdPage.id}/questions\`, {
        method: 'POST',
        headers,
        body: JSON.stringify(question)
      });
      
      if (!questionRes.ok) {
        throw new Error(\`Failed to create question '\${question.questionText}': \${await questionRes.text()}\`);
      }
      
      const createdQuestion = await questionRes.json();
      console.log(\`Created question '\${question.questionText}' with key: \${question.questionKey}\`);
    }
  }
  
  // 4. Create conditional logic rules
  console.log('Creating conditional logic rules...');
  
  for (const rule of template.conditionalLogic || []) {
    const ruleRes = await fetch(\`http://localhost:5000/api/admin/questionnaires/definitions/\${definitionId}/conditional-logic\`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rule)
    });
    
    if (!ruleRes.ok) {
      throw new Error(\`Failed to create rule: \${await ruleRes.text()}\`);
    }
    
    const createdRule = await ruleRes.json();
    console.log(\`Created conditional logic rule: \${rule.triggerQuestionKey} => \${rule.actionType} \${rule.targetQuestionKey}\`);
  }
  
  console.log('Import completed successfully!');
  return definitionId;
}

// Define your questionnaire template
const template = {
  definition: {
    versionName: "Catering Inquiry Form v1",
    description: "Form to gather client catering requirements",
    isActive: true
  },
  pages: [
    {
      title: "Contact Information",
      order: 0,
      questions: [
        {
          questionText: "First Name",
          questionKey: "firstName",
          questionType: "text",
          order: 0,
          isRequired: true,
          placeholderText: "Enter your first name"
        },
        {
          questionText: "Last Name",
          questionKey: "lastName",
          questionType: "text",
          order: 1,
          isRequired: true,
          placeholderText: "Enter your last name"
        },
        {
          questionText: "Email Address",
          questionKey: "email",
          questionType: "email",
          order: 2,
          isRequired: true,
          placeholderText: "Enter your email address"
        },
        {
          questionText: "Phone Number",
          questionKey: "phone",
          questionType: "phone",
          order: 3,
          isRequired: true,
          placeholderText: "Enter your phone number"
        }
      ]
    },
    {
      title: "Event Details",
      order: 1,
      questions: [
        {
          questionText: "Event Type",
          questionKey: "eventType",
          questionType: "radio",
          order: 0,
          isRequired: true,
          options: [
            { optionText: "Wedding", optionValue: "wedding", order: 0 },
            { optionText: "Corporate Event", optionValue: "corporate", order: 1 },
            { optionText: "Birthday Party", optionValue: "birthday", order: 2 },
            { optionText: "Other", optionValue: "other", order: 3 }
          ]
        },
        {
          questionText: "Event Date",
          questionKey: "eventDate",
          questionType: "date",
          order: 1,
          isRequired: true
        },
        {
          questionText: "Number of Guests",
          questionKey: "guestCount",
          questionType: "number",
          order: 2,
          isRequired: true,
          placeholderText: "Estimated guest count"
        },
        {
          questionText: "Venue Information",
          questionKey: "venue",
          questionType: "text",
          order: 3,
          isRequired: false,
          placeholderText: "Enter venue name and address if known"
        },
        {
          questionText: "Additional Details",
          questionKey: "additionalDetails",
          questionType: "textarea",
          order: 4,
          isRequired: false,
          placeholderText: "Any special requirements or details about your event"
        }
      ]
    }
  ],
  conditionalLogic: [
    {
      triggerQuestionKey: "eventType",
      triggerCondition: "equals",
      triggerValue: "other",
      actionType: "require_question",
      targetQuestionKey: "additionalDetails"
    }
  ]
};

// Run the import
async function run() {
  try {
    const authCookie = await login();
    const definitionId = await importQuestionnaire(authCookie, template);
    console.log(\`Successfully imported questionnaire with ID: \${definitionId}\`);
  } catch (error) {
    console.error('Import failed:', error.message);
  }
}

run();
`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Template Structure</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your questionnaire template should follow this structure:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>definition</strong> - Contains basic information about the questionnaire</li>
                  <li><strong>pages</strong> - Array of page objects, each with a title, order, and questions array</li>
                  <li><strong>questions</strong> - Array of question objects within each page</li>
                  <li><strong>options</strong> - Array of option objects for select, radio, or checkbox questions</li>
                  <li><strong>conditionalLogic</strong> - Array of conditional logic rules</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Running the Import</h3>
                <p className="text-sm text-muted-foreground">
                  To run the import script:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-sm mt-2">
                  <li>Save the script as <code>questionnaire-import.js</code></li>
                  <li>Install dependencies: <code>npm install node-fetch</code></li>
                  <li>Run: <code>node questionnaire-import.js</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Guide</CardTitle>
              <CardDescription>
                Common issues and solutions when working with questionnaires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Common Issues</h3>
                <div className="space-y-4">
                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-medium">Error: "questionnaireDefinitions is not defined"</h4>
                    <p className="text-sm mt-1">
                      <strong>Problem:</strong> Missing table import in server/routes.ts or server/storage.ts
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> Ensure you've imported the questionnaireDefinitions table at the top of the file:
                    </p>
                    <pre className="bg-slate-200 p-2 rounded text-xs mt-1">
                      {`import { questionnaireDefinitions } from "@shared/schema";`}
                    </pre>
                  </div>

                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-medium">Error: "Field [x] is required" when creating questions</h4>
                    <p className="text-sm mt-1">
                      <strong>Problem:</strong> Missing required fields in your API request
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> Ensure all required fields are included in your request body. For questions, you must include:
                    </p>
                    <ul className="list-disc pl-6 text-xs mt-1">
                      <li>questionText</li>
                      <li>questionKey</li>
                      <li>questionType</li>
                      <li>order</li>
                    </ul>
                  </div>

                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-medium">Error: "Question key already exists" when creating questions</h4>
                    <p className="text-sm mt-1">
                      <strong>Problem:</strong> Duplicate question key within the same questionnaire
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> Ensure each question has a unique questionKey. This is important for:
                    </p>
                    <ul className="list-disc pl-6 text-xs mt-1">
                      <li>Properly identifying submitted data</li>
                      <li>Setting up correct conditional logic</li>
                      <li>Avoiding database constraint errors</li>
                    </ul>
                  </div>

                  <div className="bg-slate-100 rounded-md p-4">
                    <h4 className="font-medium">Error: "Options required for question type [x]"</h4>
                    <p className="text-sm mt-1">
                      <strong>Problem:</strong> Missing options array for select, radio, or checkbox questions
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> For question types that require options (select, radio, checkbox), include an options array:
                    </p>
                    <pre className="bg-slate-200 p-2 rounded text-xs mt-1">
{`"options": [
  {
    "optionText": "Display Text",
    "optionValue": "stored_value",
    "order": 0
  }
]`}
                    </pre>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-2">Testing API Endpoints</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can test the public API endpoints using our test script:
                </p>
                <pre className="bg-slate-200 p-2 rounded text-xs">
                  {`node test-public-questionnaire-api.js`}
                </pre>
                <p className="text-sm text-muted-foreground mt-4 mb-2">
                  Or manually with cURL:
                </p>
                <pre className="bg-slate-200 p-2 rounded text-xs">
{`# Get active questionnaire
curl -X GET http://localhost:5000/api/questionnaires/active

# Submit a response
curl -X POST http://localhost:5000/api/questionnaires/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "definitionId": 1,
    "submittedData": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "555-123-4567",
      "eventType": "wedding",
      "eventDate": "2025-12-31",
      "guestCount": 100
    }
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionnaireDocumentation;