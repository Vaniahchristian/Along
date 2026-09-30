'use client';

import { useEffect, useState } from 'react';
import { Mail, Megaphone, Search, Send, Users, X } from 'lucide-react';
import { toast } from 'sonner';

const input = 'min-h-11 w-full rounded-xl border border-[#d7e3d8] bg-white px-3 text-sm outline-none focus:border-[#3b793f]';

export function Broadcasts({ onSent }) {
  const [audience, setAudience] = useState('individual');
  const [channel, setChannel] = useState('notification');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [emailEligibleCount, setEmailEligibleCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/broadcasts?q=${encodeURIComponent(query)}`, {
          cache: 'no-store', signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load recipients.');
        setMembers(result.members);
        setEligibleCount(result.eligibleCount);
        setEmailEligibleCount(result.emailEligibleCount);
      } catch (error) {
        if (error.name !== 'AbortError') toast.error(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const recipientCount = audience === 'all' ?
    (channel === 'email' ? emailEligibleCount : eligibleCount) :
    (selected && (channel !== 'email' || selected.email?.trim()) ? 1 : 0);
  const queuedEmails = audience === 'all' ? emailEligibleCount : selected?.email?.trim() ? 1 : 0;
  const canPreview = title.trim() && message.trim() && recipientCount > 0;
  async function send() {
    if (!canPreview || sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, recipientId: audience === 'individual' ? selected.id : null,
          channel, title: title.trim(), message: message.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send broadcast.');
      toast.success(`Sent to ${result.recipientCount} ${result.recipientCount === 1 ? 'member' : 'members'}${result.emailCount ? `; ${result.emailCount} email${result.emailCount === 1 ? '' : 's'} queued` : ''}.`);
      setPreview(false); setTitle(''); setMessage(''); setSelected(null); setQuery('');
      onSent?.();
    } catch (error) {
      toast.error(error.message);
    } finally { setSending(false); }
  }

  return <section className='max-w-5xl'>
    <div className='mb-6'>
      <p className='text-xs font-extrabold uppercase tracking-[.16em] text-[#b43075]'>Community updates</p>
      <h1 className='mt-1 font-heading text-3xl font-extrabold tracking-tight'>Broadcasts</h1>
      <p className='mt-2 text-sm text-[#586e5e]'>Send an announcement to one member or everyone on Tagwimi.</p>
    </div>
    <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.75fr)]'>
      <div className='rounded-[22px] border border-[#dde8df] bg-white p-5 shadow-sm sm:p-6'>
        <h2 className='font-heading text-lg font-extrabold'>Compose</h2>
        <fieldset className='mt-5'>
          <legend className='mb-2 text-sm font-bold'>Recipients</legend>
          <div className='grid grid-cols-2 gap-2'>
            {[["individual", 'One member'], ['all', 'All members']].map(([value, label]) =>
              <button key={value} type='button' onClick={() => { setAudience(value); setPreview(false); }}
                aria-pressed={audience === value}
                className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${audience === value ? 'border-[#2c7542] bg-[#e8f4e8] text-[#245e38]' : 'border-[#d7e3d8]'}`}>{label}</button>)}
          </div>
        </fieldset>
        {audience === 'individual' ? <div className='mt-4'>
          <label htmlFor='broadcast-search' className='mb-2 block text-sm font-bold'>Find a member</label>
          {selected ? <div className='flex items-center justify-between gap-3 rounded-xl border border-[#d7e3d8] bg-[#f5faf4] p-3 text-sm'>
            <span className='min-w-0'><strong className='block truncate'>{selected.display_name}</strong><span className='block truncate text-[#607362]'>{selected.email}</span></span>
            <button type='button' aria-label='Remove recipient' onClick={() => setSelected(null)}><X className='size-5' /></button>
          </div> : <>
            <div className='relative'><Search className='pointer-events-none absolute left-3 top-3 size-5 text-[#6f8171]' />
              <input id='broadcast-search' className={`${input} pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search name or email' /></div>
            <div className='mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#dce7dd]' aria-busy={loading}>
              {members.map((member) => <button key={member.id} type='button' onClick={() => setSelected(member)}
                className='block w-full border-b border-[#edf1ed] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#f2f8f1]'>
                <strong className='block'>{member.display_name}</strong><span className='text-[#607362]'>{member.email}</span>
              </button>)}
              {!loading && !members.length && <p className='p-3 text-sm text-[#607362]'>No matching members.</p>}
            </div>
          </>}
        </div> : <p className='mt-4 flex items-center gap-2 rounded-xl bg-[#f2f8f1] p-3 text-sm'>
          <Users className='size-4 text-[#287b42]' /> {recipientCount} eligible members{channel === 'both' ? `; ${emailEligibleCount} have email addresses` : ''}. Demo, suspended, and unlinked accounts are excluded.
        </p>}
        <fieldset className='mt-5'>
          <legend className='mb-2 text-sm font-bold'>Delivery</legend>
          <div className='grid gap-2 sm:grid-cols-3'>
            {[["notification", 'In app'], ['email', 'Email'], ['both', 'Both']].map(([value, label]) =>
              <button key={value} type='button' onClick={() => { setChannel(value); setPreview(false); }}
                aria-pressed={channel === value}
                className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${channel === value ? 'border-[#2c7542] bg-[#e8f4e8] text-[#245e38]' : 'border-[#d7e3d8]'}`}>{label}</button>)}
          </div>
        </fieldset>
        <label htmlFor='broadcast-title' className='mt-5 mb-2 block text-sm font-bold'>Title</label>
        <input id='broadcast-title' className={input} maxLength={120} value={title} onChange={(event) => { setTitle(event.target.value); setPreview(false); }} placeholder='A short, clear headline' />
        <label htmlFor='broadcast-message' className='mt-5 mb-2 block text-sm font-bold'>Message</label>
        <textarea id='broadcast-message' className={`${input} min-h-36 py-3`} maxLength={2000} value={message} onChange={(event) => { setMessage(event.target.value); setPreview(false); }} placeholder='What should members know?' />
        <p className='mt-1 text-right text-xs text-[#748475]'>{message.length}/2000</p>
        <button type='button' disabled={!canPreview} onClick={() => setPreview(true)}
          className='mt-4 min-h-11 rounded-xl bg-[#286c3c] px-5 text-sm font-bold text-white disabled:opacity-50'>Preview broadcast</button>
      </div>
      <div className='space-y-4'>
        <div className='rounded-[22px] border border-[#dde8df] bg-white p-5 sm:p-6'>
          <div className='flex items-center gap-2 text-[#286c3c]'><Megaphone className='size-5' /><h2 className='font-heading text-lg font-extrabold text-[#10251a]'>Message preview</h2></div>
          <p className='mt-5 text-xs font-bold uppercase tracking-wider text-[#728473]'>From Tagwimi</p>
          <h3 className='mt-2 break-words font-heading text-xl font-extrabold'>{title.trim() || 'Your headline'}</h3>
          <p className='mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#506653]'>{message.trim() || 'Your message will appear here.'}</p>
          <div className='mt-5 flex items-center gap-2 border-t border-[#edf1ed] pt-4 text-sm text-[#607362]'>
            {channel === 'notification' ? <Megaphone className='size-4' /> : <Mail className='size-4' />}
            {channel === 'notification' ? 'In-app notification' : channel === 'email' ? 'Email, queued for delivery' : 'In-app notification and queued email'}
          </div>
        </div>
        <p className='rounded-xl bg-[#fff3d8] p-4 text-sm text-[#795515]'>Use broadcasts for essential Tagwimi updates. Newsletters and activity recommendations require opt-in.</p>
      </div>
    </div>
    {preview && <div className='fixed inset-0 z-50 grid place-items-center bg-[#0b2118]/60 p-4' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(false); }}>
      <div role='dialog' aria-modal='true' aria-labelledby='broadcast-confirm-title' className='w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl'>
        <div className='flex items-start justify-between gap-4'><h2 id='broadcast-confirm-title' className='font-heading text-xl font-extrabold'>Send this broadcast?</h2>
          <button type='button' aria-label='Close' onClick={() => setPreview(false)}><X className='size-5' /></button></div>
        <p className='mt-3 text-sm text-[#506653]'>To {audience === 'all' ? `all ${recipientCount} eligible members` : selected?.display_name}. {channel === 'both' ? `${queuedEmails} email${queuedEmails === 1 ? '' : 's'} queued; in-app notification now.` : channel === 'email' ? 'Email queued for delivery.' : 'In-app notification now.'}</p>
        <div className='mt-4 rounded-xl bg-[#f2f8f1] p-4'><strong className='break-words'>{title.trim()}</strong><p className='mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm'>{message.trim()}</p></div>
        <div className='mt-5 flex justify-end gap-2'><button type='button' onClick={() => setPreview(false)} className='min-h-11 rounded-xl px-4 text-sm font-bold'>Cancel</button>
          <button type='button' disabled={sending} onClick={send} className='flex min-h-11 items-center gap-2 rounded-xl bg-[#286c3c] px-4 text-sm font-bold text-white disabled:opacity-50'><Send className='size-4' />{sending ? 'Sending…' : 'Send broadcast'}</button></div>
      </div>
    </div>}
  </section>;
}
