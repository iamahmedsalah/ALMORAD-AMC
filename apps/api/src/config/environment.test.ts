import {describe, expect, it} from 'vitest';
import {parseEnvironment} from './environment.js';
describe('environment boundary', () => {
  it('requires a PostgreSQL URL without printing its value', () => {
    expect(() => parseEnvironment({DATABASE_URL: 'https://secret@example.invalid/db'})).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({})).toThrow('DATABASE_URL');
  });
  it('requires HTTPS for production frontend origin', () => {
    expect(() => parseEnvironment({NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/test', WEB_ORIGIN: 'http://localhost:3000'})).toThrow('HTTPS');
  });
});
