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
  
  // Function to fetch the next available IDs - simplified approach
  const fetchNextAvailableIds = async () => {
    try {
      console.log("Fetching next available IDs...");
      
      // Just fetch definitions, which is the one endpoint we know exists
      const definitionsRes = await fetch('/api/admin/questionnaires/definitions');
      
      // Default values
      let nextDefinitionId = 1;
      let nextPageId = 1;
      let nextQuestionId = 1;
      
      // Process definitions
      if (definitionsRes.ok) {
        const definitions = await definitionsRes.json();
        console.log("Definitions:", definitions);
        
        if (Array.isArray(definitions) && definitions.length > 0) {
          // Get highest definition ID
          const ids = definitions.map((def: any) => def.id).filter(Boolean);
          if (ids.length > 0) {
            nextDefinitionId = Math.max(...ids) + 1;
          }
          
          // Try to get pages for all definitions to find highest page ID
          const pagePromises = definitions.map((def: any) => 
            fetch(`/api/admin/questionnaires/definitions/${def.id}/pages`)
              .then(res => res.json())
              .catch(() => [])
          );
          
          const allPagesResults = await Promise.all(pagePromises);
          const allPages = allPagesResults.flat();
          
          if (allPages.length > 0) {
            const pageIds = allPages.map((page: any) => page.id).filter(Boolean);
            if (pageIds.length > 0) {
              nextPageId = Math.max(...pageIds) + 1;
            }
            
            // Try to get questions for all pages to find highest question ID
            const questionPromises = allPages.map((page: any) => 
              fetch(`/api/admin/questionnaires/pages/${page.id}/questions`)
                .then(res => res.json())
                .catch(() => [])
            );
            
            const allQuestionsResults = await Promise.all(questionPromises);
            const allQuestions = allQuestionsResults.flat();
            
            if (allQuestions.length > 0) {
              const questionIds = allQuestions.map((q: any) => q.id).filter(Boolean);
              if (questionIds.length > 0) {
                nextQuestionId = Math.max(...questionIds) + 1;
              }
            }
          }
        }
      }
      
      // Update state with new values
      console.log("Setting next IDs:", { nextDefinitionId, nextPageId, nextQuestionId });
      setNextIds({
        definitionId: nextDefinitionId,
        pageId: nextPageId,
        questionId: nextQuestionId
      });
      
      // Also check the response data if available (for direct updates based on responses)
      if (responseData) {
        try {
          const response = JSON.parse(responseData);
          
          // Check for definition creation/update response
          if (response?.data?.id && 
              (response.action === 'createDefinition' || response.action === 'updateDefinition')) {
            setNextIds(prev => ({ ...prev, definitionId: response.data.id + 1 }));
          }
          
          // Check for page creation/update response
          if (response?.data?.id && 
              (response.action === 'addPage' || response.action === 'updatePage')) {
            setNextIds(prev => ({ ...prev, pageId: response.data.id + 1 }));
          }
          
          // Check for question creation/update response with single question
          if (response?.data?.id && 
              (response.action === 'addQuestion' || response.action === 'updateQuestion')) {
            setNextIds(prev => ({ ...prev, questionId: response.data.id + 1 }));
          }
          
          // Check for questions array in response
          if (response?.data?.questions && Array.isArray(response.data.questions)) {
            const questions = response.data.questions;
            const ids = questions.map((q: any) => q.id).filter(Boolean);
            if (ids.length > 0) {
              setNextIds(prev => ({ ...prev, questionId: Math.max(...ids) + 1 }));
            }
          }
        } catch (e) {
          // Response may not be valid JSON or doesn't contain ID information
          console.log("Could not parse response data for ID updates");
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
        
        // Update IDs after successful request
        setTimeout(() => {
          fetchNextAvailableIds();
        }, 500);
        
        // Check the response directly for IDs
        try {
          const parsedRequest = JSON.parse(requestBody);
          const action = parsedRequest.action;
          
          // Update appropriate ID based on action type
          if (action === 'createDefinition' && responseJson.data && responseJson.data.id) {
            const newDefId = responseJson.data.id + 1;
            setNextIds(prev => ({ ...prev, definitionId: newDefId }));
          } else if (action === 'addPage' && responseJson.data && responseJson.data.id) {
            const newPageId = responseJson.data.id + 1;
            setNextIds(prev => ({ ...prev, pageId: newPageId }));
          } else if ((action === 'addQuestions' || action === 'updateQuestion') && 
                    responseJson.data && responseJson.data.questions) {
            const questions = responseJson.data.questions;
            if (Array.isArray(questions) && questions.length > 0) {
              const ids = questions.map((q: any) => q.id).filter(Boolean);
              if (ids.length > 0) {
                const newQuestionId = Math.max(...ids) + 1;
                setNextIds(prev => ({ ...prev, questionId: newQuestionId }));
              }
            }
          }
        } catch (error) {
          console.error('Error parsing response for ID updates:', error);
        }
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
                  <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded-md flex items-center justify-between">
                    <div>
                      <span className="font-medium">Next Available IDs:</span>
                      <span className="ml-2 mr-1">Definition: <strong>{nextIds.definitionId || '?'}</strong></span>
                      <span className="mx-1">Page: <strong>{nextIds.pageId || '?'}</strong></span>
                      <span className="mx-1">Question: <strong>{nextIds.questionId || '?'}</strong></span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2 h-6 px-2 bg-white" 
                      onClick={fetchNextAvailableIds}
                    >
                      Refresh IDs
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