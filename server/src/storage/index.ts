import { env } from '../config/env.js';
import { LocalDiskAdapter } from './LocalDiskAdapter.js';
import { S3Adapter } from './S3Adapter.js';
import type { StorageAdapter } from './StorageAdapter.js';

let cached: StorageAdapter | null = null;

/**
 * Factory that picks the adapter from STORAGE_DRIVER. This is the ONLY place
 * in the app that decides which storage backend is active — everything else
 * depends on the StorageAdapter interface, so swapping local<->s3 is a
 * one-env-var change with no code touched elsewhere.
 */
export function getStorageAdapter(): StorageAdapter {
  if (cached) return cached;

  if (env.STORAGE_DRIVER === 's3') {
    cached = new S3Adapter({
      bucket: env.S3_BUCKET!,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  } else {
    cached = new LocalDiskAdapter(env.LOCAL_STORAGE_DIR);
  }

  return cached;
}

export type { StorageAdapter } from './StorageAdapter.js';
