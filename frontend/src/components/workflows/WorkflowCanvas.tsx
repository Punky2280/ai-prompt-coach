// src/components/workflows/WorkflowCanvas.tsx
// Canvas component for visual workflow editor

import React, { useRef, useState, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode } from '../../types';
import { cn } from '../../lib/utils';

interface CanvasPosition {
  x: number;
  y: number;
}

export const WorkflowCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState<CanvasPosition | null>(null);
  
  const {
    currentWorkflow,
    selectedNodeId,
    selectNode,
    moveNode,
    addNode
  } = useWorkflowStore();

  // Handle canvas click (deselect nodes)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  }, [selectNode]);

  // Handle node drag
  const handleNodeDragStart = useCallback((e: React.DragEvent, node: WorkflowNode) => {
    e.dataTransfer.setData('application/json', JSON.stringify(node));
    setDragPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const nodeData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // If it's an existing node, move it
      if (nodeData.id && currentWorkflow?.nodes.find(n => n.id === nodeData.id)) {
        moveNode(nodeData.id, x, y);
      } else {
        // If it's a new node type from palette, create it
        addNode({
          type: nodeData.type || 'action.log',
          name: nodeData.name || 'New Node',
          x,
          y,
          config: nodeData.config || {}
        });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [currentWorkflow, moveNode, addNode]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  if (!currentWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-500">
        <p>Select a workflow to edit</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-slate-50">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full relative cursor-default"
        onClick={handleCanvasClick}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
      >
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {currentWorkflow.edges.map((edge, index) => {
            const sourceNode = currentWorkflow.nodes.find(n => n.id === edge.source);
            const targetNode = currentWorkflow.nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;

            const x1 = sourceNode.x + 50; // Center of source node
            const y1 = sourceNode.y + 15;
            const x2 = targetNode.x + 50; // Center of target node  
            const y2 = targetNode.y + 15;

            // Create curved path
            const midX = (x1 + x2) / 2;
            const curve = Math.abs(x2 - x1) * 0.3;
            
            const path = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;

            return (
              <g key={`${edge.source}-${edge.target}-${index}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
          })}
          
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6b7280"
              />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {currentWorkflow.nodes.map((node) => (
          <WorkflowNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onSelect={() => selectNode(node.id)}
            onDragStart={(e) => handleNodeDragStart(e, node)}
          />
        ))}
      </div>
    </div>
  );
};

// Individual node component
interface WorkflowNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

const WorkflowNodeComponent: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onDragStart,
}) => {
  // Node type styling
  const getNodeStyle = (type: string) => {
    if (type.startsWith('trigger.')) {
      return 'bg-green-100 border-green-300 text-green-800';
    } else if (type.startsWith('action.')) {
      return 'bg-blue-100 border-blue-300 text-blue-800';  
    } else if (type.startsWith('condition.')) {
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    } else {
      return 'bg-slate-100 border-slate-300 text-slate-800';
    }
  };

  return (
    <div
      className={cn(
        'absolute select-none cursor-move border-2 rounded-lg px-3 py-2 shadow-sm min-w-[100px]',
        getNodeStyle(node.type),
        isSelected && 'ring-2 ring-blue-500 ring-offset-1'
      )}
      style={{
        left: node.x,
        top: node.y,
        transform: 'translate(0, 0)', // Prevents subpixel rendering issues
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      draggable
      onDragStart={onDragStart}
    >
      {/* Node header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-current opacity-60" />
        <span className="text-xs font-medium">
          {node.name || node.type.split('.')[1] || 'Node'}
        </span>
      </div>
      
      {/* Node type */}
      <div className="text-xs opacity-60 mt-1">
        {node.type}
      </div>
    </div>
  );
};