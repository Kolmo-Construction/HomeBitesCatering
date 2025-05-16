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
  const [nextIds, setNextIds] = useState<{
    definitionId: number | null;
    pageId: number | null;
    questionId: number | null;
  }>({
    definitionId: null,
    pageId: null,
    questionId: null
  });
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
    // Fetch next IDs when switching to the builder tab
    if (value === 'builder') {
      fetchNextAvailableIds();
    }
  };
  
  const selectActionTemplate = (action: string) => {
    setRequestBody(templates[action as keyof typeof templates] || '');
  };
  
  // Function to fetch the next available IDs
  const fetchNextAvailableIds = async () => {
    try {
      // Get definitions to determine next definition ID
      const definitionsResponse = await fetch('/api/admin/questionnaires/definitions');
      if (definitionsResponse.ok) {
        const definitions = await definitionsResponse.json();
        if (Array.isArray(definitions)) {
          // Calculate next definition ID (max existing ID + 1)
          const maxDefinitionId = definitions.length > 0 
            ? Math.max(...definitions.map((def: any) => def.id))
            : 0;
          setNextIds(prev => ({ ...prev, definitionId: maxDefinitionId + 1 }));
          
          // If there are definitions, get pages for the latest one to determine next page ID
          if (definitions.length > 0) {
            const latestDefinitionId = maxDefinitionId;
            const pagesResponse = await fetch(`/api/admin/questionnaires/definitions/${latestDefinitionId}/pages`);
            
            if (pagesResponse.ok) {
              const pages = await pagesResponse.json();
              if (Array.isArray(pages)) {
                // Calculate next page ID
                const maxPageId = pages.length > 0 
                  ? Math.max(...pages.map((page: any) => page.id))
                  : 0;
                setNextIds(prev => ({ ...prev, pageId: maxPageId + 1 }));
                
                // If there are pages, get questions for the latest one to determine next question ID
                if (pages.length > 0) {
                  const latestPageId = maxPageId;
                  const questionsResponse = await fetch(`/api/admin/questionnaires/pages/${latestPageId}/questions`);
                  
                  if (questionsResponse.ok) {
                    const questions = await questionsResponse.json();
                    if (Array.isArray(questions)) {
                      // Calculate next question ID
                      const maxQuestionId = questions.length > 0 
                        ? Math.max(...questions.map((question: any) => question.id))
                        : 0;
                      setNextIds(prev => ({ ...prev, questionId: maxQuestionId + 1 }));
                    }
                  }
                } else {
                  // No pages yet, so next question ID would be 1
                  setNextIds(prev => ({ ...prev, questionId: 1 }));
                }
              }
            }
          } else {
            // No definitions yet, so next page ID and question ID would be 1
            setNextIds(prev => ({ ...prev, pageId: 1, questionId: 1 }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching next available IDs:', error);
    }
  };

  // Fetch next IDs when component mounts
  React.useEffect(() => {
    fetchNextAvailableIds();
    
    // Also update IDs after successful API requests
    const updateIdsAfterRequest = () => {
      setTimeout(fetchNextAvailableIds, 1000); // Delay to ensure DB is updated
    };
    
    return () => {
      // Cleanup
    };
  }, []);

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
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium">Select Action:</h3>
                  <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md">
                    <span className="font-medium">Next Available IDs:</span>
                    <span className="ml-2">Definition: <strong>{nextIds.definitionId || '?'}</strong></span>
                    <span className="ml-2">Page: <strong>{nextIds.pageId || '?'}</strong></span>
                    <span className="ml-2">Question: <strong>{nextIds.questionId || '?'}</strong></span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 h-6 px-2" 
                      onClick={fetchNextAvailableIds}
                    >
                      ↻
                    </Button>
                  </div>
                </div>
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