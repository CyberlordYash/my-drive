import type { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Readable;
  contentType: string;
  contentLength?: number;
}

export interface PutObjectResult {
  key: string;
  size: number;
  etag?: string;
}

export interface GetStreamResult {
  stream: Readable;
  size: number;
  contentType?: string;
}

export interface DownloadUrlOptions {
  filename: string;
  inline?: boolean;
  expiresInSec?: number;
}

/**
 * The storage abstraction the whole app is built on. Every route/service
 * talks to a StorageAdapter, never to `fs` or the AWS SDK directly — enforce
 * that with the `no-restricted-imports` ESLint rule scoped to this folder so
 * the boundary can't rot as the codebase grows.
 *
 * Two implementations exist: LocalDiskAdapter and S3Adapter. Both are
 * exercised by the SAME contract test suite (see __tests__/storage), which is
 * what proves this abstraction is real rather than decorative.
 */
export interface StorageAdapter {
  readonly driver: 'local' | 's3';

  put(input: PutObjectInput): Promise<PutObjectResult>;

  getStream(key: string, range?: { start: number; end?: number }): Promise<GetStreamResult>;

  /**
   * Returns a URL the client can be redirected to for a direct download
   * (e.g. a presigned S3 GET). Returns null when the driver cannot issue
   * URLs (local disk) — in that case the caller must proxy the stream
   * itself via getStream().
   */
  getDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string | null>;

  /** Server-side copy, used by "Make a copy". */
  copy(srcKey: string, dstKey: string): Promise<void>;

  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  stat(key: string): Promise<{ size: number; contentType?: string } | null>;
}
