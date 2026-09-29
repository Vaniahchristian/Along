const FALLBACK_SITE_URL = 'https://tagwimi.com';

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
  return raw.replace(/\/$/, '');
}

export const SITE_NAME = 'Tagwimi';

export const SITE_TAGLINE = 'Make the plan. Find your people. Go.';

export const SITE_DESCRIPTION =
  'Tagwimi helps adults in Kampala make small activity plans—swims, walks, coffee, events—find people to join, and actually go. Adults 18+.';

export const SITE_KEYWORDS = [
  'Tagwimi',
  'activity plans Kampala',
  'find people to hang out Kampala',
  'activity buddies Uganda',
  'group plans Kampala',
  'meet for coffee Kampala',
  'hiking buddies Kampala',
  'social plans adults'
];
