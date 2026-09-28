'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAlong } from './context';
import { ActionButton, EmptyState, PageHeading, Panel, PersonAvatar, ReportForm } from './shared';

export function ChatScreen() {
  const { data, chatId, openChat, navigate, sendMessage, checkIn, complete } = useAlong();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const available = data.plans.filter((plan) => data.joined.includes(plan.id) || plan.host === 'You');
  const plan = available.find((item) => item.id === chatId) ?? available[0];
  const messages = plan ? data.messages[plan.id] ?? [] : [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [plan?.id, messages.length]);

  if (!plan) return <><PageHeading title="Messages" description="Chat opens once a plan is confirmed." /><EmptyState title="No conversations yet" description="Join a plan or create one to start coordinating." action="Explore plans" onAction={() => navigate('explore')} /></>;

  async function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const result = await sendMessage(plan.id, draft);
    if (result?.ok) setDraft('');
  }

  const checked = data.checkins.includes(plan.id);
  const done = data.completed.includes(plan.id);
  return <><PageHeading title="Messages" description="Make the details easy before you meet." />
    <div className="grid min-h-[570px] grid-cols-[280px_minmax(0,1fr)] gap-4 max-[760px]:min-h-0 max-[760px]:grid-cols-1"><Panel className="content-start p-3 max-[760px]:flex max-[760px]:gap-1 max-[760px]:overflow-x-auto">{available.map((item) => <button key={item.id} type="button" className={`w-full rounded-xl p-3 text-left max-[760px]:min-w-[180px] ${plan.id === item.id ? 'bg-secondary' : 'hover:bg-muted'}`} onClick={() => openChat(item.id)}><strong className="block text-[13px]">{item.title}</strong><span className="text-xs text-muted-foreground">{item.date} · {item.time}</span></button>)}</Panel>
      <Panel className="flex flex-col overflow-hidden p-0"><div className="border-b border-border px-6 py-5"><strong className="block">{plan.title}</strong><small className="text-muted-foreground">{plan.venue} · {plan.date} at {plan.time}</small></div><div className="flex min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto p-6 max-[760px]:px-4" aria-live="polite"><div className="mb-1 rounded-xl bg-soft-green p-3 text-[13px] text-forest">Group chat is for plan details. Meet at the public venue and trust your judgement.</div>{messages.map((message) => <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[75%] ${message.mine ? 'self-end' : 'self-start'}`} key={message.id}>{!message.mine && <PersonAvatar initials={message.senderInitials} name={message.senderName} tone={message.senderTone} small />}<div className={`min-w-0 rounded-[14px] px-3.5 py-3 text-[13px] ${message.mine ? 'bg-primary text-primary-foreground' : 'bg-soft-green text-forest'}`}><div className={`mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold ${message.mine ? 'text-white/80' : 'text-primary'}`}><span>{message.mine ? 'You' : message.senderName}</span>{message.senderId === plan.hostId && <span className="rounded-full bg-amber/25 px-1.5 py-0.5 text-[9px] text-inherit">Host</span>}</div><p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p><time dateTime={message.createdAt} className="mt-1 block text-[10px] opacity-70">{message.time}</time></div></div>)}<div ref={endRef} /></div><form className="flex gap-2 border-t border-border p-3.5" onSubmit={submit}><Input className="h-11 min-w-0 flex-1 rounded-xl border-border bg-card" aria-label="Message" required maxLength={500} placeholder="Ask about the meeting point…" value={draft} onChange={(event) => setDraft(event.target.value)} /><ActionButton type="submit">Send</ActionButton></form></Panel>
    </div>
    <div className="mt-4"><Panel><h2 className="mb-3 font-heading text-lg font-extrabold">On the day</h2><p className="mb-4 text-xs text-muted-foreground">Confirm when you reach the meeting point. Afterward, mark the plan complete.</p><div className="flex flex-wrap items-center gap-2"><ActionButton type="button" tone="secondary" disabled={checked} onClick={() => checkIn(plan.id)}><Check aria-hidden="true" /> {checked ? 'Checked in' : 'I’m here'}</ActionButton><ActionButton type="button" tone="secondary" disabled={done} onClick={() => complete(plan.id)}>{done ? 'Plan completed' : 'Mark completed'}</ActionButton><ReportForm planId={plan.id} /></div></Panel></div>
  </>;
}
