export const AUTH_STORAGE_KEY = 'along-demo-viewer';
export const DEMO_EMAIL = 'demo@along.app';
export const DEMO_PASSWORD = 'along123';

export function isDemoLogin(email, password) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function demoViewer({ id = null, name = 'You', email = null, interests = [], guest = false } = {}) {
  return {
    id: id || null,
    name: name.trim() || 'You',
    email: email?.trim().toLowerCase() || null,
    interests,
    guest
  };
}

export function restoreDemoViewer(value) {
  if (!value || typeof value.name !== 'string') return null;
  return demoViewer({
    id: typeof value.id === 'string' ? value.id : null,
    name: value.name,
    email: value.email,
    interests: Array.isArray(value.interests) ? value.interests : [],
    guest: Boolean(value.guest)
  });
}
