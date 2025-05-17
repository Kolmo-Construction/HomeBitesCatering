import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  MarkerType,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchAllQuestionnaireData } from '../services/api';
import QuestionNode from './QuestionNode';
import PageNode from './PageNode';
import './ConditionGraph.css';

// Node types for the graph
const nodeTypes = {
  questionNode: QuestionNode,
  pageNode: PageNode
};

interface ConditionGraphProps {
  definitionId: number;
}

const ConditionGraph: React.FC<ConditionGraphProps> = ({ definitionId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load data and create the graph
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchAllQuestionnaireData(definitionId);
        const { nodes, edges } = createGraph(data);
        
        setNodes(nodes);
        setEdges(edges);
      } catch (err) {
        console.error('Error loading questionnaire data for visualization:', err);
        setError('Failed to load questionnaire data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [definitionId, setNodes, setEdges]);
  
  // Create graph from questionnaire data
  const createGraph = useCallback((data: any) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const { pages, questionsByPage, conditionalLogicRules } = data;
    
    // Create page nodes
    pages.forEach((page: any, pageIndex: number) => {
      // Create a node for the page
      nodes.push({
        id: `page-${page.id}`,
        type: 'pageNode',
        position: { x: 0, y: pageIndex * 400 },
        data: { label: page.title, pageId: page.id }
      });
      
      const questions = questionsByPage[page.id] || [];
      
      // Create nodes for each question in the page
      questions.forEach((question: any, questionIndex: number) => {
        nodes.push({
          id: `question-${question.id}`,
          type: 'questionNode',
          position: { x: 250, y: pageIndex * 400 + questionIndex * 100 + 50 },
          data: {
            questionText: question.questionText,
            questionKey: question.questionKey,
            questionType: question.questionType,
            pageId: page.id
          }
        });
      });
    });
    
    // Create edges for conditional logic rules
    conditionalLogicRules.forEach((rule: any) => {
      // Find source question node that triggers the condition
      const sourceNodeId = nodes.find(
        node => node.type === 'questionNode' && node.data.questionKey === rule.triggerQuestionKey
      )?.id;
      
      if (!sourceNodeId) return;
      
      // Determine target node based on rule type
      let targetNodeId;
      
      if (rule.targetAction === 'show_question' || rule.targetAction === 'hide_question') {
        // Find the target question
        targetNodeId = nodes.find(
          node => node.type === 'questionNode' && node.data.questionKey === rule.targetQuestionKey
        )?.id;
      } else if (rule.targetAction === 'skip_to_page') {
        // Find the target page
        targetNodeId = nodes.find(
          node => node.type === 'pageNode' && node.data.pageId === rule.targetPageId
        )?.id;
      }
      
      if (!targetNodeId) return;
      
      // Create an edge from source to target
      edges.push({
        id: `edge-${rule.id}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'smoothstep',
        animated: true,
        label: getConditionLabel(rule),
        labelStyle: { fill: '#334155', fontWeight: 500 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: getEdgeColor(rule)
        },
        style: {
          stroke: getEdgeColor(rule),
          strokeWidth: 2
        }
      });
    });
    
    return { nodes, edges };
  }, []);
  
  // Helper function to format condition label
  const getConditionLabel = (rule: any) => {
    let label = '';
    
    switch (rule.triggerCondition) {
      case 'equals':
        label = `= ${rule.triggerValue || ''}`;
        break;
      case 'not_equals':
        label = `≠ ${rule.triggerValue || ''}`;
        break;
      case 'contains':
        label = `contains '${rule.triggerValue || ''}'`;
        break;
      case 'is_empty':
        label = 'is empty';
        break;
      default:
        label = rule.triggerCondition;
    }
    
    return label;
  };
  
  // Helper function to get edge color based on condition type
  const getEdgeColor = (rule: any) => {
    switch (rule.targetAction) {
      case 'show_question':
        return '#10b981'; // green
      case 'hide_question':
        return '#ef4444'; // red
      case 'skip_to_page':
        return '#3b82f6'; // blue
      default:
        return '#94a3b8'; // gray
    }
  };

  const onLayout = useCallback(() => {
    // Force a re-layout of nodes
    // This would be expanded with a proper layout algorithm
  }, []);
  
  return (
    <div className="condition-graph">
      {isLoading ? (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div>Loading questionnaire data...</div>
        </div>
      ) : error ? (
        <div className="error-overlay">
          <div>{error}</div>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          connectionLineType={ConnectionLineType.SmoothStep}
        >
          <Controls />
          <Background />
          <Panel position="top-right">
            <button className="layout-button" onClick={onLayout}>
              Auto Layout
            </button>
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
};

export default ConditionGraph;