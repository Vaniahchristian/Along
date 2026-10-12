'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Search, Sparkles, Timer, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAlongSession } from '@/components/providers/along';
import { ActionButton, EmptyState, PageHeading, Panel, PersonAvatar } from '@/components/layout/shared';
import { Skeleton } from '@/components/layout/app-skeleton';
import {
  acceptProposal,
  cancelAvailability,
  declineProposal,
  findMatches,
  loadMyAvailability,
  loadMyGroups,
  loadMyProposals,
  loadProposalPeers,
  saveAvailability
} from '@/lib/along/im-free';

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

// Narrow match for the trusted RPC's reschedule lock: create_availability
// raises SQLSTATE 23505 with exactly this message when an unresolved
// (pending/active) proposal still references the caller's availability.
// Never match broadly — an unrelated 23505 (e.g. decision conflicts from
// accept/decline RPCs) must fall through to the generic error path.
function isRescheduleBlocked(error) {
  return /cannot change availability while an unresolved match/i.test(String(error?.message || ''));
}

// Build user-facing guidance for a blocked save from the proposals already
// loaded on this screen (loadMyProposals shape: status, myDecision, ...).
// The DB blocks whenever ANY proposal touching the availability is
// pending/active, regardless of the caller's own decision, so we describe the
// caller's own situation (respond vs waiting) without asserting which single
// proposal blocked or naming a peer — identity for a pending invitee is
// intentionally hidden by get_match_proposal_peer.
function rescheduleBlockedMessage(rows) {
  const blocking = (rows || []).filter(
    (row) => row.status === 'pending' || row.status === 'active'
  );
  if (blocking.some((row) => row.myDecision === 'pending')) {
    return 'You have an invitation waiting for your answer below. Respond to it, then set a new free window.';
  }
  if (blocking.some((row) => row.myDecision === 'accepted')) {
    return 'You accepted an invitation that is still waiting on the other person below. Your current free window stays reserved until they respond or the shared window ends.';
  }
  return 'An unresolved match is still holding your current window. Resolve it in your invitations below, then try again.';
}

const ENDING_SOON_MS = 60 * 60 * 1000;

// Classify the saved window against the current time. Rendered at paint time
// only (no timers/polling). 'unknown' means the stored timestamps could not
// be parsed and no status should be claimed.
function availabilityStatus(row) {
  if (!row?.from_at || !row?.until_at) return 'unknown';
  const from = new Date(row.from_at);
  const until = new Date(row.until_at);
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) return 'unknown';
  const now = Date.now();
  if (now >= until.getTime()) return 'expired';
  if (now < from.getTime()) return 'upcoming';
  if (until.getTime() - now < ENDING_SOON_MS) return 'ending-soon';
  return 'active';
}

// Pill palette mirrors components/screens/profile.jsx interest styling so the
// summary reads as the same vocabulary the profile editor manages.
const interestColors = [
  'bg-[#e4f4ff] text-[#07598a]',
  'bg-[#e8f6e6] text-[#206b32]',
  'bg-[#fff2d9] text-[#8c5200]',
  'bg-[#ffe4f1] text-[#a01c60]'
];

function matchErrorMessage(error) {
  const message = String(error?.message || '');
  if (/no active availability/i.test(message)) {
    return 'Save a free window that has not ended yet, then try again.';
  }
  if (/suspended/i.test(message)) {
    return 'This account cannot search for matches right now.';
  }
  return message || 'Could not search for matches.';
}

function decisionErrorMessage(error, action) {
  const message = String(error?.message || '');
  if (/already responded|already-decided|not a pending participant/i.test(message)) {
    return 'This invitation was already decided. Refreshing the list.';
  }
  if (/already formed or closed|formed|closed/i.test(message)) {
    return 'This invitation is no longer open. Refreshing the list.';
  }
  if (/already passed|window has already/i.test(message)) {
    return 'This match window has already passed.';
  }
  if (/not a participant/i.test(message)) {
    return 'You are not part of this invitation.';
  }
  if (/proposal not found/i.test(message)) {
    return 'This invitation no longer exists. Refreshing the list.';
  }
  return message || `Could not ${action} this invitation.`;
}

