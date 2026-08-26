import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

function fieldFromPrismaMeta(meta: unknown): string {
  const target = (meta as { target?: string[] | string } | undefined)?.target;
  if (Array.isArray(target)) return target.join(', ');
  if (typeof target === 'string') return target;
  return 'field';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check the highlighted fields';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE';
        message = `That ${fieldFromPrismaMeta(err.meta)} is already in use`;
        break;
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
        break;
      // The schema and the database have drifted: the code is asking for a
      // table or a column the database does not have, which normally means a
      // migration has not been applied yet. Nothing the caller sent caused it
      // and nothing they can send will avoid it, so it is a 500 rather than a
      // 400 - which is also what gets it logged below, with the column name
      // Prisma names in the error. Reported as a 400 it looked like a bad
      // login, and left no trace on the server to say otherwise.
      case 'P2021':
      case 'P2022':
        statusCode = 500;
        code = 'SCHEMA_OUT_OF_DATE';
        message =
          'The database is missing something this build expects. ' +
          'Apply the pending migrations (npm run db:deploy) and try again.';
        break;
      default:
        statusCode = 400;
        code = `DB_${err.code}`;
        message = 'The database rejected this request';
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database is not reachable. Check DATABASE_URL and the Azure firewall rules.';
  } else if (err instanceof Error) {
    message = env.isProduction ? message : err.message;
  }

  if (statusCode >= 500) {
    logger.error(`${code}: ${message}`, err);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(details ? { errors: details } : {}),
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
};
