// src/components/Chat.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendPrompt as apiSendPrompt } from '../api';
import { Message } from '../types';
import RAGSettings from './RAGSettings';

const Chat = () => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableRAG, setEnableRAG] = useState(false);
  const [showRAGSettings, setShowRAGSettings] = useState(false);

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

  const handleSendPrompt = async () => {
    if (!prompt.trim() || loading) return;

    // 1) push user message locally
    const userMsg: Message = { role: 'user', content: prompt.trim() };
    addMessage(userMsg);
    
    const currentPrompt = prompt.trim();
    setPrompt('');
    setLoading(true);

    try {
      // 2) call backend with RAG option
      const response = await apiSendPrompt(currentPrompt, enableRAG);
      
      // 3) push assistant message with metadata
      const assistantMsg: Message = { 
        role: 'assistant', 
        content: response.success ? response.data?.answer || 'No response' : 'Error: ' + response.error,
        metadata: response.data?.metadata
      };
      addMessage(assistantMsg);
    } catch (error) {
      console.error('Failed to send prompt:', error);
      const errorMsg: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your request.'
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
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
              {/* RAG metadata display */}
              {m.metadata && m.role === 'assistant' && (
                <div className="mt-2 text-xs opacity-70 border-t pt-2">
                  {m.metadata.ragUsed && (
                    <div className="space-y-1">
                      <div>🔍 RAG: {m.metadata.retrievedChunks || 0} chunks retrieved</div>
                      {m.metadata.contextLength && (
                        <div>📄 Context: {m.metadata.contextLength} chars</div>
                      )}
                      {m.metadata.sources && m.metadata.sources.length > 0 && (
                        <div>📚 Sources: {m.metadata.sources.length} documents</div>
                      )}
                      {m.metadata.fallback && (
                        <div>⚠️ Fallback: RAG failed, used standard generation</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* RAG Settings Panel */}
      {showRAGSettings && (
        <div className="border-t p-4">
          <RAGSettings 
            enableRAG={enableRAG} 
            onToggleRAG={setEnableRAG} 
          />
        </div>
      )}

      {/* input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={enableRAG}
              onChange={(e) => setEnableRAG(e.target.checked)}
              className="mr-1"
            />
            Use RAG
          </label>
          <button
            onClick={() => setShowRAGSettings(!showRAGSettings)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showRAGSettings ? 'Hide' : 'Show'} RAG Settings
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex gap-2"
        >
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Type a prompt…"
            rows={1}
            className="flex-1 resize-none border rounded-lg p-2"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !prompt.trim()}
            className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Chat;
