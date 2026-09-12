import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { AppError } from '../lib/AppError.js';
import type {
  DownloadUrlOptions,
  GetStreamResult,
  PutObjectInput,
  PutObjectResult,
  StorageAdapter,
} from './StorageAdapter.js';

/**
 * Stores blobs on the local filesystem under `root`. Used for local dev and
 * for `docker compose` when STORAGE_DRIVER=local. Keys are always
 * server-generated (see lib/keys.ts) — this adapter still independently
 * verifies every resolved path stays inside `root`, because trusting the
 * caller once is how path-traversal bugs happen.
 */
export class LocalDiskAdapter implements StorageAdapter {
  readonly driver = 'local' as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolveKey(key: string): string {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep) && abs !== this.root) {
      throw AppError.badRequest('INVALID_KEY', 'Resolved storage path escapes the storage root');
    }
    return abs;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const dest = this.resolveKey(input.key);
    await fs.mkdir(path.dirname(dest), { recursive: true });

    const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
    let size = 0;
    await pipeline(
      input.body,
      async function* count(source) {
        for await (const chunk of source) {
          size += (chunk as Buffer).length;
          yield chunk;
        }
      },
      createWriteStream(tmp),
    );
    await fs.rename(tmp, dest);

    return { key: input.key, size };
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<GetStreamResult> {
    const abs = this.resolveKey(key);
    const st = await fs.stat(abs).catch(() => null);
    if (!st) throw AppError.notFound('BLOB_MISSING', 'Stored file is missing');

    const stream = createReadStream(abs, range ? { start: range.start, end: range.end } : {});
    const size = range ? (range.end ?? st.size - 1) - range.start + 1 : st.size;
    return { stream, size };
  }

  // Local disk cannot issue presigned URLs — callers must proxy via getStream().
  async getDownloadUrl(_key: string, _opts: DownloadUrlOptions): Promise<string | null> {
    return null;
  }

  async copy(srcKey: string, dstKey: string): Promise<void> {
    const src = this.resolveKey(srcKey);
    const dst = this.resolveKey(dstKey);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }

  async delete(key: string): Promise<void> {
    const abs = this.resolveKey(key);
    await fs.rm(abs, { force: true }); // idempotent — swallow ENOENT
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.delete(k)));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<{ size: number; contentType?: string } | null> {
    try {
      const st = await fs.stat(this.resolveKey(key));
      return { size: st.size };
    } catch {
      return null;
    }
  }
}

// Re-exported so upload.ts can wrap a Buffer as a Readable without importing
// 'node:stream' directly in a module outside storage/.
export function bufferToStream(buf: Buffer): Readable {
  return Readable.from(buf);
}
