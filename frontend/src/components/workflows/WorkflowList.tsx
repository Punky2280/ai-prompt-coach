// src/components/workflows/WorkflowList.tsx
// List view of workflows with create/manage actions

import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Plus, Play, Edit, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Workflow } from '../../types';

interface Props {
  onSelectWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
}

export const WorkflowList: React.FC<Props> = ({ onSelectWorkflow, onCreateWorkflow }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflowForDelete, setSelectedWorkflowForDelete] = useState<string | null>(null);

  const {
    workflows,
    isLoading,
    error,
    loadWorkflows,
    deleteWorkflow,
    triggerWorkflow
  } = useWorkflowStore();

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Filter workflows based on search
  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workflow.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      setSelectedWorkflowForDelete(null);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleQuickRun = async (e: React.MouseEvent, workflowId: string) => {
    e.stopPropagation();
    try {
      await triggerWorkflow({});
      // Could show toast notification here
    } catch (err) {
      // Error handled by store
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'draft':
        return <Edit size={16} className="text-yellow-600" />;
      case 'archived':
        return <AlertCircle size={16} className="text-slate-400" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (isLoading && workflows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Workflows</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage your automation workflows
            </p>
          </div>

          <button
            onClick={onCreateWorkflow}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            New Workflow
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto">
        {filteredWorkflows.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-slate-400 text-4xl mb-2">⚡</div>
              <p className="text-slate-500">
                {searchQuery ? 'No workflows match your search' : 'No workflows yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onCreateWorkflow}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  <Plus size={16} />
                  Create your first workflow
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectWorkflow(workflow)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {workflow.name}
                    </h3>
                    {workflow.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {getStatusIcon(workflow.status)}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                  <span>{workflow.nodes.length} nodes</span>
                  <span>{workflow.edges.length} connections</span>
                  <span>v{workflow.version}</span>
                </div>

                {/* Status and date */}
                <div className="flex items-center justify-between">
                  <div className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(workflow.status)
                  )}>
                    {workflow.status}
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    {workflow.updatedAt && (
                      <>Updated {new Date(workflow.updatedAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                  {/* Quick run */}
                  <button
                    onClick={(e) => handleQuickRun(e, workflow.id!)}
                    className="p-1 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Quick run"
                  >
                    <Play size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorkflowForDelete(workflow.id!);
                    }}
                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {selectedWorkflowForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-2">Delete Workflow</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete this workflow? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedWorkflowForDelete(null)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedWorkflowForDelete)}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};