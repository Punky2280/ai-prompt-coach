// services/in-memory-workflow-engine.js - Simplified In-Memory Workflow Engine
const { v4: uuidv4 } = require('uuid');
const SimpleExpressionEngine = require('./simple-expression-engine');
const ConnectorRegistry = require('./connector-registry');

class InMemoryWorkflowEngine {
  constructor() {
    this.expressionEngine = new SimpleExpressionEngine();
    this.connectorRegistry = new ConnectorRegistry();
    this.executions = new Map(); // In-memory storage
    this.workflows = new Map(); // In-memory storage
  }

  // Execute a workflow
  async executeWorkflow(workflowId, inputData = {}, options = {}) {
    const { dryRun = false, maxRetries = 3, parallel = true } = options;
    const executionId = uuidv4();

    try {
      // For ad-hoc execution, workflowId is the definition itself
      let workflow;
      if (typeof workflowId === 'string' && this.workflows.has(workflowId)) {
        workflow = this.workflows.get(workflowId);
      } else if (typeof workflowId === 'object') {
        // Direct definition passed
        workflow = { id: executionId, definition: workflowId };
      } else {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create execution record
      const execution = {
        id: executionId,
        workflowId: workflow.id,
        status: 'running',
        inputData,
        outputData: null,
        startedAt: new Date(),
        completedAt: null,
        dryRun,
        errorMessage: null
      };
      this.executions.set(executionId, execution);
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow.definition);
      
      // Execute workflow nodes
      const result = await this.executeNodes(
        executionId, 
        workflow.definition, 
        dependencyGraph, 
        inputData, 
        { dryRun, maxRetries, parallel }
      );

      // Update execution status
      execution.status = 'completed';
      execution.outputData = result;
      execution.completedAt = new Date();
      
      return {
        executionId,
        status: 'completed',
        result,
        dryRun
      };

    } catch (error) {
      console.error(`Workflow execution failed:`, error);
      const execution = this.executions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.errorMessage = error.message;
        execution.completedAt = new Date();
      }
      
      return {
        executionId,
        status: 'failed',
        error: error.message,
        dryRun
      };
    }
  }

  // Build dependency graph from workflow definition
  buildDependencyGraph(workflowDef) {
    const nodes = workflowDef.nodes || [];
    const graph = new Map();
    
    // Initialize all nodes
    nodes.forEach(node => {
      graph.set(node.id, {
        node,
        dependencies: [],
        dependents: [],
        executed: false
      });
    });

    // Build dependencies
    nodes.forEach(node => {
      const dependencies = node.dependsOn || [];
      dependencies.forEach(depId => {
        if (graph.has(depId)) {
          graph.get(node.id).dependencies.push(depId);
          graph.get(depId).dependents.push(node.id);
        }
      });
    });

    return graph;
  }

  // Execute workflow nodes with dependency resolution
  async executeNodes(executionId, workflowDef, dependencyGraph, context, options) {
    const { dryRun, maxRetries, parallel } = options;
    const results = new Map();
    const executing = new Set();

    // Find nodes ready for execution (no unmet dependencies)
    const getReadyNodes = () => {
      const ready = [];
      for (const [nodeId, nodeData] of dependencyGraph) {
        if (!nodeData.executed && !executing.has(nodeId)) {
          const depsReady = nodeData.dependencies.every(depId => 
            dependencyGraph.get(depId)?.executed
          );
          if (depsReady) {
            ready.push(nodeId);
          }
        }
      }
      return ready;
    };

    // Execute nodes in parallel where possible
    while (dependencyGraph.size > 0) {
      const readyNodes = getReadyNodes();
      
      if (readyNodes.length === 0) {
        // Check for circular dependencies
        const unexecuted = Array.from(dependencyGraph.keys()).filter(
          nodeId => !dependencyGraph.get(nodeId).executed
        );
        if (unexecuted.length > 0) {
          throw new Error(`Circular dependency detected: ${unexecuted.join(', ')}`);
        }
        break;
      }

      // Execute ready nodes (parallel or sequential based on config)
      const executionPromises = readyNodes.map(nodeId => {
        executing.add(nodeId);
        return this.executeNode(
          executionId, 
          dependencyGraph.get(nodeId).node, 
          context, 
          results, 
          { dryRun, maxRetries }
        ).then(result => {
          executing.delete(nodeId);
          dependencyGraph.get(nodeId).executed = true;
          results.set(nodeId, result);
          return result;
        }).catch(error => {
          executing.delete(nodeId);
          throw error;
        });
      });

      if (parallel && readyNodes.length > 1) {
        await Promise.all(executionPromises);
      } else {
        for (const promise of executionPromises) {
          await promise;
        }
      }

      // Remove executed nodes from the graph
      for (const nodeId of readyNodes) {
        if (dependencyGraph.get(nodeId)?.executed) {
          dependencyGraph.delete(nodeId);
        }
      }
    }

    return Object.fromEntries(results);
  }

  // Execute a single node
  async executeNode(executionId, node, context, previousResults, options) {
    const { dryRun, maxRetries } = options;
    const nodeId = node.id;

    try {
      let result;
      const nodeContext = {
        ...context,
        input: context,
        results: Object.fromEntries(previousResults),
        nodeId
      };

      // Handle different node types
      switch (node.type) {
        case 'start':
          result = nodeContext;
          break;

        case 'branch':
          result = await this.executeBranchNode(node, nodeContext, dryRun);
          break;

        case 'loop':
          result = await this.executeLoopNode(node, nodeContext, dryRun);
          break;

        case 'connector':
          result = await this.executeConnectorNode(node, nodeContext, dryRun);
          break;

        case 'expression':
          result = await this.executeExpressionNode(node, nodeContext);
          break;

        case 'subworkflow':
          result = await this.executeSubworkflowNode(node, nodeContext, dryRun);
          break;

        case 'end':
          result = nodeContext;
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
      
      return result;

    } catch (error) {
      throw new Error(`Node ${nodeId} failed: ${error.message}`);
    }
  }

  // Execute branch node with conditional logic
  async executeBranchNode(node, context, dryRun) {
    const condition = node.config?.condition;
    if (!condition) {
      throw new Error('Branch node missing condition');
    }

    const conditionResult = this.expressionEngine.evaluate(condition, context);
    const branch = conditionResult ? node.config.trueBranch : node.config.falseBranch;

    if (!branch) {
      return { conditionResult, branch: conditionResult ? 'true' : 'false' };
    }

    if (dryRun) {
      return { 
        dryRun: true, 
        conditionResult, 
        selectedBranch: conditionResult ? 'true' : 'false',
        branchAction: branch
      };
    }

    // Execute the selected branch action
    return await this.executeAction(branch, context);
  }

  // Execute loop node (while/forEach)
  async executeLoopNode(node, context, dryRun) {
    const { loopType, condition, loopBody, maxIterations = 100 } = node.config || {};
    
    if (!loopType || !condition || !loopBody) {
      throw new Error('Loop node missing required configuration');
    }

    const results = [];
    let iterations = 0;

    if (loopType === 'forEach') {
      const items = this.expressionEngine.evaluate(condition, context);
      if (!Array.isArray(items)) {
        throw new Error('forEach condition must evaluate to an array');
      }

      for (const item of items) {
        if (iterations >= maxIterations) break;
        
        const loopContext = { ...context, item, index: iterations };
        
        if (dryRun) {
          results.push({ 
            dryRun: true, 
            iteration: iterations, 
            item, 
            loopBody 
          });
        } else {
          const result = await this.executeAction(loopBody, loopContext);
          results.push(result);
        }
        
        iterations++;
      }
    } else if (loopType === 'while') {
      while (iterations < maxIterations) {
        const shouldContinue = this.expressionEngine.evaluate(condition, {
          ...context,
          iteration: iterations,
          results
        });
        
        if (!shouldContinue) break;

        const loopContext = { ...context, iteration: iterations };
        
        if (dryRun) {
          results.push({ 
            dryRun: true, 
            iteration: iterations, 
            loopBody 
          });
        } else {
          const result = await this.executeAction(loopBody, loopContext);
          results.push(result);
        }
        
        iterations++;
      }
    }

    return { results, iterations, loopType };
  }

  // Execute connector node
  async executeConnectorNode(node, context, dryRun) {
    const { connector, action, config = {} } = node.config || {};
    
    if (!connector || !action) {
      throw new Error('Connector node missing connector or action');
    }

    if (dryRun) {
      return {
        dryRun: true,
        connector,
        action,
        config,
        context: this.sanitizeContext(context)
      };
    }

    return await this.connectorRegistry.executeAction(connector, action, config, context);
  }

  // Execute expression node
  async executeExpressionNode(node, context) {
    const expression = node.config?.expression;
    if (!expression) {
      throw new Error('Expression node missing expression');
    }

    return {
      result: this.expressionEngine.evaluate(expression, context),
      expression
    };
  }

  // Execute subworkflow node
  async executeSubworkflowNode(node, context, dryRun) {
    const { workflowId, inputMapping = {} } = node.config || {};
    
    if (!workflowId) {
      throw new Error('Subworkflow node missing workflowId');
    }

    // Map input data
    const subworkflowInput = {};
    for (const [key, expression] of Object.entries(inputMapping)) {
      subworkflowInput[key] = this.expressionEngine.evaluate(expression, context);
    }

    if (dryRun) {
      return {
        dryRun: true,
        workflowId,
        inputMapping: subworkflowInput
      };
    }

    // Execute subworkflow (with depth protection)
    const depth = (context._depth || 0) + 1;
    if (depth > 10) {
      throw new Error('Maximum subworkflow depth exceeded');
    }

    const subworkflowContext = { ...subworkflowInput, _depth: depth };
    return await this.executeWorkflow(workflowId, subworkflowContext, { dryRun: false });
  }

  // Execute generic action
  async executeAction(action, context) {
    // This is a simplified action executor
    if (typeof action === 'string') {
      return this.expressionEngine.evaluate(action, context);
    }
    
    if (typeof action === 'object' && action.type) {
      // Handle structured actions
      switch (action.type) {
        case 'expression':
          return this.expressionEngine.evaluate(action.expression, context);
        case 'transform':
          return this.expressionEngine.evaluate(action.transform, context);
        default:
          return action;
      }
    }
    
    return action;
  }

  // Utility methods
  sanitizeContext(context) {
    // Remove sensitive data from context for logging
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  // Get execution details
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  // Store workflow
  storeWorkflow(id, definition) {
    this.workflows.set(id, { id, definition });
  }
}

module.exports = InMemoryWorkflowEngine;