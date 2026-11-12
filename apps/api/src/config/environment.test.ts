import {describe, expect, it} from 'vitest';
import {parseEnvironment} from './environment.js';
describe('environment boundary', () => {
  it('treats explicitly disabled optional integrations as unset without relaxing required values',()=>{
    const env=parseEnvironment({DATABASE_URL:'postgresql://localhost/amc_test',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',BOOKING_INBOX_EMAIL:'',CRON_SECRET:'',BOOKING_TOKEN_SECRET:''});
    expect(env.RESEND_API_KEY).toBeUndefined();expect(env.BOOKING_TOKEN_SECRET).toBeUndefined();
    expect(()=>parseEnvironment({DATABASE_URL:''})).toThrow('DATABASE_URL');
  });
  it('requires a PostgreSQL URL without printing its value', () => {
    expect(() => parseEnvironment({DATABASE_URL: 'https://secret@example.invalid/db'})).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({})).toThrow('DATABASE_URL');
  });
  it('requires HTTPS for production frontend origin', () => {
    expect(() => parseEnvironment({NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/test', WEB_ORIGIN: 'http://localhost:3000'})).toThrow('HTTPS');
  });
});
