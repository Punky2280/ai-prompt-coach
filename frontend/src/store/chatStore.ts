// src/store/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Conversation, Message } from '../types';

export interface ChatState {
  conversations: Conversation[];
  activeId: string | null;

  /* actions */
  newConversation: () => void;
  addMessage: (msg: Message) => void;
  setActive: (id: string) => void;
  toggleStar: (id: string) => void;
}

/* ───────────────────────────────────────────
   The store
─────────────────────────────────────────── */
export const useChatStore = create<ChatState>()(
  persist<ChatState>(
    (set, get) => ({
      conversations: [],
      activeId: null,

      /* Start a brand-new chat */
      newConversation: () => {
        const id = Date.now().toString();

        set(state => ({
          conversations: [
            {
              id,
              title: 'New Chat',
              messages: [],
              starred: false,
              updatedAt: Date.now()
            },
            ...state.conversations
          ],
          activeId: id
        }));
      },

      /* Push a message into the active chat */
      addMessage: (msg: Message) => {
        const { activeId, conversations } = get();
        if (!activeId) return;

        set({
          conversations: conversations.map(c =>
            c.id === activeId
              ? {
                  ...c,
                  messages: [...c.messages, msg],
                  title:
                    c.messages.length === 0 && msg.role === 'user'
                      ? msg.content.slice(0, 40)
                      : c.title,
                  updatedAt: Date.now()
                }
              : c
          )
        });
      },

      /* Switch the UI to another conversation */
      setActive: (id: string) => set({ activeId: id }),

      /* Star / unstar */
      toggleStar: (id: string) =>
        set(state => ({
          conversations: state.conversations.map(c =>
            c.id === id ? { ...c, starred: !c.starred } : c
          )
        }))
    }),
    {
      name: 'prompt-coach-chat',  // localStorage key
      version: 1                  // bump if the schema changes
    }
  )
);
