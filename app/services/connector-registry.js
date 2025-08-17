// services/connector-registry.js - Dynamic Connector Loading and Management
const { query } = require('../lib/database');

class ConnectorRegistry {
  constructor() {
    this.connectors = new Map();
    this.loadBuiltinConnectors();
  }

  // Load built-in connectors
  loadBuiltinConnectors() {
    // HTTP Connector
    this.registerConnector('http', {
      name: 'HTTP',
      type: 'http',
      version: '1.0.0',
      actions: {
        get: this.httpGet.bind(this),
        post: this.httpPost.bind(this),
        put: this.httpPut.bind(this),
        delete: this.httpDelete.bind(this),
        request: this.httpRequest.bind(this)
      }
    });

    // Data Transform Connector
    this.registerConnector('transform', {
      name: 'Data Transform',
      type: 'data',
      version: '1.0.0',
      actions: {
        map: this.transformMap.bind(this),
        filter: this.transformFilter.bind(this),
        reduce: this.transformReduce.bind(this),
        merge: this.transformMerge.bind(this),
        extract: this.transformExtract.bind(this)
      }
    });

    // Utility Connector
    this.registerConnector('util', {
      name: 'Utilities',
      type: 'utility',
      version: '1.0.0',
      actions: {
        delay: this.utilDelay.bind(this),
        log: this.utilLog.bind(this),
        validate: this.utilValidate.bind(this),
        format: this.utilFormat.bind(this)
      }
    });

    console.log('✅ Built-in connectors loaded');
  }

  // Register a connector
  async registerConnector(name, connector) {
    this.connectors.set(name, connector);
    
    // Persist to database (if available)
    try {
      await query(
        `INSERT INTO connectors (name, type, version, config, actions) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (name) DO UPDATE SET
         type = $2, version = $3, config = $4, actions = $5, enabled = true`,
        [
          name,
          connector.type,
          connector.version,
          JSON.stringify(connector.config || {}),
          JSON.stringify(Object.keys(connector.actions))
        ]
      );
    } catch (error) {
      // Silently ignore database errors - connectors still work in memory
    }
  }

  // Execute connector action
  async executeAction(connectorName, actionName, config, context) {
    const connector = this.connectors.get(connectorName);
    if (!connector) {
      throw new Error(`Connector ${connectorName} not found`);
    }

    const action = connector.actions[actionName];
    if (!action) {
      throw new Error(`Action ${actionName} not found in connector ${connectorName}`);
    }

    try {
      return await action(config, context);
    } catch (error) {
      throw new Error(`Connector action failed: ${error.message}`);
    }
  }

  // Get available connectors
  getConnectors() {
    return Array.from(this.connectors.entries()).map(([name, connector]) => ({
      name,
      type: connector.type,
      version: connector.version,
      actions: Object.keys(connector.actions)
    }));
  }

  // HTTP Connector Actions
  async httpGet(config, context) {
    return this.httpRequest({ ...config, method: 'GET' }, context);
  }

  async httpPost(config, context) {
    return this.httpRequest({ ...config, method: 'POST' }, context);
  }

  async httpPut(config, context) {
    return this.httpRequest({ ...config, method: 'PUT' }, context);
  }

  async httpDelete(config, context) {
    return this.httpRequest({ ...config, method: 'DELETE' }, context);
  }

