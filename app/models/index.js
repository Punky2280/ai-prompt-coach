// PURPOSE: Core data models for workflow automation platform
// PHASE: A
// STATUS: partial
// VERIFY: Firestore collection naming conventions
// TODO:
// 1. Add validation schemas
// 2. Add model methods for complex operations
// 3. Add indexes for performance

const { db } = require('../lib/firestore');

// Core Collections
const workflowsCol = db.collection('workflows');
const workflowRunsCol = db.collection('workflow_runs');
const workflowVersionsCol = db.collection('workflow_versions');
const triggersCol = db.collection('triggers');
const connectorsCol = db.collection('connectors');
const connectorVersionsCol = db.collection('connector_versions');

// Legacy collection (preserve existing functionality)
const { promptsCol } = require('../lib/firestore');

/**
 * Workflow model
 * Represents a workflow definition with metadata
 */
const WorkflowModel = {
  collection: workflowsCol,
  
  async create(data) {
    const workflow = {
      name: data.name,
      description: data.description || '',
      tags: data.tags || [],
      active: data.active !== false, // default true
      settings: data.settings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy,
      ...data
    };
    
    const docRef = await this.collection.add(workflow);
    return { id: docRef.id, ...workflow };
  },

  async findById(id) {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async list(options = {}) {
    let query = this.collection.orderBy('updatedAt', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

/**
 * WorkflowVersion model
 * Stores versioned workflow definitions (nodes, edges, etc.)
 */
const WorkflowVersionModel = {
  collection: workflowVersionsCol,
  
  async create(data) {
    const version = {
      workflowId: data.workflowId,
      version: data.version,
      nodes: data.nodes || [],
      edges: data.edges || [],
      settings: data.settings || {},
      publishedAt: data.publishedAt || null,
      createdAt: new Date(),
      createdBy: data.createdBy,
      ...data
    };
    
    const docRef = await this.collection.add(version);
    return { id: docRef.id, ...version };
  },

  async getLatest(workflowId) {
    const snapshot = await this.collection
      .where('workflowId', '==', workflowId)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
      
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async getPublished(workflowId) {
    const snapshot = await this.collection
      .where('workflowId', '==', workflowId)
      .where('publishedAt', '!=', null)
      .orderBy('publishedAt', 'desc')
      .limit(1)
      .get();
      
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
};

/**
 * WorkflowRun model
 * Tracks execution instances of workflows
 */
const WorkflowRunModel = {
  collection: workflowRunsCol,
  
  async create(data) {
    const run = {
      workflowId: data.workflowId,
      workflowVersionId: data.workflowVersionId,
      triggerId: data.triggerId || null,
      status: 'queued', // queued, running, completed, failed, cancelled
      startedAt: null,
      completedAt: null,
      input: data.input || {},
      output: data.output || {},
      error: null,
      executionLog: [],
      createdAt: new Date(),
      ...data
    };
    
    const docRef = await this.collection.add(run);
    return { id: docRef.id, ...run };
  },

  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    if (status === 'running' && !additionalData.startedAt) {
      updateData.startedAt = new Date();
    }

    if (['completed', 'failed', 'cancelled'].includes(status) && !additionalData.completedAt) {
      updateData.completedAt = new Date();
    }

    await this.collection.doc(id).update(updateData);
    return { id, ...updateData };
  },

  async addLogEntry(id, entry) {
    const run = await this.collection.doc(id).get();
    if (!run.exists) return null;
    
    const currentLog = run.data().executionLog || [];
    const newLog = [...currentLog, {
      timestamp: new Date(),
      level: entry.level || 'info',
      message: entry.message,
      nodeId: entry.nodeId || null,
      data: entry.data || null
    }];

    await this.collection.doc(id).update({ executionLog: newLog });
    return newLog;
  }
};

/**
 * Trigger model
 * Defines workflow execution triggers
 */
const TriggerModel = {
  collection: triggersCol,
  
  async create(data) {
    const trigger = {
      workflowId: data.workflowId,
      type: data.type, // manual, webhook, cron, event
      config: data.config || {},
      active: data.active !== false,
      createdAt: new Date(),
      lastTriggered: null,
      ...data
    };
    
    const docRef = await this.collection.add(trigger);
    return { id: docRef.id, ...trigger };
  },

  async findByWorkflow(workflowId) {
    const snapshot = await this.collection
      .where('workflowId', '==', workflowId)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

/**
 * Connector model
 * Registry of available connectors/integrations
 */
const ConnectorModel = {
  collection: connectorsCol,
  
  async create(data) {
    const connector = {
      slug: data.slug,
      name: data.name,
      description: data.description || '',
      category: data.category || 'general',
      iconUrl: data.iconUrl || null,
      documentation: data.documentation || '',
      active: data.active !== false,
      createdAt: new Date(),
      ...data
    };
    
    const docRef = await this.collection.add(connector);
    return { id: docRef.id, ...connector };
  },

  async findBySlug(slug) {
    const snapshot = await this.collection.where('slug', '==', slug).limit(1).get();
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async list(options = {}) {
    let query = this.collection.where('active', '==', true);
    
    if (options.category) {
      query = query.where('category', '==', options.category);
    }
    
    const snapshot = await query.orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

module.exports = {
  WorkflowModel,
  WorkflowVersionModel,
  WorkflowRunModel,
  TriggerModel,
  ConnectorModel,
  // Legacy models
  promptsCol
};