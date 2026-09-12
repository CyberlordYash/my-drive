import { Router } from 'express';
import { isDbReady } from '../../db/connect.js';
import { getStorageAdapter } from '../../storage/index.js';

export const healthRouter = Router();

// Liveness: no dependency checks at all, always 200 if the process can
// respond. Used by Docker HEALTHCHECK and Render's health-check path.
healthRouter.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Readiness: actually checks the dependencies the app needs to function.
// Returns 503 when degraded so an orchestrator can stop routing traffic
// here — the liveness/readiness split is a small thing that signals real
// operational experience.
healthRouter.get('/readyz', async (_req, res) => {
  const dbOk = isDbReady();
  let storageOk = true;
  try {
    await getStorageAdapter().exists('.readyz-probe');
  } catch {
    storageOk = false;
  }

  const ready = dbOk && storageOk;
  res.status(ready ? 200 : 503).json({ db: dbOk, storage: storageOk });
});
