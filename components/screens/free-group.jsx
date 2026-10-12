'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useAlongSession } from '@/components/providers/along';
import { ActionButton, EmptyState, PageHeading, Panel, PersonAvatar } from '@/components/layout/shared';
import { Skeleton } from '@/components/layout/app-skeleton';
import { loadGroupMessages, loadMyGroups, sendGroupMessage } from '@/lib/along/im-free';

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function FreeGroupScreen() {
  const params = useParams();
  const groupId = params?.id || null;
  const { viewer, hydrated } = useAlongSession();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    if (!viewer?.id || !groupId) return;
    setLoading(true);
    setLoadError('');
    try {
      const rows = await loadMyGroups();
      const found = rows.find((row) => row.id === groupId) || null;
      if (!found) {
        setGroup(null);
        setMessages([]);
        setLoadError('This group is unavailable. You may no longer be a member.');
        return;
      }
      setGroup(found);
      setMessages(await loadGroupMessages(viewer.id, groupId));
    } catch (error) {
      setLoadError(error.message || 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [viewer?.id, groupId]);

  useEffect(() => {
    if (hydrated && viewer && groupId) load();
    if (hydrated && !viewer) setLoading(false);
  }, [hydrated, viewer, groupId, load]);

  useEffect(() => {
    const region = scrollRef.current;
    if (region) region.scrollTop = region.scrollHeight;
  }, [messages.length, group?.id]);

  // Same offline-detection pattern as chat.jsx: proactive banner + disabled
  // send while offline. No message queuing — wording must not promise it.
  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || offline || !groupId) return;
    setSending(true);
    try {
      await sendGroupMessage(groupId, text);
      setDraft('');
      setMessages(await loadGroupMessages(viewer.id, groupId));
    } catch (error) {
      toast.error(error.message || 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <section className='mx-auto max-w-3xl pb-10' aria-busy='true' aria-live='polite'>
        <span className='sr-only'>Loading this conversation…</span>
        <Skeleton className='mb-3 h-4 w-28' />
        <Skeleton className='mb-3 h-12 w-64 max-w-full' />
        <Skeleton className='h-72 w-full' />
      </section>
    );
  }

  if (!viewer) {
    return (
      <section className='mx-auto max-w-3xl pb-10'>
        <PageHeading title='Group chat' description='Sign in to open your group conversation.' />
        <Panel>
          <EmptyState tone='soft' title='Sign in required.' description='Your groups appear after you sign in.' />
          <Link href='/app/free' className='mt-4 inline-block font-bold text-primary underline'>Back to I’m Free</Link>
        </Panel>
      </section>
    );
  }

  return (
    <section className='mx-auto max-w-3xl pb-10'>
      <Link href='/app/free' className='mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline'>
        <ArrowLeft className='size-4' aria-hidden='true' /> Back to I’m Free
      </Link>
      <PageHeading title={group ? group.sharedInterest : 'Group chat'} description={group ? `${group.memberCount} of ${group.maxSize} members` : 'Your group conversation.'} />
      {loadError ? (
        <Panel>
          <div role='alert' className='rounded-xl border border-[#f4c5d8] bg-[#fff2f7] p-4 text-sm text-[#9f2849]'>{loadError}</div>
          <div className='mt-4 flex flex-wrap gap-2'>
            <ActionButton type='button' onClick={load}>Try again</ActionButton>
          </div>
        </Panel>
      ) : (
        <Panel className='overflow-hidden p-0'>
          <div ref={scrollRef} role='log' aria-live='polite' aria-label='Group messages' className='max-h-[55vh] min-h-64 overflow-y-auto p-4 sm:p-6'>
            {messages.length ? (
              <ul className='grid gap-3'>
                {messages.map((message) => (
                  <li key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] items-end gap-2 ${message.mine ? 'flex-row-reverse' : ''}`}>
                      {!message.mine && <PersonAvatar small initials={message.senderInitials} name={message.senderName} tone={message.senderTone} />}
                      <div className={`rounded-2xl px-3 py-2.5 text-[13px] ${message.mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-border bg-white text-forest'}`}>
                        {!message.mine && <p className='mb-0.5 text-[11px] font-extrabold opacity-70'>{message.senderName}</p>}
                        <p className='whitespace-pre-wrap break-words leading-relaxed'>{message.text}</p>
                        <time dateTime={message.createdAt} className='mt-1 block text-right text-[10px] opacity-65'>{shortTime(message.createdAt)}</time>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState tone='soft' title='No messages yet.' description='Say hello — your first message starts the conversation.' />
            )}
          </div>
          {offline && (
            <p
              role='status'
              className='border-b border-[#f3c1d3] bg-[#fff2f7] px-4 py-2 text-center text-xs font-bold text-[#9f2849]'
            >
              You’re offline. Sending is disabled until you’re back online.
            </p>
          )}
          <form onSubmit={submit} className='border-t border-border bg-card px-4 py-3'>
            <div className='flex items-end gap-2'>
              <label htmlFor='free-group-draft' className='sr-only'>Message the group</label>
              <textarea
                id='free-group-draft'
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={500}
                placeholder='Message the group…'
                aria-label='Message the group'
                className='min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-[22px] border border-border bg-[#f8faf7] px-4 py-2.5 leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20'
              />
              <ActionButton type='submit' disabled={sending || offline || !draft.trim()} className='size-11 shrink-0 rounded-full bg-pink px-0 hover:bg-[#c82270]'>
                <SendHorizontal aria-hidden='true' />
                <span className='sr-only'>{sending ? 'Sending…' : 'Send message'}</span>
              </ActionButton>
            </div>
            <p className='mt-1.5 text-right text-[11px] text-muted-foreground'>{draft.trim().length}/500</p>
          </form>
        </Panel>
      )}
    </section>
  );
}
