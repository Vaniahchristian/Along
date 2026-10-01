'use client';

import { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  EyeOff,
  FileText,
  Flag,
  Lock,
  Mail,
  Megaphone,
  Search,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { ListPagination } from '@/components/ui/list-pagination';
import {
  Badge,
  Empty,
  StatCard,
  actionLabel,
  card,
  field,
  formatDateTime,
  shortId
} from '@/components/admin/shared';

function actionIcon(action) {
  if (action === 'send_broadcast') return Megaphone;
  if (action?.includes('report')) return Flag;
  if (action === 'hide_plan') return EyeOff;
  if (action?.includes('member')) return Ban;
  return FileText;
}

function resultMeta(item) {
  if (item.action === 'send_broadcast') {
    return {
      label: 'Queued',
      tone: 'orange',
      detail: 'Not delivered'
    };
  }
  return { label: 'Completed', tone: 'green', detail: null };
}

function targetLabel(item, data) {
  if (item.action === 'send_broadcast') {
    const count = item.details?.recipient_count ?? item.details?.email_count;
    const subject = item.details?.subject || item.reason || 'Broadcast';
    return count != null ? `${subject} · ${count} recipients` : subject;
  }
  if (item.target_type === 'plans') {
    const plan = (data.plans || []).find((row) => row.id === item.target_id);
    return plan?.title || item.target_id;
  }
  if (item.target_type === 'profiles') {
    const member = (data.members || []).find((row) => row.id === item.target_id);
    return member
      ? `${member.display_name}${member.email ? ` · ${member.email}` : ''}`
      : item.target_id;
  }
  if (item.target_type === 'plan_reports') {
    const report = (data.reports || []).find((row) => row.id === item.target_id);
    return report
      ? `${shortId('R', report.id)} · ${report.plan?.title || 'Report'}`
      : shortId('R', item.target_id);
  }
  return item.target_id || '—';
}

function exportCsv(rows, data) {
  const header = ['Date', 'Admin', 'Action', 'Target', 'Reason', 'Result'];
  const lines = rows.map((item) => {
    const result = resultMeta(item);
    return [
      formatDateTime(item.created_at),
      item.actor?.display_name || item.actor?.email || 'Admin',
      actionLabel(item.action),
      targetLabel(item, data),
      item.reason || '',
      result.detail ? `${result.label} (${result.detail})` : result.label
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(',');
  });
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tagwimi-admin-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function HistoryView({ data }) {
  const [query, setQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const actors = useMemo(() => {
    const map = new Map();
    for (const item of data.history || []) {
      if (!item.actor_id) continue;
      map.set(item.actor_id, item.actor?.display_name || item.actor?.email || 'Admin');
    }
    return [...map.entries()];
  }, [data.history]);

  const actions = useMemo(
    () => [...new Set((data.history || []).map((item) => item.action).filter(Boolean))],
    [data.history]
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data.history || []).filter((item) => {
      if (actorFilter !== 'all' && item.actor_id !== actorFilter) return false;
      if (actionFilter !== 'all' && item.action !== actionFilter) return false;
      if (dateFilter) {
        const day = item.created_at?.slice(0, 10);
        if (day !== dateFilter) return false;
      }
      if (!q) return true;
      return `${actionLabel(item.action)} ${item.reason || ''} ${item.target_id || ''} ${targetLabel(item, data)} ${item.actor?.display_name || ''} ${item.id}`
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, actorFilter, actionFilter, dateFilter]);

  const selected = list.find((item) => item.id === selectedId) || null;
  const pageSize = 8;
  const pageRows = list.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='font-heading text-3xl font-extrabold tracking-[-.04em] md:text-4xl'>
            Admin history
          </h1>
          <p className='mt-1 text-sm text-[#657467]'>Who changed what, when, and why.</p>
        </div>
        <button
          type='button'
          onClick={() => exportCsv(list, data)}
          className='inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cadacb] bg-white px-4 text-sm font-bold text-[#276837]'
        >
          <Download className='size-4' />
          Export CSV
        </button>
      </div>

      <p className='mb-4 flex items-center gap-2 rounded-xl border border-[#e4ece5] bg-[#f3f6f1] px-4 py-3 text-sm text-[#506653]'>
        <Lock className='size-4 shrink-0' />
        Read-only audit log. Records cannot be edited or deleted here.
      </p>

      <div className='mb-5 grid gap-3 sm:grid-cols-3'>
        <StatCard
          label='Actions today'
          value={data.counts.actionsToday ?? 0}
          icon={Megaphone}
          tone='pink'
        />
        <StatCard
          label='Broadcasts queued'
          value={data.counts.broadcastsQueued ?? 0}
          icon={Clock3}
          tone='yellow'
        />
        <StatCard
          label='Moderation actions'
          value={data.counts.moderationActions ?? 0}
          icon={Users}
          tone='green'
        />
      </div>

      <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center'>
        <label className='relative min-w-0 flex-1'>
          <Search className='absolute left-3 top-3.5 size-4 text-[#68796b]' />
          <input
            className={`${field} pl-9`}
            placeholder='Search by action, member, plan or record ID...'
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          className={`${field} xl:max-w-[160px]`}
          value={actorFilter}
          onChange={(event) => {
            setActorFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>All actors</option>
          {actors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          className={`${field} xl:max-w-[180px]`}
          value={actionFilter}
          onChange={(event) => {
            setActionFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value='all'>All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
        <input
          type='date'
          className={`${field} xl:max-w-[170px]`}
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <section className={`${card} !p-0 overflow-hidden`}>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='border-b border-[#e4ece5] bg-[#f7faf6] text-xs font-bold uppercase tracking-wide text-[#68796b]'>
                <tr>
                  <th className='px-4 py-3'>Date & time (EAT)</th>
                  <th className='px-4 py-3'>Admin</th>
                  <th className='px-4 py-3'>Action</th>
                  <th className='px-4 py-3'>Target</th>
                  <th className='px-4 py-3'>Reason / summary</th>
                  <th className='px-4 py-3'>Result</th>
                  <th className='px-4 py-3'>Details</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item) => {
                  const Icon = actionIcon(item.action);
                  const result = resultMeta(item);
                  const active = selected?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-[#eef3ee] last:border-0 ${
                        active ? 'bg-[#edf6ec]' : 'hover:bg-[#f7faf6]'
                      }`}
                    >
                      <td className='px-4 py-3 text-[#506653]'>{formatDateTime(item.created_at)}</td>
                      <td className='px-4 py-3'>
                        <span className='inline-flex items-center gap-2'>
                          <span className='grid size-7 place-items-center rounded-full bg-[#e8f2e8] text-[10px] font-extrabold text-[#246538]'>
                            {(item.actor?.display_name || 'A').slice(0, 1).toUpperCase()}
                          </span>
                          {item.actor?.display_name || 'Admin'}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <span className='inline-flex items-center gap-2 font-semibold'>
                          <Icon className='size-4 text-[#68796b]' />
                          {actionLabel(item.action)}
                        </span>
                      </td>
                      <td className='max-w-[220px] truncate px-4 py-3'>{targetLabel(item, data)}</td>
                      <td className='max-w-[220px] truncate px-4 py-3 text-[#506653]'>
                        {item.reason || item.details?.subject || '—'}
                      </td>
                      <td className='px-4 py-3'>
                        <Badge tone={result.tone}>{result.label}</Badge>
                        {result.detail && (
                          <p className='mt-1 text-[11px] text-[#7a8b7d]'>{result.detail}</p>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <button
                          type='button'
                          aria-label='View details'
                          onClick={() => setSelectedId(item.id)}
                          className='inline-flex items-center gap-1 rounded-lg border border-[#cadacb] px-2 py-1.5 text-[#276837]'
                        >
                          <FileText className='size-3.5' />
                          <ChevronRight className='size-3.5' />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!list.length && (
            <div className='p-4'>
              <Empty text='No admin actions match these filters.' />
            </div>
          )}
          <div className='border-t border-[#e4ece5] px-4'>
            <ListPagination page={page} pageSize={pageSize} total={list.length} onPageChange={setPage} />
          </div>
        </section>

        {selected && (
          <aside className={`${card} sticky top-20 flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden !p-0`}>
            <div className='flex items-start justify-between gap-3 border-b border-[#e4ece5] px-4 py-4'>
              <div className='flex items-start gap-3'>
                <span className='grid size-10 place-items-center rounded-2xl bg-[#ffe5f0] text-[#9a285e]'>
                  {(() => {
                    const Icon = actionIcon(selected.action);
                    return <Icon className='size-5' />;
                  })()}
                </span>
                <div>
                  <h2 className='font-heading text-xl font-extrabold'>{actionLabel(selected.action)}</h2>
                  <p className='mt-1 flex items-center gap-1 text-xs font-semibold text-[#68796b]'>
                    {shortId('AUD', selected.id)}
                    <button
                      type='button'
                      aria-label='Copy event id'
                      onClick={() => navigator.clipboard?.writeText(selected.id)}
                      className='rounded p-0.5 hover:bg-[#edf2ed]'
                    >
                      <Copy className='size-3.5' />
                    </button>
                  </p>
                </div>
              </div>
              <button
                type='button'
                aria-label='Close details'
                onClick={() => setSelectedId(null)}
                className='grid size-9 place-items-center rounded-full hover:bg-[#edf2ed]'
              >
                <X className='size-4' />
              </button>
            </div>

            <div className='overflow-y-auto px-4 py-4 text-sm'>
              <dl className='grid gap-3'>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Actor</dt>
                  <dd className='font-semibold'>{selected.actor?.display_name || 'Admin'}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Date & time (EAT)</dt>
                  <dd className='font-semibold'>{formatDateTime(selected.created_at)}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Target</dt>
                  <dd className='max-w-[180px] text-right font-semibold'>{targetLabel(selected, data)}</dd>
                </div>
                <div className='flex justify-between gap-3'>
                  <dt className='text-[#68796b]'>Reason</dt>
                  <dd className='max-w-[180px] text-right font-semibold'>{selected.reason || '—'}</dd>
                </div>
                {selected.action === 'send_broadcast' && (
                  <>
                    <div className='flex justify-between gap-3'>
                      <dt className='inline-flex items-center gap-1 text-[#68796b]'>
                        <Mail className='size-3.5' /> Channel
                      </dt>
                      <dd className='font-semibold capitalize'>{selected.details?.channel || 'email'}</dd>
                    </div>
                    <div className='flex justify-between gap-3'>
                      <dt className='inline-flex items-center gap-1 text-[#68796b]'>
                        <Users className='size-3.5' /> Recipients
                      </dt>
                      <dd className='font-semibold'>{selected.details?.recipient_count ?? '—'}</dd>
                    </div>
                    <div className='flex justify-between gap-3'>
                      <dt className='inline-flex items-center gap-1 text-[#68796b]'>
                        <Clock3 className='size-3.5' /> Queued
                      </dt>
                      <dd className='font-semibold'>{selected.details?.email_count ?? '—'}</dd>
                    </div>
                    <div className='flex justify-between gap-3'>
                      <dt className='inline-flex items-center gap-1 text-[#68796b]'>
                        <CheckCircle2 className='size-3.5' /> Delivered
                      </dt>
                      <dd className='font-semibold'>Pending</dd>
                    </div>
                    <div className='flex justify-between gap-3'>
                      <dt className='inline-flex items-center gap-1 text-[#68796b]'>
                        <XCircle className='size-3.5' /> Failed
                      </dt>
                      <dd className='font-semibold'>0</dd>
                    </div>
                  </>
                )}
              </dl>

              {selected.action === 'send_broadcast' && (
                <p className='mt-4 rounded-xl bg-[#fff1c8] px-3 py-2.5 text-xs font-semibold text-[#805800]'>
                  Queued does not mean delivered. This broadcast is in the delivery queue. Delivery may
                  take a few minutes.
                </p>
              )}

              {(selected.details?.before || selected.details?.after || selected.details?.subject) && (
                <section className='mt-5'>
                  <h3 className='text-sm font-extrabold'>Before / after</h3>
                  <div className='mt-2 grid gap-2 rounded-xl bg-[#f7faf6] px-3 py-3 text-xs'>
                    {selected.details?.before &&
                      Object.keys(selected.details.before).map((key) => (
                        <p key={key}>
                          <span className='font-bold capitalize'>{key.replaceAll('_', ' ')}:</span>{' '}
                          {String(selected.details.before[key] ?? '—')} →{' '}
                          {String(selected.details.after?.[key] ?? '—')}
                        </p>
                      ))}
                    {selected.action === 'send_broadcast' && (
                      <>
                        {selected.details?.audience && (
                          <p>
                            <span className='font-bold'>Audience:</span>{' '}
                            {selected.details.audience === 'all' ? 'All members' : 'Selected members'}
                          </p>
                        )}
                        {selected.details?.subject && (
                          <p>
                            <span className='font-bold'>Subject:</span> {selected.details.subject}
                          </p>
                        )}
                        {selected.details?.body && (
                          <p className='whitespace-pre-wrap text-[#506653]'>{selected.details.body}</p>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
