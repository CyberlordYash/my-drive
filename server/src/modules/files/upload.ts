import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { env } from '../../config/env.js';

/**
 * multer with diskStorage into the OS temp dir — NOT memoryStorage.
 *
 * memoryStorage would buffer the whole file in process RAM: a 100 MB upload
 * times a handful of concurrent requests OOMs a small container. Staging to
 * a temp file also gives a real validate-then-commit boundary — we can
 * sniff the real MIME type and compute a checksum, and reject the upload,
 * BEFORE any bytes are sent to the storage adapter. You cannot "un-send"
 * bytes already streamed to S3.
 */
export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
      cb(null, `drive-upload-${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
    },
  }),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 10,
    fields: 10,
  },
});