function defaultEndFor(startIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return '';
  return new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString();
}

export function FreeScreen() {
  const { viewer, hydrated } = useAlongSession();
  const router = useRouter();
  const [mode, setMode] = useState('now');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [endTouched, setEndTouched] = useState(false);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [proposals, setProposals] = useState([]);
  const [peers, setPeers] = useState(new Map());
  const [proposalsError, setProposalsError] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupsError, setGroupsError] = useState('');
  const [finding, setFinding] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [actingId, setActingId] = useState(null);
  const loadProposals = useCallback(async () => {
    setProposalsError('');
    try {
      const rows = await loadMyProposals();
      setProposals(rows);
      setPeers(await loadProposalPeers(rows));
    } catch (error) {
      setProposalsError(error.message || 'Could not load your invitations.');
    }
  }, []);
  const loadGroups = useCallback(async () => {
    setGroupsError('');
    try {
      setGroups(await loadMyGroups());
    } catch (error) {
      setGroupsError(error.message || 'Could not load your groups.');
    }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setSaved(await loadMyAvailability());
      await loadProposals();
      await loadGroups();
    } catch (error) {
      setLoadError(error.message || 'Could not load your availability.');
    } finally {
      setLoading(false);
    }
  }, [loadProposals, loadGroups]);

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

  const actionableProposals = useMemo(
    () =>
      proposals.filter(
        (row) =>
          row.status !== 'closed' &&
          (row.myDecision === 'pending' ||
            (row.myDecision === 'accepted' && (row.status === 'pending' || row.status === 'active')))
      ),
    [proposals]
  );

  async function searchMatches() {
    if (finding) return;
    if (!saved) return toast.error('Save a free window first, then search.');
    setFinding(true);
    try {
      const rows = await findMatches();
      setLastSearch({ at: new Date().toISOString(), count: rows.length });
      await loadProposals();
      if (!rows.length) {
        toast.success('Search complete — no new matches right now.');
      } else {
        toast.success(`Found ${rows.length} ${rows.length === 1 ? 'match' : 'matches'}.`);
      }
    } catch (error) {
      toast.error(matchErrorMessage(error));
    } finally {
      setFinding(false);
    }
  }

  async function decide(id, action) {
    if (actingId) return;
    setActingId(id);
    try {
      if (action === 'accept') {
        const row = await acceptProposal(id);
        await loadProposals();
        try {
          await loadGroups();
        } catch {
          /* decision already succeeded; group refresh failure is non-fatal */
        }
        if (row?.group_id) {
          toast.success('Match accepted — your group is ready.', {
            action: {
              label: 'Open group',
              onClick: () => router.push(`/app/free/${row.group_id}`)
            }
          });
        } else if (row?.status === 'formed') {
          // Defensive only: the RPC forms a group atomically inside the call
          // that completes the second acceptance and always returns its
          // group_id (handled above), so 'formed' with a null group_id is not
          // reachable today. Never invent an identifier — point to the list.
          toast.success('Match accepted — the group is already formed. Find it below.');
        } else {
          // Authoritative waiting state: no group existed as of this call
          // (status 'active'). If the other person accepts a moment later,
          // their RPC forms the group and notifies them; here it surfaces in
          // the just-refreshed groups list below — a single client-side
          // re-check could not close that race without polling.
          toast.success('Invitation accepted. Waiting on the other person.');
        }
      } else {
        await declineProposal(id);
        await loadProposals();
        try {
          await loadGroups();
        } catch {
          /* decision already succeeded; group refresh failure is non-fatal */
        }
        toast.success('Invitation declined.');
      }
    } catch (error) {
      toast.error(decisionErrorMessage(error, action === 'accept' ? 'accept' : 'decline'));
      await loadProposals();
    } finally {
      setActingId(null);
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
        // Preserve the server's lock; explain the caller's own next step from
        // already-loaded proposal state. Never claims the save succeeded.
        toast.error(rescheduleBlockedMessage(proposals));
      } else {
        toast.error(error.message || 'Could not save your availability.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function cancelWindow() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const cancelled = await cancelAvailability();
      setCancelConfirm(false);
      // false = no window existed (idempotent server-side no-op): still
      // refresh so the UI reflects the authoritative state.
      toast.success(cancelled ? 'Free window cancelled.' : 'You had no free window to cancel.');
      await load();
    } catch (error) {
      // Keep the saved-card state untouched so the UI is not falsely cleared.
      toast.error(error.message || 'Could not cancel your free window.');
    } finally {
      setCancelling(false);
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
      <PageHeading title='I’m Free.' description='Save your window, search for overlapping people, then answer your invitations.' />
      <p className='-mt-3 mb-6 max-w-2xl font-heading text-lg font-extrabold leading-snug tracking-[-.01em] text-forest'>
        Sometimes you don’t have a plan, you just have time.
        <span className='mt-1 block font-sans text-sm font-normal leading-relaxed text-muted-foreground'>
          Find people who share your interests and are free when you are.
        </span>
      </p>
      <div className='grid grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)] gap-5 max-[760px]:grid-cols-1'>
        <div className='grid min-w-0 gap-5'>
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
          {saved && !loadError && (() => {
            const status = availabilityStatus(saved);
            const statusTone = {
              upcoming: 'bg-[#e4f4ff] text-[#07598a]',
              active: 'bg-soft-green text-forest',
              'ending-soon': 'bg-[#fff2d9] text-[#8c5200]',
              expired: 'bg-secondary text-muted-foreground'
            }[status];
            const statusLabel = {
              upcoming: 'Upcoming',
              active: 'Active now',
              'ending-soon': 'Ending soon',
              expired: 'Expired'
            }[status];
            const statusNote = {
              upcoming: `Starts ${formatWindow(saved.from_at)}. It joins matching from then until it ends.`,
              active: 'You are in matching until this window ends.',
              'ending-soon': `Less than an hour left — ends ${formatWindow(saved.until_at)}.`,
              expired: 'This window has ended and no longer participates in matching. Try setting a new free window above to search again.'
            }[status];
            return (
              <div className='mt-6 rounded-2xl border border-border bg-secondary/50 p-4' aria-live='polite'>
                <p className='text-xs font-extrabold uppercase tracking-[.14em] text-primary'>Saved availability</p>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  {status !== 'unknown' && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusTone}`}>{statusLabel}</span>
                  )}
                  <p className='min-w-0 text-sm font-bold text-forest'>{formatWindow(saved.from_at)} to {formatWindow(saved.until_at)}</p>
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>Kampala time{statusNote ? ` · ${statusNote}` : ''}</p>
                <button
                  type='button'
                  onClick={() => setCancelConfirm(true)}
                  disabled={cancelling || saving}
                  className='mt-3 inline-flex min-h-9 items-center rounded-full border border-[#f4c5d8] px-3.5 text-xs font-extrabold text-[#9f2849] transition hover:bg-[#fff2f7] disabled:pointer-events-none disabled:opacity-50'
                >
                  Cancel this window
                </button>
              </div>
            );
          })()}
          {!saved && !loadError && (
            <div className='mt-6'>
              <EmptyState tone='soft' title='No free window yet.' description='Say when you are around and we will keep it here.' />
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className='font-heading text-xl font-extrabold text-forest'>Find people free at the same time</h2>
          <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
            Search checks overlapping free windows with at least one shared interest. Nothing runs until you ask.
          </p>
          <div className='mt-4'>
            <ActionButton type='button' onClick={searchMatches} disabled={finding || saving || !saved}>
              <Search aria-hidden='true' /> {finding ? 'Searching…' : 'Find compatible people'}
            </ActionButton>
          </div>
          {lastSearch && (
            <p className='mt-3 text-xs text-muted-foreground' aria-live='polite'>
              Last search {formatWindow(lastSearch.at)} — {lastSearch.count} {lastSearch.count === 1 ? 'match' : 'matches'} found.
            </p>
          )}
        </Panel>
        <Panel>
          <h2 className='font-heading text-xl font-extrabold text-forest'>Invitations to connect</h2>
          <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
            An invitation is a nudge to connect, not a confirmed meetup. When both people accept, a group forms below with its own conversation.
          </p>
          {proposalsError ? (
            <div role='alert' className='mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#f4c5d8] bg-[#fff2f7] p-4 text-sm text-[#9f2849]'>
              <span>{proposalsError}</span>
              <button type='button' onClick={loadProposals} className='font-bold underline'>Try again</button>
            </div>
          ) : actionableProposals.length ? (
            <ul className='mt-4 grid gap-3'>
              {actionableProposals.map((proposal) => {
                const busy = actingId === proposal.id;
                const waiting = proposal.myDecision === 'accepted';
                const peer = peers.get(proposal.id) || null;
                return (
                  <li key={proposal.id} className='rounded-2xl border border-border bg-secondary/50 p-4'>
                    {peer ? (
                      <div className='flex min-w-0 items-center gap-3'>
                        <PersonAvatar
                          initials={peer.initials}
                          name={peer.name}
                          tone={peer.tone}
                          src={peer.avatarUrl}
                        />
                        <div className='min-w-0'>
                          <strong className='block truncate text-sm font-extrabold text-forest'>
                            {peer.name}
                          </strong>
                          <span className='block truncate text-xs text-muted-foreground'>
                            {[peer.city, peer.bio].filter(Boolean).join(' · ') || 'Tagwimi member'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className='text-xs leading-relaxed text-muted-foreground'>
                        The other person’s profile will appear here once identity sharing is enabled.
                      </p>
                    )}
                    <div className='mt-3 flex flex-wrap items-center gap-2'>
                      <Badge className='h-auto rounded-full border-0 bg-soft-green px-2.5 py-1 text-[11px] font-extrabold text-forest'>
                        {proposal.sharedInterest}
                      </Badge>
                      <span className='text-xs font-bold text-muted-foreground'>
                        {proposal.status} · {formatWindow(proposal.createdAt)}
                      </span>
                    </div>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {!waiting && (
                        <ActionButton type='button' disabled={Boolean(actingId)} onClick={() => decide(proposal.id, 'accept')}>
                          <Check aria-hidden='true' /> {busy ? 'Working…' : 'Accept'}
                        </ActionButton>
                      )}
                      <ActionButton type='button' tone='secondary' disabled={Boolean(actingId)} onClick={() => decide(proposal.id, 'decline')}>
                        <X aria-hidden='true' /> {busy ? 'Working…' : waiting ? 'Withdraw' : 'Decline'}
                      </ActionButton>
                    </div>
                    {waiting && (
                      <p className='mt-3 rounded-xl bg-soft-green p-3 text-xs leading-relaxed text-forest'>
                        You accepted — waiting on the other person. This invitation keeps your free window reserved until they decide or it expires.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className='mt-4'>
              <EmptyState tone='soft' title='No invitations yet.' description='Run a search above. When someone overlaps your window and shares an interest, their invitation appears here.' />
            </div>
          )}
          {proposals.length > actionableProposals.length && (
            <p className='mt-4 text-xs text-muted-foreground'>
              {proposals.length - actionableProposals.length} decided or closed {proposals.length - actionableProposals.length === 1 ? 'invitation' : 'invitations'} hidden.
            </p>
          )}
        </Panel>
        <Panel>
          <h2 className='font-heading text-xl font-extrabold text-forest'>Your groups</h2>
          <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
            Groups appear here after both people accept. Open a group to continue the conversation.
          </p>
          {groupsError ? (
            <div role='alert' className='mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#f4c5d8] bg-[#fff2f7] p-4 text-sm text-[#9f2849]'>
              <span>{groupsError}</span>
              <button type='button' onClick={loadGroups} className='font-bold underline'>Try again</button>
            </div>
          ) : groups.length ? (
            <ul className='mt-4 grid gap-3'>
              {groups.map((group) => (
                <li key={group.id}>
                  <Link href={`/app/free/${group.id}`} className='flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-4 transition hover:border-primary/40 hover:bg-secondary'>
                    <Badge className='h-auto rounded-full border-0 bg-soft-green px-2.5 py-1 text-[11px] font-extrabold text-forest'>
                      {group.sharedInterest}
                    </Badge>
                    <span className='text-xs font-bold text-muted-foreground'>
                      {group.memberCount} of {group.maxSize} members · {formatWindow(group.joinedAt || group.createdAt)}
                    </span>
                    <span className='ml-auto text-xs font-extrabold text-primary'>Open chat →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className='mt-4'>
              <EmptyState tone='soft' title='No groups yet.' description='Accept an invitation and ask the other person to accept too. Your group will show up here.' />
            </div>
          )}
        </Panel>
        </div>
        <Panel className='h-fit border-0 bg-soft-green'>
          <h2 className='mb-3 font-heading text-[22px] font-extrabold text-forest'>Small windows match best.</h2>
          <p className='text-forest'>Pick a few hours you can actually keep.</p>
          <ol className='mt-4 list-decimal space-y-3 pl-5 text-forest'>
            <li>Choose now or a future start.</li>
            <li>Set a clear end time.</li>
            <li>Save — update any time you have no open match.</li>
          </ol>
        </Panel>
        <Panel className='h-fit'>
          <h2 className='font-heading text-xl font-extrabold text-forest'>Your interests</h2>
          <p className='mt-1.5 text-xs leading-relaxed text-muted-foreground'>
            Matches only happen when you share at least one interest.
          </p>
          {viewer?.interests?.length ? (
            <div className='mt-3 flex flex-wrap gap-2'>
              {viewer.interests.map((interest, index) => (
                <span
                  key={interest}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${interestColors[index % interestColors.length]}`}
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>
              Choosing interests helps us find people with something in common.
            </p>
          )}
          <Link href='/app/profile' className='mt-4 inline-flex min-h-10 items-center rounded-full border border-primary px-4 text-xs font-bold text-primary transition hover:bg-secondary'>
            Manage in your profile
          </Link>
        </Panel>
      </div>
      {cancelConfirm && (
        <div
          className='fixed inset-0 z-50 grid place-items-center bg-forest/65 p-4'
          role='presentation'
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCancelConfirm(false);
          }}
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-labelledby='cancel-window-title'
            className='w-full max-w-sm rounded-[22px] bg-card p-5 shadow-2xl'
          >
            <div className='flex items-start justify-between gap-4'>
              <h2 id='cancel-window-title' className='font-heading text-xl font-extrabold'>
                Cancel your free window?
              </h2>
              <button
                type='button'
                aria-label='Close'
                onClick={() => setCancelConfirm(false)}
                className='grid size-10 place-items-center rounded-full hover:bg-secondary'
              >
                <X className='size-5' />
              </button>
            </div>
            <p className='mt-3 text-sm text-muted-foreground'>
              Open invitations will be closed, and you will stop appearing in matching. Groups you
              have already formed keep their chat. You can set a new window any time.
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setCancelConfirm(false)}
                disabled={cancelling}
                className='min-h-11 rounded-xl px-4 text-sm font-bold'
              >
                Keep window
              </button>
              <button
                type='button'
                onClick={cancelWindow}
                disabled={cancelling}
                className='min-h-11 rounded-xl bg-[#9f2849] px-4 text-sm font-bold text-white disabled:pointer-events-none disabled:opacity-60'
              >
                {cancelling ? 'Cancelling…' : 'Cancel window'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}


