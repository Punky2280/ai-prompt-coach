// PURPOSE: Connector registry orchestrator for dynamic connector loading
// PHASE: A
// STATUS: skeleton  
// VERIFY: confirm db table naming matches migrations
// TODO:
// 1. loadConnectorVersions(slug)
// 2. registerDynamicActions()
// 3. validateConnectorSchema()
// 4. supportPluginArchitecture()

const { connectorsCol, connectorVersionsCol } = require('../lib/schema');

class ConnectorRegistryService {
  constructor(deps = {}) {
    this.deps = deps;
    this.loadedConnectors = new Map();
    this.connectorCache = new Map();
  }

  /**
   * List all available connectors
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} List of connectors
   */
  async listConnectors(options = {}) {
    const { category, official, limit = 50 } = options;
    
    let query = connectorsCol.orderBy('name');
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (typeof official === 'boolean') {
      query = query.where('isOfficial', '==', official);
    }
    
    query = query.limit(limit);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get connector details by slug
   * @param {string} slug - Connector slug identifier
   * @returns {Promise<Object|null>} Connector details or null
   */
  async getConnector(slug) {
    if (this.connectorCache.has(slug)) {
      return this.connectorCache.get(slug);
    }

    const snapshot = await connectorsCol.where('slug', '==', slug).get();
    
    if (snapshot.empty) {
      return null;
    }

    const connector = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    this.connectorCache.set(slug, connector);
    return connector;
  }

  /**
   * Load connector versions for a specific connector
   * @param {string} slug - Connector slug
   * @returns {Promise<Array>} Available versions
   */
  async loadConnectorVersions(slug) {
    // TODO: Implement connector version loading with caching
    const connector = await this.getConnector(slug);
    
    if (!connector) {
      throw new Error(`Connector not found: ${slug}`);
    }

    const snapshot = await connectorVersionsCol
      .where('connectorId', '==', connector.id)
      .orderBy('version', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Register a new connector dynamically
   * @param {Object} connectorDef - Connector definition
   * @returns {Promise<string>} Connector ID
   */
  async registerConnector(connectorDef) {
    // TODO: Add schema validation
    const connector = {
      ...connectorDef,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await connectorsCol.add(connector);
    
    // Clear cache to ensure fresh data
    this.connectorCache.clear();
    
    return docRef.id;
  }

  /**
   * Register dynamic actions for a connector
   * @param {string} connectorSlug - Connector slug
   * @param {Array} actions - Action definitions
   * @returns {Promise<void>}
   */
  async registerDynamicActions(connectorSlug, actions) {
    // TODO: Implement dynamic action registration
    const connector = await this.getConnector(connectorSlug);
    
    if (!connector) {
      throw new Error(`Connector not found: ${connectorSlug}`);
    }

    // Store actions in connector version
    const versionData = {
      connectorId: connector.id,
      version: (connector.versions?.length || 0) + 1,
      actions: actions,
      createdAt: new Date(),
      deprecated: false
    };

    await connectorVersionsCol.add(versionData);
  }

  /**
   * Get available actions for a connector
   * @param {string} slug - Connector slug
   * @param {string} version - Specific version (optional, defaults to latest)
   * @returns {Promise<Array>} Available actions
   */
  async getConnectorActions(slug, version = null) {
    const connector = await this.getConnector(slug);
    
    if (!connector) {
      return [];
    }

    let query = connectorVersionsCol.where('connectorId', '==', connector.id);
    
    if (version) {
      query = query.where('version', '==', version);
    } else {
      query = query.orderBy('version', 'desc').limit(1);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }

    const versionDoc = snapshot.docs[0].data();
    return versionDoc.actions || [];
  }

  /**
   * Validate connector schema
   * @param {Object} connectorDef - Connector definition to validate
   * @returns {Object} Validation result
   */
  validateConnectorSchema(connectorDef) {
    // TODO: Implement comprehensive schema validation
    const required = ['slug', 'name', 'category'];
    const missing = required.filter(field => !connectorDef[field]);
    
    return {
      valid: missing.length === 0,
      errors: missing.map(field => `Missing required field: ${field}`)
    };
  }

  /**
   * Clear connector cache
   */
  clearCache() {
    this.connectorCache.clear();
    this.loadedConnectors.clear();
  }
}

// Singleton instance
const connectorRegistryService = new ConnectorRegistryService();

module.exports = { ConnectorRegistryService, connectorRegistryService };