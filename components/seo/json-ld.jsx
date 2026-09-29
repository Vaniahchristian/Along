import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export function JsonLd() {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/tagwimi-logo.png`;

  const graph = [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: logoUrl
      },
      email: 'support@tagwimi.com',
      description: SITE_DESCRIPTION,
      areaServed: {
        '@type': 'City',
        name: 'Kampala'
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'en'
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#app`,
      name: SITE_NAME,
      url: siteUrl,
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      description: `${SITE_TAGLINE} ${SITE_DESCRIPTION}`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'UGX'
      },
      audience: {
        '@type': 'PeopleAudience',
        suggestedMinAge: 18
      },
      provider: { '@id': `${siteUrl}/#organization` }
    }
  ];

  const data = {
    '@context': 'https://schema.org',
    '@graph': graph
  };

  return (
    <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
