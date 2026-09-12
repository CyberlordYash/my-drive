import cron from 'node-cron';
import { FileNode } from '../db/models/FileNode.js';
import { User } from '../db/models/User.js';
import { getStorageAdapter } from '../storage/index.js';
import { logger } from '../config/logger.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Permanently purges anything that has sat in trash for 30+ days.
 *
 * Deliberately a cron job, NOT a Mongo TTL index: a TTL index deletes the
 * metadata document automatically, but has no idea the document points at a
 * blob in S3/local disk — that blob would be orphaned forever. This job
 * deletes the blob FIRST, then the document, so nothing is ever leaked.
 */
export async function purgeExpiredTrash(): Promise<{ purged: number }> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const expired = await FileNode.find({ isTrashed: true, trashedAt: { $lte: cutoff } });

  const adapter = getStorageAdapter();
  let purged = 0;

  for (const node of expired) {
    try {
      if (node.storageKey) {
        // eslint-disable-next-line no-await-in-loop
        await adapter.delete(node.storageKey);
      }
      if (node.size) {
        // eslint-disable-next-line no-await-in-loop
        await User.updateOne({ _id: node.ownerId }, { $inc: { storageUsed: -node.size } });
      }
      // eslint-disable-next-line no-await-in-loop
      await node.deleteOne();
      purged += 1;
    } catch (err) {
      logger.error({ err, fileId: node._id.toString() }, 'Failed to purge trashed file');
    }
  }

  if (purged > 0) logger.info({ purged }, 'Purged expired trash');
  return { purged };
}

export function scheduleTrashPurgeJob(): void {
  // Once a day at 03:00 server time — infrequent enough to be cheap, and
  // trash is a 30-day window so there's no need for finer granularity.
  cron.schedule('0 3 * * *', () => {
    void purgeExpiredTrash();
  });
}
