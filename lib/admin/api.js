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

export async function loadAdminSupportThreads() {
  const response = await fetch('/api/admin/support', {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load support conversations.');
  return result;
}

export async function loadAdminSupportThread(threadId) {
  const response = await fetch(`/api/admin/support?threadId=${encodeURIComponent(threadId)}`, {
    cache: 'no-store',
    credentials: 'same-origin'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load this conversation.');
  return result;
}

export async function replyAdminSupport(threadId, body) {
  const response = await fetch('/api/admin/support', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, body })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not send this reply.');
  return result;
}

export async function setAdminSupportStatus(threadId, action) {
  const response = await fetch('/api/admin/support', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, action })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not update conversation status.');
  return result;
}
