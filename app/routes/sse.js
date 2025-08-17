// PURPOSE: Server-Sent Events for real-time workflow execution updates
// PHASE: A
// STATUS: partial
// VERIFY: SSE protocol compliance, heartbeat every 25s, proper event structure
// TODO:
// 1. Implement client management and cleanup
// 2. Add authentication/authorization
// 3. Add event filtering by execution ID
// 4. Add reconnection support

const express = require('express');
const router = express.Router();
const { workflowExecutionsCol, executionStepsCol } = require('../lib/schema');

/**
 * SSE Client Management
 */
class SSEManager {
  constructor() {
    this.clients = new Map(); // executionId -> Set of response objects
    this.heartbeatInterval = 25000; // 25 seconds as per spec
    this.startHeartbeat();
  }

  /**
   * Add SSE client for execution updates
   * @param {string} executionId - Execution ID to monitor
   * @param {Response} res - Express response object
   */
  addClient(executionId, res) {
    if (!this.clients.has(executionId)) {
      this.clients.set(executionId, new Set());
    }
    this.clients.get(executionId).add(res);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(executionId, res);
    });
  }

  /**
   * Remove SSE client
   * @param {string} executionId - Execution ID
   * @param {Response} res - Express response object
   */
  removeClient(executionId, res) {
    const clientSet = this.clients.get(executionId);
    if (clientSet) {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        this.clients.delete(executionId);
      }
    }
  }

  /**
   * Broadcast event to all clients monitoring an execution
   * @param {string} executionId - Execution ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  broadcast(executionId, event, data) {
    const clientSet = this.clients.get(executionId);
    if (!clientSet) return;

    const sseData = this.formatSSEData(event, data);
    const deadClients = new Set();

    for (const res of clientSet) {
      try {
        res.write(sseData);
      } catch (error) {
        console.error('SSE write error:', error);
        deadClients.add(res);
      }
    }

    // Clean up dead connections
    for (const deadClient of deadClients) {
      this.removeClient(executionId, deadClient);
    }
  }

  /**
   * Format data for SSE protocol
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @returns {string} Formatted SSE data
   */
  formatSSEData(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  /**
   * Send heartbeat to all connected clients
   */
  sendHeartbeat() {
    const heartbeatData = this.formatSSEData('heartbeat', { 
      timestamp: new Date().toISOString() 
    });

    for (const [executionId, clientSet] of this.clients) {
      const deadClients = new Set();
      
      for (const res of clientSet) {
        try {
          res.write(heartbeatData);
        } catch (error) {
          console.error('Heartbeat error:', error);
          deadClients.add(res);
        }
      }

      // Clean up dead connections
      for (const deadClient of deadClients) {
        this.removeClient(executionId, deadClient);
      }
    }
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat() {
    setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  /**
   * Get connected client count
   * @returns {number} Total connected clients
   */
  getClientCount() {
    let count = 0;
    for (const clientSet of this.clients.values()) {
      count += clientSet.size;
    }
    return count;
  }
}

// Global SSE manager instance
const sseManager = new SSEManager();

/**
 * GET /sse/:executionId - Subscribe to execution events
 * 
 * Events emitted:
 * - step_started: { stepId, nodeId, nodeName }
 * - step_log: { stepId, level, message, timestamp }
 * - step_output: { stepId, output }
 * - step_error: { stepId, error }
 * - step_completed: { stepId, nodeId, output, duration }
 * - run_completed: { executionId, status, duration }
 * - token: { token } (for LLM streaming)
 * - heartbeat: { timestamp }
 */
router.get('/sse/:executionId', async (req, res) => {
  const { executionId } = req.params;

  try {
    // Verify execution exists
    const executionDoc = await workflowExecutionsCol.doc(executionId).get();
    if (!executionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(sseManager.formatSSEData('connected', { 
      executionId, 
      timestamp: new Date().toISOString() 
    }));

    // Add client to manager
    sseManager.addClient(executionId, res);

    // Send current execution state if execution is active
    const execution = executionDoc.data();
    if (execution.status === 'running') {
      res.write(sseManager.formatSSEData('run_started', { 
        executionId,
        status: execution.status,
        startedAt: execution.startedAt
      }));

      // Send any existing step updates
      await sendExistingStepUpdates(executionId, res);
    } else if (execution.status === 'completed' || execution.status === 'failed') {
      // Send completion event for already finished executions
      res.write(sseManager.formatSSEData('run_completed', {
        executionId,
        status: execution.status,
        duration: execution.duration,
        error: execution.error
      }));
    }

  } catch (error) {
    console.error('SSE connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to establish SSE connection'
    });
  }
});

/**
 * Send existing step updates for active execution
 * @param {string} executionId - Execution ID
 * @param {Response} res - Response object
 */
async function sendExistingStepUpdates(executionId, res) {
  try {
    const stepsSnapshot = await executionStepsCol
      .where('executionId', '==', executionId)
      .orderBy('startedAt', 'asc')
      .get();

    for (const stepDoc of stepsSnapshot.docs) {
      const step = stepDoc.data();
      const stepData = {
        stepId: stepDoc.id,
        nodeId: step.nodeId,
        nodeName: step.nodeName,
        status: step.status
      };

      // Send appropriate event based on step status
      if (step.status === 'running') {
        res.write(sseManager.formatSSEData('step_started', stepData));
      } else if (step.status === 'completed') {
        res.write(sseManager.formatSSEData('step_completed', {
          ...stepData,
          output: step.output,
          duration: step.duration
        }));
      } else if (step.status === 'failed') {
        res.write(sseManager.formatSSEData('step_error', {
          ...stepData,
          error: step.error
        }));
      }
    }
  } catch (error) {
    console.error('Error sending existing step updates:', error);
  }
}

/**
 * POST /sse/broadcast - Internal endpoint for broadcasting events
 * (Used by WorkflowRunnerService)
 */
router.post('/broadcast', express.json(), (req, res) => {
  const { executionId, event, data } = req.body;

  if (!executionId || !event) {
    return res.status(400).json({
      success: false,
      error: 'executionId and event are required'
    });
  }

  try {
    sseManager.broadcast(executionId, event, data);
    res.json({
      success: true,
      data: { message: 'Event broadcasted' }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast event'
    });
  }
});

/**
 * GET /sse/status - Get SSE manager status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      connectedClients: sseManager.getClientCount(),
      activeExecutions: sseManager.clients.size,
      heartbeatInterval: sseManager.heartbeatInterval
    }
  });
});

// Export SSE manager for use in WorkflowRunnerService
module.exports = { router, sseManager };