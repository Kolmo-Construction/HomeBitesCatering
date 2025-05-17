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

  // Toggle collapsible state for a group - simplified to prevent performance issues
  const toggleGroupCollapse = useCallback((pageId: string) => {
    setCollapsedGroups(prev => {
      return {
        ...prev,
        [pageId]: !prev[pageId]
      };
    });
  }, []);
  
  // Function to collapse/expand all groups - simplified to reduce performance issues
  const toggleAllGroups = useCallback((collapse: boolean) => {
    const groupIds = pages.map(page => `page-${page.id}`);
    const newState: Record<string, boolean> = {};
    
    groupIds.forEach(id => {
      newState[id] = collapse;
    });
    
    setCollapsedGroups(newState);
  }, [pages]);
  
  // Function to apply automatic layout to nodes and handle collapsed groups
  // Completely rewritten for better performance
  const applyAutoLayout = useCallback(() => {
    if (!nodes.length) return;
    
    // Throttle to prevent excessive CPU usage
    const layoutNodes = () => {
      // Layout constants
      const horizontalSpacing = 350;
      const verticalSpacing = 120;
      
      // Process nodes only once
      const questionNodes = [];
      const pageNodes = [];
      const pageIdMap = new Map();
      
      // Separate nodes by type in a single pass
      nodes.forEach(node => {
        if (node.id.startsWith('page-')) {
          pageNodes.push(node);
          const pageId = parseInt(node.id.replace('page-', ''));
          pageIdMap.set(pageId, node);
        } else if (node.id.startsWith('question-')) {
          questionNodes.push(node);
        }
      });
      
      // Position page nodes in first column
      const updatedPageNodes = pageNodes.map((node, index) => ({
        ...node,
        position: { x: 50, y: index * verticalSpacing + 50 },
        data: {
          ...node.data,
          isCollapsed: collapsedGroups[node.id] || false
        }
      }));
      
      // Create position map for pages
      const pagePositions = {};
      pageNodes.forEach((node, index) => {
        const pageId = parseInt(node.id.replace('page-', ''));
        pagePositions[pageId] = index * verticalSpacing + 50;
      });
      
      // Create a map of questions by page for efficient grouping
      const questionsByPage = {};
      
      // Process questions in a single, efficient pass
      questionNodes.forEach(node => {
        const pageId = node.data.questionData?.pageId?.toString() || 'unknown';
        if (!questionsByPage[pageId]) {
          questionsByPage[pageId] = [];
        }
        questionsByPage[pageId].push(node);
      });
      
      // Position questions efficiently
      let questionY = 50;
      const updatedQuestionNodes = [];
      
      Object.entries(questionsByPage).forEach(([pageId, groupNodes]) => {
        const pageNodeId = `page-${pageId}`;
        const isCollapsed = collapsedGroups[pageNodeId] || false;
        
        // Align with page if possible
        if (pageId !== 'unknown' && pagePositions[parseInt(pageId)]) {
          questionY = pagePositions[parseInt(pageId)];
        }
        
        // Only add visible questions
        if (!isCollapsed) {
          groupNodes.forEach(node => {
            updatedQuestionNodes.push({
              ...node,
              position: { x: horizontalSpacing, y: questionY },
              hidden: false
            });
            questionY += verticalSpacing / 2;
          });
          questionY += 30;
        } else {
          // Add hidden questions
          groupNodes.forEach(node => {
            updatedQuestionNodes.push({
              ...node,
              position: { x: horizontalSpacing, y: questionY },
              hidden: true
            });
          });
        }
      });
      
      // Batch update all nodes at once
      const allUpdatedNodes = [...updatedPageNodes, ...updatedQuestionNodes];
      setNodes(allUpdatedNodes);
      
      // Build a quick lookup for node visibility
      const nodeVisibility = {};
      allUpdatedNodes.forEach(node => {
        nodeVisibility[node.id] = node.hidden || false;
      });
      
      // Update all edges at once based on node visibility
      const updatedEdges = edges.map(edge => {
        const isSourceHidden = nodeVisibility[edge.source];
        const isTargetHidden = nodeVisibility[edge.target];
        
        return {
          ...edge,
          hidden: isSourceHidden || isTargetHidden || false
        };
      });
      
      setEdges(updatedEdges);
      
      // Fit view after updates
      if (reactFlowInstance) {
        reactFlowInstance.fitView(fitViewOptions);
      }
    };
    
    // Debounce execution to prevent CPU spikes
    layoutNodes();
    
  }, [nodes, edges, reactFlowInstance, fitViewOptions, collapsedGroups]);
  
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
    
    // Create optimized data structures for fast lookups
    const nodeMap = new Map();
    const newNodes = [];
    const newEdges = [];
    
    // Optimize page node creation
    if (selectedFilters.showPages && pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const nodeId = `page-${page.id}`;
        nodeMap.set(nodeId, true);
        
        newNodes.push({
          id: nodeId,
          data: { 
            label: `Page: ${page.title || page.id}`,
            pageData: page 
          },
          position: { x: 150, y: i * 100 },
          style: { 
            background: 'rgba(97, 205, 187, 0.8)',
            color: '#000',
            border: '1px solid #555',
            borderRadius: '5px',
            padding: '10px',
            width: 200
          }
        });
      }
    }

    // Optimize question node creation
    if (selectedFilters.showQuestions && questions && questions.length > 0) {
      // Batch edge creation instead of doing it one by one
      const pageLinkEdges = [];
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const nodeId = `question-${question.id}`;
        nodeMap.set(nodeId, true);
        
        // Find which page this question belongs to
        const pageId = question.pageId || null;
        
        newNodes.push({
          id: nodeId,
          data: { 
            label: `Q: ${question.questionText || question.questionKey}`,
            questionData: question 
          },
          position: { x: 450, y: i * 80 },
          style: { 
            background: 'rgba(144, 175, 255, 0.8)',
            color: '#000',
            border: '1px solid #555',
            borderRadius: '5px',
            padding: '10px',
            width: 250
          }
        });
        
        // Create edge (but don't push one by one - more efficient)
        if (selectedFilters.showPages && pageId && nodeMap.has(`page-${pageId}`)) {
          pageLinkEdges.push({
            id: `page-${pageId}-to-${nodeId}`,
            source: `page-${pageId}`,
            target: nodeId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#888' }
          });
        }
      }
      
      // Batch add all page link edges at once
      if (pageLinkEdges.length > 0) {
        newEdges.push(...pageLinkEdges);
      }
    }

    // Optimize conditional logic edge creation
    if (selectedFilters.showConditions && conditionalLogic && conditionalLogic.length > 0) {
      // Pre-calculate edge properties for different rule types
      const edgeProps = {
        'show_question': { color: 'green', label: 'Shows', animated: true },
        'hide_question': { color: 'red', label: 'Hides', animated: false },
        'skip_to_page': { color: 'orange', label: 'Skips to', animated: true }
      };
      
      // Batch conditional edges
      const conditionalEdges = [];
      
      for (let i = 0; i < conditionalLogic.length; i++) {
        const rule = conditionalLogic[i];
        
        // Get source question (trigger)
        const sourceId = `question-${rule.triggerQuestionId}`;
        
        // Get target based on action type (could be question or page)
        let targetId;
        
        if (rule.targetAction === 'show_question' || rule.targetAction === 'hide_question') {
          targetId = `question-${rule.targetQuestionId}`;
        } else if (rule.targetAction === 'skip_to_page') {
          targetId = `page-${rule.targetPageId}`;
        }
        
        // Only add edge if both nodes exist - fast lookup with Map
        if (nodeMap.has(sourceId) && targetId && nodeMap.has(targetId)) {
          // Get edge properties from pre-calculated map
          const props = edgeProps[rule.targetAction] || { color: '#666', label: '', animated: false };
          
          conditionalEdges.push({
            id: `rule-${rule.id}`,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: props.animated,
            label: props.label,
            labelStyle: { fill: props.color, fontWeight: 'bold' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: props.color,
            },
            style: { stroke: props.color, strokeWidth: 2 },
            data: { ruleData: rule }
          });
        }
      }
      
      // Batch add all conditional edges at once
      if (conditionalEdges.length > 0) {
        newEdges.push(...conditionalEdges);
      }
    }

    // Single batch state update for all nodes
    setNodes(newNodes);
    
    // Single batch state update for all edges
    setEdges(newEdges);
    
    // Performance optimization: Debounce layout changes
    // Don't call fitView on every small change
    const timeoutId = setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView(fitViewOptions);
      }
    }, 250); // Use slightly longer timeout for better performance
    
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