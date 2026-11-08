import {describe, expect, it} from 'vitest';
import {formatBanner, getBrowserConsoleBanner} from './banner.js';

describe('banner utility', () => {
  it('formats terminal banner matching reference style', () => {
    const banner = formatBanner({
      title: 'ALMORAD AMC — BACKEND API',
      icon: '🏛️',
      environment: 'development',
      version: 'v0.1.0',
      url: 'http://localhost:4000',
      docsUrl: 'http://localhost:4000/docs',
      nodeVersion: 'v24.15.0',
      diagnostics: [
        { label: 'PostgreSQL', status: 'online', value: 'Connected', detail: 'amc_dev', icon: '🐘' },
        { label: 'Security', status: 'active', value: 'RBAC Active', icon: '🛡️' }
      ]
    });

    expect(banner).toContain('ALMORAD AMC — BACKEND API');
    expect(banner).toContain('⚡ Environment');
    expect(banner).toContain('[ DEVELOPMENT ]');
    expect(banner).toContain('📦 Version');
    expect(banner).toContain('v0.1.0');
    expect(banner).toContain('🚀 URL');
    expect(banner).toContain('http://localhost:4000');
    expect(banner).toContain('📖 Swagger API');
    expect(banner).toContain('http://localhost:4000/docs');
    expect(banner).toContain('🟢 Node.js');
    expect(banner).toContain('v24.15.0');
    expect(banner).toContain('🐘 PostgreSQL');
    expect(banner).toContain('[ ONLINE ] Connected (amc_dev)');
    expect(banner).toContain('🛡️ Security');
    expect(banner).toContain('[ ACTIVE ] RBAC Active');
  });

  it('provides browser console styled banner', () => {
    const consoleBanner = getBrowserConsoleBanner();
    expect(consoleBanner.message).toContain('ALMORAD AMC');
    expect(consoleBanner.styles.length).toBeGreaterThan(0);
    expect(consoleBanner.styles[0]).toContain('#BE9D5B');
  });

  it('never prints database connection credentials, hosts or query tokens', () => {
    for (const scheme of ['postgres', 'postgresql', 'prisma+postgres']) {
      const banner = formatBanner({ title: 'API', diagnostics: [{ label: 'PostgreSQL', status: 'online', value: 'Connected', detail: `${scheme}://synthetic-user:synthetic-password)with-parenthesis@private.example.invalid:5432/test?api_key=synthetic-token` }] });
      expect(banner).toContain('[ ONLINE ] Connected');
      for (const sensitive of [scheme + '://', 'synthetic-user', 'synthetic-password', 'private.example.invalid', 'synthetic-token']) expect(banner).not.toContain(sensitive);
    }
  });
});
