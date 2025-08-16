// utils/health-monitor.js
// ----------------------------------------------------------------
// Health monitoring and circuit breaker for model availability
// ----------------------------------------------------------------

/**
 * Circuit breaker states
 */
const CIRCUIT_STATES = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, requests blocked
  HALF_OPEN: 'half_open' // Testing recovery
};

/**
 * Model health tracking
 */
class ModelHealthMonitor {
  constructor() {
    this.modelHealth = new Map(); // modelId -> health stats
    this.circuitBreakers = new Map(); // modelId -> circuit breaker state
    this.healthCheckInterval = null;
    
    // Configuration
    this.config = {
      failureThreshold: 5,        // Failures to trigger circuit open
      recoveryTimeout: 30000,     // 30s before attempting recovery
      successThreshold: 3,        // Successes needed to close circuit
      healthCheckInterval: 60000, // 1min health check interval
      requestTimeout: 10000,      // 10s request timeout
      sliding_window_size: 100    // Track last N requests
    };
    
    this.startHealthMonitoring();
  }

  /**
   * Initialize health stats for a model
   * @param {string} modelId - Model identifier
   */
  initializeModel(modelId) {
    if (!this.modelHealth.has(modelId)) {
      this.modelHealth.set(modelId, {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        avg_latency_ms: 0,
        recent_requests: [], // Sliding window
        last_success: null,
        last_failure: null,
        consecutive_failures: 0,
        availability_score: 1.0
      });
      
      this.circuitBreakers.set(modelId, {
        state: CIRCUIT_STATES.CLOSED,
        last_failure_time: null,
        failure_count: 0,
        success_count: 0
      });
    }
  }

  /**
   * Record a successful request
   * @param {string} modelId - Model identifier
   * @param {number} latencyMs - Request latency in milliseconds
   */
  recordSuccess(modelId, latencyMs) {
    this.initializeModel(modelId);
    
    const health = this.modelHealth.get(modelId);
    const circuit = this.circuitBreakers.get(modelId);
    
    // Update health stats
    health.total_requests++;
    health.successful_requests++;
    health.consecutive_failures = 0;
    health.last_success = new Date();
    
    // Update latency (exponential moving average)
    health.avg_latency_ms = health.avg_latency_ms === 0 
      ? latencyMs 
      : (health.avg_latency_ms * 0.9) + (latencyMs * 0.1);
    
    // Add to sliding window
    health.recent_requests.unshift({
      success: true,
      latency: latencyMs,
      timestamp: new Date()
    });
    
    if (health.recent_requests.length > this.config.sliding_window_size) {
      health.recent_requests.pop();
    }
    
    // Update circuit breaker
    if (circuit.state === CIRCUIT_STATES.HALF_OPEN) {
      circuit.success_count++;
      if (circuit.success_count >= this.config.successThreshold) {
        circuit.state = CIRCUIT_STATES.CLOSED;
        circuit.failure_count = 0;
        circuit.success_count = 0;
        console.log(`✅ Circuit breaker CLOSED for model ${modelId}`);
      }
    }
    
    this.updateAvailabilityScore(modelId);
  }

  /**
   * Record a failed request
   * @param {string} modelId - Model identifier
   * @param {string} error - Error description
   */
  recordFailure(modelId, error) {
    this.initializeModel(modelId);
    
    const health = this.modelHealth.get(modelId);
    const circuit = this.circuitBreakers.get(modelId);
    
    // Update health stats
    health.total_requests++;
    health.failed_requests++;
    health.consecutive_failures++;
    health.last_failure = new Date();
    
    // Add to sliding window
    health.recent_requests.unshift({
      success: false,
      error: error,
      timestamp: new Date()
    });
    
    if (health.recent_requests.length > this.config.sliding_window_size) {
      health.recent_requests.pop();
    }
    
    // Update circuit breaker
    circuit.failure_count++;
    circuit.last_failure_time = new Date();
    
    if (circuit.state === CIRCUIT_STATES.CLOSED && 
        circuit.failure_count >= this.config.failureThreshold) {
      circuit.state = CIRCUIT_STATES.OPEN;
      console.log(`🔴 Circuit breaker OPENED for model ${modelId} after ${circuit.failure_count} failures`);
    }
    
    this.updateAvailabilityScore(modelId);
  }

