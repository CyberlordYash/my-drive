import { createApp } from './app.js';
import { connectDb, disconnectDb } from './db/connect.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { scheduleTrashPurgeJob } from './jobs/purgeTrash.js';

async function main() {
  await connectDb();
  scheduleTrashPurgeJob();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Drive API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown: stop accepting new connections, let in-flight
  // requests finish, close the DB connection, then exit. Without this, a
  // SIGTERM from Render/Docker during a deploy can cut off an in-progress
  // upload mid-write.
  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);

    const forceExitTimer = setTimeout(() => {
      logger.warn('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);

    server.close(async () => {
      clearTimeout(forceExitTimer);
      await disconnectDb();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
