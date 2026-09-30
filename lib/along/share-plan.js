export function planShareUrl(id) {
  return `${window.location.origin}/p/${id}`;
}

export async function sharePlan(plan) {
  const url = planShareUrl(plan.id);
  if (navigator.share) {
    try {
      await navigator.share({ title: plan.title, text: `Come along with ${plan.host === 'You' ? 'me' : plan.host} on Tagwimi.`, url });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
