export default function manifest() {
  return {
    name: 'Tagwimi',
    short_name: 'Tagwimi',
    description: 'Make the plan. Find your people. Go.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fbfcf8',
    theme_color: '#3b793f',
    categories: ['social', 'lifestyle'],
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
