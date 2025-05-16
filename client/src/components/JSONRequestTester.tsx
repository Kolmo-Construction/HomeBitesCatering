import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

const JSONRequestTester = () => {
  const { toast } = useToast();
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("POST");
  const [endpoint, setEndpoint] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const handleSubmit = async () => {
    if (!endpoint) {
      toast({
        title: "Error",
        description: "Please provide an API endpoint",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      let parsedBody = null;
      
      // Parse JSON for non-GET requests
      if (method !== "GET" && requestBody.trim()) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "The request body is not valid JSON",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      const apiRes = await apiRequest(
        method, 
        endpoint, 
        method !== "GET" ? parsedBody : undefined
      );

      const data = await apiRes.json();
      setResponse(JSON.stringify(data, null, 2));
      
      toast({
        title: "Request Successful",
        description: `${method} request to ${endpoint} completed successfully`
      });
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message || "Unknown error occurred" }, null, 2));
      toast({
        title: "Request Failed",
        description: error.message || "Failed to execute request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (value: string) => {
    setMethod(value as "GET" | "POST" | "PUT" | "DELETE");
  };

  const handleRequestBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequestBody(e.target.value);
  };

  const handleEndpointChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEndpoint(e.target.value);
  };

  const requestExamples = {
    "Create Questionnaire Definition": {
      method: "POST",
      endpoint: "/api/admin/questionnaires/definitions",
      body: {
        title: "Customer Satisfaction Survey",
        description: "A survey to gather feedback about our catering services",
        versionName: "v1"
      }
    },
    "Create Page with Questions": {
      method: "POST",
      endpoint: "/api/admin/questionnaires/pages/{pageId}/questions",
      body: [
        {
          "questionText": "How would you rate our food quality?",
          "questionKey": "food_quality",
          "questionType": "radio",
          "isRequired": true,
          "order": 1,
          "helpText": "Please rate based on taste, presentation, and freshness",
          "options": [
            { "optionText": "Excellent", "optionValue": "excellent", "order": 1 },
            { "optionText": "Good", "optionValue": "good", "order": 2 },
            { "optionText": "Average", "optionValue": "average", "order": 3 },
            { "optionText": "Poor", "optionValue": "poor", "order": 4 }
          ]
        },
        {
          "questionText": "What did you enjoy most about our service?",
          "questionKey": "enjoy_most",
          "questionType": "text",
          "isRequired": false,
          "order": 2,
          "placeholderText": "Please share your thoughts..."
        }
      ]
    },
    "Create Complete Questionnaire": {
      method: "POST",
      endpoint: "/api/admin/questionnaires/complete",
      body: {
        "definition": {
          "title": "Event Planning Questionnaire",
          "description": "Help us understand your event needs",
          "versionName": "v1.0",
          "isActive": true
        },
        "pages": [
          {
            "title": "Basic Information",
            "description": "Let's start with the basics",
            "order": 1,
            "questions": [
              {
                "questionText": "What type of event are you planning?",
                "questionKey": "event_type",
                "questionType": "select",
                "isRequired": true,
                "order": 1,
                "options": [
                  { "optionText": "Wedding", "optionValue": "wedding", "order": 1 },
                  { "optionText": "Corporate Event", "optionValue": "corporate", "order": 2 },
                  { "optionText": "Birthday Party", "optionValue": "birthday", "order": 3 },
                  { "optionText": "Other", "optionValue": "other", "order": 4 }
                ]
              },
              {
                "questionText": "Approximately how many guests will attend?",
                "questionKey": "guest_count",
                "questionType": "number",
                "isRequired": true,
                "order": 2
              }
            ]
          },
          {
            "title": "Venue Information",
            "description": "Tell us about where you'd like to host your event",
            "order": 2,
            "questions": [
              {
                "questionText": "Do you have a venue already selected?",
                "questionKey": "has_venue",
                "questionType": "radio",
                "isRequired": true,
                "order": 1,
                "options": [
                  { "optionText": "Yes", "optionValue": "yes", "order": 1 },
                  { "optionText": "No", "optionValue": "no", "order": 2 }
                ]
              }
            ]
          }
        ],
        "conditionalLogic": [
          {
            "triggerQuestionKey": "has_venue",
            "triggerCondition": "equals",
            "triggerValue": "yes",
            "actionType": "show_question",
            "targetQuestionKey": "venue_name"
          },
          {
            "triggerQuestionKey": "has_venue",
            "triggerCondition": "equals", 
            "triggerValue": "no",
            "actionType": "skip_to_page",
            "targetPageIndex": 1
          }
        ]
      }
    },
    "Create Conditional Logic": {
      method: "POST",
      endpoint: "/api/admin/questionnaires/definitions/{definitionId}/conditional-logic",
      body: {
        triggerQuestionKey: "question_1",
        triggerCondition: "equals",
        triggerValue: "yes",
        actionType: "show_question",
        targetQuestionKey: "question_2"
      }
    },
    "Submit Questionnaire": {
      method: "POST",
      endpoint: "/api/questionnaires/submit",
      body: {
        definitionId: 1,
        submittedData: {
          question_1: "yes",
          question_2: "Very satisfied"
        }
      }
    },
    "AI Generate Questionnaire": {
      method: "POST",
      endpoint: "/api/admin/questionnaires/ai-generate",
      body: {
        title: "Corporate Event Planning Survey",
        description: "A questionnaire to gather requirements for a corporate event",
        additionalInstructions: "Include questions about dietary restrictions and AV needs"
      }
    }
  };

  const loadExample = (exampleKey: keyof typeof requestExamples) => {
    const example = requestExamples[exampleKey];
    setMethod(example.method as "GET" | "POST" | "PUT" | "DELETE");
    setEndpoint(example.endpoint);
    setRequestBody(example.body ? JSON.stringify(example.body, null, 2) : "");
  };
  
  // AI generation mutation
  const generateJsonMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest('POST', '/api/admin/questionnaires/ai-generate', {
        prompt: prompt,
        format: 'json',
        contextType: 'api_request'
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.json) {
        try {
          // Try to parse and set the generated JSON
          const parsedJson = JSON.parse(data.json);
          
          // If we have endpoint and method info, set those too
          if (data.endpoint) {
            setEndpoint(data.endpoint);
          }
          
          if (data.method) {
            setMethod(data.method as "GET" | "POST" | "PUT" | "DELETE");
          }
          
          // Set the request body
          setRequestBody(JSON.stringify(parsedJson, null, 2));
          
          toast({
            title: "AI Generation Complete",
            description: "Generated JSON has been added to the request body"
          });
        } catch (e) {
          // If parsing fails, just set it as text
          setRequestBody(data.json);
          
          toast({
            title: "JSON Generated",
            description: "The AI output has been added to the request body"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to generate valid JSON",
          variant: "destructive"
        });
      }
      
      setAiDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate JSON",
        variant: "destructive"
      });
    }
  });
  
  const handleAiPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAiPrompt(e.target.value);
  };
  
  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a prompt for the AI",
        variant: "destructive"
      });
      return;
    }
    
    generateJsonMutation.mutate(aiPrompt);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>JSON Request Tester</CardTitle>
        <CardDescription>
          Test API endpoints directly with JSON requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-none">
              <Tabs defaultValue="POST" className="w-[300px]" onValueChange={handleMethodChange}>
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="GET">GET</TabsTrigger>
                  <TabsTrigger value="POST">POST</TabsTrigger>
                  <TabsTrigger value="PUT">PUT</TabsTrigger>
                  <TabsTrigger value="DELETE">DELETE</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-grow">
              <Textarea 
                placeholder="API endpoint (e.g., /api/questionnaires/submit)" 
                className="min-h-[40px]"
                value={endpoint}
                onChange={handleEndpointChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-medium mb-2">Request Body (JSON)</h3>
              <Textarea 
                placeholder="Enter JSON request body..." 
                className="min-h-[300px] font-mono"
                value={requestBody}
                onChange={handleRequestBodyChange}
              />
              <div className="mt-2 space-y-2">
                <h4 className="text-sm font-medium">Examples:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(requestExamples).map((example) => (
                    <Button 
                      key={example} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => loadExample(example as keyof typeof requestExamples)}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-md font-medium mb-2">Response</h3>
              <Textarea 
                readOnly 
                value={response} 
                className="min-h-[300px] font-mono bg-slate-50 dark:bg-slate-900"
                placeholder="Response will appear here..."
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="flex w-full gap-4">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Sending Request..." : "Send Request"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setAiDialogOpen(true)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            AI Assist
          </Button>
        </div>
      </CardFooter>
      
      {/* AI Assistant Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>AI Request Generator</DialogTitle>
            <DialogDescription>
              Describe what API request you want to create, and the AI will generate the JSON for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="E.g. Create a questionnaire definition with 3 pages and 5 questions on each page focusing on customer feedback about our catering service."
              value={aiPrompt}
              onChange={handleAiPromptChange}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAiGenerate} 
              className="gap-2"
              disabled={generateJsonMutation.isPending}
            >
              {generateJsonMutation.isPending ? (
                "Generating..."
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate JSON
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default JSONRequestTester;