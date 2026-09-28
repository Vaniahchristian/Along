'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAlong } from './context';
import { ActionButton, CategoryBadge, EmptyState, PageHeading, Panel, PersonAvatar } from './shared';

const categories = ['All', 'Fitness', 'Outings', 'Learning'];

function PlanCard({ plan }) {
  const { openPlan } = useAlong();
  return <Panel className="plan-card">
    <div className="card-top"><CategoryBadge category={plan.category} /><span className="spots">{plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open</span></div>
    <h3>{plan.title}</h3>
    <p>{plan.intro}</p>
    <div className="meta-row"><span><CalendarDays aria-hidden="true" />{plan.date} · {plan.time}</span><span><MapPin aria-hidden="true" />{plan.venue}</span></div>
    <div className="card-bottom"><div className="host-row"><PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} small /><div><strong>{plan.host}</strong><small>Hosting this plan</small></div></div><button type="button" className="card-link" onClick={() => openPlan(plan.id)}>View plan →</button></div>
  </Panel>;
}

export function ExploreScreen() {
  const { data, navigate } = useAlong();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const filtered = useMemo(() => data.plans.filter((plan) => plan.status === 'open' && plan.spots > 0 && (category === 'All' || plan.category === category) && `${plan.title} ${plan.venue} ${plan.category}`.toLowerCase().includes(query.toLowerCase())), [data.plans, category, query]);

  return <>
    <section className="hero"><div className="hero-copy"><h1>The good stuff happens when you go.</h1><p>Find a person to try that class, take that walk, or finally make that plan with. Small plans, real places, good company.</p><ActionButton type="button" onClick={() => navigate('create')}><Plus aria-hidden="true" /> Start a plan</ActionButton></div><div className="hero-art"><div className="hero-note"><strong>Swimming is easier with someone.</strong><span>Saturday · Bugolobi · 1 spot open</span><div className="note-avatars"><PersonAvatar initials="MK" name="Maya K." tone="pink" small /><PersonAvatar initials="YO" name="You" tone="green" small /></div></div></div></section>
    <PageHeading title="Explore plans" description="Find something you’d like to do around Kampala." />
    <div className="toolbar"><label className="search"><Search aria-hidden="true" /><Input aria-label="Search plans" placeholder="Search activities or places" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="small-pill">Public places first</span></div>
    <div className="filters" role="group" aria-label="Activity categories">{categories.map((item) => <button type="button" className={`chip ${category === item ? 'active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
    <div className="section-head"><h2>Plans worth leaving home for</h2><span>{filtered.length} available</span></div>
    <div className="plan-grid">{filtered.length ? filtered.map((plan) => <PlanCard key={plan.id} plan={plan} />) : <EmptyState title="No plans match that search." description="Try another activity or put your own plan out there." action="Make a plan" onAction={() => navigate('create')} />}</div>
  </>;
}
