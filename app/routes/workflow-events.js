// routes/workflow-events.js - Server-Sent Events for Real-time Monitoring
const express = require('express');
const { query } = require('../lib/database');

const router = express.Router();
const activeConnections = new Map();

// SSE endpoint for workflow execution monitoring
router.get('/executions/:executionId/events', (req, res) => {
  const { executionId } = req.params;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ executionId, timestamp: new Date().toISOString() })}\n\n`);

  // Store connection
  activeConnections.set(executionId, res);

  // Handle client disconnect
  req.on('close', () => {
    activeConnections.delete(executionId);
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (activeConnections.has(executionId)) {
      res.write('event: heartbeat\n');
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // 30 seconds

  // Send current execution status
  sendExecutionStatus(executionId);
});

// SSE endpoint for all workflow executions
router.get('/executions/events', (req, res) => {
  const connectionId = `global-${Date.now()}`;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ connectionId, timestamp: new Date().toISOString() })}\n\n`);

  // Store connection for global events
  activeConnections.set(connectionId, res);

  // Handle client disconnect
  req.on('close', () => {
    activeConnections.delete(connectionId);
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (activeConnections.has(connectionId)) {
      res.write('event: heartbeat\n');
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

// Function to broadcast execution events
function broadcastExecutionEvent(executionId, event, data) {
  // Send to specific execution listeners
  const connection = activeConnections.get(executionId);
  if (connection) {
    try {
      connection.write(`event: ${event}\n`);
      connection.write(`data: ${JSON.stringify({ executionId, ...data, timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      console.error('Failed to send SSE event:', error);
      activeConnections.delete(executionId);
    }
  }

  // Send to global listeners
  for (const [connId, conn] of activeConnections) {
    if (connId.startsWith('global-')) {
      try {
        conn.write(`event: ${event}\n`);
        conn.write(`data: ${JSON.stringify({ executionId, ...data, timestamp: new Date().toISOString() })}\n\n`);
      } catch (error) {
        console.error('Failed to send global SSE event:', error);
        activeConnections.delete(connId);
      }
    }
  }
}

// Function to send current execution status
async function sendExecutionStatus(executionId) {
  try {
    const executionResult = await query(
      'SELECT * FROM workflow_executions WHERE id = $1',
      [executionId]
    );

    if (executionResult.rows.length > 0) {
      const execution = executionResult.rows[0];
      
      const nodesResult = await query(
        `SELECT node_id, status, started_at, completed_at, retry_count, error_message
         FROM workflow_node_executions 
         WHERE execution_id = $1 
         ORDER BY started_at ASC`,
        [executionId]
      );

      broadcastExecutionEvent(executionId, 'status', {
        execution: {
          id: execution.id,
          status: execution.status,
          started_at: execution.started_at,
          completed_at: execution.completed_at,
          dry_run: execution.dry_run
        },
        nodes: nodesResult.rows
      });
    }
  } catch (error) {
    console.error('Failed to send execution status:', error);
  }
}

// Event emitter for workflow events (to be used by the execution engine)
class WorkflowEventEmitter {
  static emitExecutionStarted(executionId, workflowId, inputData, options = {}) {
    broadcastExecutionEvent(executionId, 'execution_started', {
      workflowId,
      inputData: options.includeData ? inputData : '[data hidden]',
      dryRun: options.dryRun || false
    });
  }

  static emitExecutionCompleted(executionId, result, options = {}) {
    broadcastExecutionEvent(executionId, 'execution_completed', {
      result: options.includeData ? result : '[result hidden]',
      dryRun: options.dryRun || false
    });
  }

  static emitExecutionFailed(executionId, error, options = {}) {
    broadcastExecutionEvent(executionId, 'execution_failed', {
      error: error.message || error,
      dryRun: options.dryRun || false
    });
  }

  static emitNodeStarted(executionId, nodeId, nodeType) {
    broadcastExecutionEvent(executionId, 'node_started', {
      nodeId,
      nodeType
    });
  }

  static emitNodeCompleted(executionId, nodeId, result, options = {}) {
    broadcastExecutionEvent(executionId, 'node_completed', {
      nodeId,
      result: options.includeData ? result : '[result hidden]'
    });
  }

  static emitNodeFailed(executionId, nodeId, error, retryCount = 0) {
    broadcastExecutionEvent(executionId, 'node_failed', {
      nodeId,
      error: error.message || error,
      retryCount
    });
  }

  static emitNodeRetrying(executionId, nodeId, retryCount, delay) {
    broadcastExecutionEvent(executionId, 'node_retrying', {
      nodeId,
      retryCount,
      delay
    });
  }

  static emitCustomEvent(executionId, eventType, data) {
    broadcastExecutionEvent(executionId, eventType, data);
  }

  // Get active connections count
  static getActiveConnectionsCount() {
    return activeConnections.size;
  }

  // Clean up closed connections
  static cleanupConnections() {
    for (const [id, connection] of activeConnections) {
      try {
        // Try to write a ping to detect closed connections
        connection.write('event: ping\n');
        connection.write('data: {}\n\n');
      } catch (error) {
        activeConnections.delete(id);
      }
    }
  }
}

// Periodic cleanup of closed connections
setInterval(() => {
  WorkflowEventEmitter.cleanupConnections();
}, 60000); // Every minute

module.exports = {
  router,
  WorkflowEventEmitter,
  broadcastExecutionEvent
};