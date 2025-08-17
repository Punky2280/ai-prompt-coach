// PURPOSE: RAG document management API routes
// PHASE: C
// STATUS: partial
// VERIFY: Authentication and authorization requirements
// TODO:
// 1. Add authentication middleware
// 2. Add input validation and sanitization
// 3. Add rate limiting

const express = require('express');
const router = express.Router();
const { DocumentIngestionService } = require('../services/document-ingestion');
const { RAGRetrievalService } = require('../services/rag-retrieval');

const ingestionService = new DocumentIngestionService();
const retrievalService = new RAGRetrievalService();

/**
 * POST /api/rag/documents - Ingest a new document
 * Body: {
 *   title: string,
 *   content: string,
 *   source: string,
 *   contentType?: string,
 *   metadata?: object
 * }
 */
router.post('/documents', async (req, res) => {
  try {
    const { title, content, source, contentType, metadata } = req.body;

    // Basic validation
    if (!title || !content || !source) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and source are required'
      });
    }

    if (typeof title !== 'string' || typeof content !== 'string' || typeof source !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and source must be strings'
      });
    }

    if (content.length > 1000000) { // 1MB limit
      return res.status(400).json({
        success: false,
        error: 'Content too large (max 1MB)'
      });
    }

    // Feature flag check
    if (process.env.RAG_ENABLED !== 'true') {
      return res.status(501).json({
        success: false,
        error: 'RAG functionality is not enabled'
      });
    }

    const documentId = await ingestionService.ingestDocument({
      title: title.trim(),
      content: content.trim(),
      source: source.trim(),
      contentType: contentType || 'text',
      metadata: metadata || {}
    });

    res.json({
      success: true,
      data: {
        documentId,
        message: 'Document successfully ingested and indexed'
      }
    });

  } catch (error) {
    console.error('Document ingestion API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest document'
    });
  }
});

/**
 * GET /api/rag/documents - List documents
 * Query: limit?, offset?
 */
router.get('/documents', async (req, res) => {
  try {
    if (process.env.RAG_ENABLED !== 'true') {
      return res.status(501).json({
        success: false,
        error: 'RAG functionality is not enabled'
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search;

    let documents;
    if (search) {
      documents = await retrievalService.searchDocuments(search);
      documents = documents.slice(0, limit); // Apply limit to search results
    } else {
      // Get all documents (in production, implement proper pagination)
      const stats = await retrievalService.getDocumentStats();
      documents = []; // Placeholder - would need to implement document listing
    }

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length
      }
    });

  } catch (error) {
    console.error('Document listing API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list documents'
    });
  }
});

/**
 * DELETE /api/rag/documents/:id - Delete a document
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    if (process.env.RAG_ENABLED !== 'true') {
      return res.status(501).json({
        success: false,
        error: 'RAG functionality is not enabled'
      });
    }

    const documentId = req.params.id;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    await ingestionService.deleteDocument(documentId);

    res.json({
      success: true,
      data: {
        message: 'Document successfully deleted'
      }
    });

  } catch (error) {
    console.error('Document deletion API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

/**
 * POST /api/rag/search - Search for relevant chunks
 * Body: {
 *   query: string,
 *   topK?: number,
 *   threshold?: number
 * }
 */
router.post('/search', async (req, res) => {
  try {
    if (process.env.RAG_ENABLED !== 'true') {
      return res.status(501).json({
        success: false,
        error: 'RAG functionality is not enabled'
      });
    }

    const { query, topK, threshold } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const relevantChunks = await retrievalService.retrieveRelevantChunks(query, {
      topK: topK || 5,
      threshold: threshold || 0.7
    });

    res.json({
      success: true,
      data: {
        query,
        chunks: relevantChunks,
        total: relevantChunks.length
      }
    });

  } catch (error) {
    console.error('RAG search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search documents'
    });
  }
});

/**
 * GET /api/rag/stats - Get RAG system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    if (process.env.RAG_ENABLED !== 'true') {
      return res.status(501).json({
        success: false,
        error: 'RAG functionality is not enabled'
      });
    }

    const stats = await retrievalService.getDocumentStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('RAG stats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RAG statistics'
    });
  }
});

module.exports = router;