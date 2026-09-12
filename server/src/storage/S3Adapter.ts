import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../lib/AppError.js';
import type {
  DownloadUrlOptions,
  GetStreamResult,
  PutObjectInput,
  PutObjectResult,
  StorageAdapter,
} from './StorageAdapter.js';

export interface S3AdapterConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

/**
 * S3-backed adapter. The same class drives real AWS S3 in production and
 * MinIO in `docker compose` — pointing `endpoint` + `forcePathStyle` at a
 * local MinIO instance is what lets `docker compose up` exercise the real
 * S3 code path with zero AWS account required.
 */
export class S3Adapter implements StorageAdapter {
  readonly driver = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3AdapterConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    // PutObjectCommand requires a known ContentLength for a stream — using
    // lib-storage's Upload instead handles multipart automatically for
    // streams of unknown/large length.
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
    });

    const result = await upload.done();
    const head = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: input.key }),
    );

    return { key: input.key, size: head.ContentLength ?? 0, etag: result.ETag };
  }

  async getStream(key: string, range?: { start: number; end?: number }): Promise<GetStreamResult> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: range ? `bytes=${range.start}-${range.end ?? ''}` : undefined,
        }),
      );
      return {
        stream: res.Body as unknown as NodeJS.ReadableStream as import('node:stream').Readable,
        size: res.ContentLength ?? 0,
        contentType: res.ContentType,
      };
    } catch {
      throw AppError.notFound('BLOB_MISSING', 'Stored file is missing');
    }
  }

  async getDownloadUrl(key: string, opts: DownloadUrlOptions): Promise<string | null> {
    const disposition = `${opts.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(
      opts.filename,
    )}`;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: disposition,
    });
    return getSignedUrl(this.client, command, { expiresIn: opts.expiresInSec ?? 300 });
  }

  async copy(srcKey: string, dstKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${srcKey}`,
        Key: dstKey,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    // S3 batch delete caps at 1000 objects per request.
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      // eslint-disable-next-line no-await-in-loop
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })) },
        }),
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<{ size: number; contentType?: string } | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { size: head.ContentLength ?? 0, contentType: head.ContentType };
    } catch {
      return null;
    }
  }
}
