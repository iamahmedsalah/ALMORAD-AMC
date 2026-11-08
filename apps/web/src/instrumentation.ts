export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { printBanner } = await import('@amc/shared');
    const port = process.env.PORT || 3000;
    const url = process.env.WEB_ORIGIN || `http://localhost:${port}`;
    const apiOrigin = process.env.STAFF_API_ORIGIN || 'http://127.0.0.1:4000';

    printBanner({
      title: 'ALMORAD AMC — WEB APPLICATION',
      icon: '✨',
      environment: process.env.NODE_ENV || 'development',
      version: 'v0.1.0',
      url,
      nodeVersion: process.version,
      fields: [
        { label: 'Pillars', icon: '🏛️', value: 'Marketing, Advertising, Consulting, Web Dev' },
        { label: 'Offerings', icon: '📋', value: '11 bilingual dedicated service guides' },
      ],
      diagnostics: [
        { label: 'Locales', status: 'active', value: 'en (English LTR) | ar (العربية RTL)', icon: '🌍' },
        { label: 'Design System', status: 'ready', value: 'Cairo, IBM Plex Sans, Dark/Light/System', icon: '🎨' },
        { label: '3D Island', status: 'ready', value: 'Original GLB Three.js Island + Fallback SVG', icon: '💎' },
        { label: 'API Gateway', status: 'online', value: apiOrigin, icon: '🔌' },
      ],
    });
  }
}
