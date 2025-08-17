// src/types.ts
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    ragUsed?: boolean;
    retrievedChunks?: number;
    contextLength?: number;
    sources?: string[];
    similarities?: Array<{ chunkId: string; similarity: number }>;
  };
}

export interface Conversation {
  id: string;                 // uuid or timestamp string
  title: string;              // first 40 chars of first prompt
  messages: Message[];
  starred: boolean;
  updatedAt: number;          // unix ms
}

export interface PromptResponse {
  success: boolean;
  data?: {
    answer: string;
    metadata?: {
      ragUsed?: boolean;
      retrievedChunks?: number;
      contextLength?: number;
      sources?: string[];
      similarities?: Array<{ chunkId: string; similarity: number }>;
      fallback?: boolean;
      ragError?: string;
    };
  };
  error?: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  answer: string;
  metadata?: object;
  createdAt: any; // Firebase timestamp
}

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  contentType: string;
  metadata: object;
  createdAt: Date;
  updatedAt: Date;
  indexed: boolean;
  chunkCount: number;
}

export interface RAGStats {
  totalDocuments: number;
  indexedDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  documentTypes: Record<string, number>;
}

export interface RAGSearchResult {
  query: string;
  chunks: Array<{
    id: string;
    chunkId: string;
    documentId: string;
    similarity: number;
    content: string;
    chunkIndex: number;
    metadata: object;
  }>;
  total: number;
}
