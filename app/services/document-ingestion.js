// PURPOSE: Document ingestion and chunking service for RAG
// PHASE: C
// STATUS: skeleton
// VERIFY: Optimal chunk sizes and overlap strategies
// TODO:
// 1. Add PDF and HTML parsing
// 2. Implement semantic chunking
// 3. Add metadata extraction

const { documentsCol, chunksCol, embeddingsCol } = require('../lib/rag-firestore');
const { EmbeddingService } = require('./embedding-service');

class DocumentIngestionService {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.defaultChunkSize = 1000; // characters
    this.defaultOverlap = 200; // characters
  }

  /**
   * Ingest a document and create chunks with embeddings
   * @param {Object} document - Document to ingest
   * @param {string} document.title - Document title
   * @param {string} document.content - Document content
   * @param {string} document.source - Document source
   * @param {string} document.contentType - Content type
   * @param {Object} document.metadata - Additional metadata
   * @returns {Promise<string>} - Document ID
   */
  async ingestDocument(document) {
    try {
      const { title, content, source, contentType = 'text', metadata = {} } = document;

      if (!title || !content) {
        throw new Error("Document title and content are required");
      }

      // Create document record
      const docData = {
        title,
        content,
        source,
        contentType,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        indexed: false,
        chunkCount: 0
      };

      const docRef = await documentsCol.add(docData);
      const documentId = docRef.id;

      // Create chunks
      const chunks = this.createChunks(content, documentId);
      const chunkRefs = [];

      // Store chunks
      for (const chunk of chunks) {
        const chunkRef = await chunksCol.add(chunk);
        chunkRefs.push({ id: chunkRef.id, ...chunk });
      }

      // Generate embeddings for chunks
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(chunkTexts);

      // Store embeddings
      for (let i = 0; i < embeddings.length; i++) {
        const embeddingData = {
          chunkId: chunkRefs[i].id,
          documentId,
          embedding: embeddings[i],
          model: this.embeddingService.embeddingModel,
          createdAt: new Date()
        };
        await embeddingsCol.add(embeddingData);
      }

      // Update document with chunk count and indexed status
      await docRef.update({
        chunkCount: chunks.length,
        indexed: true,
        updatedAt: new Date()
      });

      console.log(`Successfully ingested document "${title}" with ${chunks.length} chunks`);
      return documentId;

    } catch (error) {
      console.error("Document ingestion error:", error);
      throw new Error(`Failed to ingest document: ${error.message}`);
    }
  }

  /**
   * Create text chunks from document content
   * @param {string} content - Document content
   * @param {string} documentId - Document ID
   * @returns {Array} - Array of chunk objects
   */
  createChunks(content, documentId) {
    const chunks = [];
    const chunkSize = this.defaultChunkSize;
    const overlap = this.defaultOverlap;

    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < content.length) {
      const endPos = Math.min(startPos + chunkSize, content.length);
      let chunkContent = content.slice(startPos, endPos);

      // Try to break at word boundaries if not at end of content
      if (endPos < content.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(' ');
        if (lastSpaceIndex > chunkSize * 0.8) { // Only adjust if space is reasonably close to end
          chunkContent = chunkContent.slice(0, lastSpaceIndex);
        }
      }

      const chunk = {
        documentId,
        content: chunkContent.trim(),
        chunkIndex,
        startPos,
        endPos: startPos + chunkContent.length,
        metadata: {
          length: chunkContent.length
        },
        createdAt: new Date()
      };

      chunks.push(chunk);

      // Move start position, accounting for overlap
      startPos = Math.max(startPos + chunkContent.length - overlap, startPos + 1);
      chunkIndex++;

      // Prevent infinite loop
      if (startPos >= content.length) break;
    }

    return chunks;
  }

  /**
   * Delete a document and all its chunks/embeddings
   * @param {string} documentId - Document ID to delete
   */
  async deleteDocument(documentId) {
    try {
      // Delete embeddings
      const embeddingsSnapshot = await embeddingsCol.where('documentId', '==', documentId).get();
      const embeddingDeletePromises = embeddingsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(embeddingDeletePromises);

      // Delete chunks
      const chunksSnapshot = await chunksCol.where('documentId', '==', documentId).get();
      const chunkDeletePromises = chunksSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(chunkDeletePromises);

      // Delete document
      await documentsCol.doc(documentId).delete();

      console.log(`Successfully deleted document ${documentId} and all related data`);
    } catch (error) {
      console.error("Document deletion error:", error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
}

module.exports = { DocumentIngestionService };