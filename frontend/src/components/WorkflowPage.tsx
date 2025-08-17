// PURPOSE: Basic workflow page to showcase Phase A workflow builder
// PHASE: A
// STATUS: skeleton
// VERIFY: Navigation integration
// TODO:
// 1. Add workflow list management
// 2. Add workflow execution interface
// 3. Add real-time run monitoring
// 4. Add workflow sharing/export

import React, { useState } from 'react';
import WorkflowBuilder from '../components/WorkflowBuilder';

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [view, setView] = useState<'list' | 'builder'>('list');

  const createNewWorkflow = () => {
    const newWorkflow = {
      id: Date.now().toString(),
      name: 'New Workflow',
      description: '',
      nodes: [],
      edges: [],
      createdAt: new Date()
    };
    setWorkflows(prev => [newWorkflow, ...prev]);
    setCurrentWorkflow(newWorkflow);
    setView('builder');
  };

  const handleSaveWorkflow = (workflowData: { nodes: any[]; edges: any[] }) => {
    if (!currentWorkflow) return;
    
    const updatedWorkflow = {
      ...currentWorkflow,
      ...workflowData,
      updatedAt: new Date()
    };
    
    setWorkflows(prev => 
      prev.map(w => w.id === currentWorkflow.id ? updatedWorkflow : w)
    );
    setCurrentWorkflow(updatedWorkflow);
    
    console.log('Workflow saved:', updatedWorkflow);
    // TODO: Send to backend API
  };

  if (view === 'builder' && currentWorkflow) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('list')}
              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              ← Back to Workflows
            </button>
            <h1 className="text-xl font-semibold">{currentWorkflow.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Phase A - Basic Builder</span>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={() => {
                // TODO: Execute workflow
                console.log('Execute workflow:', currentWorkflow);
              }}
            >
              Execute
            </button>
          </div>
        </div>
        
        {/* Workflow Builder */}
        <div className="flex-1">
          <WorkflowBuilder
            workflowId={currentWorkflow.id}
            onSave={handleSaveWorkflow}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-2">Create and manage your automation workflows</p>
        </div>
        <button
          onClick={createNewWorkflow}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Workflow
        </button>
      </div>

      {/* Phase A Feature Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-semibold">A</span>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Phase A Implementation</h3>
            <p className="text-blue-700 text-sm mt-1">
              Basic workflow builder with core nodes (Transform, HTTP, Delay, Set Variable). 
              Advanced features like RAG, MCP, and governance coming in future phases.
            </p>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first automation workflow</p>
          <button
            onClick={createNewWorkflow}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(workflow => (
            <div key={workflow.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{workflow.name}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {workflow.nodes?.length || 0} nodes
                </span>
              </div>
              
              {workflow.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workflow.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Created {new Date(workflow.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentWorkflow(workflow);
                      setView('builder');
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Execute workflow
                      console.log('Execute:', workflow);
                    }}
                    className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  >
                    Run
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}