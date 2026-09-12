import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalDiskAdapter } from '../storage/LocalDiskAdapter.js';
import type { StorageAdapter } from '../storage/StorageAdapter.js';

/**
 * A single contract test suite run against every StorageAdapter
 * implementation. This is the test that actually proves the storage
 * abstraction is real rather than decorative — the same assertions must
 * hold whether the backing driver is local disk or S3.
 *
 * S3Adapter is exercised against MinIO in `docker compose` (see
 * docker-compose.yml) rather than here, so this suite doesn't require
 * network access or AWS credentials to run in CI.
 */
function runContractSuite(name: string, makeAdapter: () => StorageAdapter) {
  describe(`StorageAdapter contract: ${name}`, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = makeAdapter();
    });

    it('put -> exists -> stat -> getStream round-trips the exact bytes', async () => {
      const key = `u/test/${randomUUID()}.txt`;
      const content = 'hello drive';
      await adapter.put({ key, body: Readable.from(Buffer.from(content)), contentType: 'text/plain' });

      expect(await adapter.exists(key)).toBe(true);
      const stat = await adapter.stat(key);
      expect(stat?.size).toBe(Buffer.byteLength(content));

      const { stream, size } = await adapter.getStream(key);
      expect(size).toBe(Buffer.byteLength(content));
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe(content);
    });

    it('copy duplicates the object under a new key', async () => {
      const srcKey = `u/test/${randomUUID()}.txt`;
      const dstKey = `u/test/${randomUUID()}-copy.txt`;
      await adapter.put({ key: srcKey, body: Readable.from(Buffer.from('copy me')), contentType: 'text/plain' });

      await adapter.copy(srcKey, dstKey);

      expect(await adapter.exists(dstKey)).toBe(true);
      const { stream } = await adapter.getStream(dstKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe('copy me');
    });

    it('delete is idempotent — deleting twice does not throw', async () => {
      const key = `u/test/${randomUUID()}.txt`;
      await adapter.put({ key, body: Readable.from(Buffer.from('x')), contentType: 'text/plain' });
      await adapter.delete(key);
      await expect(adapter.delete(key)).resolves.not.toThrow();
      expect(await adapter.exists(key)).toBe(false);
    });

    it('getStream on a missing key throws a BLOB_MISSING AppError, not an unhandled rejection', async () => {
      await expect(adapter.getStream(`u/test/${randomUUID()}-nonexistent.txt`)).rejects.toMatchObject({
        code: 'BLOB_MISSING',
      });
    });
  });
}

describe('LocalDiskAdapter path-traversal guard', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'drive-storage-test-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('rejects a key that resolves outside the storage root', async () => {
    const adapter = new LocalDiskAdapter(root);
    await expect(
      adapter.put({
        key: '../../../etc/passwd',
        body: Readable.from(Buffer.from('pwned')),
        contentType: 'text/plain',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_KEY' });
  });
});

let sharedRoot: string;

runContractSuite('LocalDiskAdapter', () => {
  sharedRoot ??= path.join(os.tmpdir(), `drive-storage-contract-${randomUUID()}`);
  return new LocalDiskAdapter(sharedRoot);
});
