import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || (req.headers['x-request-id'] as string) || 'unknown';
  const timestamp = new Date().toISOString();

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal error occurred';
  let details = err.details;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Invalid JSON in request payload';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    message = err.message;
  } else if (err.message && typeof err.message === 'string') {
    if (err.status) statusCode = err.status;
    else if (err.statusCode) statusCode = err.statusCode;
    message = err.message;
  }

  // Rate limit specific header
  if (err.retryAfterSeconds) {
    res.setHeader('Retry-After', err.retryAfterSeconds);
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`Server Error ${statusCode} on ${req.method} ${req.originalUrl}: ${message}`, {
      requestId,
      statusCode,
      code,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  } else {
    logger.warn(`Client Error ${statusCode} on ${req.method} ${req.originalUrl}: ${message}`, {
      requestId,
      statusCode,
      code,
      details,
    });
  }

  // Consistent Error Envelope (RFC 7807 compatible + legacy string support)
  res.status(statusCode).json({
    error: message,
    code,
    message,
    details: details || undefined,
    requestId,
    timestamp,
  });
}
