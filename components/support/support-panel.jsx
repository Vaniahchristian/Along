'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LifeBuoy, SendHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import {
  loadMySupportThread,
  markSupportThreadRead,
  sendSupportMessage
} from '@/lib/along';

function stamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-UG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function SupportPanel({ open, onClose, viewer }) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!viewer?.id) return;
    setLoading(true);
    try {
      const result = await loadMySupportThread(viewer.id);
      setThread(result.thread);
      setMessages(result.messages);
      if (result.thread) await markSupportThreadRead(viewer.id, result.thread.id);
    } catch (error) {
      toast.error(error.message || 'Could not load support chat.');
    } finally {
      setLoading(false);
    }
  }, [viewer?.id]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !thread?.id || !viewer?.id) return;
    const channel = supabase
      .channel(`support-thread-${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `thread_id=eq.${thread.id}`
        },
        (payload) => {
          const row = payload.new;
          if (!row?.id) return;
          setMessages((current) =>
            current.some((item) => item.id === row.id) ? current : [...current, row]
          );
          if (row.sender_role === 'admin') {
            markSupportThreadRead(viewer.id, thread.id).catch(() => {});
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, thread?.id, viewer?.id]);

  useEffect(() => {
    const region = scrollRef.current;
    if (region) region.scrollTop = region.scrollHeight;
  }, [messages.length, open]);

  async function submit(event) {
    event.preventDefault();
    if (!draft.trim() || sending || !viewer?.id) return;
    setSending(true);
    try {
      const result = await sendSupportMessage(viewer.id, draft);
      setThread(result.thread);
      setMessages((current) =>
        current.some((item) => item.id === result.message.id)
          ? current
          : [...current, result.message]
      );
      setDraft('');
    } catch (error) {
      toast.error(error.message || 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[60] flex justify-end bg-forest/45'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='support-panel-title'
        className='flex h-full w-full max-w-md flex-col bg-card shadow-2xl'
      >
        <header className='flex shrink-0 items-center gap-3 border-b border-border px-4 py-4'>
          <span className='grid size-10 place-items-center rounded-full bg-soft-green text-primary'>
            <LifeBuoy className='size-5' />
          </span>
          <div className='min-w-0 flex-1'>
            <h2 id='support-panel-title' className='font-heading text-lg font-extrabold'>
              Support
            </h2>
            <p className='text-xs text-muted-foreground'>
              Message the Tagwimi team. We usually reply within a day.
            </p>
          </div>
          <button
            type='button'
            aria-label='Close support'
            onClick={onClose}
            className='grid size-10 place-items-center rounded-full hover:bg-secondary'
          >
            <X className='size-5' />
          </button>
        </header>

        <div ref={scrollRef} className='min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8faf7] px-4 py-4'>
          {loading && <p className='text-center text-sm text-muted-foreground'>Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className='mx-auto mt-10 max-w-xs text-center text-sm text-muted-foreground'>
              Ask about your account, a plan, or anything that’s blocking you. An admin will reply here.
            </p>
          )}
          {messages.map((message) => {
            const mine = message.sender_role === 'member';
            return (
              <div
                key={message.id}
                className={`flex max-w-[88%] flex-col gap-1 ${mine ? 'ml-auto items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    mine ? 'bg-primary text-white' : 'bg-white text-foreground shadow-sm'
                  }`}
                >
                  {message.body}
                </div>
                <time className='px-1 text-[11px] text-muted-foreground' dateTime={message.created_at}>
                  {mine ? 'You' : 'Tagwimi'} · {stamp(message.created_at)}
                </time>
              </div>
            );
          })}
        </div>

        <form onSubmit={submit} className='shrink-0 border-t border-border bg-card p-3'>
          {thread?.status === 'resolved' && (
            <p className='mb-2 rounded-xl bg-soft-green px-3 py-2 text-xs text-forest'>
              This conversation was marked resolved. Sending a new message reopens it.
            </p>
          )}
          <div className='flex items-end gap-2'>
            <label className='sr-only' htmlFor='support-draft'>
              Message support
            </label>
            <textarea
              id='support-draft'
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
              rows={2}
              maxLength={2000}
              placeholder='How can we help?'
              className='min-h-11 flex-1 resize-none rounded-xl border border-border bg-[#f8faf7] px-3 py-2.5 text-sm outline-none focus:border-primary'
            />
            <button
              type='submit'
              disabled={sending || !draft.trim()}
              className='grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-50'
              aria-label='Send support message'
            >
              <SendHorizontal className='size-5' />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
