// PURPOSE: Workflow management API routes
// PHASE: A
// STATUS: partial
// VERIFY: Response format {success, data?, error?}, feature gating
// TODO:
// 1. Add workflow validation endpoints
// 2. Implement workflow versioning
// 3. Add bulk operations
// 4. Add workflow templates

const express = require('express');
const router = express.Router();
const { workflowsCol, workflowExecutionsCol } = require('../lib/schema');
const { workflowRunnerService } = require('../services/workflowRunner');

/**
 * GET /workflows - List workflows
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, status, tags } = req.query;
    
    let query = workflowsCol.orderBy('updatedAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit));
    
    const snapshot = await query.get();
    const workflows = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    // Filter by tags if provided (Firestore doesn't support array-contains-any efficiently)
    let filteredWorkflows = workflows;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filteredWorkflows = workflows.filter(workflow => 
        workflow.tags && tagArray.some(tag => workflow.tags.includes(tag))
      );
    }

    res.json({
      success: true,
      data: {
        workflows: filteredWorkflows,
        count: filteredWorkflows.length
      }
    });

  } catch (error) {
    console.error('List workflows error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list workflows' 
    });
  }
});

/**
 * GET /workflows/:id - Get workflow by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await workflowsCol.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const workflow = { id: doc.id, ...doc.data() };
    
    res.json({
      success: true,
      data: workflow
    });

  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow'
    });
  }
});

/**
 * POST /workflows - Create new workflow
 */
router.post('/', async (req, res) => {
  try {
    const workflowData = req.body;
    
    // Basic validation
    if (!workflowData.name) {
      return res.status(400).json({
        success: false,
        error: 'Workflow name is required'
      });
    }

    const workflow = {
      ...workflowData,
      version: 1,
      status: workflowData.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user?.id || 'system' // TODO: Implement proper auth
    };

    const docRef = await workflowsCol.add(workflow);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...workflow }
    });

  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

/**
 * PUT /workflows/:id - Update workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if workflow exists
    const doc = await workflowsCol.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const updatedWorkflow = {
      ...updates,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated directly
    delete updatedWorkflow.id;
    delete updatedWorkflow.createdAt;
    delete updatedWorkflow.createdBy;

    await workflowsCol.doc(id).update(updatedWorkflow);
    
    // Get updated workflow
    const updatedDoc = await workflowsCol.doc(id).get();
    
    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });

  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow'
    });
  }
});

/**
 * DELETE /workflows/:id - Delete workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if workflow exists
    const doc = await workflowsCol.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    await workflowsCol.doc(id).delete();
    
    res.json({
      success: true,
      data: { message: 'Workflow deleted successfully' }
    });

  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow'
    });
  }
});

/**
 * POST /workflows/:id/execute - Execute workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { input = {}, options = {} } = req.body;
    
    // Check if workflow exists
    const doc = await workflowsCol.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const workflow = doc.data();
    
    // Check if workflow is active
    if (workflow.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Workflow is not active'
      });
    }

    // Execute workflow
    const result = await workflowRunnerService.executeWorkflow(id, input, {
      ...options,
      triggeredBy: 'api'
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      error: `Workflow execution failed: ${error.message}`
    });
  }
});

/**
 * GET /workflows/:id/executions - Get workflow executions
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, status } = req.query;
    
    let query = workflowExecutionsCol
      .where('workflowId', '==', id)
      .orderBy('startedAt', 'desc')
      .limit(parseInt(limit));
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const executions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        executions,
        count: executions.length
      }
    });

  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get executions'
    });
  }
});

/**
 * POST /workflows/:id/validate - Validate workflow
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await workflowsCol.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    const workflow = { id: doc.id, ...doc.data() };
    const validation = await workflowRunnerService.validateWorkflowGraph(workflow);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Validate workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate workflow'
    });
  }
});

module.exports = router;