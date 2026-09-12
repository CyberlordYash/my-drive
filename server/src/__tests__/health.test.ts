import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  // Boots through the REAL connectDb(), not a bare mongoose.connect() —
  // this is what actually caught the sanitizeFilter bug (see db/connect.ts):
  // a raw mongoose.connect() here would silently skip whatever global
  // mongoose.set(...) calls connectDb() makes, so tests could pass while
  // production (which does go through connectDb()) breaks.
  const { connectDb } = await import('../db/connect.js');
  await connectDb(process.env.MONGODB_URI);
});

afterAll(async () => {
  const { disconnectDb } = await import('../db/connect.js');
  await disconnectDb();
  await mongod.stop();
});

describe('health endpoints', () => {
  it('GET /healthz always returns 200 with no dependency checks', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /readyz returns 200 when Mongo is connected', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe(true);
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/files returns 401 when unauthenticated', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(401);
  });

  it('unknown route returns 404 with the standard error envelope', async () => {
    const { createApp } = await import('../app.js');
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
