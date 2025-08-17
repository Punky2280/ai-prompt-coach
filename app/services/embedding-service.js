// PURPOSE: Embedding service for RAG document vectorization
// PHASE: C
// STATUS: skeleton
// VERIFY: Gemini embedding model capabilities and dimensions
// TODO:
// 1. Implement batch embedding processing
// 2. Add embedding caching
// 3. Add error handling and retries

const { GoogleGenerativeAI } = require("@google/generative-ai");

class EmbeddingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = "text-embedding-004"; // Latest Gemini embedding model
    this.dimensions = 768; // Standard embedding dimensions
  }

  /**
   * Generate embeddings for text chunks
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error("Text cannot be empty for embedding generation");
      }

      const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error("Invalid embedding response from Gemini");
      }

      return result.embedding.values;
    } catch (error) {
      console.error("Embedding generation error:", error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    try {
      const embeddings = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => this.generateEmbedding(text));
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return embeddings;
    } catch (error) {
      console.error("Batch embedding generation error:", error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param {number[]} a - First embedding vector
   * @param {number[]} b - Second embedding vector
   * @returns {number} - Similarity score between 0 and 1
   */
  calculateSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error("Embedding vectors must have same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

module.exports = { EmbeddingService };