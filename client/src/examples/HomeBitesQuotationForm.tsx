import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlockWithCopy from "@/components/ui/code-block";

const HomeBitesQuotationForm: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string>("form-definition");

  // Form Definition API Call
  const formDefinitionJson = `{
  "action": "createDefinition",
  "data": {
    "title": "Home Bites - 2025 Quotation Form",
    "description": "Get a customized quote for your catering needs from Home Bites",
    "status": "draft",
    "version": "1.0",
    "versionName": "home-bites-quotation-2025"
  }
}`;

  // Page 1: Initial Information
  const page1Json = `{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Initial Information",
    "description": "Tell us about your event",
    "order": 1
  }
}`;

  // Add Header Question to Page 1
  const page1HeaderJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "Client- Quotation Form",
        "questionKey": "header",
        "questionType": "info_text",
        "order": 1,
        "isRequired": false,
        "helpText": "At Home Bites, we understand that every occasion is unique. That's why we've designed our \\"Themed Menus\\" to provide a variety of options to suit all your different needs. We also offer an exciting food truck option for smaller parties with a menu that has something for everyone. Our food is simple, approachable, affordable, and most importantly, prepared with love and care. So go ahead and choose the menu that best suits your event. We'll get back to you soon with a cost estimate. Thank you for considering Home Bites!"
      }
    ]
  }
}`;

  // Add Event Type Question to Page 1
  const page1EventTypeJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 1,
    "questions": [
      {
        "questionText": "Event Type?",
        "questionKey": "eventType",
        "questionType": "radio",
        "order": 2,
        "isRequired": true
      }
    ]
  }
}`;

  // Add Options to Event Type Question
  const eventTypeOptionsJson = `{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 2,
    "options": [
      {
        "optionText": "Corporate event",
        "optionValue": "corporate_event",
        "order": 1
      },
      {
        "optionText": "Engagement",
        "optionValue": "engagement",
        "order": 2
      },
      {
        "optionText": "Wedding",
        "optionValue": "wedding",
        "order": 3
      },
      {
        "optionText": "Birthday",
        "optionValue": "birthday",
        "order": 4
      },
      {
        "optionText": "Other Private Party",
        "optionValue": "other_private",
        "order": 5
      },
      {
        "optionText": "Food Truck",
        "optionValue": "food_truck",
        "order": 6
      }
    ]
  }
}`;

  // Page 2: Contact and Event Details
  const page2Json = `{
  "action": "addPage",
  "data": {
    "definitionId": 1,
    "title": "Contact and Event Details",
    "description": "Tell us about yourself and your event details",
    "order": 2
  }
}`;

  // Add Company Name Question to Page 2
  const page2CompanyNameJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Company Name",
        "questionKey": "companyName",
        "questionType": "text",
        "order": 1,
        "isRequired": false,
        "placeholderText": "Enter your company name"
      }
    ]
  }
}`;

  // Add Billing Address Question to Page 2
  const page2BillingAddressJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Billing Address",
        "questionKey": "billingAddress",
        "questionType": "address",
        "order": 2,
        "isRequired": true,
        "helpText": "Enter your billing address"
      }
    ]
  }
}`;

  // Add Name Question to Page 2
  const page2NameJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Name",
        "questionKey": "fullName",
        "questionType": "name",
        "order": 3,
        "isRequired": true
      }
    ]
  }
}`;

  // Add Email Question to Page 2
  const page2EmailJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Email",
        "questionKey": "email",
        "questionType": "email",
        "order": 4,
        "isRequired": true,
        "placeholderText": "example@example.com"
      }
    ]
  }
}`;

  // Add Phone Number Question to Page 2
  const page2PhoneJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Phone Number",
        "questionKey": "phone",
        "questionType": "phone",
        "order": 5,
        "isRequired": true,
        "placeholderText": "(###) ###-####"
      }
    ]
  }
}`;

  // Add Event Date Question to Page 2
  const page2EventDateJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "What is the date of your event",
        "questionKey": "eventDate",
        "questionType": "date",
        "order": 6,
        "isRequired": true
      }
    ]
  }
}`;

  // Add Promo Code Question to Page 2
  const page2PromoCodeRadioJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Do you have a Discount Promo Code",
        "questionKey": "hasPromoCode",
        "questionType": "radio",
        "order": 7,
        "isRequired": true
      }
    ]
  }
}`;

  // Add Options to Promo Code Radio
  const promoCodeOptionsJson = `{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 9,
    "options": [
      {
        "optionText": "YES",
        "optionValue": "yes",
        "order": 1
      },
      {
        "optionText": "NO",
        "optionValue": "no",
        "order": 2
      }
    ]
  }
}`;

  // Add Promo Code Input to Page 2
  const page2PromoCodeInputJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Enter code here",
        "questionKey": "promoCode",
        "questionType": "text",
        "order": 8,
        "isRequired": false,
        "placeholderText": "Enter your promo code"
      }
    ]
  }
}`;

  // Add Venue Secured Question to Page 2
  const page2VenueSecuredJson = `{
  "action": "addQuestions",
  "data": {
    "pageId": 2,
    "questions": [
      {
        "questionText": "Have you secured a venue?",
        "questionKey": "venueSecured",
        "questionType": "radio",
        "order": 9,
        "isRequired": true
      }
    ]
  }
}`;

  // Add Options to Venue Secured
  const venueSecuredOptionsJson = `{
  "action": "addQuestionOptions",
  "data": {
    "questionId": 11,
    "options": [
      {
        "optionText": "YES",
        "optionValue": "yes",
        "order": 1
      },
      {
        "optionText": "NO",
        "optionValue": "no",
        "order": 2
      }
    ]
  }
}`;

  // Add Conditional Logic for Wedding Event Type
  const weddingConditionalLogicJson = `{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "eventType",
    "triggerCondition": "equals",
    "triggerValue": "wedding",
    "targetType": "question",
    "targetKey": "ceremonyStartTime",
    "action": "show"
  }
}`;

  // Add Conditional Logic for Corporate Event Type (Company Name)
  const corporateEventConditionalLogicJson = `{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "eventType",
    "triggerCondition": "equals",
    "triggerValue": "corporate_event",
    "targetType": "question",
    "targetKey": "companyName",
    "action": "show"
  }
}`;

  // Add Conditional Logic for Promo Code Input
  const promoCodeConditionalLogicJson = `{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "hasPromoCode",
    "triggerCondition": "equals",
    "triggerValue": "yes",
    "targetType": "question",
    "targetKey": "promoCode",
    "action": "show"
  }
}`;

  // Add Conditional Logic for Venue Name
  const venueNameConditionalLogicJson = `{
  "action": "addConditionalLogic",
  "data": {
    "definitionId": 1,
    "triggerQuestionKey": "venueSecured",
    "triggerCondition": "equals",
    "triggerValue": "yes",
    "targetType": "question",
    "targetKey": "venueName",
    "action": "show"
  }
}`;

  // Example of Using the Full API to Build the Form
  const fullApiExample = `// Step 1: Create the form definition
const formDefinitionResponse = await fetch('/api/questionnaires/builder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "action": "createDefinition",
    "data": {
      "title": "Home Bites - 2025 Quotation Form",
      "description": "Get a customized quote for your catering needs from Home Bites",
      "status": "draft",
      "version": "1.0",
      "versionName": "home-bites-quotation-2025"
    }
  })
});

const formDefinition = await formDefinitionResponse.json();
const definitionId = formDefinition.data.id;

// Step 2: Add the first page
const page1Response = await fetch('/api/questionnaires/builder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "action": "addPage",
    "data": {
      "definitionId": definitionId,
      "title": "Initial Information",
      "description": "Tell us about your event",
      "order": 1
    }
  })
});

const page1 = await page1Response.json();
const page1Id = page1.data.id;

// Step 3: Add header question to page 1
await fetch('/api/questionnaires/builder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "action": "addQuestions",
    "data": {
      "pageId": page1Id,
      "questions": [
        {
          "questionText": "Client- Quotation Form",
          "questionKey": "header",
          "questionType": "info_text",
          "order": 1,
          "isRequired": false,
          "helpText": "At Home Bites, we understand that every occasion is unique. That's why we've designed our \\"Themed Menus\\" to provide a variety of options to suit all your different needs. We also offer an exciting food truck option for smaller parties with a menu that has something for everyone. Our food is simple, approachable, affordable, and most importantly, prepared with love and care. So go ahead and choose the menu that best suits your event. We'll get back to you soon with a cost estimate. Thank you for considering Home Bites!"
        }
      ]
    }
  })
});

// Step 4: Add event type question to page 1
const eventTypeResponse = await fetch('/api/questionnaires/builder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "action": "addQuestions",
    "data": {
      "pageId": page1Id,
      "questions": [
        {
          "questionText": "Event Type?",
          "questionKey": "eventType",
          "questionType": "radio",
          "order": 2,
          "isRequired": true
        }
      ]
    }
  })
});

const eventTypeQuestion = await eventTypeResponse.json();
const eventTypeQuestionId = eventTypeQuestion.data[0].id;

// Step 5: Add options to event type question
await fetch('/api/questionnaires/builder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "action": "addQuestionOptions",
    "data": {
      "questionId": eventTypeQuestionId,
      "options": [
        {
          "optionText": "Corporate event",
          "optionValue": "corporate_event",
          "order": 1
        },
        {
          "optionText": "Engagement",
          "optionValue": "engagement",
          "order": 2
        },
        {
          "optionText": "Wedding",
          "optionValue": "wedding",
          "order": 3
        },
        {
          "optionText": "Birthday",
          "optionValue": "birthday",
          "order": 4
        },
        {
          "optionText": "Other Private Party",
          "optionValue": "other_private",
          "order": 5
        },
        {
          "optionText": "Food Truck",
          "optionValue": "food_truck",
          "order": 6
        }
      ]
    }
  })
});

// Continue with creating all the other pages, questions, options, and conditional logic
// ...`;

  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>Home Bites Quotation Form Implementation</title>
        <meta name="description" content="Example implementation of Home Bites 2025 Quotation Form using the Unified Form Builder API" />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Home Bites Quotation Form Implementation</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Form Implementation with Unified API</CardTitle>
            <CardDescription>
              This example demonstrates how to implement the complex Home Bites catering quotation form using our unified form builder API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The Home Bites quotation form is a complex multi-page form with conditional logic that helps customers get quotes for catering services. We'll show how to implement this using our unified form builder API that consolidates all form building operations into a single endpoint.
            </p>
            
            <h3 className="text-lg font-medium mb-2">Implementation Steps</h3>
            <ol className="list-decimal list-inside mb-4 space-y-1 pl-4">
              <li>Create the form definition</li>
              <li>Add pages for each section</li>
              <li>Add questions to each page</li>
              <li>Add options to choice-based questions</li>
              <li>Configure conditional logic</li>
            </ol>
          </CardContent>
        </Card>

        <Tabs defaultValue="form-definition" className="mb-8" value={activeStep} onValueChange={setActiveStep}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-4">
            <TabsTrigger value="form-definition">Form Definition</TabsTrigger>
            <TabsTrigger value="page1">Page 1: Initial Info</TabsTrigger>
            <TabsTrigger value="page2">Page 2: Contact Details</TabsTrigger>
            <TabsTrigger value="options">Question Options</TabsTrigger>
            <TabsTrigger value="conditional-logic">Conditional Logic</TabsTrigger>
            <TabsTrigger value="full-example">Full Example</TabsTrigger>
          </TabsList>
          
          <TabsContent value="form-definition" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Create Form Definition</CardTitle>
                <CardDescription>
                  First, create the form definition to act as a container for all pages and questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlockWithCopy value={formDefinitionJson} />
                
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Key Points</h4>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Use the <code className="bg-slate-100 px-1 py-0.5 rounded">createDefinition</code> action</li>
                    <li>The <code className="bg-slate-100 px-1 py-0.5 rounded">versionName</code> field is required</li>
                    <li>Set <code className="bg-slate-100 px-1 py-0.5 rounded">status</code> to "draft" during development</li>
                  </ul>
                  
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setActiveStep("page1")}>
                      Next Step: Add Page 1
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="page1" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Create Page 1 (Initial Information)</CardTitle>
                <CardDescription>
                  Add the first page to collect initial information about the event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-md font-medium mb-2">Create Page 1</h4>
                <CodeBlockWithCopy value={page1Json} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Header/Intro Text</h4>
                <CodeBlockWithCopy value={page1HeaderJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Event Type Question</h4>
                <CodeBlockWithCopy value={page1EventTypeJson} className="mb-4" />
                
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setActiveStep("form-definition")}>
                    Previous: Form Definition
                  </Button>
                  <Button variant="outline" onClick={() => setActiveStep("page2")}>
                    Next: Page 2
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="page2" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Create Page 2 (Contact and Event Details)</CardTitle>
                <CardDescription>
                  Add the second page to collect contact information and event details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-md font-medium mb-2">Create Page 2</h4>
                <CodeBlockWithCopy value={page2Json} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Company Name Question</h4>
                <CodeBlockWithCopy value={page2CompanyNameJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Billing Address Question</h4>
                <CodeBlockWithCopy value={page2BillingAddressJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Name Question</h4>
                <CodeBlockWithCopy value={page2NameJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Email Question</h4>
                <CodeBlockWithCopy value={page2EmailJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Phone Question</h4>
                <CodeBlockWithCopy value={page2PhoneJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Event Date Question</h4>
                <CodeBlockWithCopy value={page2EventDateJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Promo Code Question</h4>
                <CodeBlockWithCopy value={page2PromoCodeRadioJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Promo Code Input</h4>
                <CodeBlockWithCopy value={page2PromoCodeInputJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Add Venue Question</h4>
                <CodeBlockWithCopy value={page2VenueSecuredJson} className="mb-4" />
                
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setActiveStep("page1")}>
                    Previous: Page 1
                  </Button>
                  <Button variant="outline" onClick={() => setActiveStep("options")}>
                    Next: Question Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="options" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Add Options to Questions</CardTitle>
                <CardDescription>
                  Add options to all radio, checkbox, and select questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-md font-medium mb-2">Event Type Options</h4>
                <CodeBlockWithCopy value={eventTypeOptionsJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Promo Code Options</h4>
                <CodeBlockWithCopy value={promoCodeOptionsJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Venue Secured Options</h4>
                <CodeBlockWithCopy value={venueSecuredOptionsJson} className="mb-4" />
                
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setActiveStep("page2")}>
                    Previous: Page 2
                  </Button>
                  <Button variant="outline" onClick={() => setActiveStep("conditional-logic")}>
                    Next: Conditional Logic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="conditional-logic" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Step 5: Add Conditional Logic</CardTitle>
                <CardDescription>
                  Set up conditional display rules for questions based on previous answers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-md font-medium mb-2">Wedding Event Type Logic</h4>
                <CodeBlockWithCopy value={weddingConditionalLogicJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Corporate Event Type Logic</h4>
                <CodeBlockWithCopy value={corporateEventConditionalLogicJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Promo Code Logic</h4>
                <CodeBlockWithCopy value={promoCodeConditionalLogicJson} className="mb-4" />
                
                <h4 className="text-md font-medium mb-2">Venue Details Logic</h4>
                <CodeBlockWithCopy value={venueNameConditionalLogicJson} className="mb-4" />
                
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setActiveStep("options")}>
                    Previous: Question Options
                  </Button>
                  <Button variant="outline" onClick={() => setActiveStep("full-example")}>
                    Next: Full Example
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="full-example" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Full Implementation Example</CardTitle>
                <CardDescription>
                  A complete code example showing how to create the form programmatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlockWithCopy value={fullApiExample} />
                
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <h4 className="text-md font-medium mb-2">Important Notes</h4>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>The actual implementation would include all pages, questions, and logic from the PDF specification</li>
                    <li>This example only covers the first two pages of a multi-page form</li>
                    <li>In a real implementation, you would need to save the IDs returned from each API call to reference in subsequent calls</li>
                    <li>Error handling and validation would be needed for a production system</li>
                  </ul>
                </div>
                
                <div className="mt-4 flex justify-start">
                  <Button variant="outline" onClick={() => setActiveStep("conditional-logic")}>
                    Previous: Conditional Logic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>The Home Bites form is particularly complex with 20+ pages and extensive conditional logic</li>
              <li>Our unified API simplifies implementation by providing a consistent endpoint for all form building operations</li>
              <li>For very large forms like this, consider building the form in sections or phases</li>
              <li>Use the <code className="bg-slate-100 px-1 py-0.5 rounded">getFullQuestionnaire</code> action periodically to verify the form structure</li>
              <li>Carefully test all conditional logic paths to ensure questions show/hide correctly based on responses</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>See the <a href="/form-builder-docs" className="text-blue-600 hover:text-blue-800">Form Builder Documentation</a> for complete API reference</li>
              <li>Use the <a href="/form-builder-tester" className="text-blue-600 hover:text-blue-800">Form Builder Tester</a> to experiment with API calls</li>
              <li>For questions or support, contact your implementation team</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomeBitesQuotationForm;