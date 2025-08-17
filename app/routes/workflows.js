// PURPOSE: Server-Sent Events streaming for real-time workflow updates
// PHASE: A  
// STATUS: complete
// VERIFY: SSE protocol compliance and browser compatibility
// TODO:
// 1. Add authentication/authorization
// 2. Add rate limiting
// 3. Add client reconnection handling
// 4. Add heartbeat optimization

const express = require('express');
const router = express.Router();
const { workflowRunnerService } = require('../services/WorkflowRunnerService');

// Active SSE connections
const activeConnections = new Map(); // runId -> Set of response objects

/**
 * SSE endpoint for workflow run updates
 * GET /api/workflows/runs/:runId/stream
 */
router.get('/runs/:runId/stream', (req, res) => {
  const { runId } = req.params;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store connection
  if (!activeConnections.has(runId)) {
    activeConnections.set(runId, new Set());
  }
  activeConnections.get(runId).add(res);

  // Send initial connection event
  sendSSEEvent(res, 'connected', { runId, timestamp: new Date().toISOString() });

  // Handle client disconnect
  req.on('close', () => {
    const connections = activeConnections.get(runId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        activeConnections.delete(runId);
      }
    }
  });

  // Send heartbeat every 25 seconds
  const heartbeatInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeatInterval);
      return;
    }
    sendSSEEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * General SSE endpoint for all workflow events
 * GET /api/workflows/stream
 */
router.get('/stream', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  sendSSEEvent(res, 'connected', { timestamp: new Date().toISOString() });

  // Store connection for global events
  if (!activeConnections.has('global')) {
    activeConnections.set('global', new Set());
  }
  activeConnections.get('global').add(res);

  // Handle client disconnect
  req.on('close', () => {
    const connections = activeConnections.get('global');
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        activeConnections.delete('global');
      }
    }
  });

  // Send heartbeat every 25 seconds
  const heartbeatInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeatInterval);
      return;
    }
    sendSSEEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * Send SSE event to response stream
 */
function sendSSEEvent(res, event, data) {
  if (res.writableEnded) return;
  
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    console.error('Error sending SSE event:', error);
  }
}

/**
 * Broadcast event to all connections for a specific run
 */
function broadcastToRun(runId, event, data) {
  const connections = activeConnections.get(runId);
  if (connections) {
    connections.forEach(res => {
      sendSSEEvent(res, event, data);
    });
  }

  // Also broadcast to global listeners
  broadcastToGlobal(event, { ...data, runId });
}

/**
 * Broadcast event to all global connections
 */
function broadcastToGlobal(event, data) {
  const connections = activeConnections.get('global');
  if (connections) {
    connections.forEach(res => {
      sendSSEEvent(res, event, data);
    });
  }
}

// Set up workflow runner event listeners
workflowRunnerService.on('run_started', (data) => {
  broadcastToRun(data.runId, 'run_started', data);
});

workflowRunnerService.on('run_completed', (data) => {
  broadcastToRun(data.runId, 'run_completed', data);
});

workflowRunnerService.on('run_failed', (data) => {
  broadcastToRun(data.runId, 'run_failed', data);
});

workflowRunnerService.on('run_cancelled', (data) => {
  broadcastToRun(data.runId, 'run_cancelled', data);
});

workflowRunnerService.on('node_started', (data) => {
  broadcastToRun(data.runId, 'node_started', data);
});

workflowRunnerService.on('node_completed', (data) => {
  broadcastToRun(data.runId, 'node_completed', data);
});

workflowRunnerService.on('node_failed', (data) => {
  broadcastToRun(data.runId, 'node_failed', data);
});

/**
 * Get connection statistics
 */
router.get('/connections', (req, res) => {
  const stats = {
    totalConnections: 0,
    connectionsByRun: {}
  };

  activeConnections.forEach((connections, runId) => {
    stats.connectionsByRun[runId] = connections.size;
    stats.totalConnections += connections.size;
  });

  res.json(stats);
});

module.exports = router;