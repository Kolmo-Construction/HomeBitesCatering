import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNodes.css';

// Define the properties for the question node
interface QuestionNodeProps {
  data: {
    questionText: string;
    questionKey: string;
    questionType: string;
    pageId: number;
  };
  isConnectable: boolean;
}

// Question node component for the graph
const QuestionNode: React.FC<QuestionNodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="question-node">
      {/* Input handle at the top of the node */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      
      {/* Node content */}
      <div className="node-header">
        <div className="node-type">Question</div>
        <div className="node-key">{data.questionKey}</div>
      </div>
      
      <div className="node-content">
        <div className="question-text">{data.questionText}</div>
        <div className="question-metadata">
          <span className="question-type">{data.questionType}</span>
        </div>
      </div>
      
      {/* Output handle at the bottom of the node */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default memo(QuestionNode);