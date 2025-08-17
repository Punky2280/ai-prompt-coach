// PURPOSE: Core workflow execution engine
// PHASE: A  
// STATUS: partial
// VERIFY: Graph validation, SSE event emission, tracing spans
// TODO:
// 1. Implement parallel execution (Phase B)
// 2. Add retry logic with exponential backoff
// 3. Add subworkflow support with ancestor detection
// 4. Implement dry run mode

const { workflowsCol, workflowExecutionsCol, executionStepsCol } = require('../lib/schema');
const { expressionEngine } = require('./expressionEngine');
const { connectorRegistryService } = require('./connectorRegistry');

/**
 * Workflow execution states
 */
const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed', 
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * Core Workflow Runner Service
 * Handles workflow execution, step orchestration, and state management
 */
class WorkflowRunnerService {
  constructor() {
    this.activeExecutions = new Map();
    this.stepTimeoutMs = parseInt(process.env.WORKFLOW_STEP_TIMEOUT_MS) || 300000; // 5 min default
    this.maxRetries = parseInt(process.env.WORKFLOW_MAX_RETRIES) || 3;
    this.sseClients = new Map(); // For real-time updates
  }

  /**
   * Execute a workflow
   * @param {string} workflowId - Workflow to execute
   * @param {Object} triggerData - Input data from trigger
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflow(workflowId, triggerData = {}, options = {}) {
    const { dryRun = false, triggeredBy = 'manual' } = options;

    try {
      // Load workflow definition
      const workflowDoc = await workflowsCol.doc(workflowId).get();
      
      if (!workflowDoc.exists) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const workflow = { id: workflowDoc.id, ...workflowDoc.data() };

      // Validate workflow graph
      const validation = await this.validateWorkflowGraph(workflow);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // Create execution record
      const execution = await this.createExecution(workflow, triggerData, triggeredBy);

      if (dryRun) {
        return { execution, dryRun: true, steps: await this.planExecution(workflow, triggerData) };
      }

      // Start execution
      this.activeExecutions.set(execution.id, execution);
      const result = await this.runWorkflow(workflow, execution, triggerData);
      this.activeExecutions.delete(execution.id);

      return result;

    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }
  }

  /**
   * Create execution record in database
   * @param {Object} workflow - Workflow definition
   * @param {Object} triggerData - Input data
   * @param {string} triggeredBy - Trigger type
   * @returns {Promise<Object>} Execution record
   */
  async createExecution(workflow, triggerData, triggeredBy) {
    const execution = {
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: ExecutionStatus.PENDING,
      triggeredBy,
      triggerData,
      startedAt: new Date(),
      duration: 0,
      metadata: {}
    };

    const docRef = await workflowExecutionsCol.add(execution);
    return { id: docRef.id, ...execution };
  }