  /**
   * Check if a model is available for requests
   * @param {string} modelId - Model identifier
   * @returns {Object} Availability status and details
   */
  isModelAvailable(modelId) {
    this.initializeModel(modelId);
    
    const circuit = this.circuitBreakers.get(modelId);
    const health = this.modelHealth.get(modelId);
    const now = new Date();
    
    switch (circuit.state) {
      case CIRCUIT_STATES.CLOSED:
        return {
          available: true,
          state: 'healthy',
          reason: 'Circuit closed, model healthy'
        };
        
      case CIRCUIT_STATES.OPEN:
        // Check if enough time has passed to attempt recovery
        const timeSinceFailure = now - circuit.last_failure_time;
        if (timeSinceFailure >= this.config.recoveryTimeout) {
          circuit.state = CIRCUIT_STATES.HALF_OPEN;
          circuit.success_count = 0;
          console.log(`🟡 Circuit breaker HALF-OPEN for model ${modelId}, attempting recovery`);
          
          return {
            available: true,
            state: 'recovering',
            reason: 'Testing recovery, limited requests allowed'
          };
        }
        
        return {
          available: false,
          state: 'unavailable',
          reason: `Circuit open, ${Math.ceil((this.config.recoveryTimeout - timeSinceFailure) / 1000)}s until retry`,
          retry_after: this.config.recoveryTimeout - timeSinceFailure
        };
        
      case CIRCUIT_STATES.HALF_OPEN:
        return {
          available: true,
          state: 'recovering',
          reason: 'Testing recovery, limited requests allowed'
        };
        
      default:
        return {
          available: false,
          state: 'unknown',
          reason: 'Unknown circuit state'
        };
    }
  }

  /**
   * Get health statistics for a model
   * @param {string} modelId - Model identifier
   * @returns {Object} Health statistics
   */
  getModelHealth(modelId) {
    this.initializeModel(modelId);
    
    const health = this.modelHealth.get(modelId);
    const circuit = this.circuitBreakers.get(modelId);
    
    // Calculate recent success rate
    const recentRequests = health.recent_requests.slice(0, 20); // Last 20 requests
    const recentSuccesses = recentRequests.filter(r => r.success).length;
    const recentSuccessRate = recentRequests.length > 0 
      ? recentSuccesses / recentRequests.length 
      : 1.0;
    
    return {
      model_id: modelId,
      total_requests: health.total_requests,
      success_rate: health.total_requests > 0 
        ? health.successful_requests / health.total_requests 
        : 0,
      recent_success_rate: recentSuccessRate,
      avg_latency_ms: Math.round(health.avg_latency_ms),
      consecutive_failures: health.consecutive_failures,
      availability_score: health.availability_score,
      circuit_state: circuit.state,
      last_success: health.last_success,
      last_failure: health.last_failure,
      uptime_percentage: this.calculateUptime(modelId)
    };
  }

  /**
   * Get health stats for all models
   * @returns {Array} Array of model health stats
   */
  getAllModelHealth() {
    return Array.from(this.modelHealth.keys()).map(modelId => 
      this.getModelHealth(modelId)
    );
  }

  /**
   * Perform health check probe for a model
   * @param {string} modelId - Model identifier
   * @returns {Promise<Object>} Health check result
   */
  async probeModelHealth(modelId) {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would make an actual API call
      // For now, simulate a health check
      const isHealthy = Math.random() > 0.1; // 90% success rate simulation
      const latency = 200 + Math.random() * 800; // 200-1000ms latency
      
      await new Promise(resolve => setTimeout(resolve, latency));
      
      if (isHealthy) {
        this.recordSuccess(modelId, latency);
        return {
          healthy: true,
          latency_ms: latency,
          timestamp: new Date(),
          details: 'Health check passed'
        };
      } else {
        throw new Error('Health check failed');
      }
      
    } catch (error) {
      const latency = Date.now() - startTime;
      this.recordFailure(modelId, error.message);
      
      return {
        healthy: false,
        latency_ms: latency,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const modelIds = Array.from(this.modelHealth.keys());
      
      for (const modelId of modelIds) {
        await this.probeModelHealth(modelId);
      }
      
      console.log(`🔍 Health check completed for ${modelIds.length} models`);
    }, this.config.healthCheckInterval);
    
    console.log(`✅ Health monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Health monitoring stopped');
    }
  }

  // Helper methods
  updateAvailabilityScore(modelId) {
    const health = this.modelHealth.get(modelId);
    const recentRequests = health.recent_requests.slice(0, 50);
    
    if (recentRequests.length === 0) {
      health.availability_score = 1.0;
      return;
    }
    
    const successCount = recentRequests.filter(r => r.success).length;
    const baseScore = successCount / recentRequests.length;
    
    // Apply penalty for consecutive failures
    const failurePenalty = Math.min(0.5, health.consecutive_failures * 0.1);
    health.availability_score = Math.max(0.1, baseScore - failurePenalty);
  }

  calculateUptime(modelId) {
    const health = this.modelHealth.get(modelId);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentRequests = health.recent_requests.filter(
      r => r.timestamp >= last24h
    );
    
    if (recentRequests.length === 0) return 100;
    
    const successCount = recentRequests.filter(r => r.success).length;
    return Math.round((successCount / recentRequests.length) * 100);
  }
}

// Global health monitor instance
const healthMonitor = new ModelHealthMonitor();

module.exports = {
  healthMonitor,
  ModelHealthMonitor,
  CIRCUIT_STATES
};