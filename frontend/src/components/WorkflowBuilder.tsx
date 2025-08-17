// PURPOSE: Basic workflow builder canvas component (Phase A)
// PHASE: A
// STATUS: skeleton
// VERIFY: Canvas interaction requirements
// TODO:
// 1. Add drag and drop for nodes
// 2. Add edge creation and editing
// 3. Add node property panels
// 4. Add zoom and pan controls
// 5. Add auto-save functionality

import React, { useState, useCallback } from 'react';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

interface WorkflowBuilderProps {
  workflowId?: string;
  onSave?: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
}

export default function WorkflowBuilder({ workflowId, onSave }: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Available node types for Phase A
  const nodeTypes = [
    { type: 'transform', name: 'Transform', description: 'Transform data' },
    { type: 'http', name: 'HTTP Request', description: 'Make HTTP calls' },
    { type: 'delay', name: 'Delay', description: 'Add delays' },
    { type: 'set-variable', name: 'Set Variable', description: 'Set variables' }
  ];

  const addNode = useCallback((nodeType: string) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: nodeTypes.find(nt => nt.type === nodeType)?.name || nodeType,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      config: {}
    };
    
    setNodes(prev => [...prev, newNode]);
  }, [nodeTypes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  const handleSave = useCallback(() => {
    const workflow = { nodes, edges };
    onSave?.(workflow);
  }, [nodes, edges, onSave]);

  const handleNodeDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    setIsDragging(true);
    setSelectedNode(nodeId);
  }, []);

  const handleNodeDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Node Palette */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Node Palette</h3>
        <div className="space-y-2">
          {nodeTypes.map(nodeType => (
            <button
              key={nodeType.type}
              onClick={() => addNode(nodeType.type)}
              className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="font-medium">{nodeType.name}</div>
              <div className="text-sm text-gray-600">{nodeType.description}</div>
            </button>
          ))}
        </div>
        
        {/* Workflow Actions */}
        <div className="mt-8 space-y-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Workflow
          </button>
          <button
            onClick={() => {
              setNodes([]);
              setEdges([]);
              setSelectedNode(null);
            }}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-white">
          {/* Grid background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
          
          {/* SVG for edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              
              if (!sourceNode || !targetNode) return null;
              
              return (
                <line
                  key={edge.id}
                  x1={sourceNode.position.x + 75} // Center of node
                  y1={sourceNode.position.y + 25}
                  x2={targetNode.position.x + 75}
                  y2={targetNode.position.y + 25}
                  stroke="#6366f1"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            
            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6366f1"
                />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute w-32 h-16 bg-white border-2 rounded-lg shadow-sm cursor-move transition-all ${
                selectedNode === node.id 
                  ? 'border-blue-500 shadow-lg' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{
                left: node.position.x,
                top: node.position.y,
                transform: isDragging && selectedNode === node.id ? 'scale(1.05)' : 'scale(1)'
              }}
              draggable
              onDragStart={(e) => handleNodeDragStart(e, node.id)}
              onDragEnd={handleNodeDragEnd}
              onClick={() => setSelectedNode(node.id)}
            >
              <div className="p-2 h-full flex flex-col justify-center">
                <div className="text-xs font-medium text-gray-700 truncate">
                  {node.name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {node.type}
                </div>
              </div>
              
              {/* Delete button */}
              {selectedNode === node.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Node Properties</h3>
          {(() => {
            const node = nodes.find(n => n.id === selectedNode);
            if (!node) return null;
            
            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={node.name}
                    onChange={(e) => {
                      setNodes(prev => prev.map(n => 
                        n.id === selectedNode ? { ...n, name: e.target.value } : n
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={node.type}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={Math.round(node.position.x)}
                      onChange={(e) => {
                        const x = parseInt(e.target.value) || 0;
                        updateNodePosition(node.id, { ...node.position, x });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="X"
                    />
                    <input
                      type="number"
                      value={Math.round(node.position.y)}
                      onChange={(e) => {
                        const y = parseInt(e.target.value) || 0;
                        updateNodePosition(node.id, { ...node.position, y });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Y"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}