// server.js
// Express server for Docker / self-hosted deployment.
// Replaces Vercel's serverless function routing with explicit Express routes.
// The handler files (api/*.js) are unchanged — they use the same (req, res)
// signature that Express passes, so zero logic changes were needed.

import express       from 'express';
import cors          from 'cors';
import promMiddleware from 'express-prometheus-middleware';
import path          from 'path';
import { fileURLToPath } from 'url';

// ── Route handlers (direct imports from existing api/ files) ─────────────────
import generateHandler     from './api/generate.js';
import generateDocxHandler from './api/generate-docx.js';
import parseCVHandler      from './api/parse-cv.js';
import saveSheetHandler    from './api/save-sheet/index.js';
import lookupUserHandler   from './api/lookup-user/index.js';
import selarWebhookHandler from './api/selar-webhook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));

// Prometheus metrics — exposes /metrics endpoint scraped by Prometheus every 15s
// Tracks: HTTP request count, duration, status codes per route
app.use(promMiddleware({
  metricsPath:             '/metrics',
  collectDefaultMetrics:   true,
  requestDurationBuckets:  [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  requestLengthBuckets:    [512, 1024, 5120, 10240],
  responseLengthBuckets:   [512, 1024, 5120, 10240],
}));

// JSON body parser for all routes EXCEPT parse-cv (multipart/form-data handled
// by formidable inside the handler — attaching express body parsers first would
// consume the stream and break formidable)
app.use((req, res, next) => {
  if (req.path === '/api/parse-cv') return next();
  express.json({ limit: '2mb' })(req, res, next);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'prolaunch-careers',
    version: process.env.npm_package_version || '2.0.0',
    uptime:  Math.floor(process.uptime()),
    ts:      new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.all('/api/generate',       generateHandler);
app.all('/api/generate-docx',  generateDocxHandler);
app.all('/api/parse-cv',       parseCVHandler);
app.all('/api/save-sheet',     saveSheetHandler);
app.all('/api/lookup-user',    lookupUserHandler);
app.all('/api/selar-webhook',  selarWebhookHandler);

// ── Static frontend ───────────────────────────────────────────────────────────
// Serves index.html at /, /pages/*.html, logo, shared.js etc.
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html'],
}));

// Catch-all — serve index.html for any unmatched path so browser navigation works
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ProLaunch] Server running on port ${PORT}`);
  console.log(`[ProLaunch] Health: http://localhost:${PORT}/health`);
});