// src/App.tsx
import { useState, useEffect } from 'react';
import { sendPrompt, fetchHistory } from './api';
import { WorkflowsPage } from './components/workflows/WorkflowsPage';
import type { HistoryItem } from './types';

type View = 'chat' | 'workflows';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('chat');
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
    if (currentView === 'chat') {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

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

  // Render workflows view
  if (currentView === 'workflows') {
    return (
      <div className="h-screen flex flex-col">
        {/* Navigation */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-900">AI Prompt Coach</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('chat')}
                className={`px-3 py-1 text-sm rounded-md ${
                  currentView === 'chat'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setCurrentView('workflows')}
                className={`px-3 py-1 text-sm rounded-md ${
                  currentView === 'workflows'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Workflows
              </button>
            </div>
          </div>
        </nav>
        
        <WorkflowsPage />
      </div>
    );
  }

  /* ───────────────────────────────────────────
     Chat UI (original)
  ──────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-900">AI Prompt Coach</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-3 py-1 text-sm rounded-md ${
                currentView === 'chat'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setCurrentView('workflows')}
              className={`px-3 py-1 text-sm rounded-md ${
                currentView === 'workflows'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Workflows
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-4">Chat</h2>

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
            <h3 className="font-semibold mb-1">Answer</h3>
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
    </div>
  );
}
