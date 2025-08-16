// utils/model-catalog.js
// ----------------------------------------------------------------
// Model catalog management and utilities for AI model routing
// ----------------------------------------------------------------

const fs = require('fs');
const path = require('path');

// Load the model catalog
let modelCatalog = null;

function loadCatalog() {
  if (!modelCatalog) {
    const catalogPath = path.join(__dirname, '../data/model-catalog-sample.json');
    try {
      const data = fs.readFileSync(catalogPath, 'utf8');
      modelCatalog = JSON.parse(data);
      console.log(`✅ Loaded ${modelCatalog.models.length} models from catalog v${modelCatalog.catalog_version}`);
    } catch (err) {
      console.error('❌ Failed to load model catalog:', err.message);
      // Fallback to minimal catalog
      modelCatalog = {
        catalog_version: "v1.0.0-fallback",
        models: [
          {
            id: 1,
            repo_id: "meta-llama/Meta-Llama-3-8B-Instruct",
            category: "general",
            primary_tasks: ["chat", "reasoning"],
            serverless_candidate: true,
            requires_endpoint: false,
            provider: "huggingface",
            cost_per_1k_tokens: 0.0005,
            avg_latency_ms: 800,
            context_length: 8192
          }
        ]
      };
    }
  }
  return modelCatalog;
}

/**
 * Get all models in catalog
 * @returns {Array} Array of model objects
 */
function getAllModels() {
  const catalog = loadCatalog();
  return catalog.models;
}

/**
 * Get models by category
 * @param {string} category - Model category to filter by
 * @returns {Array} Array of matching models
 */
function getModelsByCategory(category) {
  const models = getAllModels();
  return models.filter(model => model.category === category);
}

/**
 * Get model by ID
 * @param {number} id - Model ID
 * @returns {Object|null} Model object or null if not found
 */
function getModelById(id) {
  const models = getAllModels();
  return models.find(model => model.id === id) || null;
}

/**
 * Get model by repo_id
 * @param {string} repoId - Model repo_id (e.g., "meta-llama/Meta-Llama-3-8B-Instruct")
 * @returns {Object|null} Model object or null if not found
 */
function getModelByRepoId(repoId) {
  const models = getAllModels();
  return models.find(model => model.repo_id === repoId) || null;
}

/**
 * Get models that support specific tasks
 * @param {Array} tasks - Array of task strings to match against
 * @returns {Array} Array of matching models
 */
function getModelsByTasks(tasks) {
  const models = getAllModels();
  return models.filter(model => 
    tasks.some(task => model.primary_tasks.includes(task))
  );
}

/**
 * Get serverless-compatible models
 * @returns {Array} Array of serverless-compatible models
 */
function getServerlessModels() {
  const models = getAllModels();
  return models.filter(model => model.serverless_candidate === true);
}

/**
 * Get models that require dedicated endpoints
 * @returns {Array} Array of models requiring endpoints
 */
function getEndpointRequiredModels() {
  const models = getAllModels();
  return models.filter(model => model.requires_endpoint === true);
}

/**
 * Filter models by latency threshold
 * @param {number} maxLatencyMs - Maximum allowed latency in milliseconds
 * @returns {Array} Array of models under latency threshold
 */
function getModelsByLatency(maxLatencyMs) {
  const models = getAllModels();
  return models.filter(model => model.avg_latency_ms <= maxLatencyMs);
}

/**
 * Filter models by cost threshold
 * @param {number} maxCostPer1k - Maximum cost per 1k tokens
 * @returns {Array} Array of models under cost threshold
 */
function getModelsByCost(maxCostPer1k) {
  const models = getAllModels();
  return models.filter(model => model.cost_per_1k_tokens <= maxCostPer1k);
}

/**
 * Filter models by context length requirement
 * @param {number} minContextLength - Minimum required context length
 * @returns {Array} Array of models with sufficient context length
 */
function getModelsByContextLength(minContextLength) {
  const models = getAllModels();
  return models.filter(model => model.context_length >= minContextLength);
}

/**
 * Get all unique categories
 * @returns {Array} Array of unique category strings
 */
function getCategories() {
  const models = getAllModels();
  return [...new Set(models.map(model => model.category))];
}

/**
 * Get all unique tasks
 * @returns {Array} Array of unique task strings
 */
function getAllTasks() {
  const models = getAllModels();
  const tasks = new Set();
  models.forEach(model => {
    model.primary_tasks.forEach(task => tasks.add(task));
  });
  return [...tasks];
}

module.exports = {
  loadCatalog,
  getAllModels,
  getModelsByCategory,
  getModelById,
  getModelByRepoId,
  getModelsByTasks,
  getServerlessModels,
  getEndpointRequiredModels,
  getModelsByLatency,
  getModelsByCost,
  getModelsByContextLength,
  getCategories,
  getAllTasks
};