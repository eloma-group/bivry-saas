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
      // table or a column the database does not have. Nothing the caller sent
      // caused it and nothing they can send will avoid it, so it is a 500
      // rather than a 400 - which is also what gets it logged below, with the
      // column Prisma names in the error. Reported as a 400 it looked like a
      // bad login, and left no trace on the server to say otherwise.
      //
      // It drifts in both directions and the message has to say so. A migration
      // that has not been applied leaves the database behind the code; a
      // checkout that has not been pulled leaves the code behind a database
      // somebody else has already migrated. The second one is the easier to
      // misread, because the migrations all report as applied.
      case 'P2021':
      case 'P2022':
        statusCode = 500;
        code = 'SCHEMA_OUT_OF_DATE';
        message =
          'This build and the database disagree about the schema. ' +
          'Pull the latest code, then apply pending migrations (npm run db:deploy).';
        break;
      default:
        statusCode = 400;
        code = `DB_${err.code}`;
        message = 'The database rejected this request';
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    // These three fail in completely different places and one blanket "check the
    // firewall" sends people to the wrong one. A rejected password means the
    // server answered, so the firewall is already open; a timeout means it never
    // answered at all, which is the only case the firewall explains.
    //
    // Prisma only fills in errorCode when the failure happens while the client
    // is connecting at boot. The same failure raised on the first query of a
    // request arrives with errorCode undefined, so fall back to the text.
    const text = err.message;
    const errorCode =
      err.errorCode ??
      (/Authentication failed/i.test(text)
        ? 'P1000'
        : /Can't reach database server|timed out/i.test(text)
          ? 'P1001'
          : /database .* does not exist/i.test(text)
            ? 'P1003'
            : undefined);

    switch (errorCode) {
      case 'P1000':
        message =
          'The database rejected the credentials in DATABASE_URL. The server is ' +
          'reachable, so this is the username or password, not the firewall. ' +
          'Remember to URL-encode the password: @ -> %40, # -> %23, / -> %2F, % -> %25.';
        break;
      case 'P1001':
      case 'P1002':
        message =
          'The database server did not answer. Check the host and port in ' +
          'DATABASE_URL, and that this machine is allowed by the Azure firewall rules.';
        break;
      case 'P1003':
        message =
          'DATABASE_URL points at a database that does not exist on that server. ' +
          'Check the name after the last slash, then run npm run db:deploy to create the tables.';
        break;
      default:
        message = 'Database is not reachable. Check DATABASE_URL and the Azure firewall rules.';
    }
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
