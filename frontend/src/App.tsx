// src/App.tsx
import { useState, useEffect } from 'react';
import { sendPrompt, fetchHistory } from './api';
import type { HistoryItem } from './types';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ───────────────────────────────────────────
     Load the last 20 history items on first render
  ──────────────────────────────────────────── */
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────────────────────────────────────────
     Send a prompt to the backend
  ──────────────────────────────────────────── */
  const handleSend = async () => {
    if (!prompt.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    // Optimistic update: add to history immediately
    const optimisticId = Date.now().toString();
    const optimisticItem: HistoryItem = {
      id: optimisticId,
      prompt: prompt.trim()
    };
    setHistory((prev) => [optimisticItem, ...prev]);

    try {
      const res = await sendPrompt(prompt.trim());
      setAnswer(res.answer);
      setPrompt('');
    } catch (err) {
      setError('❌ Failed to send prompt. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  /* ───────────────────────────────────────────
     Fetch history from the backend / local DB
  ──────────────────────────────────────────── */
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const items = await fetchHistory(20);
      setHistory(items);
    } catch (err) {
      setError('❌ Failed to load history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /* ───────────────────────────────────────────
     UI
  ──────────────────────────────────────────── */
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>

      {/* Prompt textarea */}
      <textarea
        className="border rounded p-2 w-full resize-y min-h-[100px] focus:outline-blue-500"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your prompt…"
        disabled={isSending}
      />

      {/* Send button */}
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
        onClick={handleSend}
        disabled={isSending || !prompt.trim()}
      >
        {isSending ? 'Sending…' : 'Send'}
      </button>

      {/* Latest answer */}
      {answer && (
        <section className="mt-6">
          <h2 className="font-semibold mb-1">Answer</h2>
          <p className="whitespace-pre-wrap border rounded p-3 bg-slate-50">
            {answer}
          </p>
        </section>
      )}

      {/* Error banner */}
      {error && (
        <p className="mt-4 text-red-600 font-semibold">{error}</p>
      )}

      {/* Load history */}
      <button
        className="mt-8 px-3 py-1 border rounded"
        onClick={loadHistory}
        disabled={isLoadingHistory}
      >
        {isLoadingHistory ? 'Loading…' : 'Reload history'}
      </button>

      {/* History list */}
      {history.length > 0 && (
        <ul className="mt-4 list-disc list-inside space-y-1">
          {history.map((item) => (
            <li key={item.id} className="truncate">
              {item.prompt}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
