'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlong } from './context';
import { ActionButton, EmptyState, PageHeading, PersonAvatar } from './shared';

export function PlansScreen() {
  const { data, navigate, openPlan, openChat } = useAlong();
  const [tab, setTab] = useState('upcoming');
  const related = new Set([...data.joined, ...data.requests, ...data.plans.filter((plan) => plan.host === 'You').map((plan) => plan.id)]);
  const ids = tab === 'past' ? data.completed : [...related].filter((id) => !data.completed.includes(id));
  const plans = ids.map((id) => data.plans.find((plan) => plan.id === id)).filter(Boolean);

  return <><PageHeading title="My plans" description="Your next steps, all in one place." />
    <Tabs value={tab} onValueChange={setTab} className="along-tabs"><TabsList><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="past">Past</TabsTrigger></TabsList></Tabs>
    {plans.length ? plans.map((plan) => {
      const joined = data.joined.includes(plan.id);
      const mine = plan.host === 'You';
      const done = data.completed.includes(plan.id);
      const status = done ? 'Completed' : mine ? 'Hosting' : joined ? 'Confirmed' : 'Request pending';
      return <article className="list-item" key={plan.id}>
        <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} />
        <div className="grow"><h3>{plan.title}</h3><p>{plan.date} · {plan.time} · {plan.venue}</p></div>
        <span className={`status ${status === 'Request pending' ? 'pending' : 'confirmed'}`}>{status}</span>
        <ActionButton type="button" tone="secondary" onClick={() => openPlan(plan.id)}>Details</ActionButton>
        {(joined || mine) && <ActionButton type="button" onClick={() => openChat(plan.id)}>Chat</ActionButton>}
      </article>;
    }) : <EmptyState title={tab === 'past' ? 'No past plans yet' : 'Nothing on your calendar yet'} description={tab === 'past' ? 'Your completed meetups will appear here.' : 'Find a plan that makes you want to go.'} action="Explore plans" onAction={() => navigate('explore')} />}
    {tab === 'upcoming' && data.requests.length > 0 && <div className="notice">Demo tip: Open Profile → Demo controls to accept a pending request and try the confirmed plan flow.</div>}
  </>;
}
