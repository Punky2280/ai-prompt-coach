// lib/database.js - PostgreSQL connection and schema
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DATABASE || 'cartrita_workflows',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Database initialization
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    try {
    // Create workflows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        definition JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active'
      )
    `);

    // Create workflow_executions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID REFERENCES workflows(id),
        status VARCHAR(50) DEFAULT 'running',
        input_data JSONB,
        output_data JSONB,
        execution_log JSONB DEFAULT '[]'::jsonb,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        dry_run BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        execution_context JSONB DEFAULT '{}'::jsonb
      )
    `);

    // Create workflow_nodes table for execution tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_node_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID REFERENCES workflow_executions(id),
        node_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        input_data JSONB,
        output_data JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT
      )
    `);

    // Create connectors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        config JSONB DEFAULT '{}'::jsonb,
        actions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        enabled BOOLEAN DEFAULT TRUE
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_node_executions_execution_id ON workflow_node_executions(execution_id);
      CREATE INDEX IF NOT EXISTS idx_connectors_name ON connectors(name);
    `);

    console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (connectionError) {
    console.warn('⚠️  Database connection failed - running in memory mode');
    console.warn('   Workflow execution will work but persistence is disabled');
    console.warn('   To enable full database features, ensure PostgreSQL is running');
    // Don't throw - allow server to start without database
  }
}

// Database query helper
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  initializeDatabase
};