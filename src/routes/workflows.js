// PURPOSE: API routes for workflow management and execution
// PHASE: B
// STATUS: complete
// VERIFY: Authentication and authorization middleware needed

const express = require('express');
const { v4: uuidv4 } = require('uuid');

/**
 * Create workflow API routes
 * @param {Object} deps - Dependencies
 * @returns {express.Router} Configured router
 */
function createWorkflowRoutes(deps) {
  const router = express.Router();
  const { workflowEngine, connectorRegistry, logger } = deps;

  // Middleware for request logging
  router.use((req, res, next) => {
    const requestId = uuidv4();
    req.requestId = requestId;
    logger?.info('API Request', { 
      requestId, 
      method: req.method, 
      path: req.path,
      ip: req.ip 
    });
    next();
  });

  /**
   * POST /workflows/execute
   * Execute a workflow
   */
  router.post('/execute', async (req, res) => {
    try {
      const { 
        workflowId, 
        inputData = {}, 
        dryRun = false,
        triggerType = 'api' 
      } = req.body;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: 'workflowId is required'
        });
      }

      const result = await workflowEngine.executeWorkflow({
        workflowId,
        inputData,
        dryRun,
        triggerType,
        triggerData: {
          requestId: req.requestId,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });

      logger?.info('Workflow execution completed', { 
        requestId: req.requestId,
        workflowId,
        dryRun,
        success: result.success 
      });

      res.json(result);

    } catch (error) {
      logger?.error('Workflow execution failed', { 
        requestId: req.requestId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /workflows/:id/runs
   * Get workflow execution history
   */
  router.get('/:id/runs', async (req, res) => {
    try {
      const { id: workflowId } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        status,
        dryRun 
      } = req.query;

      // TODO: Implement database query for workflow runs
      const mockRuns = [
        {
          id: uuidv4(),
          workflowId,
          status: 'completed',
          dryRun: false,
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3500000).toISOString(),
          triggerType: 'manual'
        },
        {
          id: uuidv4(),
          workflowId,
          status: 'failed',
          dryRun: false,
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 7100000).toISOString(),
          triggerType: 'webhook',
          errorMessage: 'Connection timeout'
        }
      ];

      res.json({
        success: true,
        data: {
          runs: mockRuns,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: mockRuns.length,
            hasMore: false
          }
        }
      });

    } catch (error) {
      logger?.error('Failed to fetch workflow runs', { 
        requestId: req.requestId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow runs'
      });
    }
  });

  /**
   * GET /workflows/runs/:runId
   * Get specific workflow run details
   */
  router.get('/runs/:runId', async (req, res) => {
    try {
      const { runId } = req.params;

      // TODO: Implement database query for specific run
      const mockRun = {
        id: runId,
        workflowId: 'workflow-123',
        status: 'completed',
        dryRun: false,
        inputData: { userId: '123', action: 'process' },
        outputData: { result: 'success', processedAt: new Date().toISOString() },
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3500000).toISOString(),
        triggerType: 'api',
        nodeExecutions: [
          {
            id: uuidv4(),
            nodeId: 'start',
            nodeType: 'trigger',
            status: 'completed',
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: new Date(Date.now() - 3598000).toISOString(),
            outputData: { triggered: true }
          },
          {
            id: uuidv4(),
            nodeId: 'process',
            nodeType: 'transform.map',
            status: 'completed',
            startedAt: new Date(Date.now() - 3598000).toISOString(),
            completedAt: new Date(Date.now() - 3590000).toISOString(),
            inputData: { userId: '123' },
            outputData: { processedUserId: '123', timestamp: new Date().toISOString() }
          }
        ]
      };

      res.json({
        success: true,
        data: mockRun
      });

    } catch (error) {
      logger?.error('Failed to fetch workflow run', { 
        requestId: req.requestId,
        runId: req.params.runId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow run'
      });
    }
  });

  /**
   * POST /workflows/:id/test
   * Test workflow execution with dry run
   */
  router.post('/:id/test', async (req, res) => {
    try {
      const { id: workflowId } = req.params;
      const { inputData = {} } = req.body;

      const result = await workflowEngine.executeWorkflow({
        workflowId,
        inputData,
        dryRun: true,
        triggerType: 'test',
        triggerData: {
          requestId: req.requestId,
          testMode: true
        }
      });

      res.json(result);

    } catch (error) {
      logger?.error('Workflow test failed', { 
        requestId: req.requestId,
        workflowId: req.params.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Workflow test failed'
      });
    }
  });

  /**
   * GET /connectors
   * List available connectors
   */
  router.get('/connectors', async (req, res) => {
    try {
      const { category, status, page, limit } = req.query;
      
      const result = await connectorRegistry.listConnectors({
        category,
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      });

      res.json(result);

    } catch (error) {
      logger?.error('Failed to list connectors', { 
        requestId: req.requestId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to list connectors'
      });
    }
  });

  /**
   * GET /connectors/:slug
   * Get specific connector details
   */
  router.get('/connectors/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const { version } = req.query;
      
      const result = await connectorRegistry.getConnector(slug, version);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);

    } catch (error) {
      logger?.error('Failed to get connector', { 
        requestId: req.requestId,
        slug: req.params.slug,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get connector'
      });
    }
  });

  /**
   * POST /connectors
   * Register a new connector
   */
  router.post('/connectors', async (req, res) => {
    try {
      const connectorDef = req.body;
      
      if (!connectorDef.slug || !connectorDef.name || !connectorDef.definition) {
        return res.status(400).json({
          success: false,
          error: 'slug, name, and definition are required'
        });
      }

      const result = await connectorRegistry.registerConnector(connectorDef);
      
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (error) {
      logger?.error('Failed to register connector', { 
        requestId: req.requestId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to register connector'
      });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        phase: 'B'
      }
    });
  });

  // Error handling middleware
  router.use((error, req, res, next) => {
    logger?.error('API Error', { 
      requestId: req.requestId,
      error: error.message,
      stack: error.stack 
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  return router;
}

module.exports = { createWorkflowRoutes };