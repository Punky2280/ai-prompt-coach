// routes/workflows.js - RESTful API for Workflow Management
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../lib/database');
const WorkflowExecutionEngine = require('../services/workflow-execution-engine');
const InMemoryWorkflowEngine = require('../services/in-memory-workflow-engine');

const router = express.Router();

// Use in-memory engine for demo purposes (since we don't have PostgreSQL)
const workflowEngine = new InMemoryWorkflowEngine();

// GET /api/v1/workflows/connectors - List available connectors
router.get('/connectors', (req, res) => {
  try {
    const connectors = workflowEngine.connectorRegistry.getConnectors();
    res.json({ connectors });
  } catch (error) {
    console.error('Failed to get connectors:', error);
    res.status(500).json({ error: 'Failed to get connectors' });
  }
});

// GET /api/v1/workflows - List all workflows
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status = 'active' } = req.query;
    
    const result = await query(
      `SELECT id, name, description, version, created_at, updated_at, status 
       FROM workflows 
       WHERE status = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const total = await query(
      'SELECT COUNT(*) FROM workflows WHERE status = $1',
      [status]
    );

    res.json({
      workflows: result.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Failed to list workflows:', error);
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

// POST /api/v1/workflows - Create new workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, definition } = req.body;
    
    if (!name || !definition) {
      return res.status(400).json({ error: 'Name and definition are required' });
    }

    // Validate workflow definition
    const validationErrors = validateWorkflowDefinition(definition);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Invalid workflow definition', details: validationErrors });
    }

    const workflowId = uuidv4();
    const result = await query(
      `INSERT INTO workflows (id, name, description, definition) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [workflowId, name, description, JSON.stringify(definition)]
    );

    res.status(201).json({
      workflow: result.rows[0],
      message: 'Workflow created successfully'
    });
  } catch (error) {
    console.error('Failed to create workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// GET /api/v1/workflows/:id - Get workflow by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM workflows WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow: result.rows[0] });
  } catch (error) {
    console.error('Failed to get workflow:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// PUT /api/v1/workflows/:id - Update workflow
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, definition } = req.body;

    // Validate workflow definition if provided
    if (definition) {
      const validationErrors = validateWorkflowDefinition(definition);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Invalid workflow definition', details: validationErrors });
      }
    }

    const result = await query(
      `UPDATE workflows 
       SET name = COALESCE($2, name), 
           description = COALESCE($3, description), 
           definition = COALESCE($4, definition),
           updated_at = NOW(),
           version = version + 1
       WHERE id = $1 
       RETURNING *`,
      [id, name, description, definition ? JSON.stringify(definition) : null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      workflow: result.rows[0],
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('Failed to update workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/v1/workflows/:id - Delete workflow (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE workflows SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      ['deleted', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// POST /api/v1/workflows/:id/execute - Execute workflow
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { inputData = {}, dryRun = false, parallel = true, maxRetries = 3 } = req.body;

    const result = await workflowEngine.executeWorkflow(id, inputData, {
      dryRun,
      parallel,
      maxRetries
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// POST /api/v1/workflows/execute - Execute workflow by definition (without saving)
router.post('/execute', async (req, res) => {
  try {
    const { definition, inputData = {}, dryRun = false, parallel = true, maxRetries = 3 } = req.body;

    if (!definition) {
      return res.status(400).json({ error: 'Workflow definition is required' });
    }

    // Validate workflow definition
    const validationErrors = validateWorkflowDefinition(definition);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Invalid workflow definition', details: validationErrors });
    }

    // Execute workflow directly with definition (no database needed)
    const result = await workflowEngine.executeWorkflow(definition, inputData, {
      dryRun,
      parallel,
      maxRetries
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// GET /api/v1/workflows/:id/executions - Get workflow executions
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0, status } = req.query;

    let whereClause = 'WHERE workflow_id = $1';
    let params = [id, limit, offset];
    
    if (status) {
      whereClause += ' AND status = $4';
      params.push(status);
    }

    const result = await query(
      `SELECT id, status, input_data, output_data, started_at, completed_at, dry_run, error_message
       FROM workflow_executions 
       ${whereClause}
       ORDER BY started_at DESC 
       LIMIT $2 OFFSET $3`,
      params
    );

    const total = await query(
      `SELECT COUNT(*) FROM workflow_executions ${whereClause.replace(/\$2.*$/, '')}`,
      [id, ...(status ? [status] : [])]
    );

    res.json({
      executions: result.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Failed to get workflow executions:', error);
    res.status(500).json({ error: 'Failed to get workflow executions' });
  }
});

// GET /api/v1/workflows/executions/:executionId - Get execution details
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const executionResult = await query(
      'SELECT * FROM workflow_executions WHERE id = $1',
      [executionId]
    );

    if (executionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const nodesResult = await query(
      `SELECT * FROM workflow_node_executions 
       WHERE execution_id = $1 
       ORDER BY started_at ASC`,
      [executionId]
    );

    res.json({
      execution: executionResult.rows[0],
      nodes: nodesResult.rows
    });
  } catch (error) {
    console.error('Failed to get execution details:', error);
    res.status(500).json({ error: 'Failed to get execution details' });
  }
});

// Validate workflow definition
function validateWorkflowDefinition(definition) {
  const errors = [];

  if (!definition || typeof definition !== 'object') {
    errors.push('Definition must be an object');
    return errors;
  }

  if (!definition.nodes || !Array.isArray(definition.nodes)) {
    errors.push('Definition must contain a nodes array');
    return errors;
  }

  if (definition.nodes.length === 0) {
    errors.push('Workflow must contain at least one node');
  }

  // Validate each node
  const nodeIds = new Set();
  for (let i = 0; i < definition.nodes.length; i++) {
    const node = definition.nodes[i];
    const nodeErrors = validateNode(node, i);
    errors.push(...nodeErrors);

    if (node.id) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }

  // Validate dependencies
  for (const node of definition.nodes) {
    if (node.dependsOn) {
      for (const depId of node.dependsOn) {
        if (!nodeIds.has(depId)) {
          errors.push(`Node ${node.id} depends on non-existent node: ${depId}`);
        }
      }
    }
  }

  return errors;
}

function validateNode(node, index) {
  const errors = [];
  const prefix = `Node ${index}`;

  if (!node || typeof node !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  if (!node.id || typeof node.id !== 'string') {
    errors.push(`${prefix}: must have a string ID`);
  }

  if (!node.type || typeof node.type !== 'string') {
    errors.push(`${prefix}: must have a string type`);
  }

  const validTypes = ['start', 'end', 'branch', 'loop', 'connector', 'expression', 'subworkflow'];
  if (node.type && !validTypes.includes(node.type)) {
    errors.push(`${prefix}: invalid type "${node.type}". Valid types: ${validTypes.join(', ')}`);
  }

  // Type-specific validation
  if (node.type === 'branch' && (!node.config || !node.config.condition)) {
    errors.push(`${prefix}: branch node must have a condition`);
  }

  if (node.type === 'loop' && (!node.config || !node.config.loopType || !node.config.condition)) {
    errors.push(`${prefix}: loop node must have loopType and condition`);
  }

  if (node.type === 'connector' && (!node.config || !node.config.connector || !node.config.action)) {
    errors.push(`${prefix}: connector node must have connector and action`);
  }

  if (node.type === 'expression' && (!node.config || !node.config.expression)) {
    errors.push(`${prefix}: expression node must have an expression`);
  }

  if (node.type === 'subworkflow' && (!node.config || !node.config.workflowId)) {
    errors.push(`${prefix}: subworkflow node must have a workflowId`);
  }

  return errors;
}

module.exports = router;