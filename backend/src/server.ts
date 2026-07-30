import app from './app';
import { assertProductionConfig, env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { verifyMailTransport } from './services/mail.service';
import { storageDriver, verifyStorage } from './services/storage.service';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // A misconfigured production environment must fail loudly here, not silently
  // at runtime with lost uploads or undelivered reset emails.
  assertProductionConfig();

  const [databaseReady, storageReady, mailReady] = await Promise.all([
    connectDatabase(),
    verifyStorage(),
    verifyMailTransport(),
  ]);

  const server = app.listen(env.port, () => {
    logger.success(`BIVRY API listening on port ${env.port}`);
    logger.info(`Environment : ${env.nodeEnv}`);
    logger.info(`Frontend    : ${env.frontendUrl}`);
    logger.info(`Database    : ${databaseReady ? 'connected' : 'not connected'}`);
    logger.info(`Storage     : ${storageDriver}${storageReady ? '' : ' (unreachable)'}`);
    logger.info(`Mail        : ${mailReady ? 'ready' : 'unavailable'}`);
    logger.info('Portals     : /api/auth/{admin,customer,vendor,employee,driver}');
  });

  // Large document uploads need more than the default two minutes.
  server.setTimeout(5 * 60 * 1000);
  // Azure's front end drops an idle connection at 240s. Keeping ours above that
  // stops the client from seeing a truncated response on a reused socket.
  server.keepAliveTimeout = 250 * 1000;
  server.headersTimeout = 260 * 1000;

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
}

void bootstrap().catch((error) => {
  logger.error('Startup failed', error);
  process.exit(1);
});
