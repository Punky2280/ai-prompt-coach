// src/api.ts
import axios from 'axios';
import type { PromptResponse, EnhancedPromptResponse, HistoryItem, SystemStats } from './types';
import type { RoutingOptions } from './types/models';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 20_000,
});

// POST /api/prompts  → Enhanced response with routing info
export async function sendPrompt(
  prompt: string,
  options: RoutingOptions = {},
  debug = false
): Promise<EnhancedPromptResponse> {
  const { data } = await API.post<EnhancedPromptResponse>(
    '/api/prompts',
    { 
      prompt,
      options
    },
    {
      params: debug ? { debug: 'true' } : {}
    }
  );
  return data;
}

// Legacy function for backward compatibility
export async function sendSimplePrompt(
  prompt: string,
): Promise<PromptResponse> {
  const response = await sendPrompt(prompt);
  return { answer: response.answer };
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

// GET /api/prompts/stats  → SystemStats
export async function fetchSystemStats(): Promise<SystemStats> {
  const { data } = await API.get<SystemStats>('/api/prompts/stats');
  return data;
}
