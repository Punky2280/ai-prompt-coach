// PURPOSE: RAG document management and vector storage
// PHASE: C
// STATUS: skeleton
// VERIFY: Firestore vector search capabilities, embedding dimensions
// TODO:
// 1. Implement document ingestion
// 2. Add vector similarity search
// 3. Add chunking strategies

const { db } = require('./firestore');

// RAG Collections
const documentsCol = db.collection('rag_documents');
const chunksCol = db.collection('rag_chunks');
const embeddingsCol = db.collection('rag_embeddings');

/**
 * RAG Document Schema:
 * {
 *   id: string,
 *   title: string,
 *   content: string,
 *   source: string,
 *   contentType: 'text' | 'pdf' | 'html' | 'markdown',
 *   metadata: object,
 *   createdAt: Date,
 *   updatedAt: Date,
 *   indexed: boolean,
 *   chunkCount: number
 * }
 */

/**
 * RAG Chunk Schema:
 * {
 *   id: string,
 *   documentId: string,
 *   content: string,
 *   chunkIndex: number,
 *   startPos: number,
 *   endPos: number,
 *   metadata: object,
 *   createdAt: Date
 * }
 */

/**
 * RAG Embedding Schema:
 * {
 *   id: string,
 *   chunkId: string,
 *   documentId: string,
 *   embedding: number[], // 768-dim vector for text-embedding-ada-002
 *   model: string,
 *   createdAt: Date
 * }
 */

module.exports = {
  db,
  documentsCol,
  chunksCol,
  embeddingsCol
};