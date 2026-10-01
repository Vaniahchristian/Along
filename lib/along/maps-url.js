const ALLOWED =
  /^https:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[a-z.]+\/|www\.google\.[a-z.]+\/maps|google\.[a-z.]+\/maps)/i;

/** Normalize and validate an optional Google Maps pin/share URL. */
export function normalizeMapsUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    throw new Error('Paste a valid Google Maps link.');
  }
  if (url.protocol !== 'https:') throw new Error('Maps links must start with https://');
  const href = url.toString();
  if (!ALLOWED.test(href)) {
    throw new Error('Use a Google Maps link (maps.app.goo.gl or google.com/maps).');
  }
  if (href.length > 500) throw new Error('That maps link is too long.');
  return href;
}
