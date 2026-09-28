'use client';

import { CalendarDays, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
import { useAlong } from './context';
import { ActionButton, BackButton, CategoryBadge, Panel, PersonAvatar, ReportForm } from './shared';

export function DetailScreen() {
  const { data, selectedPlanId, navigate, openChat, requestJoin, acceptHostRequest } = useAlong();
  const plan = data.plans.find((item) => item.id === selectedPlanId);
  if (!plan) return <><BackButton /><Panel><h1>Plan not found</h1><p className="muted">This plan is no longer in the demo.</p></Panel></>;

  const requested = data.requests.includes(plan.id);
  const joined = data.joined.includes(plan.id);
  const mine = plan.host === 'You';
  const incoming = data.hostRequests.includes(plan.id);

  return <><BackButton /><div className="detail-layout">
    <Panel className="detail-main"><CategoryBadge category={plan.category} /><h1>{plan.title}</h1><p>{plan.intro}</p>
      <div className="detail-meta">
        <div><CalendarDays aria-hidden="true" /><div><strong>{plan.date} at {plan.time}</strong><span>Confirm details in chat before you go</span></div></div>
        <div><MapPin aria-hidden="true" /><div><strong>{plan.venue}</strong><span>Meet at a public venue</span></div></div>
        <div><UsersRound aria-hidden="true" /><div><strong>{plan.size - plan.spots} going · {plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open</strong><span>Small group · {plan.size} people maximum</span></div></div>
      </div>
      <h2>The plan</h2><ul><li><strong>Meet:</strong> {plan.meet}</li><li><strong>Bring:</strong> {plan.bring}</li><li><strong>Cost:</strong> Everyone covers their own venue costs unless the group agrees otherwise.</li></ul>
    </Panel>
    <div className="side-stack">
      <Panel><h2>{mine ? 'Your plan' : 'Meet your host'}</h2><div className="host-large"><PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} large /><div><strong>{plan.host}</strong><span>Hosting a public activity</span></div></div><div className="trust-note"><ShieldCheck aria-hidden="true" /> Take a moment to review the place and plan. Share your plans with someone you trust and meet at the listed public venue.</div>
        {mine || joined ? <ActionButton type="button" className="full" onClick={() => openChat(plan.id)}>Open group chat</ActionButton> : requested ? <><ActionButton className="full" disabled>Request sent</ActionButton><p className="small muted">You’ll see this in My plans until the host responds.</p></> : plan.spots > 0 ? <><ActionButton type="button" className="full" onClick={() => requestJoin(plan.id)}>Ask to join</ActionButton><p className="small muted">The host will review your request before chat opens.</p></> : <p className="small muted">This plan is full.</p>}
      </Panel>
      {mine && <Panel><h2>Join requests</h2>{incoming ? <><div className="host-large"><PersonAvatar initials="NA" name="Nina A." tone="pink" large /><div><strong>Nina A.</strong><span>Interested in joining · sample request</span></div></div><ActionButton type="button" className="full" onClick={() => acceptHostRequest(plan.id)}>Accept Nina</ActionButton></> : <p className="small muted">No requests are waiting. When someone asks to join, review their profile here.</p>}</Panel>}
      <Panel><h2>Before you meet</h2><p className="small muted">Keep first meetups in public places. You can leave a plan, and report anything that feels wrong.</p><ReportForm planId={plan.id} /></Panel>
    </div>
  </div></>;
}
