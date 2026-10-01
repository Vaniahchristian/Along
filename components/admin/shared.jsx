'use client';

export const field =
  'min-h-11 w-full rounded-xl border border-[#d7e3d8] bg-white px-3 text-sm outline-none focus:border-[#3b793f]';
export const button =
  'min-h-10 rounded-xl bg-[#256739] px-4 text-sm font-bold text-white disabled:opacity-50';
export const card =
  'rounded-[22px] border border-[#dde8df] bg-white p-5 shadow-[0_7px_30px_rgba(15,34,24,.035)]';

export function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '—';
}

export function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Africa/Kampala',
        timeZoneName: 'short'
      })
    : '—';
}

export function shortId(prefix, id) {
  if (!id) return `${prefix}-—`;
  return `${prefix}-${String(id).replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export function actionLabel(action) {
  const labels = {
    send_broadcast: 'Broadcast queued',
    cancel_plan: 'Plan cancelled',
    hide_plan: 'Plan hidden',
    reopen_plan: 'Plan reopened',
    suspend_member: 'Member suspended',
    reinstate_member: 'Member reinstated',
    resolve_report: 'Report resolved',
    reopen_report: 'Report reopened',
    prioritize_report: 'Report priority changed',
    assign_report: 'Report assigned',
    note_report: 'Report note saved'
  };
  if (labels[action]) return labels[action];
  return String(action || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function scheduled(plan) {
  const label = String(plan.date_label || '').replace(/^[A-Za-z]{3},?\s+/, '');
  const year = new Date(plan.created_at).getUTCFullYear();
  let stamp = Date.parse(`${label} ${year} ${plan.time_label} GMT+0300`);
  if (stamp < new Date(plan.created_at).getTime() - 864e5)
    stamp = Date.parse(`${label} ${year + 1} ${plan.time_label} GMT+0300`);
  return stamp;
}

export function Badge({ children, tone = 'green' }) {
  const tones = {
    green: 'bg-[#e6f3e9] text-[#226337]',
    pink: 'bg-[#ffe5f0] text-[#9a285e]',
    yellow: 'bg-[#fff1c8] text-[#805800]',
    orange: 'bg-[#ffe8d6] text-[#9a3412]',
    gray: 'bg-[#edf1ee] text-[#526457]',
    blue: 'bg-[#e4f0ff] text-[#1d4f8c]',
    red: 'bg-[#ffe8e8] text-[#9b2c2c]'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.green}`}
    >
      {children}
    </span>
  );
}

export function Empty({ text }) {
  return <p className='rounded-xl bg-[#f4f8f2] p-5 text-sm text-[#586e5e]'>{text}</p>;
}

export function StatCard({ label, value, icon: Icon, tone = 'green' }) {
  const tones = {
    green: 'bg-[#e8f4ea] text-[#246538]',
    pink: 'bg-[#ffe5f0] text-[#9a285e]',
    yellow: 'bg-[#fff1c8] text-[#805800]',
    orange: 'bg-[#ffe8d6] text-[#9a3412]',
    gray: 'bg-[#edf1ee] text-[#526457]',
    red: 'bg-[#ffe8e8] text-[#9b2c2c]'
  };
  return (
    <div className={`${card} flex items-center gap-3 !p-4`}>
      <span className={`grid size-11 place-items-center rounded-2xl ${tones[tone] || tones.green}`}>
        <Icon className='size-5' aria-hidden='true' />
      </span>
      <div>
        <p className='font-heading text-2xl font-extrabold tracking-tight'>{value}</p>
        <p className='text-xs font-semibold text-[#657467]'>{label}</p>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, crumb }) {
  return (
    <header className='mb-6'>
      {crumb && (
        <p className='mb-2 text-xs font-semibold text-[#7a8b7d]'>
          Admin workspace <span className='text-[#b3c0b5]'>›</span> {crumb}
        </p>
      )}
      <h1 className='font-heading text-3xl font-extrabold tracking-[-.04em] md:text-4xl'>{title}</h1>
      {description && <p className='mt-1 text-sm text-[#657467]'>{description}</p>}
    </header>
  );
}

export function ReasonBar({
  title,
  prompt,
  reason,
  setReason,
  onCancel,
  onConfirm,
  confirmLabel,
  busy,
  tone = 'pink'
}) {
  return (
    <div className='fixed inset-x-0 bottom-0 z-40 border-t border-[#dce7dd] bg-[#f3f6f1] px-4 py-4 shadow-[0_-8px_30px_rgba(15,34,24,.08)] md:px-8'>
      <div className='mx-auto flex max-w-[1450px] flex-col gap-4 lg:flex-row lg:items-end'>
        <div className='min-w-0 flex-1'>
          <p className='text-xs font-extrabold uppercase tracking-[.14em] text-[#68796b]'>{title}</p>
          <p className='mt-1 text-sm font-bold text-[#10251a]'>{prompt}</p>
          <label className='mt-3 block'>
            <span className='sr-only'>Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              rows={2}
              maxLength={500}
              required
              placeholder='Enter reason…'
              className='w-full rounded-xl border border-[#d7e3d8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3b793f]'
            />
          </label>
          <p className='mt-1 text-right text-[11px] font-semibold text-[#7a8b7d]'>{reason.length}/500</p>
        </div>
        <div className='flex shrink-0 gap-2'>
          <button
            type='button'
            onClick={onCancel}
            className='min-h-11 rounded-xl border border-[#cadacb] bg-white px-4 text-sm font-bold text-[#276837]'
          >
            Cancel
          </button>
          <button
            type='button'
            disabled={busy || reason.trim().length < 3}
            onClick={onConfirm}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${
              tone === 'green' ? 'bg-[#256739]' : 'bg-[#db2777]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
