// PURPOSE: Core workflow execution engine for running workflow instances
// PHASE: A
// STATUS: skeleton
// VERIFY: Graph validation requirements and execution patterns
// TODO:
// 1. Implement graph validation
// 2. Add node execution logic
// 3. Add retry mechanisms
// 4. Add error handling
// 5. Add SSE event streaming
// 6. Add parallelism support

const { WorkflowRunModel, WorkflowVersionModel } = require('../models');
const { expressionEngine } = require('./ExpressionEngine');
const EventEmitter = require('events');

/**
 * WorkflowRunnerService
 * Manages execution of workflow instances
 */
class WorkflowRunnerService extends EventEmitter {
  constructor(deps = {}) {
    super();
    this.deps = deps;
    this.activeRuns = new Map(); // runId -> execution context
    this.nodeRegistry = new Map(); // nodeType -> executor function
    
    // Register built-in node types
    this.registerBuiltInNodes();
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(workflowId, input = {}, options = {}) {
    try {
      // Get workflow version to execute
      const workflowVersion = options.version 
        ? await WorkflowVersionModel.findById(options.version)
        : await WorkflowVersionModel.getPublished(workflowId);
      
      if (!workflowVersion) {
        throw new Error(`No executable version found for workflow ${workflowId}`);
      }

      // Create workflow run record
      const run = await WorkflowRunModel.create({
        workflowId,
        workflowVersionId: workflowVersion.id,
        triggerId: options.triggerId,
        input
      });

      // Validate workflow graph
      const validation = this.validateWorkflowGraph(workflowVersion);
      if (!validation.valid) {
        await WorkflowRunModel.updateStatus(run.id, 'failed', {
          error: `Workflow validation failed: ${validation.errors.join(', ')}`
        });
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // Start execution
      this.executeWorkflowAsync(run.id, workflowVersion, input);
      
      return run;
    } catch (error) {
      console.error('Error starting workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow asynchronously
   */
  async executeWorkflowAsync(runId, workflowVersion, input) {
    try {
      await WorkflowRunModel.updateStatus(runId, 'running');
      
      // Create execution context
      const context = {
        runId,
        workflowVersion,
        input,
        variables: { ...input },
        completedNodes: new Set(),
        nodeOutputs: new Map(),
        startedAt: new Date()
      };
      
      this.activeRuns.set(runId, context);
      
      // Emit start event
      this.emit('run_started', { runId, workflowId: workflowVersion.workflowId });
      
      // Execute workflow
      const result = await this.executeWorkflow(context);
      
      // Update run status
      await WorkflowRunModel.updateStatus(runId, 'completed', {
        output: result.output || {}
      });
      
      // Emit completion event
      this.emit('run_completed', { 
        runId, 
        workflowId: workflowVersion.workflowId,
        output: result.output,
        duration: Date.now() - context.startedAt.getTime()
      });
      
    } catch (error) {
      console.error(`Workflow execution failed for run ${runId}:`, error);
      
      await WorkflowRunModel.updateStatus(runId, 'failed', {
        error: error.message
      });
      
      this.emit('run_failed', { runId, error: error.message });
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Execute workflow nodes in proper order
   */
  async executeWorkflow(context) {
    const { workflowVersion } = context;
    const { nodes, edges } = workflowVersion;
    
    // Find entry nodes (nodes with no incoming edges)
    const entryNodes = this.findEntryNodes(nodes, edges);
    
    if (entryNodes.length === 0) {
      throw new Error('No entry nodes found in workflow');
    }

    // Execute nodes starting from entry points
    for (const entryNode of entryNodes) {
      await this.executeNode(context, entryNode);
    }

    return {
      output: context.variables,
      completedNodes: Array.from(context.completedNodes)
    };
  }

  /**
   * Execute a single node
   */
  async executeNode(context, node) {
    const { runId } = context;
    
    try {
      // Check if node is already completed
      if (context.completedNodes.has(node.id)) {
        return;
      }

      // Log node start
      await WorkflowRunModel.addLogEntry(runId, {
        level: 'info',
        message: `Starting node: ${node.name || node.type}`,
        nodeId: node.id
      });

      this.emit('node_started', { runId, nodeId: node.id, nodeType: node.type });

      // Get node executor
      const executor = this.nodeRegistry.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // Prepare node input
      const nodeInput = this.prepareNodeInput(context, node);

      // Execute node
      const nodeOutput = await executor(nodeInput, context, node);

      // Store node output
      context.nodeOutputs.set(node.id, nodeOutput);
      context.completedNodes.add(node.id);

      // Update context variables
      if (nodeOutput && typeof nodeOutput === 'object') {
        Object.assign(context.variables, nodeOutput);
      }

      // Log node completion
      await WorkflowRunModel.addLogEntry(runId, {
        level: 'info',
        message: `Completed node: ${node.name || node.type}`,
        nodeId: node.id,
        data: { output: nodeOutput }
      });

      this.emit('node_completed', { 
        runId, 
        nodeId: node.id, 
        nodeType: node.type,
        output: nodeOutput 
      });

      // Execute connected nodes
      await this.executeConnectedNodes(context, node);

    } catch (error) {
      console.error(`Node execution failed: ${node.id}`, error);
      
      await WorkflowRunModel.addLogEntry(runId, {
        level: 'error',
        message: `Node failed: ${error.message}`,
        nodeId: node.id,
        data: { error: error.message }
      });

      this.emit('node_failed', { runId, nodeId: node.id, error: error.message });
      throw error;
    }
  }

  /**
   * Prepare input for node execution
   */
  prepareNodeInput(context, node) {
    const nodeConfig = node.config || {};
    const input = { ...nodeConfig };

    // Evaluate expressions in input
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        input[key] = expressionEngine.evaluate(value, context.variables);
      }
    }

    return input;
  }

  /**
   * Execute nodes connected to the current node
   */
  async executeConnectedNodes(context, currentNode) {
    const { workflowVersion } = context;
    const { edges } = workflowVersion;
    
    // Find outgoing edges from current node
    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
    
    for (const edge of outgoingEdges) {
      const targetNode = workflowVersion.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        // Check if all prerequisites are met
        if (this.arePrerequisitesMet(context, targetNode, workflowVersion.edges)) {
          await this.executeNode(context, targetNode);
        }
      }
    }
  }

  /**
   * Check if all prerequisites for a node are met
   */
  arePrerequisitesMet(context, node, edges) {
    const incomingEdges = edges.filter(edge => edge.target === node.id);
    
    // All source nodes must be completed
    return incomingEdges.every(edge => context.completedNodes.has(edge.source));
  }

  /**
   * Find entry nodes (nodes with no incoming edges)
   */
  findEntryNodes(nodes, edges) {
    const nodesWithIncoming = new Set(edges.map(edge => edge.target));
    return nodes.filter(node => !nodesWithIncoming.has(node.id));
  }

  /**
   * Validate workflow graph structure
   */
  validateWorkflowGraph(workflowVersion) {
    const errors = [];
    const { nodes, edges } = workflowVersion;

    // Check for empty workflow
    if (!nodes || nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }

    // Check for cycles (basic check)
    if (this.hasCycles(nodes, edges)) {
      errors.push('Workflow contains cycles');
    }

    // Check for unreachable nodes
    const reachableNodes = this.findReachableNodes(nodes, edges);
    const unreachableNodes = nodes.filter(node => !reachableNodes.has(node.id));
    if (unreachableNodes.length > 0) {
      errors.push(`Unreachable nodes found: ${unreachableNodes.map(n => n.id).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for cycles in workflow graph (simplified)
   */
  hasCycles(nodes, edges) {
    // TODO: Implement proper cycle detection
    return false;
  }

  /**
   * Find all reachable nodes from entry points
   */
  findReachableNodes(nodes, edges) {
    const reachable = new Set();
    const entryNodes = this.findEntryNodes(nodes, edges);
    
    const visit = (nodeId) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      
      const outgoing = edges.filter(edge => edge.source === nodeId);
      outgoing.forEach(edge => visit(edge.target));
    };

    entryNodes.forEach(node => visit(node.id));
    return reachable;
  }

  /**
   * Register built-in node types
   */
  registerBuiltInNodes() {
    // Transform node - basic data transformation
    this.nodeRegistry.set('transform', async (input, context, node) => {
      // Simple transformation: return input with transforms applied
      return { transformed: true, input };
    });

    // HTTP node - make HTTP requests (placeholder)
    this.nodeRegistry.set('http', async (input, context, node) => {
      return { response: 'Mock HTTP response', status: 200 };
    });

    // Delay node - add delays in workflow
    this.nodeRegistry.set('delay', async (input, context, node) => {
      const delayMs = input.delayMs || 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return { delayed: delayMs };
    });

    // Set Variable node - set variables in context
    this.nodeRegistry.set('set-variable', async (input, context, node) => {
      const { variableName, value } = input;
      if (variableName) {
        context.variables[variableName] = value;
      }
      return { [variableName]: value };
    });
  }

  /**
   * Register custom node type
   */
  registerNodeType(nodeType, executor) {
    this.nodeRegistry.set(nodeType, executor);
  }

  /**
   * Get active runs
   */
  getActiveRuns() {
    return Array.from(this.activeRuns.keys());
  }

  /**
   * Cancel workflow run
   */
  async cancelWorkflowRun(runId) {
    if (this.activeRuns.has(runId)) {
      this.activeRuns.delete(runId);
      await WorkflowRunModel.updateStatus(runId, 'cancelled');
      this.emit('run_cancelled', { runId });
      return true;
    }
    return false;
  }
}

// Singleton instance
const workflowRunnerService = new WorkflowRunnerService();

module.exports = { WorkflowRunnerService, workflowRunnerService };