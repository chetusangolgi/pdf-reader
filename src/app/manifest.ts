import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rick Peruse - PDF Reader',
    short_name: 'Rick Peruse',
    description: 'The perfect PDF reader with text reflow, customizable typography, and immersive audio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
