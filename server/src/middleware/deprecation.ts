import { Request, Response, NextFunction } from 'express';

/**
 * Standard HTTP Deprecation & Sunset header middleware (RFC 8594 / RFC 9213).
 * Signals to clients that legacy unversioned /api/* routes are deprecated in favor
 * of canonical /api/v1/* endpoints and specifies the sunset termination date.
 */
export function legacyDeprecationMiddleware(successorBase = '/api/v1') {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Sun, 01 Nov 2026 00:00:00 GMT');

    const subPath = req.baseUrl.replace(/^\/api/, '') + req.path;
    const cleanSubPath = subPath.replace(/\/+$/, '') || '/';
    res.setHeader('Link', `<${successorBase}${cleanSubPath}>; rel="successor-version"`);

    next();
  };
}
