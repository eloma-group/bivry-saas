/** Error type the error middleware knows how to turn into a clean JSON response. */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'You are not logged in', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have access to this resource'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ApiError {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }

  /** An upstream service this API depends on answered badly or not at all. */
  static badGateway(message = 'An upstream service is unavailable'): ApiError {
    return new ApiError(502, message, 'BAD_GATEWAY');
  }

  static internal(message = 'Something went wrong'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
