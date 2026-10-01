'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  EyeOff,
  MapPin,
  MoreHorizontal,
  Search,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { ListPagination } from '@/components/ui/list-pagination';
import {
  Badge,
  Empty,
  PageHeader,
  ReasonBar,
  StatCard,
  card,
  field,
  formatDate,
  scheduled
} from '@/components/admin/shared';

function eventStatus(plan, now = Date.now()) {
  if (plan.cancelled_at) return { label: 'Cancelled', tone: 'red' };
  if (plan.hidden_at) return { label: 'Hidden', tone: 'gray' };
  if (plan.status !== 'open') return { label: 'Closed', tone: 'gray' };
  if (scheduled(plan) <= now) return { label: 'Past', tone: 'gray' };
  return { label: 'Upcoming', tone: 'green' };
}

function visibilityMeta(visibility) {
  if (visibility === 'link_only') return { label: 'Link-only', tone: 'blue' };
  return { label: 'Public', tone: 'green' };
}

function capacityLabel(plan) {
  const accepted = plan.accepted ?? 0;
  const size = plan.size || 0;
  if (size > 0 && accepted >= size) return { text: `${accepted}/${size} Full`, full: true };
  const open = Math.max(0, size - accepted);
  return { text: `${accepted}/${size || '—'} ${open} spots`, full: false };
}

