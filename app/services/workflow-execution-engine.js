// services/workflow-execution-engine.js - Core Workflow Execution Engine
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../lib/database');
const SimpleExpressionEngine = require('./simple-expression-engine');
const ConnectorRegistry = require('./connector-registry');

class WorkflowExecutionEngine {
  constructor() {
    this.expressionEngine = new SimpleExpressionEngine();
    this.connectorRegistry = new ConnectorRegistry();
    this.activeExecutions = new Map();
    this.maxParallelExecutions = process.env.MAX_PARALLEL_EXECUTIONS || 10;
  }

  // Execute a workflow
  async executeWorkflow(workflowId, inputData = {}, options = {}) {
    const { dryRun = false, maxRetries = 3, parallel = true } = options;
    const executionId = uuidv4();

    try {
      // Get workflow definition
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create execution record
      const execution = await this.createExecution(workflow.id, inputData, dryRun, executionId);
      
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
      await this.updateExecution(executionId, 'completed', result);
      
      return {
        executionId,
        status: 'completed',
        result,
        dryRun
      };

    } catch (error) {
      console.error(`Workflow execution failed:`, error);
      await this.updateExecution(executionId, 'failed', null, error.message);
      
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
          dependencyGraph.delete(nodeId);
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
    }

    return Object.fromEntries(results);
  }

  // Execute a single node
  async executeNode(executionId, node, context, previousResults, options) {
    const { dryRun, maxRetries } = options;
    const nodeId = node.id;

    // Create node execution record
    await this.createNodeExecution(executionId, nodeId);

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

      // Update node execution
      await this.updateNodeExecution(executionId, nodeId, 'completed', result);
      
      return result;

    } catch (error) {
      // Retry logic
      const retryCount = await this.getNodeRetryCount(executionId, nodeId);
      
      if (retryCount < maxRetries) {
        await this.incrementNodeRetryCount(executionId, nodeId);
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeNode(executionId, node, context, previousResults, options);
      }

      await this.updateNodeExecution(executionId, nodeId, 'failed', null, error.message);
      throw error;
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
    const { loopType, condition, loopBody, maxIterations = 1000 } = node.config || {};
    
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
    // In a full implementation, this would handle various action types
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

  // Database helpers
  async getWorkflow(workflowId) {
    const result = await query(
      'SELECT * FROM workflows WHERE id = $1 AND status = $2',
      [workflowId, 'active']
    );
    return result.rows[0];
  }

  async createExecution(workflowId, inputData, dryRun, executionId) {
    const result = await query(
      `INSERT INTO workflow_executions (id, workflow_id, input_data, dry_run, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [executionId, workflowId, JSON.stringify(inputData), dryRun, 'running']
    );
    return result.rows[0];
  }

  async updateExecution(executionId, status, outputData, errorMessage = null) {
    await query(
      `UPDATE workflow_executions 
       SET status = $1, output_data = $2, completed_at = NOW(), error_message = $3
       WHERE id = $4`,
      [status, outputData ? JSON.stringify(outputData) : null, errorMessage, executionId]
    );
  }

  async createNodeExecution(executionId, nodeId) {
    await query(
      `INSERT INTO workflow_node_executions (execution_id, node_id, started_at, status) 
       VALUES ($1, $2, NOW(), $3)`,
      [executionId, nodeId, 'running']
    );
  }

  async updateNodeExecution(executionId, nodeId, status, outputData, errorMessage = null) {
    await query(
      `UPDATE workflow_node_executions 
       SET status = $1, output_data = $2, completed_at = NOW(), error_message = $3
       WHERE execution_id = $4 AND node_id = $5`,
      [status, outputData ? JSON.stringify(outputData) : null, errorMessage, executionId, nodeId]
    );
  }

  async getNodeRetryCount(executionId, nodeId) {
    const result = await query(
      'SELECT retry_count FROM workflow_node_executions WHERE execution_id = $1 AND node_id = $2',
      [executionId, nodeId]
    );
    return result.rows[0]?.retry_count || 0;
  }

  async incrementNodeRetryCount(executionId, nodeId) {
    await query(
      'UPDATE workflow_node_executions SET retry_count = retry_count + 1 WHERE execution_id = $1 AND node_id = $2',
      [executionId, nodeId]
    );
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
}

module.exports = WorkflowExecutionEngine;