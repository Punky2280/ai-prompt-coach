// lib/mockFirestore.js
// Simple in-memory mock for testing workflow functionality
// Used when Firestore credentials are not available

class MockDocument {
  constructor(id, data) {
    this.id = id;
    this._data = { ...data };
  }

  data() {
    return this._data;
  }

  exists = true;

  async update(updates) {
    Object.assign(this._data, updates);
    return this;
  }

  async delete() {
    // Mark as deleted
    this.exists = false;
    return;
  }
}

class MockCollection {
  constructor(name) {
    this.name = name;
    this.documents = new Map(); // id -> document
    this.nextId = 1;
  }

  doc(id) {
    if (!id) {
      // Generate new ID
      id = `mock_${this.name}_${this.nextId++}`;
    }
    
    return {
      id,
      get: async () => {
        const doc = this.documents.get(id);
        if (doc) {
          return doc;
        }
        return { exists: false };
      },
      update: async (updates) => {
        const existingDoc = this.documents.get(id);
        if (existingDoc) {
          await existingDoc.update(updates);
          return existingDoc;
        }
        throw new Error(`Document ${id} not found`);
      },
      delete: async () => {
        const existingDoc = this.documents.get(id);
        if (existingDoc) {
          await existingDoc.delete();
          this.documents.delete(id);
        }
        return;
      }
    };
  }

  async add(data) {
    const id = `mock_${this.name}_${this.nextId++}`;
    const doc = new MockDocument(id, data);
    this.documents.set(id, doc);
    return { id };
  }

  where(field, op, value) {
    return new MockQuery(this, [{ field, op, value }]);
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(this, [], [{ field, direction }]);
  }

  limit(count) {
    return new MockQuery(this, [], [], count);
  }
}

class MockQuery {
  constructor(collection, wheres = [], orders = [], limitCount = null) {
    this.collection = collection;
    this.wheres = wheres;
    this.orders = orders;
    this.limitCount = limitCount;
  }

  where(field, op, value) {
    return new MockQuery(this.collection, [...this.wheres, { field, op, value }], this.orders, this.limitCount);
  }

  orderBy(field, direction = 'asc') {
    return new MockQuery(this.collection, this.wheres, [...this.orders, { field, direction }], this.limitCount);
  }

  limit(count) {
    return new MockQuery(this.collection, this.wheres, this.orders, count);
  }

  async get() {
    let docs = Array.from(this.collection.documents.values()).filter(doc => doc.exists);

    // Apply where filters
    for (const where of this.wheres) {
      docs = docs.filter(doc => {
        const fieldValue = this._getFieldValue(doc.data(), where.field);
        switch (where.op) {
          case '==':
            return fieldValue === where.value;
          case '!=':
            return fieldValue !== where.value;
          case '>':
            return fieldValue > where.value;
          case '>=':
            return fieldValue >= where.value;
          case '<':
            return fieldValue < where.value;
          case '<=':
            return fieldValue <= where.value;
          case 'in':
            return Array.isArray(where.value) && where.value.includes(fieldValue);
          default:
            return true;
        }
      });
    }

    // Apply ordering
    for (const order of this.orders) {
      docs.sort((a, b) => {
        const aValue = this._getFieldValue(a.data(), order.field);
        const bValue = this._getFieldValue(b.data(), order.field);
        
        if (aValue < bValue) return order.direction === 'desc' ? 1 : -1;
        if (aValue > bValue) return order.direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount) {
      docs = docs.slice(0, this.limitCount);
    }

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0
    };
  }

  _getFieldValue(data, fieldPath) {
    const parts = fieldPath.split('.');
    let value = data;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }
}

class MockFirestore {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
}

// Create mock database instance
const mockDb = new MockFirestore();

// Export collections like the real firestore.js
const promptsCol = mockDb.collection('prompts');
const workflowsCol = mockDb.collection('workflows');
const workflowRunsCol = mockDb.collection('workflow_runs');
const workflowStepsCol = mockDb.collection('workflow_steps');
const connectorsCol = mockDb.collection('connectors');
const credentialsCol = mockDb.collection('credentials');

console.log('⚠️  Using mock Firestore for testing (no credentials required)');

module.exports = { 
  db: mockDb, 
  promptsCol, 
  workflowsCol, 
  workflowRunsCol, 
  workflowStepsCol,
  connectorsCol,
  credentialsCol
};