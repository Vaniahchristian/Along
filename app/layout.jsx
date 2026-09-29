import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { JsonLd } from '@/components/seo/json-ld';
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE
} from '@/lib/seo';

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'social',
  openGraph: {
    type: 'website',
    locale: 'en_UG',
    url: siteUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME
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
  const content = (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#3b793f',
          colorText: '#0f2218',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#0f2218',
          borderRadius: '14px'
        }
      }}
    >
      {children}
    </ClerkProvider>
  );

  return (
    <html lang="en">
      <body>
        <JsonLd />
        {content}
      </body>
    </html>
  );
}
