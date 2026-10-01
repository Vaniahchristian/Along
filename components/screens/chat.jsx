'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MoreVertical,
  Mic,
  Paperclip,
  Search,
  SendHorizontal,
  Smile,
  Square,
  Trash2,
  X,
  UsersRound
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { planImage } from '@/lib/media/activity-image';
import { useAlongSession, useAlongChat } from '@/components/providers/along';
import { ActionButton, EmptyState, PersonAvatar, ReportForm } from '@/components/layout/shared';
import { EmojiPicker } from './emoji-picker';

function shortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - date.getTime() < 7 * 86400000)
    return date.toLocaleDateString('en-UG', { weekday: 'short' });
  return date.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

function PlanThumbnail({ plan, size = 'size-14' }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-xl bg-soft-green ${size}`}>
      <Image src={planImage(plan)} alt='' fill sizes='56px' className='object-cover' />
    </span>
  );
}

export function ChatScreen() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id || null;
  const chatViewOpen = Boolean(chatId);
  const { notifications, viewer, openChat, openPlan, navigate } = useAlongSession();
  const { data, sendMessage, sendMedia, refreshPlanMessages, subscribePlanMessages, dismissFailedMessage, checkIn, complete, deleteConversation } = useAlongChat();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const addEmoji = useRef((emoji) => setDraft((value) => value.length + emoji.length <= 500 ? value + emoji : value));
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const composerRef = useRef(null);
  const scrollRef = useRef(null);
  const memberships = data.plans.filter(
    (item) => data.joined.includes(item.id) || item.host === 'You'
  );
  const available = memberships.filter((item) => !(data.hiddenChats || []).includes(item.id));
  const filtered = available.filter((item) =>
    `${item.title} ${item.venue}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const plan = chatId
    ? memberships.find((item) => item.id === chatId) || null
    : available[0] || null;
  const messages = plan ? (data.messages[plan.id] ?? []) : [];
  const checked = plan && data.checkins.includes(plan.id);
  const done = plan && (data.completed.includes(plan.id) || plan.status !== 'open');
  const members = plan ? Math.max(1, Number(plan.size || 0) - Number(plan.spots || 0)) : 0;

  useEffect(() => {
    if (chatViewOpen || (typeof window !== 'undefined' && window.innerWidth > 760)) {
      const region = scrollRef.current;
      if (region) region.scrollTop = region.scrollHeight;
    }
  }, [chatViewOpen, plan?.id, messages.length]);

  useEffect(() => {
    if (!plan?.id || !viewer?.id) return;
    refreshPlanMessages(plan.id).catch(() => {});
    return subscribePlanMessages(plan.id);
  }, [plan?.id, viewer?.id, refreshPlanMessages, subscribePlanMessages]);

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

  useEffect(() => {
    if (!attachment) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  useEffect(() => () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = '44px';
    composer.style.height = `${Math.min(composer.scrollHeight, 128)}px`;
  }, [draft]);

  function chooseFile(event) {
    const file = event.target.files?.[0];
    if (file) setAttachment(file);
    event.target.value = '';
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast.error('Voice recording is unavailable in this browser. You can attach an audio file instead.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) { stream.getTracks().forEach((track) => track.stop()); toast.error('This browser cannot record a supported audio format.'); return; }
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 });
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (chunks.length) setAttachment(new File(chunks, `voice-note.${mime === 'audio/mp4' ? 'm4a' : mime.split('/')[1]}`, { type: mime }));
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch { setRecording(false); toast.error('Microphone access was not granted. Check your browser permissions.'); }
  }

  function stopRecording() { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }

  async function submit(event) {
    event.preventDefault();
    if ((!draft.trim() && !attachment) || sending || !plan || recording) return;
    setSending(true);
    try {
      const result = attachment ? await sendMedia(plan.id, attachment, draft) : await sendMessage(plan.id, draft);
      if (result?.ok) { setDraft(''); setAttachment(null); setEmojiOpen(false); }
    } finally {
      setSending(false);
    }
  }

  if (!available.length)
    return (
      <div className='pt-2'>
        <h1 className='mb-5 font-heading text-2xl font-extrabold tracking-tight'>Messages</h1>
        <EmptyState
          title='No conversations yet'
          description='Join a plan or create one to start coordinating.'
          action='Explore plans'
          onAction={() => navigate('explore')}
        />
      </div>
    );

  return (
    <div
      className={`grid h-[min(760px,calc(100dvh-8rem))] min-h-[480px] grid-cols-[minmax(260px,300px)_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-border bg-card max-[1100px]:block max-[1100px]:h-auto max-[1100px]:min-h-0 max-[1100px]:overflow-visible max-[1100px]:rounded-none max-[1100px]:border-0 max-[760px]:min-h-0 ${chatViewOpen ? 'max-[1100px]:h-[calc(100dvh-2rem)] max-[760px]:h-dvh' : ''}`}
    >
      <section
        aria-label='Conversations'
        className={`min-h-0 overflow-y-auto border-r border-border px-3 py-5 max-[1100px]:overflow-visible max-[1100px]:border-0 max-[1100px]:px-0 max-[1100px]:py-4 ${chatViewOpen ? 'max-[1100px]:hidden' : ''}`}
      >
        <h1 className='px-2 font-heading text-2xl font-extrabold tracking-[-.03em]'>Messages</h1>
        <label className='relative mt-4 block'>
          <Search
            aria-hidden='true'
            className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          />
          <span className='sr-only'>Search conversations</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search conversations'
            className='h-10 rounded-full border-border bg-[#f8faf7] pl-9 text-sm'
          />
        </label>
        <div className='mt-3'>
          {filtered.length === 0 && (
            <p className='px-3 py-8 text-center text-sm text-muted-foreground'>
              No conversations match your search.
            </p>
          )}
          {filtered.map((item) => {
            const lastMessage =
              data.messages[item.id]?.at(-1) || data.messagePreviews?.[item.id] || null;
            const unread = notifications.filter(
              (notice) => notice.plan_id === item.id && notice.kind === 'message' && !notice.read_at
            ).length;
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => openChat(item.id)}
                className={`flex w-full items-center gap-3 border-b border-border/70 px-2 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary max-[1100px]:min-h-[78px] ${plan?.id === item.id ? 'bg-soft-green max-[1100px]:bg-transparent' : ''}`}
              >
                <PlanThumbnail plan={item} />
                <span className='min-w-0 flex-1'>
                  <strong className='block truncate text-[13px] font-bold leading-snug text-foreground'>
                    {item.title}
                  </strong>
                  <span className='mt-1 block truncate text-xs text-muted-foreground'>
                    {lastMessage
                      ? `${lastMessage.mine ? 'You' : lastMessage.senderName}: ${lastMessage.mediaType === 'image' ? 'Photo' : lastMessage.mediaType === 'audio' ? 'Voice note' : lastMessage.text}`
                      : 'No messages yet · Say hello'}
                  </span>
                </span>
                <span className='flex shrink-0 flex-col items-end gap-2 self-start pt-0.5'>
                  <time
                    className='text-[11px] text-muted-foreground'
                    dateTime={lastMessage?.createdAt}
                  >
                    {lastMessage ? shortTime(lastMessage.createdAt) : ''}
                  </time>
                  {unread > 0 && (
                    <span
                      className='grid min-w-5 h-5 place-items-center rounded-full bg-pink px-1 text-[10px] font-bold text-white'
                      aria-label={`${unread} unread messages`}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {plan ? (
        <section
          aria-label={`Chat for ${plan.title}`}
          className={`flex min-h-0 flex-col overflow-hidden max-[1100px]:h-[calc(100dvh-2rem)] max-[760px]:h-dvh max-[1100px]:bg-card ${chatViewOpen ? '' : 'max-[1100px]:hidden'}`}
        >
          <header className='flex shrink-0 items-center gap-3 border-b border-border px-5 py-3 max-[760px]:gap-2 max-[760px]:px-3 max-[760px]:pt-[max(.65rem,env(safe-area-inset-top))]'>
            <button
              type='button'
              onClick={() => router.push('/app/chat')}
              aria-label='Back to conversations'
              className='hidden size-10 shrink-0 place-items-center rounded-full text-forest hover:bg-secondary max-[1100px]:grid'
            >
              <ArrowLeft className='size-5' />
            </button>
            <PlanThumbnail plan={plan} size='size-11' />
            <div className='min-w-0 flex-1'>
              <strong className='block truncate text-sm font-extrabold text-foreground'>
                {plan.title}
              </strong>
              <span className='block text-[11px] text-muted-foreground'>
                {members} {members === 1 ? 'member' : 'members'}
              </span>
            </div>
            <button
              type='button'
              onClick={() => openPlan(plan.id)}
              className='shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-primary hover:bg-secondary'
            >
              View plan
            </button>
            <details className='relative shrink-0'>
              <summary
                aria-label='Conversation actions'
                className='grid size-9 cursor-pointer list-none place-items-center rounded-full text-forest hover:bg-secondary [&::-webkit-details-marker]:hidden'
              >
                <MoreVertical className='size-5' />
              </summary>
              <div className='absolute right-0 top-10 z-30 grid max-h-[70dvh] w-[min(85vw,310px)] gap-1 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl'>
                <button
                  type='button'
                  disabled={checked}
                  onClick={() => checkIn(plan.id)}
                  className='rounded-xl px-3 py-2 text-left text-sm font-bold text-forest hover:bg-secondary disabled:opacity-50'
                >
                  {checked ? 'Checked in' : 'I’m here'}
                </button>
                <button
                  type='button'
                  disabled={done || plan.status !== 'open'}
                  onClick={() => complete(plan.id)}
                  className='rounded-xl px-3 py-2 text-left text-sm font-bold text-forest hover:bg-secondary disabled:opacity-50'
                >
                  {done || plan.status !== 'open'
                    ? 'Plan completed'
                    : plan.hostId === viewer?.id
                      ? 'Mark completed · close plan'
                      : 'Mark completed'}
                </button>
                <ReportForm planId={plan.id} hasPhoto={Boolean(plan.imageUrl)} messages={messages} />
                <button
                  type='button'
                  onClick={() => setDeleteConfirm(true)}
                  className='mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-[#9f2849] hover:bg-[#fff0f4]'
                >
                  <Trash2 className='size-4' /> Delete conversation
                </button>
              </div>
            </details>
          </header>

          <div className='shrink-0 border-b border-border px-5 py-2.5 max-[760px]:px-3'>
            <div className='flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-soft-green px-3 py-2 text-xs text-forest'>
              <span className='inline-flex items-center gap-1.5 font-semibold'>
                <CalendarDays className='size-4 text-primary' />
                {plan.date} · {plan.time}
              </span>
              <span className='inline-flex min-w-0 items-center gap-1.5'>
                <MapPin className='size-4 shrink-0 text-primary' />
                <span className='truncate'>{plan.meet || plan.venue}</span>
              </span>
              <span className='inline-flex items-center gap-1.5'>
                <UsersRound className='size-4 text-primary' />
                {members} going
              </span>
            </div>
            {plan.meet && plan.meet !== plan.venue && (
              <p className='mt-1.5 truncate px-3 text-[11px] text-muted-foreground'>{plan.venue}</p>
            )}
            {plan.mapsUrl ? (
              <a
                href={plan.mapsUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='mt-1.5 inline-flex items-center gap-1.5 px-3 text-[11px] font-bold text-primary hover:underline'
              >
                <MapPin className='size-3.5' /> Open Google Maps pin
              </a>
            ) : null}
          </div>
          <p className='shrink-0 border-b border-border/70 px-5 py-2 text-[11px] leading-snug text-muted-foreground max-[760px]:px-3'>
            Group chat is for plan details. Meet at the public venue and trust your judgement.
          </p>

            {offline && (
              <p
                role='status'
                className='shrink-0 border-b border-[#f3c1d3] bg-[#fff2f7] px-5 py-2 text-center text-xs font-bold text-[#9f2849] max-[760px]:px-3'
              >
                You’re offline. Messages will send when you’re back online.
              </p>
            )}
            <div
            ref={scrollRef}
            className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#f8faf7] px-5 py-4 max-[760px]:px-3'
            aria-live='polite'
          >
            {messages.length === 0 && (
              <p className='m-auto max-w-xs text-center text-sm text-muted-foreground'>
                No messages yet. Say hello and agree on where to meet.
              </p>
            )}
            {messages.map((message) => (
              <div
                className={`flex max-w-[82%] items-end gap-2 max-[760px]:max-w-[88%] ${message.mine ? 'self-end' : 'self-start'} ${message.pending || message.failed ? 'opacity-80' : ''}`}
                key={message.id}
              >
                {!message.mine && (
                  <PersonAvatar
                    initials={message.senderInitials}
                    name={message.senderName}
                    tone={message.senderTone}
                    small
                  />
                )}
                <div className='min-w-0'>
                  <div
                    className={`mb-1 flex items-center gap-1.5 px-1 text-[11px] font-bold text-primary ${message.mine ? 'justify-end' : ''}`}
                  >
                    {message.mine ? 'You' : message.senderName}
                    {message.senderId === plan.hostId && (
                      <span className='rounded-full bg-[#fff0bf] px-1.5 py-0.5 text-[9px] text-forest'>
                        Host
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2.5 text-[13px] shadow-[0_1px_3px_rgba(15,34,24,.07)] ${message.failed ? 'rounded-br-sm border border-[#f3c1d3] bg-[#fff2f7] text-[#9f2849]' : message.mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-border bg-white text-forest'}`}
                  >
                    {message.mediaType === 'image' && message.mediaUrl && (
                      <a
                        href={message.mediaUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label='Open shared photo'
                      >
                        <img
                          src={message.mediaUrl}
                          alt={message.text || `Photo shared by ${message.senderName}`}
                          loading='lazy'
                          decoding='async'
                          className='mb-1 max-h-72 w-full max-w-72 rounded-xl object-cover'
                        />
                      </a>
                    )}
                    {message.mediaType === 'audio' && message.mediaUrl && (
                      <audio
                        controls
                        preload='metadata'
                        src={message.mediaUrl}
                        className='mb-1 w-[min(68vw,260px)]'
                        aria-label={`Voice note from ${message.senderName}`}
                      />
                    )}
                    {message.text && (
                      <p className='whitespace-pre-wrap break-words leading-relaxed'>{message.text}</p>
                    )}
                    <time
                      dateTime={message.createdAt}
                      className='mt-1 block text-right text-[10px] opacity-65'
                    >
                      {message.pending
                        ? 'Sending…'
                        : message.failed
                          ? 'Not sent'
                          : shortTime(message.createdAt) || message.time}
                    </time>
                    {message.failed && (
                      <button
                        type='button'
                        onClick={() => dismissFailedMessage(plan.id, message.id)}
                        className='mt-1 text-[11px] font-bold underline'
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form
            className='shrink-0 border-t border-border bg-card px-4 py-3 max-[760px]:px-3 max-[760px]:pb-[calc(.75rem+env(safe-area-inset-bottom))]'
            onSubmit={submit}
          >
            {attachment && <div className='mb-2 flex items-center gap-3 rounded-xl bg-soft-green p-2 text-sm'><span className='min-w-0 flex-1 truncate'>{attachment.type.startsWith('image/') ? 'Photo' : 'Voice note'} · {attachment.name}</span>{attachment.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt='Selected photo preview' className='size-11 rounded-lg object-cover' />}{attachment.type.startsWith('audio/') && previewUrl && <audio controls src={previewUrl} className='max-w-40' aria-label='Preview voice note' />}<button type='button' onClick={() => setAttachment(null)} aria-label='Remove attachment' className='grid size-9 shrink-0 place-items-center rounded-full hover:bg-white'><X className='size-4' /></button></div>}
            {recording && <p role='status' className='mb-2 text-sm font-bold text-[#b51b63]'>Recording voice note… tap stop when finished.</p>}
            <div className='flex items-end gap-1.5 max-[420px]:flex-wrap'>
            <input ref={fileRef} type='file' accept='image/jpeg,image/png,image/webp,audio/webm,audio/mp4,audio/ogg,audio/mpeg' onChange={chooseFile} className='sr-only' aria-label='Choose a photo or audio file' />
            <button type='button' onClick={() => fileRef.current?.click()} aria-label='Attach photo or audio' className='grid size-10 shrink-0 place-items-center rounded-full text-primary hover:bg-soft-green'><Paperclip className='size-5' /></button>
            <button type='button' onClick={() => setEmojiOpen((open) => !open)} aria-label='Choose emoji' aria-expanded={emojiOpen} className='grid size-10 shrink-0 place-items-center rounded-full text-primary hover:bg-soft-green max-[420px]:hidden'><Smile className='size-5' /></button>
            <textarea
              ref={composerRef}
              rows={1}
              className='min-h-11 max-h-32 min-w-0 flex-1 resize-none overflow-y-auto rounded-[22px] border border-border bg-[#f8faf7] px-4 py-2.5 leading-6 text-foreground outline-none [overflow-wrap:anywhere] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 max-[420px]:order-last max-[420px]:basis-full'
              aria-label='Message the group'
              maxLength={500}
              placeholder='Message the group…'
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                  event.preventDefault();
                  if (draft.trim() || attachment) event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type='button' onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop voice recording' : 'Record voice note'} className={`grid size-10 shrink-0 place-items-center rounded-full ${recording ? 'bg-pink text-white' : 'text-primary hover:bg-soft-green'}`}>{recording ? <Square className='size-4' /> : <Mic className='size-5' />}</button>
            <ActionButton
              type='submit'
              disabled={sending || recording || offline || (!draft.trim() && !attachment)}
              className='size-11 shrink-0 rounded-full bg-pink px-0 hover:bg-[#c82270]'
            >
              <SendHorizontal aria-hidden='true' />
              <span className='sr-only'>Send message</span>
            </ActionButton>
            </div>
            {emojiOpen && <EmojiPicker onSelect={addEmoji.current} onClose={() => setEmojiOpen(false)} />}
          </form>
        </section>
      ) : (
        <section className='hidden place-items-center p-8 text-sm text-muted-foreground max-[1100px]:hidden min-[1101px]:grid'>
          {chatId ? 'This conversation is unavailable.' : 'Select a conversation'}
        </section>
      )}
      {deleteConfirm && plan && (
        <div
          className='fixed inset-0 z-50 grid place-items-center bg-forest/65 p-4'
          role='presentation'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteConfirm(false);
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='delete-conversation-title'
            className='w-full max-w-sm rounded-[22px] bg-card p-5 shadow-2xl'
          >
            <div className='flex items-start justify-between gap-4'>
              <h2 id='delete-conversation-title' className='font-heading text-xl font-extrabold'>
                Delete conversation?
              </h2>
              <button
                type='button'
                aria-label='Close'
                onClick={() => setDeleteConfirm(false)}
                className='grid size-10 place-items-center rounded-full hover:bg-secondary'
              >
                <X className='size-5' />
              </button>
            </div>
            <p className='mt-3 text-sm text-muted-foreground'>
              This removes the chat from your Messages list. You’re still on the plan, and it can
              reappear if someone sends a new message.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setDeleteConfirm(false)}
                className='min-h-11 rounded-xl px-4 text-sm font-bold'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={async () => {
                  const id = plan.id;
                  setDeleteConfirm(false);
                  const result = await deleteConversation(id);
                  if (result?.ok) router.push('/app/chat');
                }}
                className='min-h-11 rounded-xl bg-[#9f2849] px-4 text-sm font-bold text-white'
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
