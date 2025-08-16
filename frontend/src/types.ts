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

// API Response Types
export interface PromptResponse {
  answer: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  answer?: string;
  createdAt?: Date | any;  // Firestore timestamp
}