  async httpRequest(config, context) {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = config;
    
    if (!url) {
      throw new Error('URL is required for HTTP requests');
    }

    try {
      // Use fetch for HTTP requests
      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        success: response.ok
      };

    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  // Data Transform Actions
  async transformMap(config, context) {
    const { data, mapping } = config;
    const sourceData = data || context.input;
    
    if (!Array.isArray(sourceData)) {
      throw new Error('Map transform requires array data');
    }

    if (typeof mapping === 'function') {
      return sourceData.map(mapping);
    }

    if (typeof mapping === 'string') {
      // Simple field mapping
      return sourceData.map(item => item[mapping]);
    }

    if (typeof mapping === 'object') {
      // Object mapping
      return sourceData.map(item => {
        const mapped = {};
        for (const [key, value] of Object.entries(mapping)) {
          mapped[key] = this.getNestedValue(item, value);
        }
        return mapped;
      });
    }

    return sourceData;
  }

  async transformFilter(config, context) {
    const { data, condition } = config;
    const sourceData = data || context.input;
    
    if (!Array.isArray(sourceData)) {
      throw new Error('Filter transform requires array data');
    }

    if (typeof condition === 'function') {
      return sourceData.filter(condition);
    }

    if (typeof condition === 'string') {
      // Simple field existence check
      return sourceData.filter(item => item[condition]);
    }

    return sourceData;
  }

  async transformReduce(config, context) {
    const { data, reducer, initialValue } = config;
    const sourceData = data || context.input;
    
    if (!Array.isArray(sourceData)) {
      throw new Error('Reduce transform requires array data');
    }

    if (typeof reducer === 'function') {
      return initialValue !== undefined 
        ? sourceData.reduce(reducer, initialValue)
        : sourceData.reduce(reducer);
    }

    // Simple aggregation
    if (reducer === 'sum') {
      return sourceData.reduce((sum, item) => sum + (Number(item) || 0), 0);
    }

    if (reducer === 'count') {
      return sourceData.length;
    }

    return sourceData;
  }

  async transformMerge(config, context) {
    const { data, mergeWith } = config;
    const sourceData = data || context.input;
    
    if (Array.isArray(sourceData) && Array.isArray(mergeWith)) {
      return [...sourceData, ...mergeWith];
    }

    if (typeof sourceData === 'object' && typeof mergeWith === 'object') {
      return { ...sourceData, ...mergeWith };
    }

    throw new Error('Merge transform requires compatible data types');
  }

  async transformExtract(config, context) {
    const { data, fields } = config;
    const sourceData = data || context.input;
    
    if (typeof fields === 'string') {
      return this.getNestedValue(sourceData, fields);
    }

    if (Array.isArray(fields)) {
      const extracted = {};
      for (const field of fields) {
        extracted[field] = this.getNestedValue(sourceData, field);
      }
      return extracted;
    }

    return sourceData;
  }

  // Utility Actions
  async utilDelay(config, context) {
    const { duration = 1000 } = config;
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    return {
      delayed: duration,
      timestamp: new Date().toISOString()
    };
  }

  async utilLog(config, context) {
    const { message, level = 'info' } = config;
    const logMessage = message || JSON.stringify(context, null, 2);
    
    console.log(`[${level.toUpperCase()}] ${logMessage}`);
    
    return {
      logged: true,
      message: logMessage,
      level,
      timestamp: new Date().toISOString()
    };
  }

  async utilValidate(config, context) {
    const { data, schema } = config;
    const sourceData = data || context.input;
    
    const errors = [];
    
    if (schema) {
      for (const [field, rules] of Object.entries(schema)) {
        const value = this.getNestedValue(sourceData, field);
        
        if (rules.required && (value === undefined || value === null)) {
          errors.push(`Field ${field} is required`);
        }
        
        if (rules.type && value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rules.type) {
            errors.push(`Field ${field} must be of type ${rules.type}, got ${actualType}`);
          }
        }
        
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`Field ${field} must be at least ${rules.minLength} characters`);
        }
        
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`Field ${field} must be at most ${rules.maxLength} characters`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      data: sourceData
    };
  }

  async utilFormat(config, context) {
    const { data, format } = config;
    const sourceData = data || context.input;
    
    switch (format) {
      case 'json':
        return JSON.stringify(sourceData, null, 2);
      
      case 'csv':
        if (Array.isArray(sourceData)) {
          const headers = Object.keys(sourceData[0] || {});
          const rows = sourceData.map(item => 
            headers.map(h => JSON.stringify(item[h] || '')).join(',')
          );
          return [headers.join(','), ...rows].join('\n');
        }
        break;
        
      case 'xml':
        return this.objectToXml(sourceData);
        
      default:
        return String(sourceData);
    }
    
    return sourceData;
  }

  // Helper methods
  getNestedValue(obj, path) {
    if (!path) return obj;
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  objectToXml(obj, rootName = 'root') {
    let xml = `<${rootName}>`;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          xml += `<${key}>${typeof item === 'object' ? this.objectToXml(item, 'item').slice(6, -7) : item}</${key}>`;
        }
      } else if (typeof value === 'object') {
        xml += `<${key}>${this.objectToXml(value, 'item').slice(6, -7)}</${key}>`;
      } else {
        xml += `<${key}>${value}</${key}>`;
      }
    }
    
    xml += `</${rootName}>`;
    return xml;
  }
}

module.exports = ConnectorRegistry;