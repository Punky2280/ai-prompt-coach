// PURPOSE: Database schema design for Cartrita workflow automation platform
// PHASE: A  
// STATUS: skeleton
// VERIFY: Firestore collection structure and indexes
// TODO:
// 1. Define workflow, node, trigger, and execution schemas
// 2. Add migration utilities for Firestore
// 3. Implement schema validation

const { db } = require('../lib/firestore');

/**
 * Core Collections for Workflow Automation Platform
 */

// Workflows - Main workflow definitions
const workflowsCol = db.collection('workflows');

// Workflow Versions - Immutable versions of workflows
const workflowVersionsCol = db.collection('workflow_versions'); 

// Workflow Executions - Runtime execution instances
const workflowExecutionsCol = db.collection('workflow_executions');

// Workflow Execution Steps - Individual step executions within a workflow run
const executionStepsCol = db.collection('execution_steps');

// Connectors - Available connector definitions
const connectorsCol = db.collection('connectors');

// Connector Versions - Versioned connector implementations
const connectorVersionsCol = db.collection('connector_versions');

// Triggers - Webhook, cron, manual trigger definitions
const triggersCol = db.collection('triggers');

// RAG Documents - Knowledge base documents (Phase C)
const ragDocumentsCol = db.collection('rag_documents');

// RAG Embeddings - Vector embeddings for documents (Phase C)
const ragEmbeddingsCol = db.collection('rag_embeddings');

// MCP Capabilities - Model Context Protocol capabilities (Phase D)
const mcpCapabilitiesCol = db.collection('mcp_capabilities');

// Audit Logs - Security and compliance audit trail
const auditLogsCol = db.collection('audit_logs');

/**
 * Schema Definitions
 */

const WorkflowSchema = {
  id: 'string',           // Auto-generated
  name: 'string',         // User-friendly name
  description: 'string',  // Optional description
  version: 'number',      // Current version number
  status: 'string',       // active, inactive, draft
  nodes: 'array',         // Node definitions
  edges: 'array',         // Connection definitions
  triggers: 'array',      // Associated triggers
  settings: 'object',     // Workflow-level settings
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  createdBy: 'string',    // User ID
  tags: 'array'           // Categorization tags
};

const WorkflowExecutionSchema = {
  id: 'string',           // Auto-generated
  workflowId: 'string',   // Reference to workflow
  workflowVersion: 'number',
  status: 'string',       // running, completed, failed, cancelled
  triggeredBy: 'string',  // manual, webhook, cron, api
  triggerData: 'object',  // Input data from trigger
  startedAt: 'timestamp',
  completedAt: 'timestamp',
  duration: 'number',     // Execution time in ms
  error: 'string',        // Error message if failed
  metadata: 'object'      // Additional execution metadata
};

const ExecutionStepSchema = {
  id: 'string',           // Auto-generated
  executionId: 'string',  // Reference to workflow execution
  nodeId: 'string',       // Node being executed
  nodeName: 'string',     // Node display name
  nodeType: 'string',     // transform, action, trigger, condition
  status: 'string',       // pending, running, completed, failed, skipped
  input: 'object',        // Input data for this step
  output: 'object',       // Output data from this step
  error: 'string',        // Error message if failed
  startedAt: 'timestamp',
  completedAt: 'timestamp',
  duration: 'number',     // Step execution time in ms
  retryCount: 'number',   // Number of retries attempted
  logs: 'array'           // Step-specific log entries
};

const ConnectorSchema = {
  id: 'string',           // Auto-generated
  slug: 'string',         // URL-friendly identifier
  name: 'string',         // Display name
  description: 'string',
  category: 'string',     // api, database, file, ai, etc.
  iconUrl: 'string',      // Icon for UI
  documentationUrl: 'string',
  isOfficial: 'boolean',  // Official vs community connector
  versions: 'array',      // Available versions
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

/**
 * Initialize collections with proper indexes
 * Note: Firestore indexes need to be created via Firebase Console or CLI
 */
async function initializeCollections() {
  // TODO: Add index creation logic for Firestore
  console.log('Collections initialized:', {
    workflows: workflowsCol.path,
    executions: workflowExecutionsCol.path,
    steps: executionStepsCol.path,
    connectors: connectorsCol.path
  });
}

module.exports = {
  // Collections
  workflowsCol,
  workflowVersionsCol,
  workflowExecutionsCol,
  executionStepsCol,
  connectorsCol,
  connectorVersionsCol,
  triggersCol,
  ragDocumentsCol,
  ragEmbeddingsCol,
  mcpCapabilitiesCol,
  auditLogsCol,
  
  // Schemas
  WorkflowSchema,
  WorkflowExecutionSchema,
  ExecutionStepSchema,
  ConnectorSchema,
  
  // Utilities
  initializeCollections
};