  /**
   * Validate workflow graph for execution
   * @param {Object} workflow - Workflow to validate
   * @returns {Object} Validation result
   */
  async validateWorkflowGraph(workflow) {
    const errors = [];
    const { nodes = [], edges = [] } = workflow;

    // Basic validation
    if (nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check for required trigger node
    const triggerNodes = nodes.filter(node => node.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Validate node connections
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references unknown target node: ${edge.target}`);
      }
    }

    // Check for cycles (basic implementation)
    if (this.hasCycles(nodes, edges)) {
      errors.push('Workflow contains cycles');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect cycles in workflow graph
   * @param {Array} nodes - Workflow nodes
   * @param {Array} edges - Workflow edges  
   * @returns {boolean} True if cycles detected
   */
  hasCycles(nodes, edges) {
    // TODO: Implement proper cycle detection algorithm
    // For now, return false (assume no cycles)
    return false;
  }

  /**
   * Plan execution order without actually running
   * @param {Object} workflow - Workflow definition
   * @param {Object} triggerData - Input data
   * @returns {Promise<Array>} Planned execution steps
   */
  async planExecution(workflow, triggerData) {
    // TODO: Implement execution planning
    const { nodes = [] } = workflow;
    return nodes.map(node => ({
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      estimatedDuration: 1000 // placeholder
    }));
  }

  /**
   * Run workflow execution
   * @param {Object} workflow - Workflow definition
   * @param {Object} execution - Execution record
   * @param {Object} triggerData - Input data
   * @returns {Promise<Object>} Execution result
   */
  async runWorkflow(workflow, execution, triggerData) {
    try {
      // Update execution status
      await this.updateExecutionStatus(execution.id, ExecutionStatus.RUNNING);
      this.emitSSEEvent(execution.id, 'run_started', { executionId: execution.id });

      // Execute nodes (simplified sequential execution for Phase A)
      const { nodes = [], edges = [] } = workflow;
      const context = { ...triggerData };
      const results = {};

      // Find start node (trigger)
      const startNode = nodes.find(node => node.type === 'trigger');
      if (!startNode) {
        throw new Error('No trigger node found');
      }

      // Execute nodes in topological order (simplified)
      const executionOrder = await this.getExecutionOrder(nodes, edges, startNode.id);
      
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const stepResult = await this.executeStep(execution.id, node, context, results);
        results[nodeId] = stepResult;

        // Update context with step output
        if (stepResult.success) {
          context[`step_${nodeId}`] = stepResult.output;
        }
      }

      // Complete execution
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt,
        duration
      });

      this.emitSSEEvent(execution.id, 'run_completed', { 
        executionId: execution.id, 
        status: ExecutionStatus.COMPLETED,
        duration 
      });

      return { execution, results, duration };

    } catch (error) {
      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        error: error.message
      });

      this.emitSSEEvent(execution.id, 'run_completed', {
        executionId: execution.id,
        status: ExecutionStatus.FAILED,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get execution order for nodes
   * @param {Array} nodes - Workflow nodes
   * @param {Array} edges - Workflow edges
   * @param {string} startNodeId - Starting node ID
   * @returns {Promise<Array>} Ordered node IDs
   */
  async getExecutionOrder(nodes, edges, startNodeId) {
    // TODO: Implement proper topological sorting
    // For Phase A, return simple order starting with trigger
    const nodeIds = nodes.map(n => n.id);
    return [startNodeId, ...nodeIds.filter(id => id !== startNodeId)];
  }

  /**
   * Execute a single workflow step
   * @param {string} executionId - Execution ID
   * @param {Object} node - Node to execute
   * @param {Object} context - Execution context
   * @param {Object} results - Previous step results
   * @returns {Promise<Object>} Step result
   */
  async executeStep(executionId, node, context, results) {
    const step = {
      executionId,
      nodeId: node.id,
      nodeName: node.name || node.id,
      nodeType: node.type,
      status: StepStatus.RUNNING,
      input: context,
      startedAt: new Date(),
      retryCount: 0,
      logs: []
    };

    try {
      // Create step record
      const stepRef = await executionStepsCol.add(step);
      step.id = stepRef.id;

      this.emitSSEEvent(executionId, 'step_started', { 
        stepId: step.id, 
        nodeId: node.id, 
        nodeName: node.name 
      });

      // Execute based on node type
      let output;
      switch (node.type) {
        case 'trigger':
          output = await this.executeTriggerNode(node, context);
          break;
        case 'transform':
          output = await this.executeTransformNode(node, context);
          break;
        case 'action':
          output = await this.executeActionNode(node, context);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Complete step
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();

      await executionStepsCol.doc(step.id).update({
        status: StepStatus.COMPLETED,
        output,
        completedAt,
        duration
      });

      this.emitSSEEvent(executionId, 'step_completed', { 
        stepId: step.id, 
        nodeId: node.id, 
        output,
        duration
      });

      return { success: true, output, duration };

    } catch (error) {
      // Handle step failure
      await executionStepsCol.doc(step.id).update({
        status: StepStatus.FAILED,
        error: error.message,
        completedAt: new Date()
      });

      this.emitSSEEvent(executionId, 'step_error', {
        stepId: step.id,
        nodeId: node.id,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Execute trigger node
   * @param {Object} node - Trigger node
   * @param {Object} context - Context data
   * @returns {Promise<Object>} Node output
   */
  async executeTriggerNode(node, context) {
    // Trigger nodes just pass through the input data
    return context;
  }

  /**
   * Execute transform node  
   * @param {Object} node - Transform node
   * @param {Object} context - Context data
   * @returns {Promise<Object>} Node output
   */
  async executeTransformNode(node, context) {
    const { settings = {} } = node;
    const { expression } = settings;

    if (expression) {
      const result = expressionEngine.evaluate(expression, context);
      return { transformed: result, original: context };
    }

    return context;
  }

  /**
   * Execute action node
   * @param {Object} node - Action node
   * @param {Object} context - Context data
   * @returns {Promise<Object>} Node output
   */
  async executeActionNode(node, context) {
    // TODO: Implement connector-based action execution
    const { settings = {} } = node;
    const { connector, action } = settings;

    if (connector && action) {
      // TODO: Load connector and execute action
      return { connector, action, input: context };
    }

    return { message: 'Action executed', input: context };
  }

  /**
   * Update execution record
   * @param {string} executionId - Execution ID
   * @param {Object} updates - Fields to update
   */
  async updateExecution(executionId, updates) {
    await workflowExecutionsCol.doc(executionId).update(updates);
  }

  /**
   * Update execution status
   * @param {string} executionId - Execution ID
   * @param {string} status - New status
   */
  async updateExecutionStatus(executionId, status) {
    await this.updateExecution(executionId, { status });
  }

  /**
   * Emit Server-Sent Events for real-time updates
   * @param {string} executionId - Execution ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  emitSSEEvent(executionId, event, data) {
    // Broadcast to SSE clients if available
    try {
      if (global.sseManager) {
        global.sseManager.broadcast(executionId, event, data);
      } else {
        // Fallback to HTTP broadcast (for production environments with multiple instances)
        const fetch = require('node-fetch').catch(() => null);
        if (fetch) {
          fetch('http://localhost:8083/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ executionId, event, data })
          }).catch(err => console.error('SSE broadcast error:', err));
        }
      }
    } catch (error) {
      console.error('SSE event emission error:', error);
    }
    
    // Always log for debugging
    console.log(`SSE Event [${executionId}] ${event}:`, JSON.stringify(data));
  }

  /**
   * Cancel running execution
   * @param {string} executionId - Execution to cancel
   */
  async cancelExecution(executionId) {
    if (this.activeExecutions.has(executionId)) {
      await this.updateExecutionStatus(executionId, ExecutionStatus.CANCELLED);
      this.activeExecutions.delete(executionId);
      this.emitSSEEvent(executionId, 'run_cancelled', { executionId });
    }
  }
}

// Singleton instance
const workflowRunnerService = new WorkflowRunnerService();

module.exports = { 
  WorkflowRunnerService, 
  workflowRunnerService, 
  ExecutionStatus, 
  StepStatus 
};