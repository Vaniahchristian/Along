export function defaultActivityImage(plan) {
  const text = `${plan.title || ''} ${plan.intro || ''} ${plan.venue || ''}`.toLowerCase();
  if (/party|parties|festival|club|rave|dancehall|nightlife/.test(text)) return '/activity/party.png';
  if (/swim|pool|aquatic|water/.test(text)) return '/activity/swim.webp';
  if (/coffee|café|cafe|brunch|food|lunch|restaurant/.test(text)) return '/activity/coffee.webp';
  if (/hik|walk|trail|hill|nature|garden|outdoor/.test(text)) return '/activity/hike.webp';
  if (/art|sketch|paint|craft|workshop|learn/.test(text)) return '/activity/art.webp';
  return (
    {
      Parties: '/activity/party.png',
      Fitness: '/activity/swim.webp',
      Outings: '/activity/coffee.webp',
      Learning: '/activity/art.webp'
    }[plan.category] || '/activity/coffee.webp'
  );
}

export function planImage(plan) {
  return plan.imageUrl || defaultActivityImage(plan);
}
