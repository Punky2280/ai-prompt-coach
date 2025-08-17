// routes/workflows.js
// PURPOSE: Workflow management API endpoints
// Follows existing route patterns from prompts.js

const express = require('express');
const router = express.Router();
const { workflowsCol, workflowRunsCol, workflowStepsCol } = require('../lib/firestore');
const { workflowRunnerService } = require('../services/workflows/WorkflowRunnerService');

// GET /workflows - List workflows
router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const snap = await workflowsCol
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const workflows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ 
      success: true, 
      data: workflows 
    });
  } catch (error) {
    console.error('GET /workflows error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch workflows' 
    });
  }
});

// POST /workflows - Create new workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, nodes = [], edges = [], config = {} } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Workflow name is required' 
      });
    }

    const workflowData = {
      name: name.trim(),
      description: description || '',
      nodes,
      edges,
      config,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await workflowsCol.add(workflowData);
    
    res.json({ 
      success: true, 
      data: { id: docRef.id, ...workflowData } 
    });
  } catch (error) {
    console.error('POST /workflows error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create workflow' 
    });
  }
});

// GET /workflows/:id - Get workflow by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await workflowsCol.doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }

    res.json({ 
      success: true, 
      data: { id: doc.id, ...doc.data() } 
    });
  } catch (error) {
    console.error(`GET /workflows/${req.params.id} error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch workflow' 
    });
  }
});

// PUT /workflows/:id - Update workflow
router.put('/:id', async (req, res) => {
  try {
    const { name, description, nodes, edges, config, status } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;

    await workflowsCol.doc(req.params.id).update(updateData);

    const updated = await workflowsCol.doc(req.params.id).get();
    res.json({ 
      success: true, 
      data: { id: updated.id, ...updated.data() } 
    });
  } catch (error) {
    console.error(`PUT /workflows/${req.params.id} error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update workflow' 
    });
  }
});

// DELETE /workflows/:id - Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    await workflowsCol.doc(req.params.id).delete();
    
    res.json({ 
      success: true, 
      data: { message: 'Workflow deleted successfully' } 
    });
  } catch (error) {
    console.error(`DELETE /workflows/${req.params.id} error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete workflow' 
    });
  }
});

// POST /workflows/:id/trigger - Trigger workflow execution (manual)
router.post('/:id/trigger', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const triggerContext = req.body || {};

    // Verify workflow exists
    const workflowDoc = await workflowsCol.doc(workflowId).get();
    if (!workflowDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }

    // Start the workflow run
    const runId = await workflowRunnerService.startRun(workflowId, triggerContext);

    res.json({ 
      success: true, 
      data: { runId, workflowId } 
    });
  } catch (error) {
    console.error(`POST /workflows/${req.params.id}/trigger error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger workflow' 
    });
  }
});

// GET /workflows/:id/runs - Get workflow runs
router.get('/:id/runs', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const snap = await workflowRunsCol
      .where('workflowId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const runs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ 
      success: true, 
      data: runs 
    });
  } catch (error) {
    console.error(`GET /workflows/${req.params.id}/runs error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch workflow runs' 
    });
  }
});

// GET /runs/:runId - Get run details
router.get('/runs/:runId', async (req, res) => {
  try {
    const run = await workflowRunnerService.getRunStatus(req.params.runId);
    
    res.json({ 
      success: true, 
      data: run 
    });
  } catch (error) {
    console.error(`GET /runs/${req.params.runId} error:`, error);
    res.status(404).json({ 
      success: false, 
      error: 'Run not found' 
    });
  }
});

// GET /runs/:runId/steps - Get run steps
router.get('/runs/:runId/steps', async (req, res) => {
  try {
    const steps = await workflowRunnerService.getRunSteps(req.params.runId);
    
    res.json({ 
      success: true, 
      data: steps 
    });
  } catch (error) {
    console.error(`GET /runs/${req.params.runId}/steps error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch run steps' 
    });
  }
});

// GET /runs/:runId/stream - SSE stream for real-time updates
router.get('/runs/:runId/stream', async (req, res) => {
  const runId = req.params.runId;
  
  // Set SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  res.flushHeaders?.();

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(`data: {"runId":"${runId}","timestamp":"${new Date().toISOString()}"}\n\n`);

  // Event listener for workflow events
  const onEvent = (evt) => {
    if (evt.runId !== runId) return;
    
    try {
      res.write(`event: ${evt.type}\n`);
      res.write(`data: ${JSON.stringify(evt.data)}\n\n`);
    } catch (error) {
      console.error('SSE write error:', error);
    }
  };

  // Subscribe to events
  workflowRunnerService.on('event', onEvent);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`);
    } catch (error) {
      console.error('SSE heartbeat error:', error);
      clearInterval(heartbeat);
    }
  }, 25000);

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log(`SSE connection closed for run ${runId}`);
    clearInterval(heartbeat);
    workflowRunnerService.bus.off('event', onEvent);
    res.end();
  });

  req.on('error', (error) => {
    console.error('SSE connection error:', error);
    clearInterval(heartbeat);
    workflowRunnerService.bus.off('event', onEvent);
    res.end();
  });
});

// POST /workflows/:id/validate - Validate workflow
router.post('/:id/validate', async (req, res) => {
  try {
    const workflowDoc = await workflowsCol.doc(req.params.id).get();
    
    if (!workflowDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }

    const workflow = workflowDoc.data();
    
    // Basic validation
    const issues = [];
    
    if (!workflow.nodes || workflow.nodes.length === 0) {
      issues.push('Workflow must have at least one node');
    }
    
    const triggerNodes = workflow.nodes.filter(node => 
      node.type && node.type.startsWith('trigger.')
    );
    
    if (triggerNodes.length === 0) {
      issues.push('Workflow must have at least one trigger node');
    }

    res.json({ 
      success: true, 
      data: { 
        valid: issues.length === 0, 
        issues,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      } 
    });
  } catch (error) {
    console.error(`POST /workflows/${req.params.id}/validate error:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate workflow' 
    });
  }
});

module.exports = router;