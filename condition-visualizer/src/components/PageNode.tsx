import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './CustomNodes.css';

// Define the properties for the page node
interface PageNodeProps {
  data: {
    label: string;
    pageId: number;
  };
  isConnectable: boolean;
}

// Page node component for the graph
const PageNode: React.FC<PageNodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="page-node">
      {/* Input handle at the top of the node */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      
      {/* Node content */}
      <div className="node-header page-header">
        <div className="node-type">Page</div>
        <div className="node-id">ID: {data.pageId}</div>
      </div>
      
      <div className="node-content">
        <div className="page-title">{data.label}</div>
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

export default memo(PageNode);