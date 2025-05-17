import React, { useState, useCallback, useEffect } from 'react';
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
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

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
  const [selectedFilters, setSelectedFilters] = useState({
    showQuestions: true,
    showPages: true,
    showConditions: true
  });

  // Build graph nodes and edges from questions, pages, and conditional logic
  useEffect(() => {
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
  }, [questions, pages, conditionalLogic, selectedFilters]);

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
    <div style={{ height: '80vh', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background color="#f0f0f0" gap={12} size={1} />
        <Panel position="top-left">
          <div className="filter-panel" style={{ 
            background: 'white', 
            padding: '10px', 
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)'
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
      </ReactFlow>
    </div>
  );
};

export default ConditionVisualizer;