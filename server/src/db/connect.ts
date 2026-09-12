import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function connectDb(uriOverride?: string): Promise<void> {
  // NOTE: mongoose's global `sanitizeFilter` was tried here and reverted —
  // it does not distinguish "a filter the developer wrote in code" from
  // "a filter built from untrusted input." It wraps ANY value shaped like
  // an operator object (`{ $in: [...] }`, `{ $ne: ... }`, `{ $regex: ... }`,
  // `{ $gte: ... }`) into `{ $eq: { ...that object... } }`, which then fails
  // to cast against the field's real type. That silently broke every one of
  // our OWN internal queries that use an operator — trash/restore/permanent
  // delete (`_id: {$in: ids}`), rename collision checks (`_id: {$ne: id}`),
  // search (`nameLower: {$regex: ...}`), and the "modified after" filter
  // (`updatedAt: {$gte: ...}`) — while looking completely fine in
  // request/response logs, since the corruption happens inside Mongoose
  // before the query is ever sent.
  //
  // Our actual NoSQL-injection defense doesn't need this: every user-
  // supplied value that reaches a query is first passed through a zod
  // schema at the API boundary (server/src/schemas/files.ts) — a string,
  // enum, coerced boolean/number, or an ObjectId-shaped string — so an
  // attacker-supplied `{ $ne: null }` never survives validation to reach
  // Mongoose in the first place. The one place we build a query from raw
  // user text (search) already escapes it explicitly (lib/escapeRegex.ts).
  mongoose.set('strictQuery', true);

  // `env.MONGODB_URI` is captured once at config/env.ts's first import — a
  // test setting `process.env.MONGODB_URI` at runtime (e.g. to point at an
  // in-memory Mongo instance) has no effect on that already-parsed value.
  // The override param exists for exactly that case.
  await mongoose.connect(uriOverride ?? env.MONGODB_URI);
  logger.info('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}
