import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const UnifiedFormBuilderDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('create-definition');
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
        version: '1.0'
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
    setRequestBody(templates[value as keyof typeof templates] || '');
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

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Unified Form Builder API</h2>
        <p className="text-muted-foreground mb-4">
          This demo shows how to use the new unified form builder API. Select a template below
          to see example request formats for different actions.
        </p>
        
        <Tabs defaultValue="create-definition" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            <TabsTrigger value="create-definition">Create Definition</TabsTrigger>
            <TabsTrigger value="add-page">Add Page</TabsTrigger>
            <TabsTrigger value="add-questions">Add Questions</TabsTrigger>
            <TabsTrigger value="update-page">Update Page</TabsTrigger>
            <TabsTrigger value="update-question">Update Question</TabsTrigger>
            <TabsTrigger value="delete-question">Delete Question</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="delete-page">Delete Page</TabsTrigger>
            <TabsTrigger value="add-conditional-logic">Add Logic</TabsTrigger>
            <TabsTrigger value="update-conditional-logic">Update Logic</TabsTrigger>
            <TabsTrigger value="delete-conditional-logic">Delete Logic</TabsTrigger>
            <TabsTrigger value="get-full-questionnaire">Get Questionnaire</TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Request</h3>
              <Textarea 
                placeholder="Enter JSON request body"
                className="font-mono h-[400px]"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
              />
              <Button 
                className="mt-4" 
                onClick={handleSendRequest}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Response</h3>
              <Textarea 
                placeholder="Response will appear here"
                className="font-mono h-[400px] bg-gray-50"
                value={responseData}
                readOnly
              />
            </div>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};

export default UnifiedFormBuilderDemo;