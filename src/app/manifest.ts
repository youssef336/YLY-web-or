import type { MetadataRoute } from 'next';

/** PWA manifest: makes Bello installable on phones/desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bello — Member Evaluation',
    short_name: 'Bello',
    description: 'Offline-first committee member evaluation, scoring and WhatsApp reporting.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#060a13',
    theme_color: '#060a13',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}