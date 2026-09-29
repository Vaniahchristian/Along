export async function adminAction(action, id, reason, extra = {}) {
  const response = await fetch('/api/admin/actions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id, reason, ...extra })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The admin action failed.');
  return result;
}

export async function getAdminAccess(clerkUser = null) {
  if (!clerkUser) return { user: null, allowed: false };
  const response = await fetch('/api/admin/dashboard?access=1', {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  if (response.status === 403) return { user: null, allowed: false };
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not check admin access.');
  return result;
}

export async function loadAdminDashboard() {
  const response = await fetch('/api/admin/dashboard', {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load the dashboard.');
  return result;
}
