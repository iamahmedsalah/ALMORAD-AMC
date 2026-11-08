import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  createHttpLoggerMiddleware,
  resolveLogLevel,
  sanitizeLogPath,
  type HttpLogEntry,
} from './http-logger.middleware.js';

describe('http-logger.middleware', () => {
  it('strips query parameters from logged paths to prevent token/PII leakage', () => {
    expect(sanitizeLogPath('/api/bookings?token=secret123&email=user@example.com')).toBe(
      '/api/bookings',
    );
    expect(sanitizeLogPath(undefined)).toBe('/');
  });

  it('maps HTTP status codes to structured log levels', () => {
    expect(resolveLogLevel(200)).toBe('info');
    expect(resolveLogLevel(304)).toBe('info');
    expect(resolveLogLevel(404)).toBe('warn');
    expect(resolveLogLevel(422)).toBe('warn');
    expect(resolveLogLevel(500)).toBe('error');
  });

  it('attaches X-Request-ID, Cache-Control, and emits structured JSON log on response finish', () => {
    const entries: HttpLogEntry[] = [];
    const middleware = createHttpLoggerMiddleware({
      sink: (entry) => entries.push(entry),
    });

    const headers = new Map<string, string>();
    const emitter = new EventEmitter();

    const req = {
      method: 'POST',
      originalUrl: '/api/v1/bookings?secret=abc',
      headers: {},
    } as unknown as Request;

    const res = Object.assign(emitter, {
      statusCode: 201,
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    }) as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(headers.get('Cache-Control')).toBe('no-store');
    const requestId = headers.get('X-Request-ID');
    expect(requestId).toBeDefined();

    emitter.emit('finish');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 'info',
      event: 'http',
      requestId,
      method: 'POST',
      path: '/api/v1/bookings',
      status: 201,
    });
    expect(typeof entries[0]?.durationMs).toBe('number');
    expect(typeof entries[0]?.timestamp).toBe('string');
  });
});
