// index.js - Cartrita Unified Workflow Automation Platform
/* ─────────────────────  ENV + BASIC DIAGNOSTIC  ─────────────────── */
require('dotenv').config();                               // load .env
console.log('Running with', process.version, '| fetch:', typeof fetch);

// Check for legacy mode
const LEGACY_MODE = process.env.LEGACY_MODE === 'true';
console.log(`🚀 Starting Cartrita Workflow Platform (Legacy Mode: ${LEGACY_MODE})`);

/* ───────────────────────────  IMPORTS  ──────────────────────────── */
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

/* ────────────────────────────  ROUTES  ──────────────────────────── */
const promptRoutes  = require('./routes/prompts');
const historyRoutes = require('./routes/history');

// Workflow automation routes (Phase B implementation)
const workflowRoutes = require('./routes/workflows');
const { router: workflowEventsRouter } = require('./routes/workflow-events');

/* ────────────────────  DATABASE & SERVICES  ──────────────────────── */
const { initializeDatabase } = require('./lib/database');

/* ──────────────────────────  APP CONFIG  ────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 8083;
const HOST = '0.0.0.0';                                   // bind to all

/* ─────────────────────────  MIDDLEWARE  ─────────────────────────── */
app.use(cors({ origin: '*' }));        // adjust for prod if needed
app.use(express.json({ limit: '10mb' })); // Increased limit for workflow definitions
app.use(morgan('dev'));                // request logger

/* ────────────────────────────  ROUTES  ──────────────────────────── */
app.get('/', (_req, res) => {
  const status = {
    service: 'Cartrita Unified Workflow Automation Platform',
    version: '1.0.0',
    features: [
      'AI Prompt Coach (Legacy)',
      'Workflow Automation Engine',
      'Expression Engine with Security Sandboxing', 
      'Connector Registry',
      'Real-time Monitoring via SSE'
    ],
    phase_b_features: [
      'Parallelism', 'Branching', 'Retries', 'Loops', 'Subworkflows', 'Dry Runs'
    ],
    legacy_mode: LEGACY_MODE,
    api_endpoints: {
      legacy: ['/api/prompts', '/api/history'],
      workflows: ['/api/v1/workflows/*', '/api/v1/workflows/events/*']
    },
    status: 'active'
  };
  
  if (LEGACY_MODE) {
    res.send('AI Prompt backend is live! (Legacy Mode)');
  } else {
    res.json(status);
  }
});

app.get('/ping', (_req, res) => res.json({ 
  status: 'ok', 
  platform: 'cartrita-workflow',
  legacy_mode: LEGACY_MODE,
  timestamp: new Date().toISOString()
})); // health

// Legacy AI Prompt routes (backward compatibility)
app.use('/api/prompts', promptRoutes);   // POST /api/prompts
app.use('/api/history', historyRoutes);  // GET  /api/history?limit=n

// Phase B Workflow Automation API
if (!LEGACY_MODE) {
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/workflows/events', workflowEventsRouter);
  
  // Additional workflow utility endpoints
  app.get('/api/v1/status', (_req, res) => {
    res.json({
      platform: 'Cartrita Unified Workflow Automation',
      version: '1.0.0',
      features_enabled: {
        workflow_execution: true,
        expression_engine: true,
        connector_registry: true,
        real_time_monitoring: true,
        parallel_execution: true,
        retry_logic: true,
        dry_run_support: true
      },
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });
}

/* ─────────────────────  404 + ERROR HANDLERS  ───────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

/* ───────────────────────────  SERVER  ──────────────────────────── */
// Initialize database before starting server
async function startServer() {
  try {
    if (!LEGACY_MODE) {
      console.log('🔧 Initializing database schema...');
      await initializeDatabase();
      console.log('✅ Database initialized successfully');
    }

    app.listen(PORT, HOST, () => {
      console.log(`✅  Server listening on http://${HOST}:${PORT}`);
      if (LEGACY_MODE) {
        console.log('📝 Legacy AI Prompt Coach mode enabled');
        console.log('🔗 Available endpoints: /api/prompts, /api/history');
      } else {
        console.log('🚀 Cartrita Workflow Automation Platform started');
        console.log('🔗 Workflow API: /api/v1/workflows/*');
        console.log('📡 Real-time monitoring: /api/v1/workflows/events/*');
        console.log('📝 Legacy endpoints still available: /api/prompts, /api/history');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
