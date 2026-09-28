'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, MoreVertical, SendHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAlong } from './context';
import { ActionButton, EmptyState, PageHeading, Panel, PersonAvatar, ReportForm } from './shared';

export function ChatScreen() {
  const { data, chatId, chatViewOpen, setChatViewOpen, openChat, openPlan, navigate, sendMessage, checkIn, complete } = useAlong();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const available = data.plans.filter((item) => data.joined.includes(item.id) || item.host === 'You');
  const plan = available.find((item) => item.id === chatId) ?? available[0];
  const messages = plan ? data.messages[plan.id] ?? [] : [];

  useEffect(() => { if (chatViewOpen) endRef.current?.scrollIntoView({ block: 'end' }); }, [chatViewOpen, plan?.id, messages.length]);

  if (!plan) return <><PageHeading title="Messages" description="Chat opens once a plan is confirmed." /><EmptyState title="No conversations yet" description="Join a plan or create one to start coordinating." action="Explore plans" onAction={() => navigate('explore')} /></>;

  async function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const result = await sendMessage(plan.id, draft);
    if (result?.ok) setDraft('');
  }

  const checked = data.checkins.includes(plan.id);
  const done = data.completed.includes(plan.id);

  return <>
    <div className={chatViewOpen ? 'max-[760px]:hidden' : ''}><PageHeading title="Messages" description="Make the details easy before you meet." /></div>
    <div className={`grid min-h-[570px] grid-cols-[280px_minmax(0,1fr)] gap-4 max-[760px]:block max-[760px]:min-h-0 ${chatViewOpen ? 'max-[760px]:h-dvh' : ''}`}>
      <Panel className={`content-start p-3 max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:bg-transparent max-[760px]:p-0 ${chatViewOpen ? 'max-[760px]:hidden' : ''}`}>
        <p className="hidden px-1 pb-3 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground max-[760px]:block">Your conversations</p>
        {available.map((item) => {
          const lastMessage = data.messages[item.id]?.at(-1);
          return <button key={item.id} type="button" className={`w-full rounded-xl p-3 text-left transition-colors hover:bg-secondary max-[760px]:flex max-[760px]:min-h-20 max-[760px]:items-center max-[760px]:gap-3 max-[760px]:rounded-none max-[760px]:border-b max-[760px]:border-border max-[760px]:px-1 ${plan.id === item.id ? 'bg-secondary max-[760px]:bg-transparent' : ''}`} onClick={() => openChat(item.id)}>
            <span className="hidden max-[760px]:block"><PersonAvatar initials={item.initials} name={item.host} tone={item.tone} large /></span>
            <span className="block min-w-0 flex-1"><strong className="block truncate text-[13px] font-extrabold max-[760px]:text-sm">{item.title}</strong><span className="mt-1 block text-xs text-muted-foreground max-[760px]:hidden">{item.date} · {item.time}</span><span className="mt-1 hidden truncate text-xs text-muted-foreground max-[760px]:block">{lastMessage ? `${lastMessage.mine ? 'You' : lastMessage.senderName}: ${lastMessage.text}` : `${item.date} · ${item.time}`}</span></span>
          </button>;
        })}
      </Panel>

      <Panel className={`flex min-h-[570px] flex-col overflow-hidden p-0 max-[760px]:h-dvh max-[760px]:min-h-0 max-[760px]:overflow-visible max-[760px]:rounded-none max-[760px]:border-0 ${chatViewOpen ? '' : 'max-[760px]:hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border px-6 py-5 max-[760px]:min-h-16 max-[760px]:px-3 max-[760px]:py-2">
          <button type="button" onClick={() => setChatViewOpen(false)} aria-label="Back to conversations" className="hidden size-10 shrink-0 place-items-center rounded-full text-forest hover:bg-secondary max-[760px]:grid"><ArrowLeft className="size-5" /></button>
          <span className="hidden max-[760px]:block"><PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} small /></span>
          <div className="min-w-0"><strong className="block truncate text-sm font-extrabold sm:text-base">{plan.title}</strong><small className="block truncate text-muted-foreground max-[760px]:text-[11px]">{plan.venue} · {plan.date} at {plan.time}</small></div>
          <details className="relative ml-auto hidden shrink-0 max-[760px]:block"><summary aria-label="Conversation actions" className="grid size-10 cursor-pointer list-none place-items-center rounded-full text-forest hover:bg-secondary [&::-webkit-details-marker]:hidden"><MoreVertical className="size-5" /></summary><div className="absolute right-0 top-11 z-20 grid max-h-[70dvh] w-[min(85vw,320px)] gap-2 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl"><button type="button" onClick={() => openPlan(plan.id)} className="rounded-xl px-3 py-2 text-left text-sm font-bold text-primary hover:bg-secondary">View plan details</button><button type="button" disabled={checked} onClick={() => checkIn(plan.id)} className="rounded-xl px-3 py-2 text-left text-sm font-bold text-forest hover:bg-secondary disabled:opacity-50">{checked ? 'Checked in' : 'I’m here'}</button><button type="button" disabled={done} onClick={() => complete(plan.id)} className="rounded-xl px-3 py-2 text-left text-sm font-bold text-forest hover:bg-secondary disabled:opacity-50">{done ? 'Plan completed' : 'Mark completed'}</button><ReportForm planId={plan.id} /></div></details>
        </div>
        <div className="flex min-h-[320px] flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#f7f9f4] p-6 max-[760px]:min-h-0 max-[760px]:px-3 max-[760px]:py-4" aria-live="polite">
          <div className="mb-1 rounded-xl bg-soft-green p-3 text-[13px] text-forest">Group chat is for plan details. Meet at the public venue and trust your judgement.</div>
          {messages.map((message) => <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[75%] ${message.mine ? 'self-end' : 'self-start'}`} key={message.id}>
            {!message.mine && <PersonAvatar initials={message.senderInitials} name={message.senderName} tone={message.senderTone} small />}
            <div className={`min-w-0 rounded-[14px] px-3.5 py-3 text-[13px] shadow-sm ${message.mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-white text-forest'}`}>
              <div className={`mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold ${message.mine ? 'text-white/80' : 'text-primary'}`}><span>{message.mine ? 'You' : message.senderName}</span>{message.senderId === plan.hostId && <span className="rounded-full bg-amber/25 px-1.5 py-0.5 text-[9px] text-inherit">Host</span>}</div>
              <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
              <time dateTime={message.createdAt} className="mt-1 block text-right text-[10px] opacity-70">{message.time}</time>
            </div>
          </div>)}
          <div ref={endRef} />
        </div>
        <form className="flex shrink-0 gap-2 border-t border-border bg-card p-3.5 max-[760px]:px-3 max-[760px]:pt-2 max-[760px]:pb-[calc(.75rem+env(safe-area-inset-bottom))]" onSubmit={submit}>
          <Input className="h-11 min-w-0 flex-1 rounded-full border-border bg-background px-4" aria-label="Message" required maxLength={500} placeholder="Message the group" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <ActionButton type="submit" className="max-[760px]:size-11 max-[760px]:rounded-full max-[760px]:px-0"><SendHorizontal aria-hidden="true" /><span className="max-[760px]:sr-only">Send</span></ActionButton>
        </form>
      </Panel>
    </div>
    <div className="mt-4 max-[760px]:hidden"><Panel><h2 className="mb-3 font-heading text-lg font-extrabold">On the day</h2><p className="mb-4 text-xs text-muted-foreground">Confirm when you reach the meeting point. Afterward, mark the plan complete.</p><div className="flex flex-wrap items-center gap-2"><ActionButton type="button" tone="secondary" disabled={checked} onClick={() => checkIn(plan.id)}><Check aria-hidden="true" /> {checked ? 'Checked in' : 'I’m here'}</ActionButton><ActionButton type="button" tone="secondary" disabled={done} onClick={() => complete(plan.id)}>{done ? 'Plan completed' : 'Mark completed'}</ActionButton><ReportForm planId={plan.id} /></div></Panel></div>
  </>;
}
