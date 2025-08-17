// PURPOSE: API routes for workflow management (CRUD operations)
// PHASE: A
// STATUS: partial
// VERIFY: API response format compliance
// TODO:
// 1. Add authentication middleware
// 2. Add request validation
// 3. Add pagination for list endpoints
// 4. Add bulk operations
// 5. Add advanced filtering

const express = require('express');
const router = express.Router();
const { WorkflowModel, WorkflowVersionModel, WorkflowRunModel, TriggerModel } = require('../models');
const { workflowRunnerService } = require('../services/WorkflowRunnerService');

/**
 * Create new workflow
 * POST /api/workflows
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, tags } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Workflow name is required' 
      });
    }

    const workflow = await WorkflowModel.create({
      name,
      description,
      tags,
      createdBy: req.user?.id || 'anonymous' // TODO: Add proper auth
    });

    res.status(201).json({ 
      success: true, 
      data: workflow 
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create workflow' 
    });
  }
});

/**
 * List workflows
 * GET /api/workflows
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const workflows = await WorkflowModel.list({ limit });

    res.json({ 
      success: true, 
      data: workflows 
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list workflows' 
    });
  }
});

/**
 * Get workflow by ID
 * GET /api/workflows/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const workflow = await WorkflowModel.findById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }

    res.json({ 
      success: true, 
      data: workflow 
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflow' 
    });
  }
});

/**
 * Create workflow version
 * POST /api/workflows/:id/versions
 */
router.post('/:id/versions', async (req, res) => {
  try {
    const { nodes, edges, settings } = req.body;
    const workflowId = req.params.id;

    // Get current version number
    const latestVersion = await WorkflowVersionModel.getLatest(workflowId);
    const version = latestVersion ? latestVersion.version + 1 : 1;

    const workflowVersion = await WorkflowVersionModel.create({
      workflowId,
      version,
      nodes: nodes || [],
      edges: edges || [],
      settings: settings || {},
      createdBy: req.user?.id || 'anonymous'
    });

    res.status(201).json({ 
      success: true, 
      data: workflowVersion 
    });
  } catch (error) {
    console.error('Error creating workflow version:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create workflow version' 
    });
  }
});

/**
 * Get workflow version
 * GET /api/workflows/:id/versions/:versionId
 */
router.get('/:id/versions/:versionId', async (req, res) => {
  try {
    const version = await WorkflowVersionModel.findById(req.params.versionId);
    
    if (!version || version.workflowId !== req.params.id) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow version not found' 
      });
    }

    res.json({ 
      success: true, 
      data: version 
    });
  } catch (error) {
    console.error('Error getting workflow version:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflow version' 
    });
  }
});

/**
 * Execute workflow
 * POST /api/workflows/:id/execute
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const { input = {}, versionId } = req.body;

    const run = await workflowRunnerService.startWorkflow(workflowId, input, {
      version: versionId
    });

    res.status(201).json({ 
      success: true, 
      data: run 
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to execute workflow' 
    });
  }
});

/**
 * Get workflow runs
 * GET /api/workflows/:id/runs
 */
router.get('/:id/runs', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const limit = parseInt(req.query.limit) || 20;

    // TODO: Add proper filtering by workflowId
    const runs = await WorkflowRunModel.collection
      .where('workflowId', '==', workflowId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const runData = runs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ 
      success: true, 
      data: runData 
    });
  } catch (error) {
    console.error('Error getting workflow runs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflow runs' 
    });
  }
});

/**
 * Get specific workflow run
 * GET /api/workflows/:id/runs/:runId
 */
router.get('/:id/runs/:runId', async (req, res) => {
  try {
    const run = await WorkflowRunModel.collection.doc(req.params.runId).get();
    
    if (!run.exists || run.data().workflowId !== req.params.id) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow run not found' 
      });
    }

    res.json({ 
      success: true, 
      data: { id: run.id, ...run.data() } 
    });
  } catch (error) {
    console.error('Error getting workflow run:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflow run' 
    });
  }
});

/**
 * Cancel workflow run
 * POST /api/workflows/:id/runs/:runId/cancel
 */
router.post('/:id/runs/:runId/cancel', async (req, res) => {
  try {
    const runId = req.params.runId;
    const cancelled = await workflowRunnerService.cancelWorkflowRun(runId);
    
    if (!cancelled) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow run not found or not running' 
      });
    }

    res.json({ 
      success: true, 
      data: { runId, cancelled: true } 
    });
  } catch (error) {
    console.error('Error cancelling workflow run:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel workflow run' 
    });
  }
});

/**
 * Create trigger for workflow
 * POST /api/workflows/:id/triggers
 */
router.post('/:id/triggers', async (req, res) => {
  try {
    const { type, config } = req.body;
    const workflowId = req.params.id;

    if (!type || !['manual', 'webhook', 'cron', 'event'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid trigger type' 
      });
    }

    const trigger = await TriggerModel.create({
      workflowId,
      type,
      config: config || {}
    });

    res.status(201).json({ 
      success: true, 
      data: trigger 
    });
  } catch (error) {
    console.error('Error creating trigger:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create trigger' 
    });
  }
});

/**
 * Get workflow triggers
 * GET /api/workflows/:id/triggers
 */
router.get('/:id/triggers', async (req, res) => {
  try {
    const triggers = await TriggerModel.findByWorkflow(req.params.id);

    res.json({ 
      success: true, 
      data: triggers 
    });
  } catch (error) {
    console.error('Error getting triggers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get triggers' 
    });
  }
});

module.exports = router;