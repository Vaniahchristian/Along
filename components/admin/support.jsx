'use client';

import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, LoaderCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadAdminSupportThread,
  loadAdminSupportThreads,
  replyAdminSupport,
  setAdminSupportStatus
} from '@/lib/admin/api';

const field =
  'min-h-11 w-full rounded-xl border border-[#d7e3d8] bg-white px-3 text-sm outline-none focus:border-[#3b793f]';
const card =
  'rounded-[22px] border border-[#dde8df] bg-white shadow-[0_7px_30px_rgba(15,34,24,.035)]';

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

export function SupportInbox() {
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const result = await loadAdminSupportThreads();
      setThreads(result.threads || []);
      setSelectedId((current) => {
        if (current && (result.threads || []).some((row) => row.id === current)) return current;
        return result.threads?.[0]?.id || null;
      });
    } catch (error) {
      toast.error(error.message || 'Could not load support conversations.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const openThread = useCallback(async (id) => {
    if (!id) {
      setThread(null);
      setMessages([]);
      return;
    }
    setLoadingThread(true);
    try {
      const result = await loadAdminSupportThread(id);
      setThread(result.thread);
      setMessages(result.messages || []);
      setThreads((current) =>
        current.map((row) => (row.id === id ? { ...row, unread: false, status: result.thread.status } : row))
      );
    } catch (error) {
      toast.error(error.message || 'Could not load this conversation.');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    openThread(selectedId);
  }, [selectedId, openThread]);

  async function send(event) {
    event.preventDefault();
    if (!selectedId || !draft.trim() || busy) return;
    setBusy(true);
    try {
      const message = await replyAdminSupport(selectedId, draft);
      setMessages((current) => [...current, message]);
      setDraft('');
      setThreads((current) =>
        current
          .map((row) =>
            row.id === selectedId
              ? {
                  ...row,
                  status: 'open',
                  last_message_at: message.created_at,
                  preview: message,
                  unread: false
                }
              : row
          )
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
            return new Date(b.last_message_at) - new Date(a.last_message_at);
          })
      );
      setThread((current) => (current ? { ...current, status: 'open' } : current));
      toast.success('Reply sent.');
    } catch (error) {
      toast.error(error.message || 'Could not send this reply.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!selectedId || !thread || busy) return;
    const action = thread.status === 'open' ? 'resolve' : 'reopen';
    setBusy(true);
    try {
      const updated = await setAdminSupportStatus(selectedId, action);
      setThread((current) => (current ? { ...current, status: updated.status } : current));
      setThreads((current) =>
        current.map((row) => (row.id === selectedId ? { ...row, status: updated.status } : row))
      );
      toast.success(action === 'resolve' ? 'Marked resolved.' : 'Conversation reopened.');
    } catch (error) {
      toast.error(error.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className='grid gap-5'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2 text-[#286c3c]'>
            <LifeBuoy className='size-5' />
            <h2 className='font-heading text-xl font-extrabold text-[#10251a]'>Support inbox</h2>
          </div>
          <p className='mt-1 text-sm text-[#617463]'>
            One conversation per member. Reply here and they see it in the app.
          </p>
        </div>
        <button
          type='button'
          onClick={refreshList}
          className='min-h-10 rounded-xl border border-[#d7e3d8] bg-white px-4 text-sm font-bold'
        >
          Refresh
        </button>
      </div>

      <div className={`grid min-h-[420px] overflow-hidden lg:min-h-[560px] lg:grid-cols-[320px_minmax(0,1fr)] ${card}`}>
        <aside className='border-b border-[#edf1ed] lg:border-b-0 lg:border-r'>
          <div className='border-b border-[#edf1ed] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#728473]'>
            Conversations
          </div>
          {loadingList ? (
            <p className='flex items-center gap-2 p-5 text-sm text-[#617463]'>
              <LoaderCircle className='size-4 animate-spin' /> Loading…
            </p>
          ) : threads.length === 0 ? (
            <p className='p-5 text-sm text-[#617463]'>No support messages yet.</p>
          ) : (
            <div className='max-h-[280px] overflow-y-auto lg:max-h-[560px]'>
              {threads.map((row) => {
                const active = row.id === selectedId;
                return (
                  <button
                    key={row.id}
                    type='button'
                    onClick={() => setSelectedId(row.id)}
                    className={`flex w-full flex-col gap-1 border-b border-[#f0f4f0] px-4 py-3 text-left ${
                      active ? 'bg-[#eef6ee]' : 'hover:bg-[#f7faf6]'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      <strong className='min-w-0 flex-1 truncate text-sm'>
                        {row.member?.display_name || 'Member'}
                      </strong>
                      {row.unread && (
                        <span className='size-2 shrink-0 rounded-full bg-[#ec4899]' aria-label='Unread' />
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.status === 'open'
                            ? 'bg-[#fff1c8] text-[#805800]'
                            : 'bg-[#edf1ee] text-[#526457]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <span className='truncate text-xs text-[#617463]'>
                      {row.preview
                        ? `${row.preview.sender_role === 'admin' ? 'You: ' : ''}${row.preview.body}`
                        : 'No messages yet'}
                    </span>
                    <time className='text-[11px] text-[#8a9b8d]' dateTime={row.last_message_at}>
                      {stamp(row.last_message_at)}
                    </time>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className='flex min-h-0 flex-col'>
          {!selectedId ? (
            <p className='m-auto p-8 text-sm text-[#617463]'>Select a conversation.</p>
          ) : loadingThread ? (
            <p className='m-auto flex items-center gap-2 p-8 text-sm text-[#617463]'>
              <LoaderCircle className='size-4 animate-spin' /> Loading conversation…
            </p>
          ) : (
            <>
              <header className='flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ed] px-5 py-4'>
                <div className='min-w-0'>
                  <strong className='block truncate'>{thread?.member?.display_name || 'Member'}</strong>
                  <span className='block truncate text-xs text-[#617463]'>
                    {thread?.member?.email || 'No email on file'}
                  </span>
                </div>
                <button
                  type='button'
                  disabled={busy}
                  onClick={toggleStatus}
                  className='min-h-10 rounded-xl border border-[#d7e3d8] px-4 text-sm font-bold disabled:opacity-50'
                >
                  {thread?.status === 'open' ? 'Mark resolved' : 'Reopen'}
                </button>
              </header>
              <div className='min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7faf6] px-5 py-4'>
                {messages.length === 0 && (
                  <p className='text-center text-sm text-[#617463]'>No messages in this thread.</p>
                )}
                {messages.map((message) => {
                  const mine = message.sender_role === 'admin';
                  return (
                    <div
                      key={message.id}
                      className={`flex max-w-[85%] flex-col gap-1 ${mine ? 'ml-auto items-end' : 'items-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          mine ? 'bg-[#256739] text-white' : 'bg-white text-[#10251a] shadow-sm'
                        }`}
                      >
                        {message.body}
                      </div>
                      <time className='text-[11px] text-[#8a9b8d]' dateTime={message.created_at}>
                        {mine ? 'You' : thread?.member?.display_name || 'Member'} · {stamp(message.created_at)}
                      </time>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={send} className='border-t border-[#edf1ed] p-4'>
                <label className='sr-only' htmlFor='admin-support-reply'>
                  Reply
                </label>
                <textarea
                  id='admin-support-reply'
                  className={`${field} min-h-24 py-3`}
                  value={draft}
                  maxLength={2000}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder='Write a reply…'
                />
                <div className='mt-3 flex justify-end'>
                  <button
                    type='submit'
                    disabled={busy || !draft.trim()}
                    className='flex min-h-11 items-center gap-2 rounded-xl bg-[#256739] px-4 text-sm font-bold text-white disabled:opacity-50'
                  >
                    <Send className='size-4' /> Send reply
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
