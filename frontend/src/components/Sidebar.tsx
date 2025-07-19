// src/components/Sidebar.tsx
import React from 'react';
import { Plus, Star } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import clsx from 'clsx';

const Sidebar = () => {
  const {
    conversations,
    activeId,
    newConversation,
    setActive,
    toggleStar
  } = useChatStore(state => ({
    conversations: state.conversations,
    activeId: state.activeId,
    newConversation: state.newConversation,
    setActive: state.setActive,
    toggleStar: state.toggleStar
  }));

  // sort: starred first, then recent
  const sorted = [...conversations].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <aside className="w-64 bg-slate-800 text-white flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <h1 className="font-semibold">Prompt Coach</h1>
        <button
          onClick={newConversation}
          className="p-1 rounded hover:bg-slate-700"
          title="New chat"
        >
          <Plus size={18} />
        </button>
      </header>

      <nav className="flex-1 overflow-y-auto">
        {sorted.map(c => (
          <div
            key={c.id}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-700',
              c.id === activeId && 'bg-slate-700'
            )}
            onClick={() => setActive(c.id)}
          >
            <button
              onClick={e => {
                e.stopPropagation();
                toggleStar(c.id);
              }}
              className="opacity-75 hover:opacity-100"
            >
              <Star
                size={14}
                className={clsx(c.starred ? 'fill-yellow-400 text-yellow-400' : '')}
              />
            </button>
            <span className="truncate">{c.title}</span>
          </div>
        ))}
      </nav>

      <footer className="p-4 border-t border-slate-700 text-xs opacity-60">
        v0.1
      </footer>
    </aside>
  );
};

export default Sidebar;
