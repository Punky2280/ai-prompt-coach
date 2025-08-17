// src/components/RAGSettings.tsx
import React, { useState, useEffect } from 'react';
import { getRagStats, ingestDocument } from '../api';
import type { RAGStats } from '../types';

interface RAGSettingsProps {
  enableRAG: boolean;
  onToggleRAG: (enabled: boolean) => void;
}

const RAGSettings: React.FC<RAGSettingsProps> = ({ enableRAG, onToggleRAG }) => {
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    content: '',
    source: '',
    contentType: 'text'
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getRagStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch RAG stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enableRAG) {
      fetchStats();
    }
  }, [enableRAG]);

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await ingestDocument({
        title: documentForm.title,
        content: documentForm.content,
        source: documentForm.source,
        contentType: documentForm.contentType
      });

      if (response.success) {
        alert('Document ingested successfully!');
        setDocumentForm({ title: '', content: '', source: '', contentType: 'text' });
        setShowDocumentForm(false);
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to ingest document:', error);
      alert('Failed to ingest document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">RAG Settings</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={enableRAG}
            onChange={(e) => onToggleRAG(e.target.checked)}
            className="mr-2"
          />
          Enable RAG
        </label>
      </div>

      {enableRAG && (
        <div className="space-y-4">
          {/* Statistics */}
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium mb-2">Knowledge Base Statistics</h4>
            {loading ? (
              <div>Loading stats...</div>
            ) : stats ? (
              <div className="text-sm space-y-1">
                <div>Documents: {stats.indexedDocuments}/{stats.totalDocuments}</div>
                <div>Chunks: {stats.totalChunks}</div>
                <div>Embeddings: {stats.totalEmbeddings}</div>
                {Object.keys(stats.documentTypes).length > 0 && (
                  <div>
                    Types: {Object.entries(stats.documentTypes)
                      .map(([type, count]) => `${type}(${count})`)
                      .join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No stats available</div>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {/* Document Ingestion */}
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Add Document</h4>
              <button
                onClick={() => setShowDocumentForm(!showDocumentForm)}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                {showDocumentForm ? 'Cancel' : 'Add Document'}
              </button>
            </div>

            {showDocumentForm && (
              <form onSubmit={handleDocumentSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Document title"
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Source (e.g., URL, book name)"
                  value={documentForm.source}
                  onChange={(e) => setDocumentForm({...documentForm, source: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
                <select
                  value={documentForm.contentType}
                  onChange={(e) => setDocumentForm({...documentForm, contentType: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="text">Text</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                </select>
                <textarea
                  placeholder="Document content"
                  value={documentForm.content}
                  onChange={(e) => setDocumentForm({...documentForm, content: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm h-32"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Ingesting...' : 'Add Document'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGSettings;