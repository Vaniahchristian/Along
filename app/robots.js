import { getSiteUrl } from '@/lib/seo';

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/help', '/terms', '/privacy'],
        disallow: ['/app', '/admin', '/sso-callback', '/offline', '/api/']
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
