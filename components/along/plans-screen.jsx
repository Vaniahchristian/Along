'use client';

import { useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListPagination } from '@/components/ui/list-pagination';
import { useAlong } from './context';
import { ActionButton, EmptyState, PageHeading, PersonAvatar } from './shared';

const PAGE_SIZE = 8;

export function PlansScreen() {
  const { data, navigate, openPlan, openChat, cancelRequest, busy } = useAlong();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const listTop = useRef(null);
  const related = new Set([...data.joined, ...data.requests, ...data.plans.filter((plan) => plan.host === 'You').map((plan) => plan.id)]);
  const ids = tab === 'past' ? data.completed : [...related].filter((id) => !data.completed.includes(id));
  const plans = ids.map((id) => data.plans.find((plan) => plan.id === id)).filter(Boolean);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(plans.length / PAGE_SIZE)));
  const visible = plans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <><PageHeading title="My plans" description="Your next steps, all in one place." />
    <div ref={listTop} className="scroll-mt-20"><Tabs value={tab} onValueChange={(next) => { setTab(next); setPage(1); }} className="mb-5"><TabsList className="h-10 rounded-xl bg-soft-green p-1"><TabsTrigger className="h-8 px-3 font-bold data-active:bg-card data-active:text-primary" value="upcoming">Upcoming</TabsTrigger><TabsTrigger className="h-8 px-3 font-bold data-active:bg-card data-active:text-primary" value="past">Past</TabsTrigger></TabsList></Tabs></div>
    {plans.length ? visible.map((plan) => {
      const joined = data.joined.includes(plan.id);
      const mine = plan.host === 'You';
      const done = data.completed.includes(plan.id);
      const pending = data.requests.includes(plan.id);
      const status = done ? 'Completed' : mine ? 'Hosting' : joined ? 'Confirmed' : 'Request pending';
      return <article className="mb-3 flex min-w-0 flex-col gap-4 rounded-[18px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between" key={plan.id}>
        <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
          <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} />
          <div className="min-w-0 flex-1"><h3 className="font-heading text-base font-extrabold leading-snug text-forest">{plan.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{plan.date} · {plan.time}<span className="block sm:inline"> · {plan.venue}</span></p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:justify-end sm:pl-0">
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${status === 'Request pending' ? 'bg-amber/15 text-forest' : 'bg-soft-green text-forest'}`}><span className={`size-1.5 rounded-full ${status === 'Request pending' ? 'bg-amber' : status === 'Hosting' ? 'bg-primary' : 'bg-success'}`} />{status}</span>
          <ActionButton type="button" tone="secondary" onClick={() => openPlan(plan.id)}>Details</ActionButton>
          {pending && <ActionButton type="button" tone="secondary" disabled={busy} onClick={() => cancelRequest(plan.id)}>{busy ? 'Cancelling…' : 'Cancel'}</ActionButton>}
          {(joined || mine) && <ActionButton type="button" onClick={() => openChat(plan.id)}>Chat</ActionButton>}
        </div>
      </article>;
    }) : <EmptyState title={tab === 'past' ? 'No past plans yet' : 'Nothing on your calendar yet'} description={tab === 'past' ? 'Your completed meetups will appear here.' : 'Find a plan that makes you want to go.'} action="Explore plans" onAction={() => navigate('explore')} />}
    <ListPagination page={currentPage} pageSize={PAGE_SIZE} total={plans.length} onPageChange={(next) => { setPage(next); listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
  </>;
}
