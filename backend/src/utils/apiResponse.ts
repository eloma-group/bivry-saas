import type { Response } from 'express';

export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
}

/** Every successful endpoint replies through this so the shape never drifts. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): Response<SuccessBody<T>> {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendCreated<T>(res: Response, data: T, message = 'Created'): Response<SuccessBody<T>> {
  return sendSuccess(res, data, message, 201);
}
