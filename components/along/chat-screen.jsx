'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAlong } from './context';
import { ActionButton, EmptyState, PageHeading, Panel, ReportForm } from './shared';

export function ChatScreen() {
  const { data, chatId, openChat, navigate, sendMessage, checkIn, complete } = useAlong();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const available = data.plans.filter((plan) => data.joined.includes(plan.id) || plan.host === 'You');
  const plan = available.find((item) => item.id === chatId) ?? available[0];
  const messages = plan ? data.messages[plan.id] ?? [] : [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [plan?.id, messages.length]);

  if (!plan) return <><PageHeading title="Messages" description="Chat opens once a plan is confirmed." /><EmptyState title="No conversations yet" description="Join a plan or create one to start coordinating." action="Explore plans" onAction={() => navigate('explore')} /></>;

  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    sendMessage(plan.id, draft);
    setDraft('');
  }

  const checked = data.checkins.includes(plan.id);
  const done = data.completed.includes(plan.id);
  return <><PageHeading title="Messages" description="Make the details easy before you meet." />
    <div className="chat-layout"><Panel className="chat-list">{available.map((item) => <button key={item.id} type="button" className={`chat-choice ${plan.id === item.id ? 'active' : ''}`} onClick={() => openChat(item.id)}><strong>{item.title}</strong><span>{item.date} · {item.time}</span></button>)}</Panel>
      <Panel className="chat-panel"><div className="chat-header"><strong>{plan.title}</strong><small>{plan.venue} · {plan.date} at {plan.time}</small></div><div className="messages" aria-live="polite"><div className="notice">Group chat is for plan details. Meet at the public venue and trust your judgement.</div>{messages.map((message, index) => <div className={`bubble ${message.mine ? 'mine' : ''}`} key={`${index}-${message.time}`}>{message.text}<small>{message.time}</small></div>)}<div ref={endRef} /></div><form className="chat-compose" onSubmit={submit}><Input aria-label="Message" required maxLength={500} placeholder="Ask about the meeting point…" value={draft} onChange={(event) => setDraft(event.target.value)} /><ActionButton type="submit">Send</ActionButton></form></Panel>
    </div>
    <div className="chat-after"><Panel><h2>On the day</h2><p className="small muted">Confirm when you reach the meeting point. Afterward, mark the plan complete.</p><div className="chat-actions"><ActionButton type="button" tone="secondary" disabled={checked} onClick={() => checkIn(plan.id)}><Check aria-hidden="true" /> {checked ? 'Checked in' : 'I’m here'}</ActionButton><ActionButton type="button" tone="secondary" disabled={done} onClick={() => complete(plan.id)}>{done ? 'Plan completed' : 'Mark completed'}</ActionButton><ReportForm planId={plan.id} /></div></Panel></div>
  </>;
}
