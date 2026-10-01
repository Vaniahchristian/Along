'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  MoreHorizontal,
  Search,
  ShieldOff,
  UserRound,
  Users,
  X
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
  formatDate
} from '@/components/admin/shared';

function actionLabel(action) {
  return String(action || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Members({ data, run, busy, onReviewReport }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportsFilter, setReportsFilter] = useState('all');
  const [joinedFilter, setJoinedFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState('');

  const enriched = useMemo(() => {
    return (data.members || []).map((person) => {
      const hosted = (data.plans || []).filter((plan) => plan.host_id === person.id).length;
      const joined = (data.memberships || []).filter(
        (membership) => membership.profile_id === person.id
      ).length;
      const reports = (data.reports || []).filter(
        (report) => report.subject_profile_id === person.id
      );
      return { ...person, hosted, joined, reportCount: reports.length, reports };
    });
  }, [data.members, data.plans, data.memberships, data.reports]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    let rows = enriched.filter((person) => {
      if (statusFilter === 'active' && person.suspended_at) return false;
      if (statusFilter === 'suspended' && !person.suspended_at) return false;
      if (reportsFilter === 'with' && person.reportCount === 0) return false;
      if (reportsFilter === 'without' && person.reportCount > 0) return false;
      if (joinedFilter !== 'all') {
        const age = now - new Date(person.created_at).getTime();
        if (joinedFilter === '7d' && age > 7 * 864e5) return false;
        if (joinedFilter === '30d' && age > 30 * 864e5) return false;
        if (joinedFilter === '90d' && age > 90 * 864e5) return false;
      }
      if (!q) return true;
      return `${person.display_name} ${person.email}`.toLowerCase().includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
    return rows;
  }, [enriched, query, statusFilter, reportsFilter, joinedFilter, sort]);

  const selected = list.find((person) => person.id === selectedId) || null;
  const pageSize = 8;
  const pageRows = list.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = Math.max(
    0,
    (data.counts.members || 0) - (data.counts.suspended || 0)
  );

  const memberHistory = useMemo(() => {
    if (!selected) return [];
    return (data.history || []).filter(
      (item) => item.target_type === 'profiles' && item.target_id === selected.id
    );
  }, [data.history, selected]);

  async function confirmAction() {
    if (!pendingAction) return;
    const ok = await run(pendingAction.action, pendingAction.id, reason);
    if (ok) {
      setPendingAction(null);
      setReason('');
    }
  }

  return (
    <div className={pendingAction ? 'pb-44' : undefined}>
      <PageHeader
        title='Members'
        description='Manage accounts, participation and member reports.'
      />

      <div className='mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Total members' value={data.counts.members ?? 0} icon={Users} tone='green' />
        <StatCard label='Active' value={activeCount} icon={UserRound} tone='green' />
        <StatCard
          label='Suspended'
          value={data.counts.suspended ?? 0}
          icon={Ban}
          tone='pink'
        />
        <StatCard
          label='Members with reports'
          value={data.counts.membersWithReports ?? 0}
          icon={AlertTriangle}
          tone='yellow'
        />
      </div>

      <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center'>
        <label className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-3.5 size-4 text-[#68796b]' />
          <input
            className={`${field} pl-9`}
            placeholder='Search by name or email...'
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          className={`${field} xl:max-w-[160px]`}
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Account status</option>
          <option value='active'>Active</option>
          <option value='suspended'>Suspended</option>
        </select>
        <select
          className={`${field} xl:max-w-[140px]`}
          value={reportsFilter}
          onChange={(event) => {
            setReportsFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Reports</option>
          <option value='with'>Has reports</option>
          <option value='without'>No reports</option>
        </select>
        <select
          className={`${field} xl:max-w-[150px]`}
          value={joinedFilter}
          onChange={(event) => {
            setJoinedFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Joined date</option>
          <option value='7d'>Last 7 days</option>
          <option value='30d'>Last 30 days</option>
          <option value='90d'>Last 90 days</option>
        </select>
        <button
          type='button'
          onClick={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
          className='min-h-11 rounded-xl border border-[#d7e3d8] bg-white px-3 text-xs font-bold text-[#276837]'
        >
          Sort: {sort === 'newest' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <section className={`${card} !p-0 overflow-hidden`}>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='border-b border-[#e4ece5] bg-[#f7faf6] text-xs font-bold uppercase tracking-wide text-[#68796b]'>
                <tr>
                  <th className='px-4 py-3 w-10'>
                    <span className='sr-only'>Select</span>
                  </th>
                  <th className='px-4 py-3'>Member</th>
                  <th className='px-4 py-3'>Account status</th>
                  <th className='px-4 py-3'>Joined</th>
                  <th className='px-4 py-3'>Hosted</th>
                  <th className='px-4 py-3'>Joined plans</th>
                  <th className='px-4 py-3'>Reports</th>
                  <th className='px-4 py-3'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((person) => {
                  const active = selected?.id === person.id;
                  return (
                    <tr
                      key={person.id}
                      className={`border-b border-[#eef3ee] last:border-0 ${
                        active ? 'bg-[#edf6ec]' : 'hover:bg-[#f7faf6]'
                      }`}
                    >
                      <td className='px-4 py-3'>
                        <input
                          type='checkbox'
                          checked={active}
                          onChange={() => setSelectedId(active ? null : person.id)}
                          aria-label={`Select ${person.display_name}`}
                          className='size-4 rounded border-[#cadacb]'
                        />
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          type='button'
                          className='flex items-center gap-3 text-left'
                          onClick={() => setSelectedId(person.id)}
                        >
                          <span className='grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8f2e8] text-xs font-extrabold text-[#246538]'>
                            {person.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={person.avatarUrl}
                                alt=''
                                className='size-full object-cover'
                              />
                            ) : (
                              (person.initials || person.display_name || '?').slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <span>
                            <span className='block font-bold'>{person.display_name}</span>
                            <span className='block text-xs text-[#657467]'>{person.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className='px-4 py-3'>
                        <Badge tone={person.suspended_at ? 'pink' : 'green'}>
                          {person.suspended_at ? 'Suspended' : 'Active'}
                        </Badge>
                      </td>
                      <td className='px-4 py-3 text-[#506653]'>{formatDate(person.created_at)}</td>
                      <td className='px-4 py-3 font-semibold'>{person.hosted}</td>
                      <td className='px-4 py-3 font-semibold'>{person.joined}</td>
                      <td className='px-4 py-3'>
                        {person.reportCount > 0 ? (
                          <span
                            className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                              person.reportCount > 1
                                ? 'bg-[#ffe5f0] text-[#9a285e]'
                                : 'bg-[#fff1c8] text-[#805800]'
                            }`}
                          >
                            {person.reportCount}
                          </span>
                        ) : (
                          <span className='text-[#7a8b7d]'>0</span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => setSelectedId(person.id)}
                            className='min-h-9 rounded-lg border border-[#cadacb] px-3 text-xs font-bold text-[#276837]'
                          >
                            View
                          </button>
                          <button
                            type='button'
                            aria-label='More actions'
                            onClick={() => setSelectedId(person.id)}
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
              <Empty text='No matching members.' />
            </div>
          )}
          <div className='border-t border-[#e4ece5] px-4'>
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={list.length}
              onPageChange={setPage}
            />
          </div>
        </section>

        {selected && (
          <aside className={`${card} flex max-h-[min(70dvh,640px)] flex-col overflow-hidden !p-0 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)]`}>
            <div className='flex items-start justify-between gap-3 border-b border-[#e4ece5] px-4 py-4'>
              <div className='flex min-w-0 items-start gap-3'>
                <span className='grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8f2e8] text-sm font-extrabold text-[#246538]'>
                  {selected.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.avatarUrl} alt='' className='size-full object-cover' />
                  ) : (
                    (selected.initials || selected.display_name || '?').slice(0, 2).toUpperCase()
                  )}
                </span>
                <div className='min-w-0'>
                  <h2 className='font-heading text-xl font-extrabold'>{selected.display_name}</h2>
                  <p className='truncate text-sm text-[#657467]'>{selected.email}</p>
                  <Link
                    href='/app/profile'
                    className='mt-1 inline-block text-xs font-bold text-[#256739]'
                  >
                    View public profile
                  </Link>
                </div>
              </div>
              <button
                type='button'
                aria-label='Close member details'
                onClick={() => setSelectedId(null)}
                className='grid size-9 place-items-center rounded-full hover:bg-[#edf2ed]'
              >
                <X className='size-4' />
              </button>
            </div>

            <div className='overflow-y-auto px-4 py-4'>
              <dl className='grid gap-3 text-sm'>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Joined</dt>
                  <dd className='font-semibold'>{formatDate(selected.created_at)}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Hosted plans</dt>
                  <dd className='font-semibold'>{selected.hosted}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Joined plans</dt>
                  <dd className='font-semibold'>{selected.joined}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Reports</dt>
                  <dd>
                    {selected.reportCount > 0 ? (
                      <Badge tone='yellow'>{selected.reportCount}</Badge>
                    ) : (
                      <span className='font-semibold'>0</span>
                    )}
                  </dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Account</dt>
                  <dd>
                    <Badge tone={selected.suspended_at ? 'pink' : 'green'}>
                      {selected.suspended_at ? 'Suspended' : 'Active'}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <section className='mt-5'>
                <h3 className='text-sm font-extrabold'>Recent reports</h3>
                {selected.reports.length ? (
                  <ul className='mt-2 grid gap-2'>
                    {selected.reports.slice(0, 5).map((report) => (
                      <li key={report.id} className='rounded-xl bg-[#f7faf6] px-3 py-2 text-xs'>
                        <p className='font-semibold'>{report.reason}</p>
                        <div className='mt-1 flex items-center justify-between gap-2 text-[#68796b]'>
                          <span>{formatDate(report.created_at)}</span>
                          <button
                            type='button'
                            onClick={() => onReviewReport?.(report.id)}
                            className='font-bold text-[#256739] hover:underline'
                          >
                            Review report
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='mt-2 text-xs text-[#68796b]'>No reports for this member.</p>
                )}
              </section>

              <section className='mt-5'>
                <h3 className='text-sm font-extrabold'>Recent moderation history</h3>
                {memberHistory.length ? (
                  <ul className='mt-2 grid gap-2'>
                    {memberHistory.slice(0, 5).map((item) => (
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
              <button
                type='button'
                onClick={() => {
                  setPendingAction({
                    action: selected.suspended_at ? 'reinstate_member' : 'suspend_member',
                    id: selected.id,
                    name: selected.display_name,
                    reinstate: Boolean(selected.suspended_at)
                  });
                  setReason('');
                }}
                className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${
                  selected.suspended_at
                    ? 'border-[#cadacb] text-[#276837]'
                    : 'border-[#f3b4d0] text-[#9a285e]'
                }`}
              >
                {selected.suspended_at ? (
                  <>
                    <ShieldOff className='size-4' /> Reinstate member
                  </>
                ) : (
                  <>
                    <Ban className='size-4' /> Suspend member
                  </>
                )}
              </button>
            </div>
          </aside>
        )}
      </div>

      {pendingAction && (
        <ReasonBar
          title='Moderation action'
          prompt={
            pendingAction.reinstate
              ? `Reinstate ${pendingAction.name}? Provide a reason. This will be recorded in the admin history.`
              : `Suspend ${pendingAction.name}? Provide a reason for suspension. This will be recorded in the admin history.`
          }
          reason={reason}
          setReason={setReason}
          onCancel={() => {
            setPendingAction(null);
            setReason('');
          }}
          onConfirm={confirmAction}
          confirmLabel={pendingAction.reinstate ? 'Confirm reinstatement' : 'Confirm suspension'}
          busy={busy}
          tone={pendingAction.reinstate ? 'green' : 'pink'}
        />
      )}
    </div>
  );
}
