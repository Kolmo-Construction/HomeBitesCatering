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
import { ZoomIn, ZoomOut, Maximize, RefreshCw, ChevronDown, ChevronRight, FolderClosed, FolderOpen } from 'lucide-react';

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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

  // Toggle collapsible state for a group
  const toggleGroupCollapse = useCallback((pageId: string) => {
    setCollapsedGroups(prev => {
      const newState = {
        ...prev,
        [pageId]: !prev[pageId]
      };
      return newState;
    });
    
    // Schedule a re-render after state update
    setTimeout(() => {
      if (nodes.length) {
        const updatedNodes = [...nodes];
        setNodes(updatedNodes);
      }
    }, 50);
  }, [nodes]);
  
  // Function to collapse/expand all groups
  const toggleAllGroups = useCallback((collapse: boolean) => {
    const groupIds = pages.map(page => `page-${page.id}`);
    const newState: Record<string, boolean> = {};
    
    groupIds.forEach(id => {
      newState[id] = collapse;
    });
    
    setCollapsedGroups(newState);
    
    // Schedule layout update after state change
    setTimeout(() => {
      // Use a direct approach to update the layout without causing loops
      // Apply layout based on current collapsed state
      if (nodes.length) {
        const questionNodes = nodes.filter(node => node.id.startsWith('question-'));
        const pageNodes = nodes.filter(node => node.id.startsWith('page-'));
        
        // Update visibility of nodes and edges based on collapsed state
        const updatedNodes = [...pageNodes, ...questionNodes].map(node => {
          // Hide questions from collapsed page groups
          if (node.id.startsWith('question-')) {
            const pageId = node.data.questionData?.pageId;
            const isHidden = pageId && newState[`page-${pageId}`];
            return {
              ...node,
              hidden: isHidden
            };
          }
          return node;
        });
        
        setNodes(updatedNodes);
        
        // Update edges
        const updatedEdges = edges.map(edge => {
          // Get source and target nodes
          const sourceNodeId = edge.source;
          const targetNodeId = edge.target;
          
          // Check if either node is hidden (part of collapsed group)
          const sourceNode = updatedNodes.find(n => n.id === sourceNodeId);
          const targetNode = updatedNodes.find(n => n.id === targetNodeId);
          
          const isSourceHidden = sourceNode?.hidden;
          const isTargetHidden = targetNode?.hidden;
          
          return {
            ...edge,
            hidden: isSourceHidden || isTargetHidden ? true : undefined
          };
        });
        
        setEdges(updatedEdges);
        
        // Fit view
        if (reactFlowInstance) {
          reactFlowInstance.fitView();
        }
      }
    }, 100);
  }, [pages, nodes, edges, reactFlowInstance]);
  
  // Function to apply automatic layout to nodes and handle collapsed groups
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
      position: { x: 50, y: index * verticalSpacing + 50 },
      data: {
        ...node.data,
        isCollapsed: collapsedGroups[node.id] || false,
        onToggleCollapse: () => toggleGroupCollapse(node.id)
      }
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
    
    // Position questions based on their page grouping, respecting collapsed state
    let questionY = 50;
    const updatedQuestionNodes: Node[] = [];
    let visibleNodeCount = 0;
    
    Object.entries(questionsByPage).forEach(([pageId, groupNodes]) => {
      const pageNodeId = `page-${pageId}`;
      const isCollapsed = collapsedGroups[pageNodeId] || false;
      
      // Try to align with the page node if it exists
      if (pageId !== 'unknown' && pagePositions[parseInt(pageId)]) {
        questionY = pagePositions[parseInt(pageId)];
      }
      
      // Only add questions to the visible nodes if their page group is not collapsed
      if (!isCollapsed) {
        groupNodes.forEach((node) => {
          updatedQuestionNodes.push({
            ...node,
            position: { x: horizontalSpacing, y: questionY }
          });
          questionY += verticalSpacing / 2;
          visibleNodeCount++;
        });
        
        // Add extra spacing between page groups
        questionY += 30;
      }
    });
    
    // Set nodes and update edges visibility based on collapsed state
    const updatedNodes = [...updatedPageNodes, ...updatedQuestionNodes];
    setNodes(updatedNodes);
    
    // Update edges to hide them for collapsed groups
    const updatedEdges = edges.map(edge => {
      // Check if source or target is in a collapsed group
      const sourceNodeId = edge.source;
      const targetNodeId = edge.target;
      
      // Get the page ID of the source and target nodes
      let sourcePageId = '';
      let targetPageId = '';
      
      if (sourceNodeId.startsWith('question-')) {
        const sourceQuestion = questionNodes.find(n => n.id === sourceNodeId);
        if (sourceQuestion) {
          sourcePageId = `page-${sourceQuestion.data.questionData?.pageId}`;
        }
      }
      
      if (targetNodeId.startsWith('question-')) {
        const targetQuestion = questionNodes.find(n => n.id === targetNodeId);
        if (targetQuestion) {
          targetPageId = `page-${targetQuestion.data.questionData?.pageId}`;
        }
      }
      
      // Hide edge if either source or target group is collapsed
      const isSourceCollapsed = sourcePageId && collapsedGroups[sourcePageId];
      const isTargetCollapsed = targetPageId && collapsedGroups[targetPageId];
      
      return {
        ...edge,
        hidden: isSourceCollapsed || isTargetCollapsed ? true : undefined
      };
    });
    
    setEdges(updatedEdges);
    
    // Fit the view to ensure everything is visible
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView(fitViewOptions);
      }, 100);
    }
  }, [nodes, edges, reactFlowInstance, fitViewOptions, collapsedGroups, toggleGroupCollapse]);
  
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
    // But don't do it every time collapsedGroups changes to prevent infinite loop
    const timeoutId = setTimeout(() => {
      // Use a ref to keep track of the last time layout was applied
      // to prevent rapid re-layouts causing flicker
      if (reactFlowInstance) {
        reactFlowInstance.fitView(fitViewOptions);
      }
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [questions, pages, conditionalLogic, selectedFilters, reactFlowInstance, fitViewOptions]);

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
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        nodesDraggable={true}
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
        
        {/* Collapsible Groups Panel */}
        <Panel position="bottom-left">
          <div className="groups-panel" style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Page Groups</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Button onClick={() => toggleAllGroups(false)} size="sm" variant="outline">
                <FolderOpen className="h-4 w-4 mr-1" /> Expand All
              </Button>
              <Button onClick={() => toggleAllGroups(true)} size="sm" variant="outline">
                <FolderClosed className="h-4 w-4 mr-1" /> Collapse All
              </Button>
            </div>
            {pages && pages.length > 0 ? (
              <div className="page-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pages.map(page => (
                  <div key={`page-${page.id}-group`} className="page-group" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(97, 205, 187, 0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleGroupCollapse(`page-${page.id}`)}>
                    {collapsedGroups[`page-${page.id}`] ? (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    <span style={{ fontWeight: '500' }}>
                      Page {page.id}: {page.title || 'Untitled'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No pages available</p>
            )}
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