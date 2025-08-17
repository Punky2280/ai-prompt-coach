// src/api/workflows.ts
// API client for workflow operations

import type { Workflow, WorkflowRun, WorkflowStep } from '../types';

const API_BASE = '/api/workflows';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Workflow CRUD operations
export async function createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });

  const result: ApiResponse<Workflow> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create workflow');
  }
  
  return result.data;
}

export async function getWorkflows(limit: number = 20): Promise<Workflow[]> {
  const response = await fetch(`${API_BASE}?limit=${limit}`);
  const result: ApiResponse<Workflow[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch workflows');
  }
  
  return result.data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/${id}`);
  const result: ApiResponse<Workflow> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch workflow');
  }
  
  return result.data;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const result: ApiResponse<Workflow> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to update workflow');
  }
  
  return result.data;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<{ message: string }> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete workflow');
  }
}

// Workflow execution
export async function triggerWorkflow(id: string, context: Record<string, any> = {}): Promise<{ runId: string; workflowId: string }> {
  const response = await fetch(`${API_BASE}/${id}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  const result: ApiResponse<{ runId: string; workflowId: string }> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to trigger workflow');
  }
  
  return result.data;
}

export async function getWorkflowRuns(workflowId: string, limit: number = 20): Promise<WorkflowRun[]> {
  const response = await fetch(`${API_BASE}/${workflowId}/runs?limit=${limit}`);
  const result: ApiResponse<WorkflowRun[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch workflow runs');
  }
  
  return result.data;
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRun> {
  const response = await fetch(`${API_BASE}/runs/${runId}`);
  const result: ApiResponse<WorkflowRun> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch workflow run');
  }
  
  return result.data;
}

export async function getWorkflowRunSteps(runId: string): Promise<WorkflowStep[]> {
  const response = await fetch(`${API_BASE}/runs/${runId}/steps`);
  const result: ApiResponse<WorkflowStep[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch workflow run steps');
  }
  
  return result.data;
}

// Validation
export async function validateWorkflow(id: string): Promise<{ valid: boolean; issues: string[]; nodeCount: number; edgeCount: number }> {
  const response = await fetch(`${API_BASE}/${id}/validate`, {
    method: 'POST',
  });

  const result: ApiResponse<{ valid: boolean; issues: string[]; nodeCount: number; edgeCount: number }> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to validate workflow');
  }
  
  return result.data;
}

// SSE Stream for real-time updates
export function createWorkflowRunStream(runId: string): EventSource {
  return new EventSource(`${API_BASE}/runs/${runId}/stream`);
}