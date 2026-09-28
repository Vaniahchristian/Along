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
    <Tabs value={tab} onValueChange={setTab} className="mb-5"><TabsList className="h-10 rounded-xl bg-[#eaece3] p-1"><TabsTrigger className="h-8 px-3 font-bold data-active:bg-card data-active:text-primary" value="upcoming">Upcoming</TabsTrigger><TabsTrigger className="h-8 px-3 font-bold data-active:bg-card data-active:text-primary" value="past">Past</TabsTrigger></TabsList></Tabs>
    {plans.length ? plans.map((plan) => {
      const joined = data.joined.includes(plan.id);
      const mine = plan.host === 'You';
      const done = data.completed.includes(plan.id);
      const status = done ? 'Completed' : mine ? 'Hosting' : joined ? 'Confirmed' : 'Request pending';
      return <article className="mb-2.5 flex items-center gap-4 rounded-[17px] border border-border bg-card p-4 max-[420px]:flex-wrap" key={plan.id}>
        <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} />
        <div className="min-w-0 flex-1"><h3 className="font-heading font-extrabold">{plan.title}</h3><p className="text-xs text-muted-foreground">{plan.date} · {plan.time} · {plan.venue}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${status === 'Request pending' ? 'bg-[#fae7ca] text-[#77512a]' : 'bg-secondary text-primary'}`}>{status}</span>
        <ActionButton type="button" tone="secondary" className="max-[420px]:flex-1" onClick={() => openPlan(plan.id)}>Details</ActionButton>
        {(joined || mine) && <ActionButton type="button" className="max-[420px]:flex-1" onClick={() => openChat(plan.id)}>Chat</ActionButton>}
      </article>;
    }) : <EmptyState title={tab === 'past' ? 'No past plans yet' : 'Nothing on your calendar yet'} description={tab === 'past' ? 'Your completed meetups will appear here.' : 'Find a plan that makes you want to go.'} action="Explore plans" onAction={() => navigate('explore')} />}
    {tab === 'upcoming' && data.requests.length > 0 && <div className="mt-4 rounded-xl bg-muted p-3 text-[13px] text-foreground">Demo tip: Open Profile → Demo controls to accept a pending request and try the confirmed plan flow.</div>}
  </>;
}
