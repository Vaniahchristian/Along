import { HomePage } from '@/components/marketing/home-page';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export const metadata = {
  title: {
    absolute: `${SITE_NAME} — ${SITE_TAGLINE}`
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: '/'
  }
};

export default function Page() {
  return <HomePage />;
}
