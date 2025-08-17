// src/api.ts
import axios from 'axios';
import type { PromptResponse, HistoryItem, RAGDocument, RAGStats, RAGSearchResult } from './types';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 20_000,
});

// POST /api/prompts  → { answer }
export async function sendPrompt(
  prompt: string,
  enableRAG = false,
): Promise<PromptResponse> {
  const { data } = await API.post<PromptResponse>(
    '/api/prompts',
    { prompt, enableRAG },
  );
  return data;
}

// GET /api/history?limit=20  → HistoryItem[]
export async function fetchHistory(
  limit = 20,
): Promise<HistoryItem[]> {
  const { data } = await API.get<HistoryItem[]>(
    '/api/history',
    { params: { limit } },
  );
  return data;
}

// RAG API Functions
export async function ingestDocument(document: {
  title: string;
  content: string;
  source: string;
  contentType?: string;
  metadata?: object;
}): Promise<{ success: boolean; data?: { documentId: string; message: string } }> {
  const { data } = await API.post('/api/rag/documents', document);
  return data;
}

export async function getRagStats(): Promise<{ success: boolean; data?: RAGStats }> {
  const { data } = await API.get('/api/rag/stats');
  return data;
}

export async function searchDocuments(query: string, topK = 5, threshold = 0.7): Promise<{ 
  success: boolean; 
  data?: RAGSearchResult 
}> {
  const { data } = await API.post('/api/rag/search', { query, topK, threshold });
  return data;
}
