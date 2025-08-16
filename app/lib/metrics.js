// lib/metrics.js
// Simple metrics collection for health monitoring

let metrics = {
  requestCount: 0,
  errorCount: 0,
  promptsProcessed: 0,
  averageResponseTime: 0,
  lastRequestTime: null,
  startTime: new Date()
};

// Request counter middleware
function countRequest(req, res, next) {
  const startTime = Date.now();
  metrics.requestCount++;
  metrics.lastRequestTime = new Date();
  
  // Measure response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    // Simple moving average for response time
    metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
    
    // Count errors
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
  });
  
  next();
}

function incrementPromptCount() {
  metrics.promptsProcessed++;
}

function getMetrics() {
  return {
    ...metrics,
    uptime: Date.now() - metrics.startTime.getTime(),
    errorRate: metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%' : '0%'
  };
}

function resetMetrics() {
  metrics = {
    requestCount: 0,
    errorCount: 0,
    promptsProcessed: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    startTime: new Date()
  };
}

module.exports = {
  countRequest,
  incrementPromptCount,
  getMetrics,
  resetMetrics
};