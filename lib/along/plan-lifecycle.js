/** Whether a plan still accepts new joiners. */
export function isPlanJoinable(plan, now = Date.now()) {
  if (!plan || plan.status !== 'open' || Number(plan.spots) <= 0) return false;
  if (!plan.endsAt) return true;
  const end = new Date(plan.endsAt).getTime();
  return !Number.isNaN(end) && end > now;
}

/** Default end = start + 24 hours. */
export function defaultEndsAt(startsAtIso) {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) throw new Error('Choose a valid start time.');
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}
