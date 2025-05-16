import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Helmet } from "react-helmet";

export default function QuestionnaireDocumentation() {
  return (
    <>
      <Helmet>
        <title>Questionnaire Documentation | Home Bites CMS</title>
        <meta name="description" content="Documentation for the dynamic questionnaire system API endpoints and usage" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col mb-6">
          <h1 className="text-2xl font-bold">Dynamic Questionnaire System Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive guide for integrating and using the questionnaire system
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="admin-api">Admin API</TabsTrigger>
            <TabsTrigger value="public-api">Public API</TabsTrigger>
            <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Architecture</CardTitle>
                <CardDescription>
                  Understanding the questionnaire system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-lg font-medium">Introduction</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        The dynamic questionnaire system is designed to create customizable forms for collecting 
                        information from leads and clients. It supports various question types, conditional logic, 
                        and integrates with the existing lead management workflow.
                      </p>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Core Components</h3>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-2">
                        <li>
                          <strong>Questionnaire Definitions</strong>: The top-level container for a questionnaire, including metadata like version name and active status.
                        </li>
                        <li>
                          <strong>Pages</strong>: Groups of questions that are presented together, allowing for multi-step forms.
                        </li>
                        <li>
                          <strong>Questions</strong>: Individual form fields with various types (text, number, select, etc.).
                        </li>
                        <li>
                          <strong>Options</strong>: Possible values for select/choice-based questions.
                        </li>
                        <li>
                          <strong>Conditional Logic</strong>: Rules that control the visibility and flow of questions based on previous answers.
                        </li>
                        <li>
                          <strong>Submissions</strong>: Stored responses from users, linked to raw leads or opportunities.
                        </li>
                      </ul>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Data Model</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        The questionnaire system uses the following database tables:
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-2">
                        <li><code>questionnaire_definitions</code>: Stores metadata about questionnaires</li>
                        <li><code>questionnaire_pages</code>: Stores pages within questionnaires</li>
                        <li><code>questionnaire_questions</code>: Stores individual questions</li>
                        <li><code>questionnaire_options</code>: Stores options for select/multi-select questions</li>
                        <li><code>questionnaire_conditional_logic</code>: Stores conditional display rules</li>
                        <li><code>questionnaire_submissions</code>: Stores user responses</li>
                        <li><code>questionnaire_answers</code>: Stores individual answers within submissions</li>
                      </ul>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Integration Points</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        The questionnaire system integrates with the following components:
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-2">
                        <li>
                          <strong>Raw Leads</strong>: When a questionnaire is submitted by a new lead, a record is created in the raw_leads table.
                        </li>
                        <li>
                          <strong>Opportunities</strong>: Questionnaire submissions can be linked to existing opportunities to collect additional information.
                        </li>
                        <li>
                          <strong>Clients</strong>: Once a raw lead is converted to an opportunity and then to a client, the questionnaire data remains linked.
                        </li>
                      </ul>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Versioning</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        The system supports multiple versions of questionnaires, with only one being active at a time.
                        This allows for testing new versions without affecting the live questionnaire.
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin API Reference</CardTitle>
                <CardDescription>
                  Endpoints for managing questionnaires (admin access required)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-lg font-medium">Authentication</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        All admin API endpoints require authentication with an admin user account.
                        Requests without proper authentication will receive a 401 Unauthorized or 403 Forbidden response.
                      </p>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Questionnaire Definitions</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Create Questionnaire Definition</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/admin/questionnaires/definitions</p>
                        <p className="text-sm mt-2">Creates a new questionnaire definition.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "versionName": "Customer Intake v1",
  "description": "Initial questionnaire for new customers",
  "isActive": true
}`}
                          </pre>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Response:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "id": 1,
  "versionName": "Customer Intake v1",
  "description": "Initial questionnaire for new customers",
  "isActive": true,
  "createdAt": "2023-05-15T12:00:00Z",
  "updatedAt": "2023-05-15T12:00:00Z"
}`}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Get Questionnaire Definitions</h4>
                        <p className="text-xs text-muted-foreground mt-1">GET /api/admin/questionnaires/definitions</p>
                        <p className="text-sm mt-2">Retrieves all questionnaire definitions.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Response:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`[
  {
    "id": 1,
    "versionName": "Customer Intake v1",
    "description": "Initial questionnaire for new customers",
    "isActive": true,
    "createdAt": "2023-05-15T12:00:00Z",
    "updatedAt": "2023-05-15T12:00:00Z"
  },
  ...
]`}
                          </pre>
                        </div>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Pages</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Create Page</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/admin/questionnaires/definitions/:definitionId/pages</p>
                        <p className="text-sm mt-2">Creates a new page within a questionnaire definition.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "title": "Basic Information",
  "order": 1
}`}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Reorder Pages</h4>
                        <p className="text-xs text-muted-foreground mt-1">PATCH /api/admin/questionnaires/definitions/:definitionId/pages/reorder</p>
                        <p className="text-sm mt-2">Updates the order of pages within a questionnaire.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "pageOrders": [
    { "id": 1, "order": 2 },
    { "id": 2, "order": 1 }
  ]
}`}
                          </pre>
                        </div>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Questions</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Create Question</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/admin/questionnaires/pages/:pageId/questions</p>
                        <p className="text-sm mt-2">Creates a new question within a page.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "questionText": "What is your name?",
  "questionKey": "customer_name",
  "questionType": "text",
  "isRequired": true,
  "helpText": "Please enter your full name",
  "order": 1,
  "options": []
}`}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Create Question with Options</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/admin/questionnaires/pages/:pageId/questions</p>
                        <p className="text-sm mt-2">Creates a new select question with options.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "questionText": "What type of event are you planning?",
  "questionKey": "event_type",
  "questionType": "select",
  "isRequired": true,
  "helpText": "Select the type of event",
  "order": 2,
  "options": [
    {
      "value": "wedding",
      "label": "Wedding",
      "order": 1
    },
    {
      "value": "corporate",
      "label": "Corporate Event",
      "order": 2
    },
    {
      "value": "birthday",
      "label": "Birthday Party",
      "order": 3
    }
  ]
}`}
                          </pre>
                        </div>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Conditional Logic</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Create Conditional Logic Rule</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/admin/questionnaires/definitions/:definitionId/conditional-logic</p>
                        <p className="text-sm mt-2">Creates a new conditional logic rule.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "name": "Show dietary restrictions when special diet is selected",
  "triggerQuestionId": 3,
  "triggerCondition": "equals",
  "triggerValue": "yes",
  "actionType": "show",
  "targetQuestionId": 4
}`}
                          </pre>
                        </div>
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public-api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Public API Reference</CardTitle>
                <CardDescription>
                  Endpoints for accessing and submitting questionnaires (public access)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-lg font-medium">Authentication</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Public API endpoints do not require authentication. They are designed to be accessible 
                        to anonymous users for viewing and submitting questionnaires.
                      </p>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Fetching Questionnaires</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Get Active Questionnaire</h4>
                        <p className="text-xs text-muted-foreground mt-1">GET /api/questionnaires/active</p>
                        <p className="text-sm mt-2">Retrieves the currently active questionnaire with all its pages, questions, and options.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Response:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "definition": {
    "id": 1,
    "versionName": "Customer Intake v1",
    "description": "Initial questionnaire for new customers",
    "isActive": true
  },
  "pages": [
    {
      "id": 1,
      "title": "Basic Information",
      "order": 1,
      "questions": [
        {
          "id": 1,
          "questionText": "What is your name?",
          "questionKey": "customer_name",
          "questionType": "text",
          "isRequired": true,
          "helpText": "Please enter your full name",
          "order": 1,
          "options": []
        },
        {
          "id": 2,
          "questionText": "What type of event are you planning?",
          "questionKey": "event_type",
          "questionType": "select",
          "isRequired": true,
          "helpText": "Select the type of event",
          "order": 2,
          "options": [
            {
              "id": 1,
              "value": "wedding",
              "label": "Wedding",
              "order": 1
            },
            {
              "id": 2,
              "value": "corporate",
              "label": "Corporate Event",
              "order": 2
            },
            {
              "id": 3,
              "value": "birthday",
              "label": "Birthday Party",
              "order": 3
            }
          ]
        }
      ]
    }
  ],
  "conditionalLogic": [
    {
      "id": 1,
      "name": "Show dietary restrictions when special diet is selected",
      "triggerQuestionId": 3,
      "triggerCondition": "equals",
      "triggerValue": "yes",
      "actionType": "show",
      "targetQuestionId": 4
    }
  ]
}`}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Get Specific Questionnaire</h4>
                        <p className="text-xs text-muted-foreground mt-1">GET /api/questionnaires/:definitionId</p>
                        <p className="text-sm mt-2">Retrieves a specific questionnaire by ID.</p>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Submitting Responses</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Submit Questionnaire Response</h4>
                        <p className="text-xs text-muted-foreground mt-1">POST /api/questionnaires/submit</p>
                        <p className="text-sm mt-2">Submits responses to a questionnaire. If no opportunityId is provided, a new raw lead will be created.</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Request Body:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "definitionId": 1,
  "opportunityId": null,  // Optional, if submitting for an existing opportunity
  "contactInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567"
  },
  "answers": [
    {
      "questionId": 1,
      "value": "John Doe"
    },
    {
      "questionId": 2,
      "value": "wedding"
    },
    {
      "questionId": 3,
      "value": "yes"
    },
    {
      "questionId": 4,
      "value": "Vegetarian, Gluten-free"
    }
  ]
}`}
                          </pre>
                        </div>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Response:</h5>
                          <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`{
  "success": true,
  "submissionId": 123,
  "rawLeadId": 456,  // Only included if a new raw lead was created
  "message": "Questionnaire submitted successfully"
}`}
                          </pre>
                        </div>
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import Guide</CardTitle>
                <CardDescription>
                  How to create questionnaires in bulk using scripts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-lg font-medium">Overview</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        For complex questionnaires, it may be more efficient to create them programmatically 
                        rather than through the UI. This guide shows how to create a complete questionnaire 
                        with a single script.
                      </p>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Example Script</h3>
                      <pre className="bg-muted p-2 rounded-md text-xs mt-1 overflow-auto">
{`const axios = require('axios');

