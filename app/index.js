// index.js
/* ─────────────────────  ENV + BASIC DIAGNOSTIC  ─────────────────── */
require('dotenv').config();                               // load .env
console.log('Running with', process.version, '| fetch:', typeof fetch);

/* ───────────────────────────  IMPORTS  ──────────────────────────── */
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

/* ────────────────────────────  ROUTES  ──────────────────────────── */
const promptRoutes   = require('./routes/prompts');
const historyRoutes  = require('./routes/history');
const workflowRoutes = require('./routes/workflows');
const { router: sseRouter, sseManager } = require('./routes/sse');

/* ──────────────────────────  APP CONFIG  ────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 8083;
const HOST = '0.0.0.0';                                   // bind to all

// Feature flags for workflow automation
const ENABLE_WORKFLOWS = process.env.ENABLE_WORKFLOWS !== 'false';

/* ─────────────────────────  MIDDLEWARE  ─────────────────────────── */
app.use(cors({ origin: '*' }));        // adjust for prod if needed
app.use(express.json());               // JSON body-parser
app.use(morgan('dev'));                // request logger

/* ────────────────────────────  ROUTES  ──────────────────────────── */
app.get('/', (_req, res) => {
  const features = {
    aiPrompts: true,
    workflows: ENABLE_WORKFLOWS,
    version: '1.0.0-alpha'
  };
  res.json({ 
    message: 'Cartrita Workflow Platform API', 
    features 
  });
});

app.get('/ping', (_req, res) => res.json({ status: 'ok' })); // health

// Legacy AI Prompt routes (preserved for backward compatibility)
app.use('/api/prompts', promptRoutes);   // POST /api/prompts
app.use('/api/history', historyRoutes);  // GET  /api/history?limit=n

// New workflow automation routes (feature flagged)
if (ENABLE_WORKFLOWS) {
  app.use('/api/workflows', workflowRoutes); // Workflow CRUD
  app.use('/api', sseRouter);               // SSE streaming
  
  // Make SSE manager globally available for workflow runner
  global.sseManager = sseManager;
}

/* ─────────────────────  404 + ERROR HANDLERS  ───────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

/* ───────────────────────────  SERVER  ──────────────────────────── */
app.listen(PORT, HOST, () => {
  console.log(`✅  Server listening on http://${HOST}:${PORT}`);
});
