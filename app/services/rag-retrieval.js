// PURPOSE: RAG retrieval service with vector similarity search
// PHASE: C
// STATUS: skeleton
// VERIFY: Firestore query limitations, optimal retrieval strategies
// TODO:
// 1. Implement hybrid search (semantic + keyword)
// 2. Add result reranking
// 3. Add query expansion

const { embeddingsCol, chunksCol, documentsCol } = require('../lib/rag-firestore');
const { EmbeddingService } = require('./embedding-service');

class RAGRetrievalService {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.defaultTopK = 5;
    this.similarityThreshold = 0.7;
  }

  /**
   * Retrieve relevant chunks for a query
   * @param {string} query - User query
   * @param {Object} options - Retrieval options
   * @param {number} options.topK - Number of chunks to retrieve
   * @param {number} options.threshold - Minimum similarity threshold
   * @returns {Promise<Array>} - Relevant chunks with scores
   */
  async retrieveRelevantChunks(query, options = {}) {
    try {
      const { topK = this.defaultTopK, threshold = this.similarityThreshold } = options;

      if (!query || query.trim().length === 0) {
        throw new Error("Query cannot be empty");
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Get all embeddings (note: this is not optimal for large datasets)
      // In production, would use vector database like Pinecone, Weaviate, etc.
      const embeddingsSnapshot = await embeddingsCol.get();
      const similarities = [];

      // Calculate similarities
      for (const embeddingDoc of embeddingsSnapshot.docs) {
        const embeddingData = embeddingDoc.data();
        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          embeddingData.embedding
        );

        if (similarity >= threshold) {
          similarities.push({
            id: embeddingDoc.id,
            chunkId: embeddingData.chunkId,
            documentId: embeddingData.documentId,
            similarity,
            model: embeddingData.model
          });
        }
      }

      // Sort by similarity and take top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topResults = similarities.slice(0, topK);

      // Fetch chunk content for top results
      const enrichedResults = [];
      for (const result of topResults) {
        const chunkDoc = await chunksCol.doc(result.chunkId).get();
        if (chunkDoc.exists) {
          const chunkData = chunkDoc.data();
          enrichedResults.push({
            ...result,
            content: chunkData.content,
            chunkIndex: chunkData.chunkIndex,
            metadata: chunkData.metadata
          });
        }
      }

      return enrichedResults;
    } catch (error) {
      console.error("RAG retrieval error:", error);
      throw new Error(`Failed to retrieve relevant chunks: ${error.message}`);
    }
  }

  /**
   * Generate RAG-augmented response
   * @param {string} query - User query
   * @param {string} context - Retrieved context
   * @returns {string} - Augmented prompt
   */
  generateAugmentedPrompt(query, context) {
    return `Based on the following context, please answer the user's question. If the context doesn't contain relevant information, say so clearly.

Context:
${context}

User Question: ${query}

Please provide a helpful and accurate response based on the context provided.`;
  }

  /**
   * Get document statistics
   * @returns {Promise<Object>} - Statistics about indexed documents
   */
  async getDocumentStats() {
    try {
      const documentsSnapshot = await documentsCol.get();
      const chunksSnapshot = await chunksCol.get();
      const embeddingsSnapshot = await embeddingsCol.get();

      const documents = documentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const stats = {
        totalDocuments: documents.length,
        indexedDocuments: documents.filter(doc => doc.indexed).length,
        totalChunks: chunksSnapshot.size,
        totalEmbeddings: embeddingsSnapshot.size,
        documentTypes: {}
      };

      // Count by content type
      documents.forEach(doc => {
        const type = doc.contentType || 'unknown';
        stats.documentTypes[type] = (stats.documentTypes[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error getting document stats:", error);
      throw new Error(`Failed to get document statistics: ${error.message}`);
    }
  }

  /**
   * Search documents by title or metadata
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Matching documents
   */
  async searchDocuments(searchTerm) {
    try {
      const documentsSnapshot = await documentsCol.get();
      const documents = documentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const searchTermLower = searchTerm.toLowerCase();
      
      return documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTermLower) ||
        doc.source.toLowerCase().includes(searchTermLower) ||
        (doc.metadata && JSON.stringify(doc.metadata).toLowerCase().includes(searchTermLower))
      );
    } catch (error) {
      console.error("Document search error:", error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }
}

module.exports = { RAGRetrievalService };