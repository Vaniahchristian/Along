export async function ensureClerkViewerProfile(user) {
  if (!user?.id) throw new Error('Sign in to continue.');
  const response = await fetch('/api/profile', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load your profile.');
  return result.profile;
}
