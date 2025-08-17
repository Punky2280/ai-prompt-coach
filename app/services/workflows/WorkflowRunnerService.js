// services/workflows/WorkflowRunnerService.js
// PURPOSE: Core workflow execution engine
// DO NOT import agents statically. Use dynamic loading where needed. // VERIFY paths.
// TODO LIST (remove as solved):
// 1. Implement execution loop
// 2. Add OTEL spans 
// 3. Add validation

const EventEmitter = require('events');
const { workflowsCol, workflowRunsCol, workflowStepsCol } = require('../../lib/firestore');

class WorkflowRunnerService {
  constructor() {
    this.bus = new EventEmitter();
    this.activeRuns = new Map(); // runId -> execution context
  }

  /**
   * Start a workflow run
   * @param {string} workflowId - Workflow ID
   * @param {Object} triggerContext - Context from trigger
   * @returns {Promise<string>} Run ID
   */
  async startRun(workflowId, triggerContext = {}) {
    try {
      console.log(`Starting workflow run for workflow: ${workflowId}`);
      
      // 1. Load workflow definition
      const workflowDoc = await workflowsCol.doc(workflowId).get();
      if (!workflowDoc.exists) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      
      const workflow = { id: workflowDoc.id, ...workflowDoc.data() };
      
      // 2. Validate workflow graph
      const validation = this._validateGraph(workflow.nodes, workflow.edges);
      if (!validation.valid) {
        throw new Error(`Workflow validation failed: ${validation.issues.join(', ')}`);
      }
      
      // 3. Create run record
      const runData = {
        workflowId,
        status: 'queued',
        triggerContext,
        startedAt: new Date(),
        completedAt: null,
        error: null,
        createdAt: new Date()
      };
      
      const runRef = await workflowRunsCol.add(runData);
      const runId = runRef.id;
      
      // 4. Initialize execution context
      const context = {
        runId,
        workflow,
        triggerContext,
        steps: new Map(), // nodeId -> step output
        completedNodes: new Set(),
        failedNodes: new Set()
      };
      
      this.activeRuns.set(runId, context);
      
      // 5. Start async execution
      this._processLoop(context).catch(err => {
        console.error(`Execution failed for run ${runId}:`, err);
        this._markRunComplete(runId, 'failed', err.message);
      });
      
      this._emitEvent('run.started', { runId, workflowId });
      
      return runId;
      
    } catch (error) {
      console.error('Failed to start workflow run:', error);
      throw error;
    }
  }

  /**
   * Main execution loop
   * @private
   */
  async _processLoop(context) {
    const { runId, workflow } = context;
    
    try {
      // Update status to running
      await workflowRunsCol.doc(runId).update({ 
        status: 'running',
        updatedAt: new Date()
      });
      
      // Find executable nodes (nodes with no pending dependencies)
      const executableNodes = this._findExecutableNodes(context);
      
      if (executableNodes.length === 0) {
        // No more nodes to execute - check if complete
        const allNodesComplete = workflow.nodes.every(node => 
          context.completedNodes.has(node.id) || context.failedNodes.has(node.id)
        );
        
        if (allNodesComplete) {
          const hasFailures = context.failedNodes.size > 0;
          await this._markRunComplete(runId, hasFailures ? 'failed' : 'completed');
        }
        return;
      }
      
      // Execute nodes with concurrency limit
      const concurrencyLimit = 5; // TODO: make configurable
      const promises = executableNodes.slice(0, concurrencyLimit).map(node =>
        this._executeNode(context, node)
      );
      
      await Promise.allSettled(promises);
      
      // Continue execution loop
      setTimeout(() => this._processLoop(context), 100);
      
    } catch (error) {
      console.error(`Process loop failed for run ${runId}:`, error);
      await this._markRunComplete(runId, 'failed', error.message);
    }
  }

