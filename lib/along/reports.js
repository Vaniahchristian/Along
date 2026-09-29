export async function submitPlanReport(
  _viewerId,
  planId,
  reason,
  targetType = 'plan',
  messageId = null
) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ planId, reason, targetType, messageId })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not send your report.');
}
