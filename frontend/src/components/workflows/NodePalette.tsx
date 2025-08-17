// src/components/workflows/NodePalette.tsx
// Node palette for dragging new nodes onto the canvas

import React from 'react';
import { cn } from '../../lib/utils';

interface NodeType {
  type: string;
  name: string;
  description: string;
  category: 'trigger' | 'action' | 'condition' | 'transform';
  icon?: string;
}

const NODE_TYPES: NodeType[] = [
  // Triggers
  {
    type: 'trigger.manual',
    name: 'Manual Trigger',
    description: 'Start workflow manually',
    category: 'trigger',
    icon: '▶️'
  },
  {
    type: 'trigger.webhook',
    name: 'Webhook',
    description: 'Start from HTTP request',
    category: 'trigger',
    icon: '🌐'
  },
  {
    type: 'trigger.schedule',
    name: 'Schedule',
    description: 'Run on schedule',
    category: 'trigger',
    icon: '⏰'
  },
  
  // Actions
  {
    type: 'action.log',
    name: 'Log Message',
    description: 'Output a log message',
    category: 'action',
    icon: '📝'
  },
  {
    type: 'action.http',
    name: 'HTTP Request',
    description: 'Make an HTTP request',
    category: 'action',
    icon: '🔄'
  },
  {
    type: 'action.email',
    name: 'Send Email',
    description: 'Send an email',
    category: 'action',
    icon: '📧'
  },
  
  // Conditions
  {
    type: 'condition.if',
    name: 'If Condition',
    description: 'Branch based on condition',
    category: 'condition',
    icon: '❓'
  },
  
  // Transforms
  {
    type: 'transform.map',
    name: 'Transform Data',
    description: 'Transform data structure',
    category: 'transform',
    icon: '🔄'
  },
];

const CATEGORY_COLORS = {
  trigger: 'text-green-700 bg-green-50 border-green-200',
  action: 'text-blue-700 bg-blue-50 border-blue-200', 
  condition: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  transform: 'text-purple-700 bg-purple-50 border-purple-200',
};

export const NodePalette: React.FC = () => {
  const categories = ['trigger', 'action', 'condition', 'transform'] as const;

  const handleNodeDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: nodeType.type,
      name: nodeType.name,
      config: {}
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Node Palette</h3>
        <p className="text-sm text-slate-600 mt-1">
          Drag nodes onto the canvas
        </p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(category => {
          const categoryNodes = NODE_TYPES.filter(node => node.category === category);
          
          if (categoryNodes.length === 0) return null;

          return (
            <div key={category} className="p-3">
              {/* Category header */}
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {category}s
              </h4>

              {/* Nodes */}
              <div className="space-y-1">
                {categoryNodes.map(node => (
                  <div
                    key={node.type}
                    className={cn(
                      'p-2 rounded-md border cursor-move transition-colors hover:shadow-sm',
                      CATEGORY_COLORS[node.category]
                    )}
                    draggable
                    onDragStart={(e) => handleNodeDragStart(e, node)}
                    title={node.description}
                  >
                    <div className="flex items-center gap-2">
                      {node.icon && (
                        <span className="text-sm">{node.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {node.name}
                        </div>
                        <div className="text-xs opacity-75 truncate">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
        Drag nodes to canvas to create workflow
      </div>
    </div>
  );
};