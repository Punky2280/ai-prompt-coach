// src/components/workflows/WorkflowsPage.tsx
// Main workflows page with navigation between list and editor

import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowList } from './WorkflowList';
import { WorkflowEditor } from './WorkflowEditor';
import { ArrowLeft } from 'lucide-react';
import type { Workflow } from '../../types';

type View = 'list' | 'editor' | 'create';

export const WorkflowsPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    currentWorkflow,
    createWorkflow,
    loadWorkflow,
    updateWorkflowMeta
  } = useWorkflowStore();

  const handleSelectWorkflow = async (workflow: Workflow) => {
    if (workflow.id) {
      await loadWorkflow(workflow.id);
      setCurrentView('editor');
      setIsCreating(false);
    }
  };

  const handleCreateWorkflow = () => {
    setCurrentView('create');
    setIsCreating(true);
  };

  const handleCreateSubmit = async (name: string, description: string) => {
    await createWorkflow({
      name,
      description,
      nodes: [
        {
          id: 'trigger1',
          type: 'trigger.manual',
          name: 'Manual Trigger',
          x: 100,
          y: 100,
          config: {}
        }
      ],
      edges: [],
      config: {},
      status: 'draft',
      version: 1
    });
    setCurrentView('editor');
    setIsCreating(false);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setIsCreating(false);
  };

  // Create workflow form
  if (currentView === 'create') {
    return <CreateWorkflowForm onSubmit={handleCreateSubmit} onCancel={handleBackToList} />;
  }

  // Workflow editor
  if (currentView === 'editor') {
    return (
      <div className="flex flex-col h-full">
        {/* Back button */}
        <div className="bg-white border-b border-slate-200 px-4 py-2">
          <button
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Workflows
          </button>
        </div>
        
        <WorkflowEditor />
      </div>
    );
  }

  // Workflow list (default)
  return (
    <WorkflowList 
      onSelectWorkflow={handleSelectWorkflow}
      onCreateWorkflow={handleCreateWorkflow}
    />
  );
};

// Create workflow form component
interface CreateWorkflowFormProps {
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
}

const CreateWorkflowForm: React.FC<CreateWorkflowFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { isLoading } = useWorkflowStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), description.trim());
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Create New Workflow</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Workflow Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Awesome Workflow"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What does this workflow do?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};