function actionLabel(action) {
  return String(action || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Plans({ data, run, busy }) {
  const [query, setQuery] = useState('');
  const [windowFilter, setWindowFilter] = useState('upcoming');
  const [eventFilter, setEventFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState('');
  const now = Date.now();

  const reportCountByPlan = useMemo(() => {
    const map = new Map();
    for (const report of data.reports || []) {
      if (!report.plan_id) continue;
      map.set(report.plan_id, (map.get(report.plan_id) || 0) + 1);
    }
    return map;
  }, [data.reports]);

  const pendingByPlan = useMemo(() => {
    const map = new Map();
    for (const request of data.joinRequests || []) {
      map.set(request.plan_id, (map.get(request.plan_id) || 0) + 1);
    }
    return map;
  }, [data.joinRequests]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data.plans || []).filter((plan) => {
      const stamp = scheduled(plan);
      const upcoming = plan.status === 'open' && !plan.cancelled_at && stamp > now;
      const past = stamp <= now || plan.status !== 'open' || Boolean(plan.cancelled_at);
      if (windowFilter === 'upcoming' && !upcoming) return false;
      if (windowFilter === 'past' && !past) return false;
      if (eventFilter === 'cancelled' && !plan.cancelled_at) return false;
      if (eventFilter === 'hidden' && !plan.hidden_at) return false;
      if (eventFilter === 'upcoming' && !(upcoming && !plan.hidden_at)) return false;
      if (eventFilter === 'full') {
        const accepted = plan.accepted ?? 0;
        if (!(plan.size > 0 && accepted >= plan.size && upcoming)) return false;
      }
      if (visibilityFilter !== 'all' && (plan.visibility || 'public') !== visibilityFilter)
        return false;
      if (!q) return true;
      return `${plan.title} ${plan.host?.display_name} ${plan.host?.email} ${plan.venue} ${plan.category} ${plan.date_label}`
        .toLowerCase()
        .includes(q);
    });
  }, [data.plans, query, windowFilter, eventFilter, visibilityFilter, now]);

  const selected = list.find((plan) => plan.id === selectedId) || null;
  const pageSize = 8;
  const pageRows = list.slice((page - 1) * pageSize, page * pageSize);

  const recentPlanHistory = useMemo(
    () =>
      (data.history || [])
        .filter((item) => item.target_type === 'plans')
        .slice(0, 8),
    [data.history]
  );

  async function confirmAction() {
    if (!pendingAction) return;
    const ok = await run(pendingAction.action, pendingAction.id, reason);
    if (ok) {
      setPendingAction(null);
      setReason('');
    }
  }

  return (
    <>
      <PageHeader
        title='Plans'
        description='Review activity plans, participation and moderation.'
      />

      <div className='mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Upcoming' value={data.counts.upcoming ?? 0} icon={CalendarDays} tone='green' />
        <StatCard label='Full' value={data.counts.full ?? 0} icon={Users} tone='pink' />
        <StatCard label='Hidden' value={data.counts.hidden ?? 0} icon={EyeOff} tone='gray' />
        <StatCard label='Cancelled' value={data.counts.cancelled ?? 0} icon={XCircle} tone='red' />
      </div>

      <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center'>
        <label className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-3.5 size-4 text-[#68796b]' />
          <input
            className={`${field} pl-9`}
            placeholder='Search plan, host or venue'
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
        </label>
        <div className='inline-flex rounded-xl border border-[#d7e3d8] bg-white p-1'>
          {[
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
            ['all', 'All']
          ].map(([value, label]) => (
            <button
              key={value}
              type='button'
              onClick={() => {
                setWindowFilter(value);
                setPage(1);
              }}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold ${
                windowFilter === value ? 'bg-[#e8f2e8] text-[#246538]' : 'text-[#657467]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className={`${field} xl:max-w-[160px]`}
          value={eventFilter}
          onChange={(event) => {
            setEventFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Event status</option>
          <option value='upcoming'>Upcoming</option>
          <option value='full'>Full</option>
          <option value='hidden'>Hidden</option>
          <option value='cancelled'>Cancelled</option>
        </select>
        <select
          className={`${field} xl:max-w-[150px]`}
          value={visibilityFilter}
          onChange={(event) => {
            setVisibilityFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Visibility</option>
          <option value='public'>Public</option>
          <option value='link_only'>Link-only</option>
        </select>
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <section className={`${card} !p-0 overflow-hidden`}>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='border-b border-[#e4ece5] bg-[#f7faf6] text-xs font-bold uppercase tracking-wide text-[#68796b]'>
                <tr>
                  <th className='px-4 py-3'>Plan & host</th>
                  <th className='px-4 py-3'>Date & time</th>
                  <th className='px-4 py-3'>Capacity</th>
                  <th className='px-4 py-3'>Event status</th>
                  <th className='px-4 py-3'>Visibility</th>
                  <th className='px-4 py-3'>Reports</th>
                  <th className='px-4 py-3'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((plan) => {
                  const status = eventStatus(plan, now);
                  const visibility = visibilityMeta(plan.visibility);
                  const capacity = capacityLabel(plan);
                  const reports = reportCountByPlan.get(plan.id) || 0;
                  const active = selected?.id === plan.id;
                  return (
                    <tr
                      key={plan.id}
                      className={`border-b border-[#eef3ee] last:border-0 ${
                        active ? 'bg-[#edf6ec]' : 'hover:bg-[#f7faf6]'
                      }`}
                    >
                      <td className='px-4 py-3'>
                        <button
                          type='button'
                          className='flex max-w-[280px] items-start gap-3 text-left'
                          onClick={() => setSelectedId(plan.id)}
                        >
                          <span className='relative mt-0.5 size-11 shrink-0 overflow-hidden rounded-xl bg-[#e8f2e8]'>
                            {plan.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={plan.imageUrl} alt='' className='size-full object-cover' />
                            ) : (
                              <span className='grid size-full place-items-center text-xs font-bold text-[#246538]'>
                                {(plan.title || 'P').slice(0, 1)}
                              </span>
                            )}
                          </span>
                          <span>
                            <span className='block font-bold text-[#10251a]'>{plan.title}</span>
                            <span className='mt-0.5 block text-xs text-[#657467]'>
                              {plan.host?.display_name || 'Host'} · {plan.category}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className='px-4 py-3 text-[#506653]'>
                        <div>{plan.date_label || '—'}</div>
                        <div className='text-xs text-[#7a8b7d]'>{plan.time_label || '—'}</div>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${capacity.full ? 'text-[#9a285e]' : 'text-[#506653]'}`}>
                        {capacity.text}
                      </td>
                      <td className='px-4 py-3'>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className='px-4 py-3'>
                        <Badge tone={plan.hidden_at ? 'gray' : visibility.tone}>
                          {plan.hidden_at ? 'Hidden' : visibility.label}
                        </Badge>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='inline-flex items-center gap-1.5 font-semibold'>
                          {reports > 0 && <AlertTriangle className='size-3.5 text-[#b45309]' />}
                          {reports}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => setSelectedId(plan.id)}
                            className='min-h-9 rounded-lg border border-[#cadacb] px-3 text-xs font-bold text-[#276837]'
                          >
                            View
                          </button>
                          <button
                            type='button'
                            aria-label='More actions'
                            onClick={() => setSelectedId(plan.id)}
                            className='grid size-9 place-items-center rounded-lg border border-[#cadacb] text-[#276837]'
                          >
                            <MoreHorizontal className='size-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!list.length && (
            <div className='p-4'>
              <Empty text='No plans match these filters.' />
            </div>
          )}
          <div className='border-t border-[#e4ece5] px-4'>
            <ListPagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
          </div>
        </section>

        {selected && (
          <aside className={`${card} sticky top-20 flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden !p-0`}>
            <div className='flex items-start justify-between gap-3 border-b border-[#e4ece5] px-4 py-4'>
              <div className='min-w-0'>
                <h2 className='font-heading text-xl font-extrabold tracking-tight'>{selected.title}</h2>
                <Link
                  href={`/p/${selected.id}`}
                  target='_blank'
                  className='mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#256739]'
                >
                  View public plan <ExternalLink className='size-3.5' />
                </Link>
              </div>
              <button
                type='button'
                aria-label='Close plan details'
                onClick={() => setSelectedId(null)}
                className='grid size-9 place-items-center rounded-full hover:bg-[#edf2ed]'
              >
                <X className='size-4' />
              </button>
            </div>
            <div className='overflow-y-auto px-4 py-4'>
              <div className='mb-3'>
                <Badge tone={eventStatus(selected, now).tone}>{eventStatus(selected, now).label}</Badge>
              </div>
              <div className='relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-[#e8f2e8]'>
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt='' className='size-full object-cover' />
                ) : (
                  <div className='grid size-full place-items-center text-sm font-bold text-[#246538]'>
                    No cover photo
                  </div>
                )}
              </div>
              <dl className='grid gap-3 text-sm'>
                <div className='flex items-start gap-2'>
                  <Users className='mt-0.5 size-4 text-[#68796b]' />
                  <div>
                    <dt className='text-xs font-bold text-[#68796b]'>Host</dt>
                    <dd>{selected.host?.display_name || 'Host'}</dd>
                  </div>
                </div>
                <div className='flex items-start gap-2'>
                  <CalendarDays className='mt-0.5 size-4 text-[#68796b]' />
                  <div>
                    <dt className='text-xs font-bold text-[#68796b]'>Date & time</dt>
                    <dd>
                      {selected.date_label} at {selected.time_label}
                    </dd>
                  </div>
                </div>
                <div className='flex items-start gap-2'>
                  <MapPin className='mt-0.5 size-4 text-[#68796b]' />
                  <div>
                    <dt className='text-xs font-bold text-[#68796b]'>Venue</dt>
                    <dd>{selected.venue || '—'}</dd>
                  </div>
                </div>
                <div>
                  <dt className='text-xs font-bold text-[#68796b]'>Capacity</dt>
                  <dd className={capacityLabel(selected).full ? 'font-bold text-[#9a285e]' : ''}>
                    {capacityLabel(selected).text}
                  </dd>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Badge tone={eventStatus(selected, now).tone}>{eventStatus(selected, now).label}</Badge>
                  <Badge tone={selected.hidden_at ? 'gray' : visibilityMeta(selected.visibility).tone}>
                    {selected.hidden_at ? 'Hidden' : visibilityMeta(selected.visibility).label}
                  </Badge>
                </div>
              </dl>

              {capacityLabel(selected).full && (
                <p className='mt-4 rounded-xl bg-[#fff6d9] px-3 py-2.5 text-xs font-semibold text-[#805800]'>
                  Full plans have no available spots.
                </p>
              )}

              <div className='mt-4 grid grid-cols-2 gap-2'>
                <div className='rounded-xl bg-[#eef6ee] p-3'>
                  <p className='flex items-center gap-1.5 text-xs font-bold text-[#246538]'>
                    <CheckCircle2 className='size-3.5' /> Accepted
                  </p>
                  <p className='mt-1 font-heading text-xl font-extrabold'>{selected.accepted ?? 0}</p>
                </div>
                <div className='rounded-xl bg-[#fff6d9] p-3'>
                  <p className='flex items-center gap-1.5 text-xs font-bold text-[#805800]'>
                    <Clock3 className='size-3.5' /> Pending
                  </p>
                  <p className='mt-1 font-heading text-xl font-extrabold'>
                    {pendingByPlan.get(selected.id) || 0}
                  </p>
                </div>
              </div>

              <section className='mt-5'>
                <h3 className='text-sm font-extrabold'>Reports</h3>
                {(data.reports || []).filter((report) => report.plan_id === selected.id).length ? (
                  <ul className='mt-2 grid gap-2'>
                    {(data.reports || [])
                      .filter((report) => report.plan_id === selected.id)
                      .slice(0, 4)
                      .map((report) => (
                        <li key={report.id} className='rounded-xl bg-[#f7faf6] px-3 py-2 text-xs'>
                          <p className='font-semibold'>{report.reason}</p>
                          <p className='mt-1 text-[#68796b]'>{formatDate(report.created_at)}</p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className='mt-2 text-xs text-[#68796b]'>No reports for this plan</p>
                )}
              </section>

              <section className='mt-5'>
                <h3 className='text-sm font-extrabold'>Moderation history</h3>
                {(data.history || []).filter((item) => item.target_id === selected.id).length ? (
                  <ul className='mt-2 grid gap-2'>
                    {(data.history || [])
                      .filter((item) => item.target_id === selected.id)
                      .slice(0, 4)
                      .map((item) => (
                        <li key={item.id} className='rounded-xl bg-[#f7faf6] px-3 py-2 text-xs'>
                          <p className='font-semibold'>{actionLabel(item.action)}</p>
                          <p className='mt-1 text-[#68796b]'>
                            {item.actor?.display_name || 'Admin'} · {formatDate(item.created_at)}
                          </p>
                          {item.reason && <p className='mt-1'>{item.reason}</p>}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className='mt-2 text-xs text-[#68796b]'>No actions recorded.</p>
                )}
              </section>
            </div>
            <div className='mt-auto border-t border-[#e4ece5] px-4 py-3'>
              <div className='flex flex-wrap gap-2'>
                {!selected.hidden_at && selected.status === 'open' && !selected.cancelled_at && (
                  <button
                    type='button'
                    onClick={() => {
                      setPendingAction({ action: 'hide_plan', id: selected.id, label: selected.title });
                      setReason('');
                    }}
                    className='min-h-10 rounded-xl border border-[#cadacb] px-3 text-xs font-bold text-[#276837]'
                  >
                    Hide from discovery
                  </button>
                )}
                {selected.status === 'open' && !selected.cancelled_at ? (
                  <button
                    type='button'
                    onClick={() => {
                      setPendingAction({
                        action: 'cancel_plan',
                        id: selected.id,
                        label: selected.title
                      });
                      setReason('');
                    }}
                    className='min-h-10 rounded-xl border border-[#f3b4d0] px-3 text-xs font-bold text-[#9a285e]'
                  >
                    Cancel plan
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      setPendingAction({
                        action: 'reopen_plan',
                        id: selected.id,
                        label: selected.title
                      });
                      setReason('');
                    }}
                    className='min-h-10 rounded-xl border border-[#cadacb] px-3 text-xs font-bold text-[#276837]'
                  >
                    Reopen plan
                  </button>
                )}
              </div>
              <p className='mt-2 text-[11px] text-[#7a8b7d]'>
                A reason is required. Every action is logged.
              </p>
            </div>
          </aside>
        )}
      </div>

      <section className={`${card} mt-5 !p-0 overflow-hidden`}>
        <div className='border-b border-[#e4ece5] px-4 py-3'>
          <h2 className='font-heading text-lg font-extrabold'>Recent admin activity</h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-left text-sm'>
            <thead className='bg-[#f7faf6] text-xs font-bold uppercase tracking-wide text-[#68796b]'>
              <tr>
                <th className='px-4 py-3'>Action</th>
                <th className='px-4 py-3'>Plan</th>
                <th className='px-4 py-3'>Reason</th>
                <th className='px-4 py-3'>By</th>
                <th className='px-4 py-3'>Date & time</th>
              </tr>
            </thead>
            <tbody>
              {recentPlanHistory.map((item) => {
                const plan = (data.plans || []).find((row) => row.id === item.target_id);
                return (
                  <tr key={item.id} className='border-t border-[#eef3ee]'>
                    <td className='px-4 py-3 font-semibold'>{actionLabel(item.action)}</td>
                    <td className='px-4 py-3'>{plan?.title || item.target_id}</td>
                    <td className='px-4 py-3 text-[#506653]'>{item.reason || '—'}</td>
                    <td className='px-4 py-3'>{item.actor?.display_name || 'Admin'}</td>
                    <td className='px-4 py-3 text-[#68796b]'>{formatDate(item.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!recentPlanHistory.length && (
          <div className='p-4'>
            <Empty text='No plan moderation actions yet.' />
          </div>
        )}
      </section>

      {pendingAction && (
        <ReasonBar
          title='Moderation action'
          prompt={`${pendingAction.action === 'hide_plan' ? 'Hide' : pendingAction.action === 'cancel_plan' ? 'Cancel' : 'Reopen'} “${pendingAction.label}”? Provide a reason. This will be recorded in admin history.`}
          reason={reason}
          setReason={setReason}
          onCancel={() => {
            setPendingAction(null);
            setReason('');
          }}
          onConfirm={confirmAction}
          confirmLabel={
            pendingAction.action === 'hide_plan'
              ? 'Confirm hide'
              : pendingAction.action === 'cancel_plan'
                ? 'Confirm cancel'
                : 'Confirm reopen'
          }
          busy={busy}
          tone={pendingAction.action === 'cancel_plan' ? 'pink' : 'green'}
        />
      )}
    </>
  );
}
