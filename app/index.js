// index.js
/* ─────────────────────  ENV + BASIC DIAGNOSTIC  ─────────────────── */
require('dotenv').config();                               // load .env
console.log('Running with', process.version, '| fetch:', typeof fetch);

/* ───────────────────────────  IMPORTS  ──────────────────────────── */
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

/* ────────────────────────────  ROUTES  ──────────────────────────── */
const promptRoutes  = require('./routes/prompts');
const historyRoutes = require('./routes/history');

/* ──────────────────────────  APP CONFIG  ────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 8083;
const HOST = '0.0.0.0';                                   // bind to all

/* ─────────────────────────  MIDDLEWARE  ─────────────────────────── */
app.use(cors({ origin: '*' }));        // adjust for prod if needed
app.use(express.json());               // JSON body-parser
app.use(morgan('dev'));                // request logger

/* ────────────────────────────  ROUTES  ──────────────────────────── */
app.get('/',   (_req, res) => res.send('AI Prompt backend is live!'));
app.get('/ping', (_req, res) => res.json({ status: 'ok' })); // health

app.use('/api/prompts', promptRoutes);   // POST /api/prompts
app.use('/api/history', historyRoutes);  // GET  /api/history?limit=n

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
