// PURPOSE: RAG-enhanced prompt service integrating retrieval with generation
// PHASE: C
// STATUS: partial
// VERIFY: Integration with existing gemini service
// TODO:
// 1. Add caching for retrieved contexts
// 2. Implement query analysis and routing
// 3. Add response confidence scoring

const { generateText } = require('./gemini');
const { RAGRetrievalService } = require('./rag-retrieval');

class RAGPromptService {
  constructor() {
    this.retrievalService = new RAGRetrievalService();
    this.maxContextLength = 4000; // characters
  }

  /**
   * Process prompt with RAG enhancement
   * @param {string} prompt - User prompt
   * @param {Object} options - Processing options
   * @param {boolean} options.enableRAG - Whether to use RAG
   * @param {string} options.model - LLM model to use
   * @param {number} options.topK - Number of documents to retrieve
   * @param {number} options.threshold - Similarity threshold
   * @returns {Promise<Object>} - Enhanced response with metadata
   */
  async processPrompt(prompt, options = {}) {
    try {
      const {
        enableRAG = process.env.RAG_ENABLED === 'true',
        model,
        topK = 5,
        threshold = 0.7,
        temperature,
        maxOutputTokens
      } = options;

      let response;
      let metadata = {
        ragUsed: false,
        retrievedChunks: 0,
        contextLength: 0
      };

      if (enableRAG) {
        // Retrieve relevant context
        const relevantChunks = await this.retrievalService.retrieveRelevantChunks(
          prompt,
          { topK, threshold }
        );

        if (relevantChunks.length > 0) {
          // Combine context from chunks
          const context = this.combineContext(relevantChunks);
          
          // Generate augmented prompt
          const augmentedPrompt = this.retrievalService.generateAugmentedPrompt(
            prompt,
            context
          );

          // Generate response with context
          response = await generateText(augmentedPrompt, {
            model,
            temperature,
            maxOutputTokens
          });

          metadata = {
            ragUsed: true,
            retrievedChunks: relevantChunks.length,
            contextLength: context.length,
            sources: this.extractSources(relevantChunks),
            similarities: relevantChunks.map(chunk => ({
              chunkId: chunk.chunkId,
              similarity: chunk.similarity
            }))
          };
        } else {
          // No relevant context found, use original prompt
          response = await generateText(prompt, {
            model,
            temperature,
            maxOutputTokens
          });
          
          metadata.ragUsed = true; // RAG was attempted
          metadata.noRelevantContext = true;
        }
      } else {
        // Standard generation without RAG
        response = await generateText(prompt, {
          model,
          temperature,
          maxOutputTokens
        });
      }

      return {
        answer: response,
        metadata
      };

    } catch (error) {
      console.error("RAG prompt processing error:", error);
      throw new Error(`Failed to process prompt with RAG: ${error.message}`);
    }
  }

  /**
   * Combine context from multiple chunks intelligently
   * @param {Array} chunks - Retrieved chunks
   * @returns {string} - Combined context
   */
  combineContext(chunks) {
    let context = '';
    let currentLength = 0;

    // Sort by similarity (highest first)
    const sortedChunks = chunks.sort((a, b) => b.similarity - a.similarity);

    for (const chunk of sortedChunks) {
      const chunkText = `[Source: Chunk ${chunk.chunkIndex}]\n${chunk.content}\n\n`;
      
      if (currentLength + chunkText.length <= this.maxContextLength) {
        context += chunkText;
        currentLength += chunkText.length;
      } else {
        // Try to fit partial chunk if there's remaining space
        const remainingSpace = this.maxContextLength - currentLength;
        if (remainingSpace > 100) { // Only add if meaningful space left
          const partialChunk = chunkText.substring(0, remainingSpace - 10) + '...';
          context += partialChunk;
        }
        break;
      }
    }

    return context.trim();
  }

  /**
   * Extract source information from chunks
   * @param {Array} chunks - Retrieved chunks
   * @returns {Array} - Source information
   */
  extractSources(chunks) {
    const sources = new Set();
    
    chunks.forEach(chunk => {
      sources.add(chunk.documentId);
    });

    return Array.from(sources);
  }

  /**
   * Analyze query to determine if RAG would be beneficial
   * @param {string} query - User query
   * @returns {boolean} - Whether RAG should be used
   */
  shouldUseRAG(query) {
    // Simple heuristics - in production, could use ML model
    const ragIndicators = [
      'what is',
      'explain',
      'how does',
      'define',
      'tell me about',
      'describe',
      'according to',
      'based on',
      'information about'
    ];

    const queryLower = query.toLowerCase();
    return ragIndicators.some(indicator => queryLower.includes(indicator));
  }

  /**
   * Get RAG service statistics
   * @returns {Promise<Object>} - Service statistics
   */
  async getStats() {
    try {
      return await this.retrievalService.getDocumentStats();
    } catch (error) {
      console.error("Error getting RAG stats:", error);
      throw error;
    }
  }
}

module.exports = { RAGPromptService };