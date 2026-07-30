import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Single Prisma client for the whole process.
 * `tsx watch` reloads the module on every save, so the instance is cached on
 * globalThis to avoid opening a new connection pool on each reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/** Verifies the database is reachable. Called once at boot. */
export async function connectDatabase(): Promise<boolean> {
  if (!env.databaseUrl) {
    logger.warn('DATABASE_URL is not set. Starting without a database connection.');
    return false;
  }

  try {
    await prisma.$connect();
    logger.success('Database connected');
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
