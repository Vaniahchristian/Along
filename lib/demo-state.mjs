export const STORAGE_KEY = 'along-demo';

export const seedPlans = [
  { id: 1, category: 'Fitness', beginnerFriendly: true, title: 'Saturday morning swim at Silver Springs', venue: 'Silver Springs Hotel pool, Bugolobi', date: 'Sat, 3 Oct', time: '10:00 AM', spots: 1, size: 2, host: 'Maya K.', initials: 'MK', tone: 'pink', intro: 'Getting back into swimming and would love company for easy laps. Beginners welcome. We can grab a juice afterwards.', bring: 'Swimwear, towel and pool entry fee', meet: 'At the café entrance beside the pool', status: 'open' },
  { id: 2, category: 'Outings', title: 'Coffee and a quiet work session', venue: 'Endiro Coffee, Kisementi', date: 'Sun, 4 Oct', time: '2:30 PM', spots: 2, size: 4, host: 'David O.', initials: 'DO', tone: 'green', intro: 'Bring a laptop or notebook. Work for 90 minutes, then take a proper coffee break together.', bring: 'Laptop or notebook; buy your own drink', meet: 'Inside, at the long table near the window', status: 'open' },
  { id: 3, category: 'Fitness', beginnerFriendly: true, title: 'Try a beginner circuit class together', venue: 'The Cube Fitness, Kololo', date: 'Mon, 5 Oct', time: '6:00 PM', spots: 1, size: 2, host: 'Brenda N.', initials: 'BN', tone: '', intro: 'First circuit class for both of us? Let’s arrive a little early and figure it out together.', bring: 'Workout clothes, water and class fee', meet: 'At the front desk, 15 minutes before class', status: 'open' },
  { id: 4, category: 'Outings', title: 'A slow walk through the botanical gardens', venue: 'Entebbe Botanical Gardens', date: 'Sat, 10 Oct', time: '9:00 AM', spots: 3, size: 5, host: 'Aisha M.', initials: 'AM', tone: 'pink', intro: 'An easy morning walk, fresh air and good conversation. We’ll stay on the main paths.', bring: 'Comfortable shoes, water and entry fee', meet: 'At the main entrance ticket office', status: 'open' },
  { id: 5, category: 'Learning', title: 'Sketch and sip at an art workshop', venue: 'The Artfield, Ntinda', date: 'Sun, 11 Oct', time: '11:00 AM', spots: 2, size: 3, host: 'Joel T.', initials: 'JT', tone: 'green', intro: 'No drawing skills required. I want to try the weekend workshop and it would be easier to walk in with someone.', bring: 'Workshop fee and curiosity', meet: 'Outside the studio entrance', status: 'open' }
];

export function initialDemoData() {
  return {
    plans: seedPlans.map((plan) => ({ ...plan })),
    requests: [],
    joined: [],
    hostRequests: [],
    messages: { 1: [{ mine: false, text: 'Hi! The pool opens at 9, so 10 should be nice and calm.', time: 'Yesterday' }] },
    checkins: [],
    completed: []
  };
}

export function restoreDemoData(value) {
  const initial = initialDemoData();
  if (!value || !Array.isArray(value.plans)) return initial;
  return {
    plans: value.plans.map((plan) => ({ ...plan, ...([1, 3].includes(plan.id) && plan.beginnerFriendly === undefined ? { beginnerFriendly: true } : {}) })),
    requests: Array.isArray(value.requests) ? value.requests : [],
    joined: Array.isArray(value.joined) ? value.joined : [],
    hostRequests: Array.isArray(value.hostRequests) ? value.hostRequests : [],
    messages: value.messages && typeof value.messages === 'object' ? value.messages : {},
    checkins: Array.isArray(value.checkins) ? value.checkins : [],
    completed: Array.isArray(value.completed) ? value.completed : []
  };
}

const addOnce = (items, id) => items.includes(id) ? items : [...items, id];
const reduceSpot = (plans, id) => plans.map((plan) => plan.id === id ? { ...plan, spots: Math.max(0, plan.spots - 1) } : plan);

export function demoReducer(state, action) {
  switch (action.type) {
    case 'hydrate': return restoreDemoData(action.value);
    case 'reset': return initialDemoData();
    case 'request':
      if (state.requests.includes(action.id) || state.joined.includes(action.id)) return state;
      return { ...state, requests: [...state.requests, action.id] };
    case 'accept-request': {
      const id = action.id ?? state.requests[0];
      if (!state.requests.includes(id)) return state;
      const plan = state.plans.find((item) => item.id === id);
      if (!plan) return state;
      return {
        ...state,
        plans: reduceSpot(state.plans, id),
        requests: state.requests.filter((item) => item !== id),
        joined: addOnce(state.joined, id),
        messages: { ...state.messages, [id]: [{ mine: false, text: `Hi! Happy you can join. Let’s meet ${plan.meet.toLowerCase()}.`, time: 'Just now' }] }
      };
    }
    case 'publish':
      return { ...state, plans: [action.plan, ...state.plans], hostRequests: addOnce(state.hostRequests, action.plan.id) };
    case 'accept-host':
      if (!state.hostRequests.includes(action.id)) return state;
      return {
        ...state,
        plans: reduceSpot(state.plans, action.id),
        hostRequests: state.hostRequests.filter((id) => id !== action.id),
        messages: { ...state.messages, [action.id]: [{ mine: false, text: 'Hi! Thanks for accepting me. I’ll be there a few minutes early.', time: 'Just now' }] }
      };
    case 'message':
      if (!action.text.trim()) return state;
      return { ...state, messages: { ...state.messages, [action.id]: [...(state.messages[action.id] ?? []), { mine: true, text: action.text.trim(), time: 'Just now' }] } };
    case 'checkin': return { ...state, checkins: addOnce(state.checkins, action.id) };
    case 'complete': return { ...state, completed: addOnce(state.completed, action.id) };
    default: return state;
  }
}
