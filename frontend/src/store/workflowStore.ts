// src/store/workflowStore.ts
// Zustand store for workflow state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowRun } from '../types';
import * as workflowApi from '../api/workflows';

export interface WorkflowState {
  // Data
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  runs: WorkflowRun[];
  isLoading: boolean;
  error: string | null;

  // Canvas state
  selectedNodeId: string | null;
  draggedNode: WorkflowNode | null;
  
  // Actions - Workflow Management
  loadWorkflows: () => Promise<void>;
  createWorkflow: (workflow: Omit<Workflow, 'id'>) => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  
  // Actions - Workflow Editing
  updateWorkflowMeta: (updates: { name?: string; description?: string }) => void;
  addNode: (node: Omit<WorkflowNode, 'id'>) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (source: string, target: string) => void;
  
  // Actions - Canvas Interaction
  selectNode: (nodeId: string | null) => void;
  setDraggedNode: (node: WorkflowNode | null) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  
  // Actions - Execution
  triggerWorkflow: (context?: Record<string, any>) => Promise<string>; // returns runId
  loadRuns: (workflowId: string) => Promise<void>;
  
  // Actions - UI State
  setError: (error: string | null) => void;
  clearError: () => void;
}

let nodeIdCounter = 1;

export const useWorkflowStore = create<WorkflowState>()(
  persist<WorkflowState>(
    (set, get) => ({
      // Initial state
      workflows: [],
      currentWorkflow: null,
      runs: [],
      isLoading: false,
      error: null,
      selectedNodeId: null,
      draggedNode: null,

      // Workflow Management
      loadWorkflows: async () => {
        set({ isLoading: true, error: null });
        try {
          const workflows = await workflowApi.getWorkflows();
          set({ workflows, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load workflows',
            isLoading: false 
          });
        }
      },

      createWorkflow: async (workflowData) => {
        set({ isLoading: true, error: null });
        try {
          const workflow = await workflowApi.createWorkflow(workflowData);
          set(state => ({ 
            workflows: [workflow, ...state.workflows],
            currentWorkflow: workflow,
            isLoading: false 
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create workflow',
            isLoading: false 
          });
        }
      },

      loadWorkflow: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const workflow = await workflowApi.getWorkflow(id);
          set({ currentWorkflow: workflow, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load workflow',
            isLoading: false 
          });
        }
      },

      saveWorkflow: async () => {
        const { currentWorkflow } = get();
        if (!currentWorkflow?.id) {
          set({ error: 'No workflow to save' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const updated = await workflowApi.updateWorkflow(currentWorkflow.id, currentWorkflow);
          set(state => ({
            currentWorkflow: updated,
            workflows: state.workflows.map(w => w.id === updated.id ? updated : w),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save workflow',
            isLoading: false 
          });
        }
      },

      deleteWorkflow: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await workflowApi.deleteWorkflow(id);
          set(state => ({
            workflows: state.workflows.filter(w => w.id !== id),
            currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete workflow',
            isLoading: false 
          });
        }
      },

      // Workflow Editing
      updateWorkflowMeta: (updates) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            ...updates
          } : null
        }));
      },

      addNode: (nodeData) => {
        const nodeId = `node_${nodeIdCounter++}`;
        const newNode: WorkflowNode = { ...nodeData, id: nodeId };
        
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            nodes: [...state.currentWorkflow.nodes, newNode]
          } : null
        }));
      },

      updateNode: (nodeId, updates) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.map(node =>
              node.id === nodeId ? { ...node, ...updates } : node
            )
          } : null
        }));
      },

      deleteNode: (nodeId) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.filter(node => node.id !== nodeId),
            edges: state.currentWorkflow.edges.filter(edge => 
              edge.source !== nodeId && edge.target !== nodeId
            )
          } : null,
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
        }));
      },

      addEdge: (edge) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            edges: [...state.currentWorkflow.edges, edge]
          } : null
        }));
      },

      deleteEdge: (source, target) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            edges: state.currentWorkflow.edges.filter(edge =>
              !(edge.source === source && edge.target === target)
            )
          } : null
        }));
      },

      // Canvas Interaction
      selectNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      setDraggedNode: (node) => {
        set({ draggedNode: node });
      },

      moveNode: (nodeId, x, y) => {
        set(state => ({
          currentWorkflow: state.currentWorkflow ? {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.map(node =>
              node.id === nodeId ? { ...node, x, y } : node
            )
          } : null
        }));
      },

      // Execution
      triggerWorkflow: async (context = {}) => {
        const { currentWorkflow } = get();
        if (!currentWorkflow?.id) {
          throw new Error('No workflow selected');
        }

        set({ isLoading: true, error: null });
        try {
          const result = await workflowApi.triggerWorkflow(currentWorkflow.id, context);
          set({ isLoading: false });
          return result.runId;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to trigger workflow',
            isLoading: false 
          });
          throw error;
        }
      },

      loadRuns: async (workflowId) => {
        set({ isLoading: true, error: null });
        try {
          const runs = await workflowApi.getWorkflowRuns(workflowId);
          set({ runs, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load runs',
            isLoading: false 
          });
        }
      },

      // UI State
      setError: (error) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'workflow-store',
      version: 1,
      // Only persist minimal UI state, not the full workflows
      partialize: (state) => ({
        selectedNodeId: state.selectedNodeId
      })
    }
  )
);