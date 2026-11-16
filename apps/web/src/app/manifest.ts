import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ALMORAD AMC — Growth & Brand Studio',
    short_name: 'ALMORAD AMC',
    description: 'Bilingual Growth & Brand Studio offering marketing, advertising, consulting, and web development.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#0B1F44',
    theme_color: '#F7761E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
