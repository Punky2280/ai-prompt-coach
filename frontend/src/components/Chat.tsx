// src/components/Chat.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { Message } from '../types';

const Chat = () => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');

  const { activeId, conversations, addMessage } = useChatStore();

  const activeConv = conversations.find(c => c.id === activeId);

  // autoscroll
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [
    activeConv?.messages
  ]);

  if (!activeConv) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select or create a conversation
      </div>
    );
  }

  const sendPrompt = async () => {
    if (!prompt.trim()) return;

    // 1) push user message locally
    const userMsg: Message = { role: 'user', content: prompt.trim() };
    addMessage(userMsg);
    setPrompt('');

    // 2) call backend
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userMsg.content })
    });
    const data = await res.json();

    // 3) push assistant message
    const assistantMsg: Message = { role: 'assistant', content: data.text };
    addMessage(assistantMsg);
  };

  return (
    <section className="flex-1 flex flex-col">
      {/* messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {activeConv.messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xl ${
              m.role === 'user' ? 'ml-auto text-right' : 'mr-auto'
            }`}
          >
            <div
              className={`whitespace-pre-wrap rounded-lg px-4 py-2 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-gray-900'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="border-t p-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendPrompt();
          }}
          className="flex gap-2"
        >
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Type a prompt…"
            rows={1}
            className="flex-1 resize-none border rounded-lg p-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 rounded">
            Send
          </button>
        </form>
      </div>
    </section>
  );
};

export default Chat;
