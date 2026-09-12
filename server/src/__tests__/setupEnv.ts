// Provides the minimum valid env for config/env.ts's zod validation to pass
// during tests, BEFORE any test file imports app.js (which imports env.js at
// module scope). MONGODB_URI is overridden per-test-file once
// mongodb-memory-server hands back its real connection string.
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL ??= 'http://localhost:4000';
process.env.WEB_ORIGIN ??= 'http://localhost:5173';
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/drive-test';
process.env.SESSION_SECRET ??= 'test-session-secret-at-least-32-characters-long';
process.env.GOOGLE_CLIENT_ID ??= 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL ??= 'http://localhost:4000/api/auth/google/callback';
process.env.STORAGE_DRIVER ??= 'local';
process.env.LOCAL_STORAGE_DIR ??= './data/test-uploads';
