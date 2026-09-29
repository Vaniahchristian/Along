import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Tagwimi — Make the plan. Find your people. Go.',
    template: '%s · Tagwimi'
  },
  description: 'Make the plan. Find your people. Go. Tagwimi brings people together around small activities at real places and times. Adults 18+.',
  applicationName: 'Tagwimi',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tagwimi'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b793f' },
    { media: '(prefers-color-scheme: dark)', color: '#0f2218' }
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  const content = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
    ? <ClerkProvider appearance={{ variables: { colorPrimary: '#3b793f', colorText: '#0f2218', colorBackground: '#ffffff', colorInputBackground: '#ffffff', colorInputText: '#0f2218', borderRadius: '14px' } }}>{children}</ClerkProvider>
    : children;
  return (
    <html lang="en">
      <body>{content}</body>
    </html>
  );
}
