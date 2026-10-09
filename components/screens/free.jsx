'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Sparkles, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAlongSession } from '@/components/providers/along';
import { ActionButton, EmptyState, PageHeading, Panel } from '@/components/layout/shared';
import { Skeleton } from '@/components/layout/app-skeleton';
import { loadMyAvailability, saveAvailability } from '@/lib/along/im-free';

function kampalaInputParts(iso) {
  if (!iso) return { date: '', time: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function formatWindow(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-UG', {
    timeZone: 'Africa/Kampala',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function isRescheduleBlocked(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('unresolved') || message.includes('proposal') || error?.code === '23505';
}

function defaultEndFor(startIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return '';
  return new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

export function FreeScreen() {
  const { viewer, hydrated } = useAlongSession();
  const [mode, setMode] = useState('now');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [endTouched, setEndTouched] = useState(false);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setSaved(await loadMyAvailability());
    } catch (error) {
      setLoadError(error.message || 'Could not load your availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && viewer) load();
    if (hydrated && !viewer) setLoading(false);
  }, [hydrated, viewer, load]);

  const savedParts = useMemo(
    () => ({
      start: saved ? kampalaInputParts(saved.from_at) : { date: '', time: '' },
      end: saved ? kampalaInputParts(saved.until_at) : { date: '', time: '' }
    }),
    [saved]
  );

  useEffect(() => {
    if (!saved || mode !== 'later' || startDate || startTime || endTouched) return;
    setStartDate(savedParts.start.date);
    setStartTime(savedParts.start.time);
    setEndDate(savedParts.end.date);
    setEndTime(savedParts.end.time);
  }, [saved, mode, startDate, startTime, endTouched, savedParts]);

  useEffect(() => {
    if (endTouched || !startDate || !startTime) return;
    try {
      const start = new Date(`${startDate}T${startTime}:00+03:00`);
      if (Number.isNaN(start.getTime())) return;
      const parts = kampalaInputParts(defaultEndFor(start.toISOString()));
      setEndDate(parts.date);
      setEndTime(parts.time);
    } catch {
      /* ignore while typing */
    }
  }, [startDate, startTime, endTouched]);

  function chooseMode(next) {
    setMode(next);
    setEndTouched(false);
    if (next === 'later' && saved && !startDate && !startTime) {
      setStartDate(savedParts.start.date);
      setStartTime(savedParts.start.time);
      setEndDate(savedParts.end.date);
      setEndTime(savedParts.end.time);
    }
  }

  async function submit(event) {
    event.preventDefault();
    let start;
    if (mode === 'now') {
      start = new Date();
    } else {
      if (!startDate || !startTime) return toast.error('Choose a future start date and time.');
      start = new Date(`${startDate}T${startTime}:00+03:00`);
      if (Number.isNaN(start.getTime())) return toast.error('Choose a valid start date and time.');
      if (start <= new Date()) return toast.error('Choose a future start time.');
    }
    if (!endDate || !endTime) return toast.error('Choose when your free window ends.');
    const end = new Date(`${endDate}T${endTime}:00+03:00`);
    if (Number.isNaN(end.getTime())) return toast.error('Choose a valid end date and time.');
    if (end <= start) return toast.error('End time must be after the start time.');
    setSaving(true);
    try {
      await saveAvailability(start.toISOString(), end.toISOString());
      setSaved(await loadMyAvailability());
      toast.success('Availability saved.');
    } catch (error) {
      if (isRescheduleBlocked(error)) {
        toast.error('You already have a pending or active match. Resolve it first, then set a new free window.');
      } else {
        toast.error(error.message || 'Could not save your availability.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <section className='mx-auto max-w-3xl pb-10' aria-busy='true' aria-live='polite'>
        <span className='sr-only'>Loading your availability…</span>
        <Skeleton className='mb-3 h-4 w-28' />
        <Skeleton className='mb-3 h-12 w-64 max-w-full' />
        <Skeleton className='h-64 w-full rounded-[20px]' />
      </section>
    );
  }
  return (
    <>
      <PageHeading title='I’m Free.' description='Tell people when you are around. Matches come next.' />
      <div className='grid grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)] gap-5 max-[760px]:grid-cols-1'>
        <Panel>
          {loadError ? (
            <div role='alert' className='flex flex-wrap items-center gap-3 rounded-xl border border-[#f4c5d8] bg-[#fff2f7] p-4 text-sm text-[#9f2849]'>
              <span>{loadError}</span>
              <button type='button' onClick={load} className='font-bold underline'>Try again</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className='grid grid-cols-2 gap-2 rounded-2xl border border-border bg-secondary/60 p-1.5 max-[480px]:grid-cols-1' role='group' aria-label='When are you free?'>
                <button type='button' aria-pressed={mode === 'now'} onClick={() => chooseMode('now')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold ${mode === 'now' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                  <Timer className='size-4' aria-hidden='true' /> I am free now
                </button>
                <button type='button' aria-pressed={mode === 'later'} onClick={() => chooseMode('later')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold ${mode === 'later' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                  <CalendarClock className='size-4' aria-hidden='true' /> I will be free later
                </button>
              </div>
              {mode === 'now' ? (
                <p className='mt-4 rounded-xl bg-soft-green px-4 py-3 text-sm font-semibold text-forest'>Starts right now. Just choose when it ends below.</p>
              ) : (
                <div className='mt-4 grid grid-cols-2 gap-4 max-[480px]:grid-cols-1'>
                  <div className='grid gap-2'>
                    <Label htmlFor='free-start-date' className='text-[13px] font-extrabold'>Start date</Label>
                    <Input id='free-start-date' type='date' required value={startDate} onChange={(e) => setStartDate(e.target.value)} className='h-11 rounded-xl border-border bg-card' />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='free-start-time' className='text-[13px] font-extrabold'>Start time</Label>
                    <Input id='free-start-time' type='time' required value={startTime} onChange={(e) => setStartTime(e.target.value)} className='h-11 rounded-xl border-border bg-card' />
                  </div>
                </div>
              )}
              <div className='mt-4 grid grid-cols-2 gap-4 max-[480px]:grid-cols-1'>
                <div className='grid gap-2'>
                  <Label htmlFor='free-end-date' className='text-[13px] font-extrabold'>End date</Label>
                  <Input id='free-end-date' type='date' required value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndTouched(true); }} className='h-11 rounded-xl border-border bg-card' />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='free-end-time' className='text-[13px] font-extrabold'>End time</Label>
                  <Input id='free-end-time' type='time' required value={endTime} onChange={(e) => { setEndTime(e.target.value); setEndTouched(true); }} className='h-11 rounded-xl border-border bg-card' />
                </div>
              </div>
              <small className='mt-2 block text-xs text-muted-foreground'>Times use Kampala time (EAT). The end must be later than the start.</small>
              <div className='mt-5'>
                <ActionButton type='submit' disabled={saving}>
                  <Sparkles aria-hidden='true' /> {saving ? 'Saving…' : 'Save availability'}
                </ActionButton>
              </div>
            </form>
          )}
          {saved && !loadError && (
            <div className='mt-6 rounded-2xl border border-border bg-secondary/50 p-4' aria-live='polite'>
              <p className='text-xs font-extrabold uppercase tracking-[.14em] text-primary'>Saved availability</p>
              <p className='mt-1.5 text-sm font-bold text-forest'>{formatWindow(saved.from_at)} to {formatWindow(saved.until_at)}</p>
              <p className='mt-1 text-xs text-muted-foreground'>Kampala time</p>
            </div>
          )}
          {!saved && !loadError && (
            <div className='mt-6'>
              <EmptyState tone='soft' title='No free window yet.' description='Say when you are around and we will keep it here.' />
            </div>
          )}
        </Panel>
        <Panel className='h-fit border-0 bg-soft-green'>
          <h2 className='mb-3 font-heading text-[22px] font-extrabold text-forest'>Small windows match best.</h2>
          <p className='text-forest'>Pick a few hours you can actually keep.</p>
          <ol className='mt-4 list-decimal space-y-3 pl-5 text-forest'>
            <li>Choose now or a future start.</li>
            <li>Set a clear end time.</li>
            <li>Save — update any time you have no open match.</li>
          </ol>
        </Panel>
      </div>
    </>
  );
}


