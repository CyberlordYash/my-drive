import type { Response } from 'express';
import type { FileNodeDoc } from '../../db/models/FileNode.js';
import { getStorageAdapter } from '../../storage/index.js';
import { AppError } from '../../lib/AppError.js';

const INLINE_SAFE_PREFIXES = ['image/', 'application/pdf', 'text/plain'];

/**
 * Serves a file's bytes. If the adapter can issue a direct URL (S3), we
 * redirect and let S3 handle the transfer — zero egress bandwidth spent on
 * our own process. Otherwise (local disk) we proxy the stream ourselves,
 * with Range support so video/audio scrubbing and resumable downloads work.
 */
export async function streamOrRedirect(
  node: FileNodeDoc,
  res: Response,
  opts: { inline: boolean; rangeHeader?: string },
) {
  if (node.kind !== 'file' || !node.storageKey) {
    throw AppError.badRequest('NOT_A_FILE', 'Only files can be downloaded');
  }

  if (opts.inline && !INLINE_SAFE_PREFIXES.some((p) => node.mimeType?.startsWith(p))) {
    // Never inline-render a type we haven't allowlisted (defense against
    // stored-content becoming an XSS vector when viewed in-browser).
    opts.inline = false;
  }

  const adapter = getStorageAdapter();
  const url = await adapter.getDownloadUrl(node.storageKey, {
    filename: node.name,
    inline: opts.inline,
  });

  if (url) {
    res.redirect(302, url);
    return;
  }

  // Local adapter — proxy with Range support.
  let range: { start: number; end?: number } | undefined;
  if (opts.rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(opts.rangeHeader);
    if (match) {
      range = { start: Number(match[1]), end: match[2] ? Number(match[2]) : undefined };
    }
  }

  const { stream, size } = await adapter.getStream(node.storageKey, range);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', node.mimeType ?? 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${opts.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(node.name)}`,
  );
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.start + size - 1}/${node.size ?? size}`);
  }
  res.setHeader('Content-Length', String(size));

  stream.pipe(res);
}
