import { getSiteUrl } from '@/lib/seo';

export default function sitemap() {
  const siteUrl = getSiteUrl();
  const lastModified = new Date('2026-09-29');

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${siteUrl}/help`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3
    }
  ];
}
