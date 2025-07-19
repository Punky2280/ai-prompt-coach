// src/api.ts
import axios from 'axios';
import type { PromptResponse, HistoryItem } from './types';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 20_000,
});

// POST /api/prompts  → { answer }
export async function sendPrompt(
  prompt: string,
): Promise<PromptResponse> {
  const { data } = await API.post<PromptResponse>(
    '/api/prompts',
    { prompt },
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
