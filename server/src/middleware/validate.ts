import { Request, Response, NextFunction } from 'express';
import { ValidationError, ErrorDetail } from '../utils/errors.js';

export type ValidatorFn = (data: any) => ErrorDetail[] | null;

/**
 * Express middleware that validates req.body, req.query, or req.params against a validator function.
 */
export function validateRequest(opts: {
  body?: ValidatorFn;
  query?: ValidatorFn;
  params?: ValidatorFn;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: ErrorDetail[] = [];

    if (opts.body) {
      const errs = opts.body(req.body);
      if (errs) allErrors.push(...errs);
    }

    if (opts.query) {
      const errs = opts.query(req.query);
      if (errs) allErrors.push(...errs);
    }

    if (opts.params) {
      const errs = opts.params(req.params);
      if (errs) allErrors.push(...errs);
    }

    if (allErrors.length > 0) {
      const summaryMsg = `Validation failed: ${allErrors.map(e => e.message).join('; ')}`;
      return next(new ValidationError(summaryMsg, allErrors));
    }

    next();
  };
}

// Built-in validation rules
export const validators = {
  isValidEmail(email: string): boolean {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isNonEmptyString(val: any): boolean {
    return typeof val === 'string' && val.trim().length > 0;
  },

  isPositiveInteger(val: any): boolean {
    const num = Number(val);
    return Number.isInteger(num) && num > 0;
  },
};

// Common schema validators
export const authValidators = {
  login(body: any): ErrorDetail[] | null {
    const errors: ErrorDetail[] = [];
    if (!body || typeof body !== 'object') {
      return [{ message: 'Request body must be a JSON object' }];
    }
    if (!body.email || !validators.isValidEmail(body.email)) {
      errors.push({ field: 'email', message: 'A valid email address is required' });
    }
    if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
    }
    return errors.length > 0 ? errors : null;
  },

  refresh(body: any): ErrorDetail[] | null {
    const errors: ErrorDetail[] = [];
    if (!body?.refreshToken || !validators.isNonEmptyString(body.refreshToken)) {
      errors.push({ field: 'refreshToken', message: 'Refresh token is required' });
    }
    return errors.length > 0 ? errors : null;
  },
};

export const prescriptionValidators = {
  scan(body: any): ErrorDetail[] | null {
    const errors: ErrorDetail[] = [];
    if (!body?.uploadId || !validators.isNonEmptyString(body.uploadId)) {
      errors.push({ field: 'uploadId', message: 'Upload ID is required' });
    }
    return errors.length > 0 ? errors : null;
  },

  sign(body: any): ErrorDetail[] | null {
    const errors: ErrorDetail[] = [];
    if (!body?.signatureBytes || !validators.isNonEmptyString(body.signatureBytes)) {
      errors.push({ field: 'signatureBytes', message: 'Cryptographic signature bytes (Base64) required' });
    }
    if (!body?.signingKeyId || !validators.isNonEmptyString(body.signingKeyId)) {
      errors.push({ field: 'signingKeyId', message: 'Doctor signing key ID or KMS Key reference required' });
    }
    const validAlgos = ['ES256', 'Ed25519', 'RS256'];
    if (body?.signatureAlgorithm && !validAlgos.includes(body.signatureAlgorithm)) {
      errors.push({ field: 'signatureAlgorithm', message: `Algorithm must be one of: ${validAlgos.join(', ')}` });
    }
    return errors.length > 0 ? errors : null;
  },
};

export const paginationValidator = (query: any): ErrorDetail[] | null => {
  const errors: ErrorDetail[] = [];
  if (query?.page !== undefined) {
    const pageNum = Number(query.page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', message: 'Page must be an integer >= 1' });
    }
  }
  if (query?.limit !== undefined) {
    const limitNum = Number(query.limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 100' });
    }
  }
  return errors.length > 0 ? errors : null;
};
