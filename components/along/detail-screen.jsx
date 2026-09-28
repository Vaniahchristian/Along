'use client';

import { CalendarDays, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
import { useAlong } from './context';
import { ActionButton, BackButton, BeginnerBadge, CategoryBadge, Panel, PersonAvatar, ReportForm } from './shared';

export function DetailScreen() {
  const { data, selectedPlanId, openChat, requestJoin, approveRequest, busy } = useAlong();
  const plan = data.plans.find((item) => item.id === selectedPlanId);
  if (!plan) return <><BackButton /><Panel><h1 className="font-heading text-2xl font-extrabold">Plan not found</h1><p className="text-muted-foreground">This plan may have been removed.</p></Panel></>;

  const requested = data.requests.includes(plan.id);
  const joined = data.joined.includes(plan.id);
  const mine = plan.host === 'You';
  const incoming = data.hostRequests.filter((request) => request.planId === plan.id);

  return <><BackButton /><div className="grid grid-cols-[minmax(0,1.3fr)_minmax(290px,.7fr)] gap-5 max-[760px]:grid-cols-1">
    <Panel><div className="flex flex-wrap gap-1.5"><CategoryBadge category={plan.category} />{plan.beginnerFriendly && <BeginnerBadge />}</div><h1 className="mt-4 mb-4 font-heading text-[clamp(1.8rem,3.3vw,2.7rem)] leading-[1.14] font-extrabold tracking-[-.04em]">{plan.title}</h1><p className="max-w-[65ch] text-muted-foreground">{plan.intro}</p>
      <div className="my-6 grid gap-3 border-y border-border py-5">
        <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><strong className="block">{plan.date} at {plan.time}</strong><span className="block text-[13px] text-muted-foreground">Confirm details in chat before you go</span></div></div>
        <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><strong className="block">{plan.venue}</strong><span className="block text-[13px] text-muted-foreground">Meet at a public venue</span></div></div>
        <div className="flex items-start gap-3"><UsersRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><strong className="block">{plan.size - plan.spots} going · {plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open</strong><span className="block text-[13px] text-muted-foreground">Small group · {plan.size} people maximum</span></div></div>
      </div>
      <h2 className="mb-3 font-heading text-lg font-extrabold">The plan</h2><ul className="list-disc space-y-2 pl-5 text-muted-foreground"><li><strong>Meet:</strong> {plan.meet}</li><li><strong>Bring:</strong> {plan.bring}</li><li><strong>Cost:</strong> Everyone covers their own venue costs unless the group agrees otherwise.</li></ul>
    </Panel>
    <div className="grid content-start gap-4">
      <Panel><h2 className="mb-3 font-heading text-lg font-extrabold">{mine ? 'Your plan' : 'Meet your host'}</h2><div className="flex items-center gap-3"><PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} large /><div><strong className="block">{plan.host}</strong><span className="text-xs text-muted-foreground">Hosting a public activity</span></div></div><div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary p-3 text-xs text-secondary-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" /> Take a moment to review the place and plan. Share your plans with someone you trust and meet at the listed public venue.</div>
        {mine || joined ? <ActionButton type="button" className="mt-4 w-full" onClick={() => openChat(plan.id)}>Open group chat</ActionButton> : requested ? <><ActionButton className="mt-4 w-full" disabled>Request sent</ActionButton><p className="mt-2 text-xs text-muted-foreground">You’ll see this in My plans until the host responds.</p></> : plan.spots > 0 ? <><ActionButton type="button" className="mt-4 w-full" onClick={() => requestJoin(plan.id)}>Ask to join</ActionButton><p className="mt-2 text-xs text-muted-foreground">The host will review your request before chat opens.</p></> : <p className="mt-4 text-xs text-muted-foreground">This plan is full.</p>}
      </Panel>
      {mine && <Panel><h2 className="mb-3 font-heading text-lg font-extrabold">Join requests</h2>{incoming.length ? <div className="grid gap-4">{incoming.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-3"><PersonAvatar initials={request.initials} name={request.name} tone="pink" large /><div className="min-w-0 flex-1"><strong className="block">{request.name}</strong><span className="text-xs text-muted-foreground">Interested in joining</span></div><ActionButton type="button" disabled={busy} onClick={() => approveRequest(plan.id, request.id)}>Accept</ActionButton></div>)}</div> : <p className="text-xs text-muted-foreground">No requests are waiting.</p>}</Panel>}
      <Panel><h2 className="mb-3 font-heading text-lg font-extrabold">Before you meet</h2><p className="text-xs text-muted-foreground">Keep first meetups in public places. Share the details with someone you trust.</p><ReportForm planId={plan.id} /></Panel>
    </div>
  </div></>;
}

