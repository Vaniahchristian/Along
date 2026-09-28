'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAlong } from './context';
import { ActionButton, BeginnerBadge, CategoryBadge, EmptyState, PageHeading, Panel, PersonAvatar } from './shared';

const categories = ['All', 'Fitness', 'Outings', 'Learning'];

function PlanCard({ plan }) {
  const { openPlan } = useAlong();
  return <Panel className="flex min-h-[306px] flex-col p-5 shadow-[0_3px_12px_rgba(31,55,40,.025)] max-[760px]:min-h-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-1.5"><CategoryBadge category={plan.category} />{plan.beginnerFriendly && <BeginnerBadge />}</div><span className="text-xs font-extrabold text-primary">{plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open</span></div>
    <h3 className="mt-4 mb-2.5 font-heading text-xl leading-tight font-extrabold tracking-[-.035em]">{plan.title}</h3>
    <p className="mb-4 text-[13px] text-muted-foreground">{plan.intro}</p>
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-4 text-primary" aria-hidden="true" />{plan.date} · {plan.time}</span><span className="flex items-center gap-1"><MapPin className="size-4 text-primary" aria-hidden="true" />{plan.venue}</span></div>
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4"><div className="flex items-center gap-2"><PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} small /><div><strong className="block text-xs">{plan.host}</strong><small className="block text-[11px] text-muted-foreground">Hosting this plan</small></div></div><button type="button" className="whitespace-nowrap text-[13px] font-extrabold text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary" onClick={() => openPlan(plan.id)}>View plan →</button></div>
  </Panel>;
}

export function ExploreScreen() {
  const { data, navigate } = useAlong();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const filtered = useMemo(() => data.plans.filter((plan) => plan.status === 'open' && plan.spots > 0 && (category === 'All' || plan.category === category) && `${plan.title} ${plan.venue} ${plan.category}`.toLowerCase().includes(query.toLowerCase())), [data.plans, category, query]);

  return <>
    <section className="mb-7 grid min-h-[278px] grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)] overflow-hidden rounded-3xl bg-forest text-white max-[760px]:grid-cols-1"><div className="flex flex-col items-start justify-center p-9 max-[760px]:p-7"><h1 className="max-w-[680px] font-heading text-[clamp(2rem,3.5vw,3rem)] leading-[1.1] font-extrabold tracking-[-.04em]">The good stuff happens when you go.</h1><p className="mt-4 mb-5 max-w-[540px] text-white/80">Find a person to try that class, take that walk, or finally make that plan with. Small plans, real places, good company.</p><ActionButton type="button" onClick={() => navigate('create')}><Plus aria-hidden="true" /> Start a plan</ActionButton></div><div className="relative flex items-center justify-center overflow-hidden bg-primary max-[760px]:hidden"><div aria-hidden="true" className="absolute size-[330px] translate-x-12 translate-y-12 rounded-full border border-white/30" /><div aria-hidden="true" className="absolute size-[210px] translate-x-9 translate-y-9 rounded-full border border-white/30" /><div className="relative z-10 w-[210px] -rotate-[7deg] rounded-[18px] bg-card p-5 text-foreground shadow-[0_22px_40px_rgba(0,0,0,.13)]"><strong className="block font-heading text-lg leading-tight font-extrabold">Swimming is easier with someone.</strong><span className="mt-1.5 block text-xs text-muted-foreground">Saturday · Bugolobi · 1 spot open</span><div className="mt-4 flex -space-x-2"><PersonAvatar initials="MK" name="Maya K." tone="pink" small /><PersonAvatar initials="YO" name="You" tone="green" small /></div></div></div></section>
    <PageHeading title="Explore plans" description="Find something you’d like to do around Kampala." />
    <div className="mb-4 flex flex-wrap items-center gap-3"><label className="relative min-w-[230px] flex-1"><Search className="pointer-events-none absolute top-3.5 left-4 size-[18px] text-muted-foreground" aria-hidden="true" /><Input className="h-12 rounded-xl border-border bg-card pl-11" aria-label="Search plans" placeholder="Search activities or places" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">Public places first</span></div>
    <div className="mb-6 flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Activity categories">{categories.map((item) => <button type="button" className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-bold ${category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-secondary'}`} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
    <div className="mt-6 mb-4 flex items-center justify-between gap-4"><h2 className="font-heading text-[21px] font-extrabold tracking-[-.035em]">Plans worth leaving home for</h2><span className="text-[13px] text-muted-foreground">{filtered.length} available</span></div>
    <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">{filtered.length ? filtered.map((plan) => <PlanCard key={plan.id} plan={plan} />) : <EmptyState title="No plans match that search." description="Try another activity or put your own plan out there." action="Make a plan" onAction={() => navigate('create')} />}</div>
  </>;
}


