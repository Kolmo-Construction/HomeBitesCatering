import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  ReactFlowInstance,
  useReactFlow,
  FitViewOptions
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize, RefreshCw } from 'lucide-react';

// Custom node types could be added here
// import QuestionNode from './QuestionNode';
// import PageNode from './PageNode';
// import ConditionNode from './ConditionNode';

interface ConditionVisualizerProps {
  questions: any[];
  pages: any[];
  conditionalLogic: any[];
  onNodeSelect?: (nodeData: any) => void;
}

const ConditionVisualizer: React.FC<ConditionVisualizerProps> = ({
  questions,
  pages,
  conditionalLogic,
  onNodeSelect
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const flowWrapper = useRef<HTMLDivElement>(null);
  const [selectedFilters, setSelectedFilters] = useState({
    showQuestions: true,
    showPages: true,
    showConditions: true
  });
  
  // Fit view options
  const fitViewOptions: FitViewOptions = {
    padding: 0.2,
    includeHiddenNodes: false,
    minZoom: 0.1,
    maxZoom: 1.5
  };

  // Function to apply automatic layout to nodes
  const applyAutoLayout = useCallback(() => {
    if (!nodes.length) return;
    
    // Group nodes by type
    const questionNodes = nodes.filter(node => node.id.startsWith('question-'));
    const pageNodes = nodes.filter(node => node.id.startsWith('page-'));
    
    // Layout constants
    const horizontalSpacing = 350;
    const verticalSpacing = 120;
    
    // Position page nodes in first column
    const updatedPageNodes = pageNodes.map((node, index) => ({
      ...node,
      position: { x: 50, y: index * verticalSpacing + 50 }
    }));
    
    // Build a map of page IDs to their vertical positions
    const pagePositions: Record<number, number> = {};
    pageNodes.forEach((node, index) => {
      const pageId = parseInt(node.id.replace('page-', ''));
      pagePositions[pageId] = index * verticalSpacing + 50;
    });
    
    // Group questions by page
    const questionsByPage: Record<string, Node[]> = {};
    questionNodes.forEach(node => {
      const pageId = node.data.questionData?.pageId?.toString() || 'unknown';
      if (!questionsByPage[pageId]) {
        questionsByPage[pageId] = [];
      }
      questionsByPage[pageId].push(node);
    });
    
    // Position questions based on their page grouping
    let questionY = 50;
    const updatedQuestionNodes: Node[] = [];
    
    Object.entries(questionsByPage).forEach(([pageId, groupNodes]) => {
      // Try to align with the page node if it exists
      if (pageId !== 'unknown' && pagePositions[parseInt(pageId)]) {
        questionY = pagePositions[parseInt(pageId)];
      }
      
      groupNodes.forEach((node) => {
        updatedQuestionNodes.push({
          ...node,
          position: { x: horizontalSpacing, y: questionY }
        });
        questionY += verticalSpacing / 2;
      });
      
      // Add extra spacing between page groups
      questionY += 30;
    });
    
    setNodes([...updatedPageNodes, ...updatedQuestionNodes]);
    
    // Fit the view to ensure everything is visible
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView(fitViewOptions);
      }, 100);
    }
  }, [nodes, reactFlowInstance, fitViewOptions]);
  
  // Handle zoom controls
  const zoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);
  
  const zoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);
  
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView(fitViewOptions);
    }
  }, [reactFlowInstance, fitViewOptions]);
  
  // Build graph nodes and edges from questions, pages, and conditional logic
  useEffect(() => {
    if (!questions?.length && !pages?.length) return;
    
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeMap: Record<string, boolean> = {};

    // Add page nodes if the filter is active
    if (selectedFilters.showPages && pages && pages.length > 0) {
      pages.forEach((page, index) => {
        const nodeId = `page-${page.id}`;
        nodeMap[nodeId] = true;
        
        newNodes.push({
          id: nodeId,
          data: { 
            label: `Page: ${page.title || page.id}`,
            pageData: page 
          },
          position: { x: 150, y: index * 100 },
          style: { 
            background: 'rgba(97, 205, 187, 0.8)',
            color: '#000',
            border: '1px solid #555',
            borderRadius: '5px',
            padding: '10px',
            width: 200
          }
        });
      });
    }

    // Add question nodes if the filter is active
    if (selectedFilters.showQuestions && questions && questions.length > 0) {
      questions.forEach((question, index) => {
        const nodeId = `question-${question.id}`;
        nodeMap[nodeId] = true;
        
        // Find which page this question belongs to
        const pageId = question.pageId || null;
        
        newNodes.push({
          id: nodeId,
          data: { 
            label: `Q: ${question.questionText || question.questionKey}`,
            questionData: question 
          },
          position: { x: 450, y: index * 80 },
          style: { 
            background: 'rgba(144, 175, 255, 0.8)',
            color: '#000',
            border: '1px solid #555',
            borderRadius: '5px',
            padding: '10px',
            width: 250
          }
        });
        
        // Connect question to its page
        if (selectedFilters.showPages && pageId && nodeMap[`page-${pageId}`]) {
          newEdges.push({
            id: `page-${pageId}-to-${nodeId}`,
            source: `page-${pageId}`,
            target: nodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#888' }
          });
        }
      });
    }

    // Add conditional logic edges if the filter is active
    if (selectedFilters.showConditions && conditionalLogic && conditionalLogic.length > 0) {
      conditionalLogic.forEach((rule, index) => {
        // Get source question (trigger)
        const sourceId = `question-${rule.triggerQuestionId}`;
        // Get target based on action type (could be question or page)
        let targetId;
        
        if (rule.targetAction === 'show_question' || rule.targetAction === 'hide_question') {
          targetId = `question-${rule.targetQuestionId}`;
        } else if (rule.targetAction === 'skip_to_page') {
          targetId = `page-${rule.targetPageId}`;
        }
        
        // Only add edge if both nodes exist
        if (nodeMap[sourceId] && targetId && nodeMap[targetId]) {
          // Determine edge color based on action type
          let edgeColor = '#666';
          let edgeLabel = '';
          let animated = false;
          
          if (rule.targetAction === 'show_question') {
            edgeColor = 'green';
            edgeLabel = 'Shows';
            animated = true;
          } else if (rule.targetAction === 'hide_question') {
            edgeColor = 'red';
            edgeLabel = 'Hides';
          } else if (rule.targetAction === 'skip_to_page') {
            edgeColor = 'orange';
            edgeLabel = 'Skips to';
            animated = true;
          }
          
          newEdges.push({
            id: `rule-${rule.id}`,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: animated,
            label: edgeLabel,
            labelStyle: { fill: edgeColor, fontWeight: 'bold' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
            },
            style: { stroke: edgeColor, strokeWidth: 2 },
            data: { ruleData: rule }
          });
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
    
    // Auto-layout the graph on initial load (or filter change)
    setTimeout(() => {
      applyAutoLayout();
    }, 200);
  }, [questions, pages, conditionalLogic, selectedFilters, applyAutoLayout]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeSelect) {
      onNodeSelect(node.data);
    }
  }, [onNodeSelect]);

  // Handle filter changes
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setSelectedFilters(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <div ref={flowWrapper} style={{ height: '80vh', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onInit={setReactFlowInstance}
        fitView
        fitViewOptions={fitViewOptions}
        maxZoom={1.5}
        minZoom={0.1}
        zoomOnScroll={true}
        defaultZoom={0.5}
      >
        <Controls showInteractive={false} />
        <MiniMap />
        <Background color="#f0f0f0" gap={12} size={1} />
        
        {/* Filter panel */}
        <Panel position="top-left">
          <div className="filter-panel" style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            marginBottom: '10px'
          }}>
            <h3>Filters</h3>
            <div>
              <label>
                <input
                  type="checkbox"
                  name="showQuestions"
                  checked={selectedFilters.showQuestions}
                  onChange={handleFilterChange}
                />
                Show Questions
              </label>
            </div>
            <div>
              <label>
                <input
                  type="checkbox"
                  name="showPages"
                  checked={selectedFilters.showPages}
                  onChange={handleFilterChange}
                />
                Show Pages
              </label>
            </div>
            <div>
              <label>
                <input
                  type="checkbox"
                  name="showConditions"
                  checked={selectedFilters.showConditions}
                  onChange={handleFilterChange}
                />
                Show Conditions
              </label>
            </div>
          </div>
        </Panel>
        
        {/* Zoom and layout controls */}
        <Panel position="top-right">
          <div className="control-panel" style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <Button onClick={zoomIn} size="sm" variant="outline">
              <ZoomIn className="h-4 w-4 mr-1" /> Zoom In
            </Button>
            <Button onClick={zoomOut} size="sm" variant="outline">
              <ZoomOut className="h-4 w-4 mr-1" /> Zoom Out
            </Button>
            <Button onClick={fitView} size="sm" variant="outline">
              <Maximize className="h-4 w-4 mr-1" /> Fit View
            </Button>
            <Button onClick={applyAutoLayout} size="sm" variant="default">
              <RefreshCw className="h-4 w-4 mr-1" /> Auto Layout
            </Button>
          </div>
        </Panel>
      </ReactFlow>
      
      <div className="visualization-legend" style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        background: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)'
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Legend</h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(97, 205, 187, 0.8)', borderRadius: '3px', marginRight: '8px' }}></div>
          <span>Page</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '16px', background: 'rgba(144, 175, 255, 0.8)', borderRadius: '3px', marginRight: '8px' }}></div>
          <span>Question</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '3px', background: 'green', marginRight: '8px' }}></div>
          <span>Shows Relationship</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '3px', background: 'red', marginRight: '8px' }}></div>
          <span>Hides Relationship</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '16px', height: '3px', background: 'orange', marginRight: '8px' }}></div>
          <span>Skips To Relationship</span>
        </div>
      </div>
    </div>
  );
};

export default ConditionVisualizer;