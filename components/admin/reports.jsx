'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flag,
  Search
} from 'lucide-react';
import { ListPagination } from '@/components/ui/list-pagination';
import {
  Badge,
  Empty,
  PageHeader,
  StatCard,
  actionLabel,
  card,
  field,
  formatDateTime,
  shortId
} from '@/components/admin/shared';

function reportStatus(report) {
  if (report.status === 'resolved') return { label: 'Resolved', tone: 'green', key: 'resolved' };
  if (report.assigned_admin_id) return { label: 'In review', tone: 'yellow', key: 'in_review' };
  return { label: 'Open', tone: 'pink', key: 'open' };
}

function typeLabel(type) {
  if (type === 'plan') return 'Plan';
  if (type === 'member') return 'Member';
  if (type === 'message') return 'Message';
  if (type === 'image') return 'Image';
  return type || 'Report';
}

function initials(person) {
  return (person?.initials || person?.display_name || '?').slice(0, 2).toUpperCase();
}

export function Reports({ data, run, busy, selectedId }) {
  const [selected, setSelected] = useState(selectedId);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('evidence');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (selectedId) setSelected(selectedId);
  }, [selectedId]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = (data.reports || []).filter((report) => {
      const status = reportStatus(report).key;
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (typeFilter !== 'all' && report.target_type !== typeFilter) return false;
      if (priorityFilter !== 'all' && report.priority !== priorityFilter) return false;
      if (assignedFilter === 'me' && !report.assigned_admin_id) return false;
      if (assignedFilter === 'unassigned' && report.assigned_admin_id) return false;
      if (!q) return true;
      return `${shortId('R', report.id)} ${report.plan?.title || ''} ${report.reason || ''} ${report.evidence_text || ''} ${report.reporter?.display_name || ''} ${report.subject?.display_name || ''} ${report.id}`
        .toLowerCase()
        .includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
    return rows;
  }, [data.reports, query, statusFilter, typeFilter, priorityFilter, assignedFilter, sort]);

  const report = list.find((item) => item.id === selected) || list[0] || null;
  useEffect(() => {
    if (report) {
      setSelected(report.id);
      setNote(report.review_note || '');
      setTab('evidence');
    }
  }, [report?.id]);

  const pageSize = 8;
  const pageRows = list.slice((page - 1) * pageSize, page * pageSize);
  const activity = useMemo(() => {
    if (!report) return [];
    return (data.history || []).filter(
      (item) => item.target_type === 'plan_reports' && item.target_id === report.id
    );
  }, [data.history, report]);

  async function saveNote() {
    if (note.trim().length < 3) return;
    await run('note_report', report.id, note.trim());
  }

  async function resolve() {
    if (note.trim().length < 3) return;
    const ok = await run(
      report.status === 'open' ? 'resolve_report' : 'reopen_report',
      report.id,
      note.trim()
    );
    if (ok) setNote('');
  }

  return (
    <>
      <PageHeader
        title='Reports'
        description='Review concerns, document decisions and track outcomes.'
      />

      <div className='mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          label='Open'
          value={data.counts.openUnassigned ?? data.counts.openReports ?? 0}
          icon={Flag}
          tone='pink'
        />
        <StatCard label='In review' value={data.counts.inReview ?? 0} icon={Clock3} tone='yellow' />
        <StatCard
          label='High priority'
          value={data.counts.highPriority ?? 0}
          icon={AlertTriangle}
          tone='orange'
        />
        <StatCard
          label='Resolved'
          value={data.counts.resolvedReports ?? 0}
          icon={CheckCircle2}
          tone='green'
        />
      </div>

      <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center'>
        <label className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-3.5 size-4 text-[#68796b]' />
          <input
            className={`${field} pl-9`}
            placeholder='Search reports by plan, message, member or ID...'
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className='inline-flex flex-wrap rounded-xl border border-[#d7e3d8] bg-white p-1'>
          {[
            ['open', 'Open'],
            ['in_review', 'In review'],
            ['resolved', 'Resolved'],
            ['all', 'All']
          ].map(([value, label]) => (
            <button
              key={value}
              type='button'
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={`min-h-9 rounded-lg px-3 text-xs font-bold ${
                statusFilter === value ? 'bg-[#e8f2e8] text-[#246538]' : 'text-[#657467]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className={`${field} xl:max-w-[130px]`}
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>All types</option>
          <option value='plan'>Plan</option>
          <option value='member'>Member</option>
          <option value='message'>Message</option>
          <option value='image'>Image</option>
        </select>
        <select
          className={`${field} xl:max-w-[140px]`}
          value={priorityFilter}
          onChange={(event) => {
            setPriorityFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>All priorities</option>
          <option value='normal'>Normal</option>
          <option value='high'>High</option>
        </select>
        <select
          className={`${field} xl:max-w-[140px]`}
          value={assignedFilter}
          onChange={(event) => {
            setAssignedFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>Assigned to</option>
          <option value='unassigned'>Unassigned</option>
          <option value='me'>Assigned</option>
        </select>
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.15fr)]'>
        <section className={`${card} !p-0 overflow-hidden`}>
          <div className='flex items-center justify-between gap-3 border-b border-[#e4ece5] px-4 py-3'>
            <p className='text-sm font-bold'>{list.length} reports</p>
            <button
              type='button'
              onClick={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
              className='text-xs font-bold text-[#276837]'
            >
              Sort: {sort === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
          </div>
          <div className='divide-y divide-[#eef3ee]'>
            {pageRows.map((item) => {
              const status = reportStatus(item);
              const active = report?.id === item.id;
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setSelected(item.id)}
                  className={`block w-full px-4 py-3.5 text-left hover:bg-[#f7faf6] ${
                    active ? 'bg-[#edf6ec]' : ''
                  }`}
                >
                  <span className='flex flex-wrap items-center gap-2'>
                    <span className='text-xs font-bold text-[#68796b]'>{shortId('R', item.id)}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <Badge tone={item.priority === 'high' ? 'orange' : 'yellow'}>
                      {item.priority === 'high' ? 'High' : 'Normal'}
                    </Badge>
                  </span>
                  <strong className='mt-2 block text-sm'>
                    {item.plan?.title || typeLabel(item.target_type)}
                  </strong>
                  <span className='mt-1 block text-xs text-[#68796b]'>
                    {item.reason} · {typeLabel(item.target_type)}
                  </span>
                  <span className='mt-1 block text-xs text-[#7a8b7d]'>
                    {formatDateTime(item.created_at)}
                  </span>
                  <span className='mt-2 flex items-center gap-2 text-xs font-semibold text-[#506653]'>
                    <span className='grid size-6 place-items-center overflow-hidden rounded-full bg-[#e8f2e8] text-[10px] font-extrabold text-[#246538]'>
                      {item.reporter?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.reporter.avatarUrl} alt='' className='size-full object-cover' />
                      ) : (
                        initials(item.reporter)
                      )}
                    </span>
                    {item.reporter?.display_name || 'Member'}
                  </span>
                </button>
              );
            })}
          </div>
          {!list.length && (
            <div className='p-4'>
              <Empty text='No reports match these filters.' />
            </div>
          )}
          <div className='border-t border-[#e4ece5] px-4'>
            <ListPagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
          </div>
        </section>

        {report ? (
          <section className={`${card} flex flex-col !p-0 overflow-hidden`}>
            <div className='flex flex-wrap items-center gap-2 border-b border-[#e4ece5] px-4 py-3'>
              <span className='text-sm font-extrabold'>{shortId('R', report.id)}</span>
              <Badge tone={reportStatus(report).tone}>{reportStatus(report).label}</Badge>
              <select
                className='min-h-9 rounded-lg border border-[#d7e3d8] bg-white px-2 text-xs font-bold'
                value={report.priority || 'normal'}
                disabled={busy || report.status !== 'open'}
                onChange={(event) =>
                  run('prioritize_report', report.id, 'Priority updated', {
                    priority: event.target.value
                  })
                }
              >
                <option value='normal'>Normal priority</option>
                <option value='high'>High priority</option>
              </select>
              {!report.assigned_admin_id && report.status === 'open' && (
                <button
                  type='button'
                  disabled={busy}
                  onClick={() => run('assign_report', report.id, 'Assigned for review')}
                  className='min-h-9 rounded-lg border border-[#cadacb] px-3 text-xs font-bold text-[#276837]'
                >
                  Assign to me
                </button>
              )}
            </div>

            <div className='overflow-y-auto px-4 py-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <h2 className='font-heading text-2xl font-extrabold tracking-tight'>
                  {report.plan?.title || typeLabel(report.target_type)}
                </h2>
                {report.plan_id && (
                  <Link
                    href={`/p/${report.plan_id}`}
                    target='_blank'
                    className='inline-flex items-center gap-1 text-xs font-bold text-[#256739]'
                  >
                    View plan <ExternalLink className='size-3.5' />
                  </Link>
                )}
              </div>

              <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                <div className='rounded-xl bg-[#f7faf6] p-3 text-sm'>
                  <p className='text-xs font-bold text-[#68796b]'>Reported by</p>
                  <p className='mt-1 font-semibold'>{report.reporter?.display_name || 'Member'}</p>
                </div>
                <div className='rounded-xl bg-[#f7faf6] p-3 text-sm'>
                  <p className='text-xs font-bold text-[#68796b]'>Reported member</p>
                  <p className='mt-1 font-semibold'>{report.subject?.display_name || '—'}</p>
                </div>
                <div className='rounded-xl bg-[#f7faf6] p-3 text-sm'>
                  <p className='text-xs font-bold text-[#68796b]'>Submitted</p>
                  <p className='mt-1 font-semibold'>{formatDateTime(report.created_at)}</p>
                </div>
              </div>

              <div className='mt-4'>
                <p className='text-xs font-bold text-[#68796b]'>Reason for report</p>
                <div className='mt-2'>
                  <Badge tone='pink'>{report.reason}</Badge>
                </div>
              </div>

              <div className='mt-5 flex gap-4 border-b border-[#e4ece5] text-sm font-bold'>
                {[
                  ['evidence', 'Evidence'],
                  ['notes', `Notes (${report.review_note ? 1 : 0})`],
                  ['activity', `Activity (${activity.length})`]
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type='button'
                    onClick={() => setTab(id)}
                    className={`pb-2 ${
                      tab === id
                        ? 'border-b-2 border-[#256739] text-[#246538]'
                        : 'text-[#7a8b7d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'evidence' && (
                <div className='mt-4 grid gap-4'>
                  <div>
                    <p className='mb-2 text-xs font-bold text-[#68796b]'>Member&apos;s report</p>
                    <blockquote className='rounded-xl bg-[#fff2f7] px-4 py-3 text-sm italic text-[#7a2858]'>
                      “{report.evidence_text || report.reason || 'No written evidence provided.'}”
                    </blockquote>
                  </div>
                  {report.image_path && (
                    <a
                      href={`/api/admin/report-media/${report.id}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm font-bold text-[#256739] underline'
                    >
                      View reported media
                    </a>
                  )}
                  {report.plan && (
                    <div>
                      <p className='mb-2 text-xs font-bold text-[#68796b]'>
                        Plan snapshot (at time of report)
                      </p>
                      <div className='flex gap-3 rounded-xl border border-[#e4ece5] bg-white p-3'>
                        <span className='size-16 shrink-0 overflow-hidden rounded-xl bg-[#e8f2e8]'>
                          {report.plan.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={report.plan.imageUrl}
                              alt=''
                              className='size-full object-cover'
                            />
                          ) : null}
                        </span>
                        <div className='min-w-0 text-sm'>
                          <p className='font-bold'>{report.plan.title}</p>
                          <p className='text-[#657467]'>{report.plan.venue || '—'}</p>
                          <p className='text-xs text-[#7a8b7d]'>
                            {report.plan.date_label} · {report.plan.time_label}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'notes' && (
                <div className='mt-4'>
                  {report.review_note ? (
                    <p className='rounded-xl bg-[#f7faf6] px-4 py-3 text-sm whitespace-pre-wrap'>
                      {report.review_note}
                    </p>
                  ) : (
                    <Empty text='No moderation notes yet.' />
                  )}
                </div>
              )}

              {tab === 'activity' && (
                <div className='mt-4 grid gap-2'>
                  {activity.length ? (
                    activity.map((item) => (
                      <div key={item.id} className='rounded-xl bg-[#f7faf6] px-3 py-2 text-xs'>
                        <p className='font-semibold'>{actionLabel(item.action)}</p>
                        <p className='mt-1 text-[#68796b]'>
                          {item.actor?.display_name || 'Admin'} · {formatDateTime(item.created_at)}
                        </p>
                        {item.reason && <p className='mt-1'>{item.reason}</p>}
                      </div>
                    ))
                  ) : (
                    <Empty text='No activity recorded for this report.' />
                  )}
                </div>
              )}
            </div>

            <div className='mt-auto border-t border-[#e4ece5] bg-[#f7faf6] px-4 py-4'>
              <h3 className='text-sm font-extrabold'>Add moderation note and resolution</h3>
              <label className='mt-3 block text-xs font-bold'>
                Resolution reason (required)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 500))}
                  rows={3}
                  maxLength={500}
                  placeholder='Add a note about your decision, what you checked and next steps...'
                  className='mt-1.5 w-full rounded-xl border border-[#d7e3d8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#3b793f]'
                />
              </label>
              <div className='mt-3 flex flex-wrap gap-2'>
                <button
                  type='button'
                  disabled={busy || note.trim().length < 3}
                  onClick={saveNote}
                  className='min-h-10 rounded-xl border border-[#cadacb] bg-white px-4 text-sm font-bold text-[#276837] disabled:opacity-50'
                >
                  Save note
                </button>
                <button
                  type='button'
                  disabled={busy || note.trim().length < 3}
                  onClick={resolve}
                  className='min-h-10 rounded-xl bg-[#256739] px-4 text-sm font-bold text-white disabled:opacity-50'
                >
                  {report.status === 'open' ? 'Resolve report' : 'Reopen report'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <Empty text='Select a report to review.' />
        )}
      </div>
    </>
  );
}
