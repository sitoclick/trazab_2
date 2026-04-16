import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import operationsRouter from './verticals/operations/routes.js';
import traceabilityRouter from './verticals/traceability/routes.js';
import agentsRouter from './verticals/agents/routes.js';
import pricingRouter from './verticals/pricing/routes.js';
import salesRouter from './verticals/sales/routes.js';
import mastersRouter from './verticals/masters/routes.js';
import onlineOrdersRouter from './verticals/online-orders/routes.js';
import { initializeTables } from './verticals/agents/queries.js';
import { initializePricingTables } from './verticals/pricing/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', operationsRouter);
app.use('/api', traceabilityRouter);
app.use('/api', agentsRouter);
app.use('/api', pricingRouter);
app.use('/api', salesRouter);
app.use('/api', mastersRouter);
app.use('/api', onlineOrdersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function startServer() {
  // Initialize DB tables
  try {
    await initializeTables();
    await initializePricingTables();
  } catch (err) {
    console.warn('Table initialization skipped (DB may not be connected):', err);
  }

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    console.log('Mode: PRODUCTION (serving dist)');
  } else {
    console.log('Mode: DEVELOPMENT (loading Vite)');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

startServer().catch(console.error);
