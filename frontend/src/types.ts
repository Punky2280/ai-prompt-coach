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
