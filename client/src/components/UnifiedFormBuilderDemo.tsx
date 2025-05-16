import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const UnifiedFormBuilderDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [requestBody, setRequestBody] = useState('');
  const [responseData, setResponseData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Template examples for different actions
  const templates = {
    'create-definition': JSON.stringify({
      action: 'createDefinition',
      data: {
        title: 'Catering Inquiry Form',
        description: 'A form to collect information about catering inquiries',
        status: 'draft',
        version: '1.0',
        versionName: 'catering-inquiry-v1'
      }
    }, null, 2),
    'add-page': JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1, // Replace with actual definition ID
        title: 'Customer Information',
        description: 'Please provide your contact information',
        order: 1
      }
    }, null, 2),
    'add-questions': JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 1, // Replace with actual page ID
        questions: [
          {
            questionText: 'What is your name?',
            questionKey: 'customer_name',
            questionType: 'text',
            isRequired: true,
            order: 1,
            helpText: 'Please enter your full name'
          },
          {
            questionText: 'Email Address',
            questionKey: 'email',
            questionType: 'email',
            isRequired: true,
            order: 2,
            helpText: 'We will use this to contact you'
          }
        ]
      }
    }, null, 2),
    'update-page': JSON.stringify({
      action: 'updatePage',
      data: {
        pageId: 1, // Replace with actual page ID
        title: 'Contact Information',
        description: 'Updated description for contact information page'
      }
    }, null, 2),
    'update-question': JSON.stringify({
      action: 'updateQuestion',
      data: {
        questionId: 1, // Replace with actual question ID
        questionText: 'Updated question text',
        isRequired: false,
        helpText: 'Updated help text'
      }
    }, null, 2),
    'delete-page': JSON.stringify({
      action: 'deletePage',
      data: {
        pageId: 1 // Replace with actual page ID
      }
    }, null, 2),
    'delete-question': JSON.stringify({
      action: 'deleteQuestion',
      data: {
        questionId: 1 // Replace with actual question ID
      }
    }, null, 2),
    'add-conditional-logic': JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 1, // Replace with actual definition ID
        sourceQuestionId: 1, // Question ID that triggers the condition
        targetQuestionId: 2, // Question ID to show/hide based on condition
        condition: 'equals',
        value: 'Yes',
        action: 'show'
      }
    }, null, 2),
    'update-conditional-logic': JSON.stringify({
      action: 'updateConditionalLogic',
      data: {
        ruleId: 1, // Replace with actual rule ID
        condition: 'not_equals',
        value: 'No',
        action: 'hide'
      }
    }, null, 2),
    'delete-conditional-logic': JSON.stringify({
      action: 'deleteConditionalLogic',
      data: {
        ruleId: 1 // Replace with actual rule ID
      }
    }, null, 2),
    'get-full-questionnaire': JSON.stringify({
      action: 'getFullQuestionnaire',
      data: {
        definitionId: 1 // Replace with actual definition ID
      }
    }, null, 2),
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const selectActionTemplate = (action: string) => {
    setRequestBody(templates[action as keyof typeof templates] || '');
  };

  const handleSendRequest = async () => {
    try {
      setIsLoading(true);
      
      if (!requestBody.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Request body cannot be empty",
        });
        setIsLoading(false);
        return;
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Please check your JSON format",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/questionnaires/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const responseJson = await response.json();
      setResponseData(JSON.stringify(responseJson, null, 2));

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "API Error",
          description: responseJson.message || "Something went wrong",
        });
      } else {
        toast({
          title: "Success",
          description: "Request processed successfully",
        });
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Unable to send request to the server",
      });
      setResponseData(JSON.stringify({ error: "Failed to send request" }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Home Bites 2025 Quotation Form full implementation
  const homeBitesForm = {
    // Form Definition (simplified for this example)
    definition: JSON.stringify({
      action: 'createDefinition',
      data: {
        title: 'Home Bites 2025 Quotation Form',
        description: 'Complete catering quotation form for Home Bites Catering Services',
        status: 'draft',
        version: '1.0',
        versionName: 'home-bites-quotation-2025'
      }
    }, null, 2),

    // Page 1
    page1: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1, 
        title: 'Event Information',
        description: 'Tell us about your event',
        order: 1
      }
    }, null, 2),
    
    // More examples abbreviated for space
  };

  const handleExampleSelect = (exampleKey: string) => {
    setSelectedExample(exampleKey);
    setRequestBody(homeBitesForm[exampleKey as keyof typeof homeBitesForm]);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder">API Builder</TabsTrigger>
          <TabsTrigger value="home-bites">Home Bites 2025 Form</TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Unified Form Builder API</CardTitle>
              <CardDescription>
                Use this tool to test the unified form builder API with different actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-base font-medium mb-2">Select Action:</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
                  {Object.keys(templates).map((action) => (
                    <Button 
                      key={action}
                      variant={requestBody === templates[action as keyof typeof templates] ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectActionTemplate(action)}
                    >
                      {action.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Request</h3>
                  <Textarea 
                    placeholder="Enter JSON request body"
                    className="font-mono h-[400px]"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Response</h3>
                  <div className="bg-slate-100 rounded-md p-4 font-mono h-[400px] overflow-auto">
                    <pre className="whitespace-pre-wrap">{responseData || 'Response will appear here'}</pre>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleSendRequest} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="home-bites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Home Bites 2025 Quotation Form Builder</CardTitle>
              <CardDescription>
                Test building the complete Home Bites 2025 Quotation Form step by step
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Select Example Step:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {Object.keys(homeBitesForm).map((exampleKey) => (
                    <Button 
                      key={exampleKey}
                      variant={selectedExample === exampleKey ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleExampleSelect(exampleKey)}
                    >
                      {exampleKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Request</h3>
                  <Textarea 
                    placeholder="Select an example step above"
                    className="font-mono h-[400px]"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Response</h3>
                  <div className="bg-slate-100 rounded-md p-4 font-mono h-[400px] overflow-auto">
                    <pre className="whitespace-pre-wrap">{responseData || 'Response will appear here'}</pre>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleSendRequest} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedFormBuilderDemo;