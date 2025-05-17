import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, DownloadIcon, RefreshCw } from 'lucide-react';
import ConditionVisualizer from '@/components/visualizer/ConditionVisualizer';

const ConditionVisualizerPage: React.FC = () => {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('visualizer');

  // Fetch questionnaire definitions
  const { data: definitions, isLoading: isLoadingDefinitions } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions'],
    select: (data) => data || []
  });

  // Fetch pages for the selected definition
  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinitionId, 'pages'],
    enabled: !!selectedDefinitionId,
    select: (data) => data || []
  });

  // Fetch conditional logic for the selected definition
  const { data: conditionalLogic, isLoading: isLoadingLogic } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinitionId, 'conditional-logic'],
    enabled: !!selectedDefinitionId,
    select: (data) => data || []
  });

  // Fetch all questions for the selected definition
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Load questions for all pages
  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedDefinitionId || !pages || pages.length === 0) return;

      setIsLoadingQuestions(true);
      try {
        const allQuestions: any[] = [];
        
        // For each page, fetch its questions
        for (const page of pages) {
          const response = await fetch(`/api/admin/questionnaires/pages/${page.id}/questions`);
          if (response.ok) {
            const pageQuestions = await response.json();
            if (Array.isArray(pageQuestions)) {
              allQuestions.push(...pageQuestions);
            }
          }
        }
        
        setQuestions(allQuestions);
      } catch (error) {
        console.error("Error loading questions:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load questions for visualization."
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [selectedDefinitionId, pages]);

  // Handle node selection
  const handleNodeSelect = (nodeData: any) => {
    setSelectedNodeData(nodeData);
    setActiveTab('details');
  };

  // Export visualization data as JSON
  const handleExportData = () => {
    if (!selectedDefinitionId) return;
    
    const exportData = {
      definition: definitions?.find(d => d.id === selectedDefinitionId),
      pages,
      questions,
      conditionalLogic
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `questionnaire-${selectedDefinitionId}-visualization-data.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Render node details panel
  const renderNodeDetails = () => {
    if (!selectedNodeData) return <p>Select a node in the visualization to see details</p>;
    
    if (selectedNodeData.pageData) {
      const page = selectedNodeData.pageData;
      return (
        <div>
          <h3 className="text-lg font-bold">Page Details</h3>
          <div className="mt-4 space-y-2">
            <p><span className="font-medium">ID:</span> {page.id}</p>
            <p><span className="font-medium">Title:</span> {page.title}</p>
            <p><span className="font-medium">Order:</span> {page.order}</p>
          </div>
        </div>
      );
    }
    
    if (selectedNodeData.questionData) {
      const question = selectedNodeData.questionData;
      return (
        <div>
          <h3 className="text-lg font-bold">Question Details</h3>
          <div className="mt-4 space-y-2">
            <p><span className="font-medium">ID:</span> {question.id}</p>
            <p><span className="font-medium">Text:</span> {question.questionText}</p>
            <p><span className="font-medium">Key:</span> {question.questionKey}</p>
            <p><span className="font-medium">Type:</span> {question.questionType}</p>
            <p><span className="font-medium">Required:</span> {question.isRequired ? 'Yes' : 'No'}</p>
            <p><span className="font-medium">Page ID:</span> {question.pageId}</p>
          </div>
        </div>
      );
    }
    
    if (selectedNodeData.ruleData) {
      const rule = selectedNodeData.ruleData;
      return (
        <div>
          <h3 className="text-lg font-bold">Condition Rule Details</h3>
          <div className="mt-4 space-y-2">
            <p><span className="font-medium">ID:</span> {rule.id}</p>
            <p><span className="font-medium">Trigger Question:</span> {rule.triggerQuestionKey}</p>
            <p><span className="font-medium">Condition:</span> {rule.triggerCondition}</p>
            <p><span className="font-medium">Value:</span> {rule.triggerValue || 'Any value'}</p>
            <p><span className="font-medium">Action:</span> {rule.targetAction}</p>
            {rule.targetQuestionId && (
              <p><span className="font-medium">Target Question ID:</span> {rule.targetQuestionId}</p>
            )}
            {rule.targetPageId && (
              <p><span className="font-medium">Target Page ID:</span> {rule.targetPageId}</p>
            )}
          </div>
        </div>
      );
    }
    
    return <p>Unknown node type</p>;
  };

  const isLoading = isLoadingDefinitions || isLoadingPages || isLoadingQuestions || isLoadingLogic;
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Conditional Logic Visualizer</h1>
      
      <div className="grid grid-cols-4 gap-6 mb-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Select Questionnaire Definition</CardTitle>
            <CardDescription>Choose a questionnaire to visualize its conditional logic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {isLoadingDefinitions ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Loading definitions...</span>
                </div>
              ) : (
                definitions?.map((definition) => (
                  <Button
                    key={definition.id}
                    variant={selectedDefinitionId === definition.id ? "default" : "outline"}
                    onClick={() => setSelectedDefinitionId(definition.id)}
                    className="mb-2"
                  >
                    {definition.versionName} 
                    {definition.isActive && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {selectedDefinitionId && (
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Visualization</CardTitle>
                  <CardDescription>
                    Interactive graph showing questions, pages, and conditional logic relationships
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    disabled={isLoading}
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[700px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Loading visualization data...</span>
                  </div>
                ) : (
                  <ConditionVisualizer
                    questions={questions}
                    pages={pages || []}
                    conditionalLogic={conditionalLogic || []}
                    onNodeSelect={handleNodeSelect}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="visualizer" className="flex-1">Visualizer</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visualizer" className="border rounded-md p-4 mt-4">
                <h3 className="font-medium text-lg mb-2">Visualization Guide</h3>
                <div className="space-y-2 text-sm">
                  <p>• <span className="font-medium">Blue nodes</span> represent questions</p>
                  <p>• <span className="font-medium">Teal nodes</span> represent pages</p>
                  <p>• <span className="font-medium">Green edges</span> represent "show" conditions</p>
                  <p>• <span className="font-medium">Red edges</span> represent "hide" conditions</p>
                  <p>• <span className="font-medium">Orange edges</span> represent "skip to" conditions</p>
                  <p className="pt-4">Click on any node or edge to see its details in the Details tab.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="border rounded-md p-4 mt-4 min-h-[300px]">
                {renderNodeDetails()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionVisualizerPage;