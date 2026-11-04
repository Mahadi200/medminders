import { Request, Response, NextFunction } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /signature/i,
  /key/i,
  /credential/i,
  /database_url/i,
  /bmdc/i,
  /license/i,
];

const PHI_KEY_PATTERNS = [
  /ocrtext/i,
  /medicinesjson/i,
  /antibioticsjson/i,
  /allergiesjson/i,
  /chronicconditionsjson/i,
  /diagnosis/i,
  /clinicalnotes/i,
  /emergencycontact/i,
  /fullname/i,
  /patientname/i,
  /chiefcomplaint/i,
  /phonenumber/i,
];

/**
 * Safely masks an email address (e.g. j***e@example.com).
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '[REDACTED_EMAIL]';
  const parts = email.split('@');
  if (parts.length !== 2) return '[REDACTED_EMAIL]';
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Safely masks a phone number (e.g. +88017****1234).
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '[REDACTED_PHONE]';
  if (phone.length <= 6) return '***';
  return `${phone.slice(0, 5)}****${phone.slice(-4)}`;
}

/**
 * Recursively deep-redacts sensitive fields (PHI and credentials) from log objects.
 */
export function sanitizeLogData(data: any, depth = 0): any {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact bearer tokens or passwords in raw strings
    if (data.startsWith('Bearer ') || data.startsWith('eyJ')) {
      return '[REDACTED_BEARER_TOKEN]';
    }
    if (/postgresql:\/\/[^@\s]+@/i.test(data) || /postgres:\/\/[^@\s]+@/i.test(data)) {
      return data.replace(/postgres(ql)?:\/\/[^@\s]+@/gi, 'postgresql://***:***@');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      // Check credentials
      if (SENSITIVE_KEY_PATTERNS.some(rx => rx.test(key))) {
        sanitized[key] = '[REDACTED_CREDENTIAL]';
        continue;
      }
      // Check PHI
      if (PHI_KEY_PATTERNS.some(rx => rx.test(key))) {
        sanitized[key] = '[REDACTED_PHI]';
        continue;
      }
      if (key.toLowerCase() === 'email' && typeof val === 'string') {
        sanitized[key] = maskEmail(val);
        continue;
      }
      sanitized[key] = sanitizeLogData(val, depth + 1);
    }
    return sanitized;
  }

  return data;
}

export class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): string {
    const payload = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(context ? sanitizeLogData(context) : {}),
    };
    return JSON.stringify(payload);
  }

  info(message: string, context?: Record<string, any>): void {
    console.log(this.formatLog('info', message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn(this.formatLog('warn', message, context));
  }

  error(message: string, context?: Record<string, any>): void {
    console.error(this.formatLog('error', message, context));
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatLog('debug', message, context));
    }
  }
}

export const logger = new StructuredLogger();

/**
 * Express middleware for structured HTTP access logging with automatic redaction.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.id || (req.headers['x-request-id'] as string);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info(`HTTP ${req.method} ${req.originalUrl || req.url}`, {
      requestId,
      method: req.method,
      path: req.baseUrl + req.path,
      statusCode: res.statusCode,
      durationMs,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user?.id ? '[USER_SET]' : undefined,
    });
  });

  next();
}