async function login() {
  const response = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'password'
  });
  
  return response.data.token;
}

async function createQuestionnaire() {
  const token = await login();
  
  // 1. Create the questionnaire definition
  const definitionResponse = await axios.post(
    'http://localhost:5000/api/admin/questionnaires/definitions',
    {
      versionName: "Event Planning Questionnaire",
      description: "Comprehensive questionnaire for event planning clients",
      isActive: true
    },
    {
      headers: { Authorization: \`Bearer \${token}\` }
    }
  );
  
  const definitionId = definitionResponse.data.id;
  console.log(\`Created questionnaire definition with ID \${definitionId}\`);
  
  // 2. Create pages
  const pages = [
    { title: "Contact Information", order: 1 },
    { title: "Event Details", order: 2 },
    { title: "Catering Preferences", order: 3 }
  ];
  
  const pageIds = [];
  
  for (const page of pages) {
    const pageResponse = await axios.post(
      \`http://localhost:5000/api/admin/questionnaires/definitions/\${definitionId}/pages\`,
      page,
      {
        headers: { Authorization: \`Bearer \${token}\` }
      }
    );
    
    pageIds.push(pageResponse.data.id);
    console.log(\`Created page "\${page.title}" with ID \${pageResponse.data.id}\`);
  }
  
  // 3. Create questions for page 1 (Contact Information)
  const contactQuestions = [
    {
      questionText: "First Name",
      questionKey: "first_name",
      questionType: "text",
      isRequired: true,
      helpText: "Your first name",
      order: 1
    },
    {
      questionText: "Last Name",
      questionKey: "last_name",
      questionType: "text",
      isRequired: true,
      helpText: "Your last name",
      order: 2
    },
    {
      questionText: "Email Address",
      questionKey: "email",
      questionType: "email",
      isRequired: true,
      helpText: "Your email address",
      order: 3
    },
    {
      questionText: "Phone Number",
      questionKey: "phone",
      questionType: "text",
      isRequired: true,
      helpText: "Your phone number",
      order: 4
    }
  ];
  
  for (const question of contactQuestions) {
    await axios.post(
      \`http://localhost:5000/api/admin/questionnaires/pages/\${pageIds[0]}/questions\`,
      question,
      {
        headers: { Authorization: \`Bearer \${token}\` }
      }
    );
    console.log(\`Created question "\${question.questionText}"\`);
  }
  
  // 4. Create questions for page 2 (Event Details)
  const eventTypeQuestion = {
    questionText: "What type of event are you planning?",
    questionKey: "event_type",
    questionType: "select",
    isRequired: true,
    helpText: "Select the type of event",
    order: 1,
    options: [
      { value: "wedding", label: "Wedding", order: 1 },
      { value: "corporate", label: "Corporate Event", order: 2 },
      { value: "birthday", label: "Birthday Party", order: 3 },
      { value: "other", label: "Other", order: 4 }
    ]
  };
  
  const eventTypeResponse = await axios.post(
    \`http://localhost:5000/api/admin/questionnaires/pages/\${pageIds[1]}/questions\`,
    eventTypeQuestion,
    {
      headers: { Authorization: \`Bearer \${token}\` }
    }
  );
  
  const eventTypeQuestionId = eventTypeResponse.data.id;
  console.log(\`Created question "Event Type" with ID \${eventTypeQuestionId}\`);
  
  // Add more questions and conditional logic as needed...
  
  console.log('Questionnaire creation completed successfully!');
}

createQuestionnaire().catch(error => {
  console.error('Error creating questionnaire:', error.response?.data || error.message);
});`}
                      </pre>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Bulk Processing Tips</h3>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-2">
                        <li>
                          <strong>Use Transactions</strong>: When creating complex questionnaires, consider wrapping your operations in transactions to ensure data consistency.
                        </li>
                        <li>
                          <strong>Error Handling</strong>: Implement proper error handling to identify and fix issues during bulk creation.
                        </li>
                        <li>
                          <strong>Data Validation</strong>: Perform validation checks on your data before sending it to the API.
                        </li>
                        <li>
                          <strong>Rate Limiting</strong>: Be aware of rate limits on the API to avoid overwhelming the server.
                        </li>
                      </ul>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting Guide</CardTitle>
                <CardDescription>
                  Common issues and solutions when working with the questionnaire system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-lg font-medium">Common Issues</h3>
                      
                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Questionnaire Not Displaying</h4>
                        <p className="text-sm mt-2">If the questionnaire is not displaying on the public page:</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          <li>Check if any questionnaire is set to active (only one can be active at a time)</li>
                          <li>Verify that the active questionnaire has at least one page and question</li>
                          <li>Check the browser console for JavaScript errors</li>
                        </ul>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Conditional Logic Not Working</h4>
                        <p className="text-sm mt-2">If conditional logic rules are not working properly:</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          <li>Confirm that trigger and target questions exist in the questionnaire</li>
                          <li>Check for conflicting rules that might cancel each other out</li>
                          <li>Verify the syntax of trigger conditions and values</li>
                        </ul>
                      </div>

                      <div className="mt-4 border rounded-md p-4">
                        <h4 className="font-medium">Submission Failures</h4>
                        <p className="text-sm mt-2">If submissions are failing:</p>
                        <ul className="mt-2 list-disc pl-5 text-sm">
                          <li>Check that all required fields have values</li>
                          <li>Verify the format of email addresses and other validated fields</li>
                          <li>Ensure the contact information section is complete</li>
                          <li>Check for server-side validation errors in the response</li>
                        </ul>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">API Error Messages</h3>
                      
                      <div className="mt-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Error Code</th>
                              <th className="text-left py-2">Description</th>
                              <th className="text-left py-2">Solution</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="py-2">400</td>
                              <td className="py-2">Validation error</td>
                              <td className="py-2">Check the request body against the API documentation</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">401</td>
                              <td className="py-2">Unauthorized</td>
                              <td className="py-2">Ensure you're logged in and have a valid token</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">403</td>
                              <td className="py-2">Forbidden</td>
                              <td className="py-2">Check that your user account has admin privileges</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">404</td>
                              <td className="py-2">Resource not found</td>
                              <td className="py-2">Verify the ID of the resource you're trying to access</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">409</td>
                              <td className="py-2">Conflict</td>
                              <td className="py-2">Check for duplicate keys or conflicting operations</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">500</td>
                              <td className="py-2">Server error</td>
                              <td className="py-2">Contact system administrator with the error details</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <Separator className="my-4" />

                    <section>
                      <h3 className="text-lg font-medium">Getting Help</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        If you're experiencing issues not covered in this guide:
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-sm">
                        <li>Check the server logs for detailed error messages</li>
                        <li>Review the API documentation for correct request formats</li>
                        <li>Test API endpoints directly using a tool like Postman</li>
                        <li>Contact the development team with detailed information about the issue</li>
                      </ul>
                    </section>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}