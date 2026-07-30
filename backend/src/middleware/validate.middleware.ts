import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validates and replaces `req.body` with the parsed result, so controllers only
 * ever see clean, typed data. A ZodError is turned into a 400 by the error
 * middleware.
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    Object.assign(req.query, result.data);
    return next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return next(result.error);
    Object.assign(req.params, result.data);
    return next();
  };
}
