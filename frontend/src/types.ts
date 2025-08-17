// src/types.ts
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;                 // uuid or timestamp string
  title: string;              // first 40 chars of first prompt
  messages: Message[];
  starred: boolean;
  updatedAt: number;          // unix ms
}

// Workflow Types
export interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  config: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  triggerContext: Record<string, any>;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkflowStep {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  status: 'running' | 'completed' | 'failed';
  input: any;
  output: any;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  answer?: string;
  createdAt?: string;
}
