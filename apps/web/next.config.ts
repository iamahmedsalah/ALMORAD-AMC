import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
if (existsSync('../../.env')) loadEnvFile('../../.env');
const config: NextConfig = {
  transpilePackages: ['@amc/shared'], poweredByHeader: false, output: process.env.VERCEL ? undefined : 'standalone',
  experimental: { cpus: 1 },
  async redirects() {
    return ['almorad-amc.vercel.app', 'www.almorad-amc.com'].map(host => ({
      source: '/:path*', has: [{type: 'host' as const, value: host.replaceAll('.', '\\.')}],
      destination: 'https://almorad-amc.com/:path*', permanent: true,
    }));
  },
  async headers() { return [{source:'/(en|ar)/staff/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source: '/:path*', headers: [
    {key: 'X-Content-Type-Options', value: 'nosniff'}, {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    {key: 'X-Frame-Options', value: 'DENY'}, {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default createNextIntlPlugin('./src/i18n/request.ts')(config);
