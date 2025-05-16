import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const EXAMPLE_REQUESTS = {
  createDefinition: {
    action: 'createDefinition',
    data: {
      versionName: 'Unified API Test v1.0',
      description: 'Testing the unified form builder API',
      isActive: true
    }
  },
  addPage: {
    action: 'addPage',
    data: {
      definitionId: 1, // Replace with actual ID after creating definition
      title: 'Basic Information',
      order: 1
    }
  },
  addQuestions: {
    action: 'addQuestions',
    data: {
      pageId: 1, // Replace with actual ID after creating page
      questions: [
        {
          questionText: 'What type of event are you planning?',
          questionKey: 'event_type',
          questionType: 'select',
          isRequired: true,
          order: 1,
          options: [
            { optionText: 'Wedding', optionValue: 'wedding', order: 1 },
            { optionText: 'Corporate', optionValue: 'corporate', order: 2 },
            { optionText: 'Birthday', optionValue: 'birthday', order: 3 },
            { optionText: 'Other', optionValue: 'other', order: 4 }
          ]
        },
        {
          questionText: 'Approximate number of guests?',
          questionKey: 'guest_count',
          questionType: 'number',
          isRequired: true,
          order: 2
        }
      ]
    }
  },
  getFullQuestionnaire: {
    action: 'getFullQuestionnaire',
    data: {
      definitionId: 1 // Replace with actual ID
    }
  }
};

const UnifiedFormBuilderDemo: React.FC = () => {
  const { toast } = useToast();
  const [requestBody, setRequestBody] = useState(JSON.stringify(EXAMPLE_REQUESTS.createDefinition, null, 2));
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponse('Sending request...');
    
    try {
      const requestData = JSON.parse(requestBody);
      const apiResponse = await apiRequest('POST', '/api/questionnaires/builder', requestData);
      const data = await apiResponse.json();
      
      setResponse(JSON.stringify(data, null, 2));
      
      toast({
        title: 'Request sent successfully',
        description: `Action: ${requestData.action}`,
        variant: 'default'
      });
    } catch (error) {
      setResponse(`Error: ${error.message}`);
      
      toast({
        title: 'Error sending request',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setExampleRequest = (example: keyof typeof EXAMPLE_REQUESTS) => {
    setRequestBody(JSON.stringify(EXAMPLE_REQUESTS[example], null, 2));
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Unified Form Builder API Tester</CardTitle>
          <CardDescription>
            Test the unified form builder API by sending different actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="createDefinition">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="createDefinition" onClick={() => setExampleRequest('createDefinition')}>
                Create Definition
              </TabsTrigger>
              <TabsTrigger value="addPage" onClick={() => setExampleRequest('addPage')}>
                Add Page
              </TabsTrigger>
              <TabsTrigger value="addQuestions" onClick={() => setExampleRequest('addQuestions')}>
                Add Questions
              </TabsTrigger>
              <TabsTrigger value="getFullQuestionnaire" onClick={() => setExampleRequest('getFullQuestionnaire')}>
                Get Questionnaire
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Request Body:</h3>
              <Textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="font-mono h-[400px] resize-none"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Response:</h3>
              <Textarea
                value={response}
                readOnly
                className="font-mono h-[400px] resize-none bg-muted"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSendRequest} disabled={isLoading}>
            Send Request
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UnifiedFormBuilderDemo;