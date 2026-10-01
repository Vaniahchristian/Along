'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Flag,
  History,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast, Toaster } from 'sonner';
import { TagwimiLogo } from '@/components/layout/logo';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { Broadcasts } from '@/components/admin/broadcasts';
import { SupportInbox } from '@/components/admin/support';
import { Plans } from '@/components/admin/plans';
import { Members } from '@/components/admin/members';
import { Reports } from '@/components/admin/reports';
import { HistoryView } from '@/components/admin/history';
import {
  Badge,
  Empty,
  button,
  card,
  formatDate as date,
  scheduled
} from '@/components/admin/shared';
import { adminAction, getAdminAccess, loadAdminDashboard } from '@/lib/admin/api';
import { setClerkTokenGetter } from '@/lib/supabase/client';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plans', label: 'Plans', icon: CalendarDays },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
  { id: 'history', label: 'Admin history', icon: History }
];
const tabLabels = Object.fromEntries(tabs.map((tab) => [tab.id, tab.label]));
function Overview({ data, go, run, busy }) {
  const now = Date.now();
  const open = data.reports
    .filter((report) => report.status === 'open')
    .sort((a, b) => (b.priority === 'high') - (a.priority === 'high'));
  const upcoming = data.plans
    .filter((plan) => plan.status === 'open' && scheduled(plan) > now)
    .sort((a, b) => scheduled(a) - scheduled(b))
    .slice(0, 4);
  const totals = [
    { label: 'Upcoming plans', value: data.counts.upcoming, icon: CalendarDays, tone: 'green' },
    { label: 'Active members', value: data.counts.activeMembers, icon: Users, tone: 'green' },
    { label: 'Open reports', value: data.counts.openReports, icon: Flag, tone: 'pink' },
    { label: 'Cancelled plans', value: data.counts.cancelled, icon: ClipboardList, tone: 'yellow' }
  ];
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + index);
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString('en-UG', { weekday: 'short' }),
      count: data.plans.filter((plan) => plan.created_at?.slice(0, 10) === key).length
    };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <>
      <header className='mb-7'>
        <h1 className='font-heading text-4xl font-extrabold tracking-[-.05em]'>Overview</h1>
        <p className='mt-1 text-[#657467]'>Keep plans active and the community supported.</p>
      </header>
      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        {totals.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={card}>
            <span
              className={`mb-4 grid size-10 place-items-center rounded-full ${tone === 'pink' ? 'bg-[#ffe6f0] text-[#e83682]' : tone === 'yellow' ? 'bg-[#fff1c8] text-[#d08b00]' : 'bg-[#e6f3e9] text-[#168f4a]'}`}
            >
              <Icon className='size-5' />
            </span>
            <p className='text-xs text-[#5c6c60]'>{label}</p>
            <strong className='font-heading text-3xl font-extrabold'>{value}</strong>
          </div>
        ))}
      </div>
      <div className='mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]'>
        <section className={card}>
          <h2 className='font-heading text-xl font-extrabold'>Needs attention</h2>
          <p className='mb-4 text-sm text-[#667568]'>Open member reports, high priority first.</p>
          {open.length ? (
            open.slice(0, 5).map((report) => (
              <div
                key={report.id}
                className='flex flex-wrap items-center gap-3 border-t border-[#e7eee7] py-3'
              >
                <span className='grid size-10 place-items-center rounded-lg bg-[#ffe7f0] text-[#e53681]'>
                  <Flag className='size-5' />
                </span>
                <div className='min-w-0 flex-1'>
                  <strong className='block truncate text-sm'>
                    {report.plan?.title || 'Reported content'}
                  </strong>
                  <span className='text-xs text-[#68796b]'>
                    {report.target_type} · {date(report.created_at)}
                  </span>
                </div>
                <Badge tone={report.priority === 'high' ? 'pink' : 'yellow'}>
                  {report.priority}
                </Badge>
                <button className={button} onClick={() => go('reports', report.id)}>
                  Review
                </button>
              </div>
            ))
          ) : (
            <Empty text='No reports need review right now.' />
          )}
        </section>
        <section className={card}>
          <div className='flex justify-between gap-3'>
            <div>
              <h2 className='font-heading text-xl font-extrabold'>Upcoming plans</h2>
              <p className='text-sm text-[#667568]'>Next plans in the community.</p>
            </div>
            <button className='text-sm font-bold text-[#256739]' onClick={() => go('plans')}>
              View all →
            </button>
          </div>
          {upcoming.length ? (
            upcoming.map((plan) => (
              <div key={plan.id} className='border-t border-[#e7eee7] py-3 first:mt-4'>
                <strong className='block text-sm'>{plan.title}</strong>
                <p className='mt-1 text-xs text-[#68796b]'>
                  {plan.date_label} · {plan.time_label} · {plan.venue}
                </p>
                <Badge>
                  {(data.memberships || []).filter((member) => member.plan_id === plan.id).length}{' '}
                  members
                </Badge>
              </div>
            ))
          ) : (
            <div className='mt-4'>
              <Empty text='No upcoming plans are scheduled.' />
            </div>
          )}
        </section>
      </div>
      <div className='mt-5 grid gap-5 xl:grid-cols-2'>
        <section className={card}>
          <h2 className='font-heading text-xl font-extrabold'>Plans created this week</h2>
          <p className='mb-5 text-sm text-[#667568]'>Real plans created each day.</p>
          <div className='flex h-44 items-end gap-2'>
            {days.map((day, index) => (
              <div
                key={index}
                className='flex h-full flex-1 flex-col items-center justify-end gap-1'
              >
                <span className='text-xs font-bold'>{day.count}</span>
                <div
                  className='w-full max-w-12 rounded-t-lg bg-[#26a45a]'
                  style={{ height: `${Math.max(3, (day.count / max) * 120)}px` }}
                />
                <span className='text-xs text-[#68796b]'>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={card}>
          <div className='flex justify-between'>
            <h2 className='font-heading text-xl font-extrabold'>Recent admin activity</h2>
            <button className='text-sm font-bold text-[#256739]' onClick={() => go('history')}>
              View all →
            </button>
          </div>
          <div className='mt-4'>
            {data.history.length ? (
              data.history.slice(0, 5).map((item) => (
                <div key={item.id} className='border-t border-[#e7eee7] py-2 text-sm'>
                  <strong>{item.actor?.display_name || 'Admin'}</strong>{' '}
                  {item.action.replaceAll('_', ' ')}
                  <span className='block text-xs text-[#68796b]'>
                    {date(item.created_at)} · {item.reason}
                  </span>
                </div>
              ))
            ) : (
              <Empty text='No admin actions recorded yet.' />
            )}
          </div>
        </section>
      </div>
      <p className='mt-5 text-xs text-[#68796b]'>
        Active members are members with a hosted plan in the past 30 days or a plan membership. Plan
        dates show scheduled activity; they do not verify attendance.
      </p>
    </>
  );
}

export function ClerkAdminDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  return <AdminDashboard clerkIdentity={{ user, isLoaded, getToken }} />;
}
export function AdminDashboard({ clerkIdentity }) {
  const [phase, setPhase] = useState('loading');
  const [access, setAccess] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [selectedReport, setSelectedReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await loadAdminDashboard());
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);
  useEffect(() => {
    if (!clerkIdentity?.isLoaded) return;
    let active = true;
    (async () => {
      try {
        setClerkTokenGetter(clerkIdentity.getToken);
        const result = clerkIdentity.user
          ? await getAdminAccess(clerkIdentity.user)
          : { allowed: false };
        if (!active) return;
        setAccess(result);
        if (!result.allowed) {
          setPhase('denied');
          return;
        }
        setData(await loadAdminDashboard());
        if (active) setPhase('ready');
      } catch (failure) {
        if (active) {
          setError(failure.message);
          setPhase('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [clerkIdentity?.isLoaded, clerkIdentity?.user?.id]);
  async function run(action, id, reason, extra) {
    setBusy(true);
    try {
      await adminAction(action, id, reason, extra);
      await refresh();
      toast.success('Action saved to admin history.');
      return true;
    } catch (failure) {
      toast.error(failure.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function go(next, reportId) {
    setTab(next);
    setSelectedReport(reportId || null);
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (phase !== 'ready')
    return (
      <div className='grid min-h-screen place-content-center bg-[#f7f9f4] px-5 text-center'>
        <ShieldCheck className='mx-auto size-9 text-[#3b793f]' />
        <h1 className='mt-4 font-heading text-2xl font-extrabold'>
          {phase === 'loading'
            ? 'Checking admin access…'
            : phase === 'denied'
              ? 'Admin access required'
              : 'Dashboard unavailable'}
        </h1>
        {error && <p className='mt-2 text-sm'>{error}</p>}
        <Link className='mt-4 font-bold text-[#3b793f]' href='/app'>
          Back to Tagwimi
        </Link>
      </div>
    );
  const nav = (dark) =>
    tabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => go(id)}
        className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${tab === id ? (dark ? 'bg-[#276947] text-white' : 'bg-[#e8f2e8] text-[#246538]') : dark ? 'text-[#bbd0c0] hover:bg-white/10' : 'text-[#506653] hover:bg-[#f1f6f0]'}`}
      >
        <Icon className='size-5' />
        {label}
        {id === 'reports' && data.counts.openReports > 0 && (
          <span className='ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-xs text-white'>
            {data.counts.openReports}
          </span>
        )}
      </button>
    ));
  return (
    <div className='min-h-screen bg-[#f6f9f5] text-[#10251a]'>
      <aside className='fixed inset-y-0 left-0 hidden w-[248px] flex-col bg-[#0f2b1e] p-5 text-white lg:flex'>
        <TagwimiLogo compact onDark />
        <p className='mt-3 px-3 text-sm text-[#c0d2c3]'>Admin workspace</p>
        <nav className='mt-8 grid gap-1'>{nav(true)}</nav>
        <Link
          href='/app'
          className='mt-auto flex items-center gap-2 border-t border-white/15 pt-5 text-sm font-bold'
        >
          <ArrowLeft className='size-4' />
          Back to app
        </Link>
      </aside>
      <div className='lg:pl-[248px]'>
        <header className='sticky top-0 z-10 flex items-center justify-between border-b border-[#dce7dd] bg-[#f6f9f5]/95 px-4 py-3 backdrop-blur md:px-8'>
          <div className='flex items-center gap-2'>
            <button
              className='grid size-10 place-items-center rounded-xl border border-[#dce7dd] bg-white lg:hidden'
              aria-label='Open admin menu'
              onClick={() => setDrawer(true)}
            >
              <Menu className='size-5' />
            </button>
            <span className='text-sm font-semibold text-[#657467]'>
              Admin workspace <span className='text-[#b3c0b5]'>›</span>{' '}
              <span className='font-bold text-[#10251a]'>{tabLabels[tab]}</span>
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              className='grid size-10 place-items-center rounded-xl border border-[#dce7dd] bg-white'
              aria-label='Refresh'
              onClick={refresh}
            >
              <RefreshCw className='size-4' />
            </button>
            <div className='hidden items-center gap-2 rounded-xl border border-[#dce7dd] bg-white py-1.5 pl-1.5 pr-3 sm:flex'>
              <span className='grid size-8 place-items-center rounded-full bg-[#e8f2e8] text-xs font-extrabold text-[#246538]'>
                {(access?.user?.email || 'A').slice(0, 1).toUpperCase()}
              </span>
              <span className='text-xs font-bold'>Admin</span>
            </div>
          </div>
        </header>
        <main className='mx-auto max-w-[1450px] px-4 py-7 md:px-8'>
          {error && (
            <p role='alert' className='mb-4 rounded-xl bg-[#ffe5ef] p-3 text-sm'>
              {error}
            </p>
          )}
          {tab === 'overview' && <Overview data={data} go={go} run={run} busy={busy} />}
          {tab === 'plans' && <Plans data={data} run={run} busy={busy} />}
          {tab === 'members' && (
            <Members
              data={data}
              run={run}
              busy={busy}
              onReviewReport={(reportId) => go('reports', reportId)}
            />
          )}
          {tab === 'reports' && (
            <Reports data={data} run={run} busy={busy} selectedId={selectedReport} />
          )}
          {tab === 'support' && <SupportInbox />}
          {tab === 'broadcasts' && <Broadcasts onSent={refresh} />}
          {tab === 'history' && <HistoryView data={data} />}
          {(data.counts.members > 100 ||
            data.counts.reports > 100 ||
            data.history.length >= 100) && (
            <p className='mt-5 text-xs text-[#68796b]'>
              Members, reports, and history show their latest 100 records.
            </p>
          )}
        </main>
      </div>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} title='Admin menu'>
        <nav className='grid gap-1 px-3 py-5'>{nav(false)}</nav>
        <Link
          href='/app'
          className='mx-4 mt-auto mb-5 flex min-h-11 items-center gap-2 border-t border-[#dce7dd] text-sm font-bold'
        >
          <ArrowLeft className='size-4' /> Back to app
        </Link>
      </MobileDrawer>
      <Toaster position='bottom-right' />
    </div>
  );
}
