import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface HttpLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: 'http';
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface HttpLoggerOptions {
  environment?: string;
  sink?: (entry: HttpLogEntry) => void;
}

export function sanitizeLogPath(rawUrl: string | undefined): string {
  if (!rawUrl) return '/';
  const [pathname] = rawUrl.split('?');
  return pathname || '/';
}

export function resolveLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

export function defaultHttpLogSink(entry: HttpLogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createHttpLoggerMiddleware(options: HttpLoggerOptions = {}) {
  const sink = options.sink ?? defaultHttpLogSink;

  return (request: Request, response: Response, next: NextFunction): void => {
    const incomingId =
      typeof request.headers?.['x-request-id'] === 'string' &&
      request.headers['x-request-id'].trim().length > 0
        ? request.headers['x-request-id'].trim()
        : undefined;
    const requestId = incomingId ?? randomUUID();
    const started = performance.now();

    response.setHeader('X-Request-ID', requestId);
    response.setHeader('Cache-Control', 'no-store');

    response.on('finish', () => {
      const status = response.statusCode || 200;
      const entry: HttpLogEntry = {
        timestamp: new Date().toISOString(),
        level: resolveLogLevel(status),
        event: 'http',
        requestId,
        method: request.method || 'GET',
        path: sanitizeLogPath(request.originalUrl || request.url),
        status,
        durationMs: Math.max(0, Math.round(performance.now() - started)),
      };
      sink(entry);
    });

    next();
  };
}