  /**
   * Execute a single node
   * @private
   */
  async _executeNode(context, node) {
    const { runId } = context;
    
    try {
      console.log(`Executing node ${node.id} (${node.type}) in run ${runId}`);
      
      // Create step record
      const stepData = {
        runId,
        nodeId: node.id,
        nodeType: node.type,
        status: 'running',
        input: null,
        output: null,
        error: null,
        startedAt: new Date(),
        completedAt: null
      };
      
      const stepRef = await workflowStepsCol.add(stepData);
      const stepId = stepRef.id;
      
      this._emitEvent('step.started', { runId, nodeId: node.id, stepId });
      
      // Render expressions in node config
      const renderedConfig = this._renderExpressions(node.config, context);
      
      let output;
      
      // Execute based on node type
      switch (node.type) {
        case 'trigger.manual':
          output = context.triggerContext;
          break;
          
        case 'action.log':
          const message = renderedConfig.message || 'Log message';
          console.log(`[Workflow Log]: ${message}`);
          output = { message, timestamp: new Date().toISOString() };
          break;
          
        case 'action.http':
          // Simple HTTP action implementation
          output = await this._executeHttpAction(renderedConfig);
          break;
          
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
      
      // Update step with success
      await workflowStepsCol.doc(stepId).update({
        status: 'completed',
        output,
        completedAt: new Date()
      });
      
      // Store output in context
      context.steps.set(node.id, { output });
      context.completedNodes.add(node.id);
      
      this._emitEvent('step.completed', { 
        runId, 
        nodeId: node.id, 
        stepId, 
        output 
      });
      
    } catch (error) {
      console.error(`Node execution failed: ${node.id}`, error);
      
      context.failedNodes.add(node.id);
      
      this._emitEvent('step.failed', { 
        runId, 
        nodeId: node.id, 
        error: error.message 
      });
    }
  }

  /**
   * Find nodes ready for execution
   * @private
   */
  _findExecutableNodes(context) {
    const { workflow } = context;
    
    return workflow.nodes.filter(node => {
      // Skip if already processed
      if (context.completedNodes.has(node.id) || context.failedNodes.has(node.id)) {
        return false;
      }
      
      // Find incoming edges
      const incomingEdges = workflow.edges.filter(edge => edge.target === node.id);
      
      // Node is executable if all source nodes are completed
      return incomingEdges.every(edge => 
        context.completedNodes.has(edge.source)
      );
    });
  }

  /**
   * Render expressions in configuration
   * @private
   */
  _renderExpressions(config, context) {
    if (!config || typeof config !== 'object') {
      return config;
    }
    
    const rendered = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.includes('{{')) {
        rendered[key] = this._renderString(value, context);
      } else if (typeof value === 'object') {
        rendered[key] = this._renderExpressions(value, context);
      } else {
        rendered[key] = value;
      }
    }
    
    return rendered;
  }

  /**
   * Render string with expressions
   * @private
   */
  _renderString(template, context) {
    return template.replace(/{{\s*([^}]+)\s*}}/g, (_, expr) => {
      try {
        // Support steps.NodeId.output.field
        if (expr.startsWith('steps.')) {
          const parts = expr.split('.');
          const nodeId = parts[1];
          const path = parts.slice(2); // skip 'steps', 'NodeId'
          
          const stepData = context.steps.get(nodeId);
          let current = stepData;
          
          for (const segment of path) {
            current = current?.[segment];
          }
          
          return current !== undefined ? current : '';
        }
        
        // Support trigger context
        if (expr.startsWith('trigger.')) {
          const path = expr.split('.').slice(1);
          let current = context.triggerContext;
          
          for (const segment of path) {
            current = current?.[segment];
          }
          
          return current !== undefined ? current : '';
        }
        
        return '';
      } catch (error) {
        console.error('Expression render error:', error);
        return '';
      }
    });
  }

  /**
   * Execute HTTP action
   * @private
   */
  async _executeHttpAction(config) {
    const { url, method = 'GET', headers = {}, body } = config;
    
    // Simple implementation - in production would use proper HTTP client
    const response = {
      url,
      method,
      status: 200,
      data: { message: 'HTTP action executed', timestamp: new Date().toISOString() }
    };
    
    return response;
  }

  /**
   * Validate workflow graph
   * @private
   */
  _validateGraph(nodes, edges) {
    const issues = [];
    
    // Check for at least one trigger
    const triggerNodes = nodes.filter(node => node.type.startsWith('trigger.'));
    if (triggerNodes.length === 0) {
      issues.push('Workflow must have at least one trigger node');
    }
    
    // Check for cycles (simplified)
    // TODO: Implement proper cycle detection
    
    // Limit node count
    if (nodes.length > 100) {
      issues.push('Workflow cannot exceed 100 nodes');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Mark run as complete
   * @private
   */
  async _markRunComplete(runId, status, error = null) {
    await workflowRunsCol.doc(runId).update({
      status,
      error,
      completedAt: new Date()
    });
    
    this.activeRuns.delete(runId);
    
    this._emitEvent('run.completed', { runId, status, error });
  }

  /**
   * Emit event to event bus
   * @private
   */
  _emitEvent(type, data) {
    this.bus.emit('event', {
      type,
      data,
      runId: data.runId,
      timestamp: new Date().toISOString()
    });
  }

  // Public methods for event subscription
  on(event, listener) { 
    this.bus.on(event, listener); 
  }
  
  emit(event, payload) { 
    this.bus.emit(event, payload); 
  }

  /**
   * Get run status
   */
  async getRunStatus(runId) {
    const runDoc = await workflowRunsCol.doc(runId).get();
    if (!runDoc.exists) {
      throw new Error(`Run ${runId} not found`);
    }
    
    return { id: runDoc.id, ...runDoc.data() };
  }

  /**
   * Get run steps
   */
  async getRunSteps(runId) {
    const stepsSnap = await workflowStepsCol
      .where('runId', '==', runId)
      .orderBy('startedAt')
      .get();
    
    return stepsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Export singleton instance
const workflowRunnerService = new WorkflowRunnerService();
module.exports = { workflowRunnerService };