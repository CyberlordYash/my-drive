import 'dotenv/config';
import { z } from 'zod';

/**
 * All process.env access in the app goes through this parsed, typed object.
 * Parsing happens once at import time, so a missing/invalid var crashes the
 * process on boot with a readable message instead of surfacing as a mystery
 * 500 later at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // PUBLIC_URL is the API's own externally-reachable origin. It is used to
  // build the Google OAuth callback URL deterministically — never derived
  // from the incoming request, which behind Render's proxy would come out
  // as http:// and mismatch the registered redirect URI.
  PUBLIC_URL: z.url(),
  WEB_ORIGIN: z.url(),
  // Cookie Domain attribute, e.g. ".yashsachan.com" in prod. Must be left
  // empty/undefined on localhost, or the browser silently refuses to set it.
  COOKIE_DOMAIN: z.string().optional().default(''),

  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url(),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./data/uploads'),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(104_857_600), // 100 MB
  USER_QUOTA_BYTES: z.coerce.number().int().positive().default(16_106_127_360), // 15 GiB (display parity with the Figma design)

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment configuration:');
    // eslint-disable-next-line no-console
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
  }

  const env = parsed.data;

  if (env.STORAGE_DRIVER === 's3') {
    const missing = (['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const).filter(
      (k) => !env[k],
    );
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `❌ STORAGE_DRIVER=s3 requires ${missing.join(', ')} to be set`,
      );
      process.exit(1);
    }
  }

  return env;
}

export const env = loadEnv();
export type Env = typeof env;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
