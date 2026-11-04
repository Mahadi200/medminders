export interface ErrorDetail {
  field?: string;
  message: string;
  value?: any;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId?: string;
    timestamp: string;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN_ACCESS');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(message = 'Rate limit exceeded', retryAfterSeconds = 60) {
    super(message, 429, 'RATE_LIMITED');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database service unavailable') {
    super(message, 503, 'DATABASE_UNAVAILABLE');
  }
}

export class AuditPersistenceError extends AppError {
  constructor(message = 'Critical audit log failed to persist. Operation aborted for compliance and security.') {
    super(message, 503, 'AUDIT_PERSISTENCE_FAILED');
  }
}
