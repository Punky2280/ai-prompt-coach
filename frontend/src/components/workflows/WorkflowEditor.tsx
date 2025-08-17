// src/components/workflows/WorkflowEditor.tsx
// Main workflow editor interface

import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodePalette } from './NodePalette';
import { Play, Save, Settings, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const WorkflowEditor: React.FC = () => {
  const [triggerContext, setTriggerContext] = useState('{}');
  const [showRunDialog, setShowRunDialog] = useState(false);
  
  const {
    currentWorkflow,
    isLoading,
    error,
    saveWorkflow,
    triggerWorkflow,
    clearError
  } = useWorkflowStore();

  const handleSave = async () => {
    try {
      await saveWorkflow();
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleRun = async () => {
    if (!currentWorkflow) return;
    
    try {
      let context = {};
      try {
        context = JSON.parse(triggerContext);
      } catch (err) {
        console.warn('Invalid JSON in trigger context, using empty object');
      }
      
      const runId = await triggerWorkflow(context);
      setShowRunDialog(false);
      
      // Show success message or navigate to run view
      console.log(`Workflow started with run ID: ${runId}`);
      
    } catch (err) {
      // Error handled by store
    }
  };

  // Clear errors after some time
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, clearError]);

  if (!currentWorkflow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-slate-400 text-6xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold text-slate-600 mb-2">
            No Workflow Selected
          </h2>
          <p className="text-slate-500">
            Create a new workflow or select an existing one to start editing
          </p>
        </div>
      </div>
    );
  }

  const canRun = currentWorkflow.nodes.some(node => node.type.startsWith('trigger.'));

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {currentWorkflow.name}
              </h1>
              <p className="text-sm text-slate-600">
                {currentWorkflow.description || 'No description'}
              </p>
            </div>
            <div className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              currentWorkflow.status === 'published' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            )}>
              {currentWorkflow.status}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              <Save size={16} />
              {isLoading ? 'Saving...' : 'Save'}
            </button>

            {/* Run button */}
            <button
              onClick={() => setShowRunDialog(true)}
              disabled={!canRun || isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canRun ? 'Add a trigger node to run the workflow' : 'Run workflow'}
            >
              <Play size={16} />
              Run
            </button>

            {/* Settings button */}
            <button
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              title="Workflow settings"
            >
              <Settings size={16} />
            </button>

            {/* Preview button */}
            <button
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              title="Preview workflow"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-3 text-sm text-slate-600">
          <span>{currentWorkflow.nodes.length} nodes</span>
          <span>{currentWorkflow.edges.length} connections</span>
          <span>Version {currentWorkflow.version}</span>
          {currentWorkflow.updatedAt && (
            <span>Updated {new Date(currentWorkflow.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 flex">
        <NodePalette />
        <WorkflowCanvas />
      </div>

      {/* Run dialog */}
      {showRunDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Run Workflow</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trigger Context (JSON)
              </label>
              <textarea
                value={triggerContext}
                onChange={(e) => setTriggerContext(e.target.value)}
                className="w-full h-24 p-2 border border-slate-300 rounded-md text-sm font-mono"
                placeholder='{"key": "value"}'
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional data to pass to the workflow trigger
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRunDialog(false)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Run Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};