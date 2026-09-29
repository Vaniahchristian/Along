'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Flag, LayoutDashboard, LoaderCircle, LockKeyhole, Menu, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ListPagination } from '@/components/ui/list-pagination';
import { AlongLogo } from '@/components/along/logo';
import { MobileDrawer } from '@/components/along/mobile-drawer';
import { getAdminAccess, loadAdminDashboard, setPlanStatus, setReportStatus } from '@/lib/admin-db';
import { useAuth, useUser } from '@clerk/nextjs';
import { setClerkTokenGetter } from '@/lib/supabase/client';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'plans', label: 'Plans', icon: ClipboardList },
  { id: 'members', label: 'Members', icon: Users }
];
const dateText = (value) => value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';

function Pill({ children, tone = 'green' }) {
  const colors = { green: 'bg-[#e5f2e2] text-[#2d6834]', pink: 'bg-[#ffe1ee] text-[#9a275e]', yellow: 'bg-[#fff0bc] text-[#765400]', neutral: 'bg-[#eef1ec] text-[#536257]' };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${colors[tone]}`}>{children}</span>;
}

function Empty({ icon: Icon, title, text }) {
  return <div className="grid min-h-48 place-content-center justify-items-center rounded-[22px] border border-dashed border-[#cbd8cb] bg-white px-6 text-center"><Icon className="size-8 text-[#3b793f]" strokeWidth={1.5} /><h3 className="mt-3 font-heading text-lg font-extrabold text-forest">{title}</h3><p className="mt-1 max-w-sm text-sm text-[#607061]">{text}</p></div>;
}

function ReportRow({ report, selected, onSelect }) {
  return <button type="button" onClick={() => onSelect(report.id)} className={`w-full border-b border-[#e1e9df] px-5 py-4 text-left transition hover:bg-[#f8faf6] focus-visible:outline-2 focus-visible:outline-[#3b793f] ${selected ? 'bg-[#f0f6ec]' : 'bg-white'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-heading font-bold text-forest">{report.plan?.title || 'Removed plan'}</span><Pill tone={report.status === 'open' ? 'pink' : 'green'}>{report.status === 'open' ? 'Needs review' : 'Resolved'}</Pill></div>
    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#5c6c5e]">{report.reason}</p>
    <div className="mt-3 flex items-center gap-2 text-xs text-[#68796a]"><span>{report.reporter?.display_name || 'Member'}</span><span aria-hidden="true">·</span><span>{dateText(report.created_at)}</span></div>
  </button>;
}

function ReportDetail({ report, adminId, busy, onChange }) {
  const [note, setNote] = useState(report?.review_note || '');
  useEffect(() => setNote(report?.review_note || ''), [report?.id, report?.review_note]);
  if (!report) return <div className="hidden rounded-[22px] border border-[#dee7dc] bg-white p-7 lg:block"><Flag className="size-7 text-[#ec4899]" /><h3 className="mt-4 font-heading text-xl font-extrabold">Select a report</h3><p className="mt-2 text-sm text-[#607061]">Read the concern and the plan before deciding what to do.</p></div>;
  const update = async (status) => {
    const okay = await onChange(() => setReportStatus(report.id, status, note, adminId), status === 'resolved' ? 'Report marked resolved.' : 'Report reopened.');
    if (okay) setNote('');
  };
  return <section className="rounded-[22px] border border-[#dee7dc] bg-white p-6"><div className="flex items-start justify-between gap-3"><h3 className="font-heading text-xl font-extrabold tracking-[-.035em] text-forest">Report details</h3><Pill tone={report.status === 'open' ? 'pink' : 'green'}>{report.status === 'open' ? 'Open' : 'Resolved'}</Pill></div><p className="mt-6 text-xs font-bold uppercase tracking-[.08em] text-[#647667]">Plan</p><p className="mt-1 font-bold text-forest">{report.plan?.title || 'Removed plan'}</p><p className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-[#647667]">Reported by</p><p className="mt-1 text-sm text-forest">{report.reporter?.display_name || 'Member'} · {report.reporter?.email || 'No email'}</p><p className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-[#647667]">What happened</p><p className="mt-2 whitespace-pre-wrap rounded-2xl bg-[#fff5f8] p-4 text-sm leading-relaxed text-forest">{report.reason}</p><label htmlFor="review-note" className="mt-6 block text-sm font-bold text-forest">Review note</label><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Record why you made this decision" className="mt-2 min-h-24 resize-y border-[#d4dfd2]" /><div className="mt-4 flex flex-wrap gap-2">{report.status === 'open' ? <button type="button" disabled={busy} onClick={() => update('resolved')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3b793f] px-4 text-sm font-bold text-white hover:bg-[#2d6531] disabled:opacity-50"><Check className="size-4" /> Resolve report</button> : <button type="button" disabled={busy} onClick={() => update('open')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c9d7c8] px-4 text-sm font-bold text-[#3b793f] hover:bg-[#eef4ec] disabled:opacity-50">Reopen report</button>}</div><p className="mt-4 text-xs leading-relaxed text-[#647667]">Resolving records your decision. Close the plan separately if people should no longer join it.</p></section>;
}

function PlansView({ plans, search, setSearch, busy, onChange }) {
  const [confirmId, setConfirmId] = useState(null);
  const [page, setPage] = useState(1);
  const listTop = useRef(null);
  const visible = useMemo(() => plans.filter((plan) => `${plan.title} ${plan.venue} ${plan.host?.display_name || ''}`.toLowerCase().includes(search.toLowerCase())), [plans, search]);
  const pageSize = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visible.length / pageSize)));
  const pagePlans = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <><div ref={listTop} className="mb-6 flex scroll-mt-20 flex-wrap items-end justify-between gap-4"><div><h2 className="font-heading text-3xl font-extrabold tracking-[-.045em] text-forest">Plan oversight</h2><p className="mt-2 text-sm text-[#5d6e60]">Close a plan to stop new people from joining. Reopen it when the concern is cleared.</p></div><label className="relative w-full max-w-xs"><Search className="absolute left-3.5 top-3.5 size-4 text-[#6b7b6c]" /><Input aria-label="Search plans" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search plans or hosts" className="h-11 rounded-xl border-[#d5e0d4] bg-white pl-10" /></label></div>
    {visible.length ? <div className="overflow-hidden rounded-[22px] border border-[#dee7dc] bg-white">{pagePlans.map((plan) => <div key={plan.id} className="border-b border-[#e4ebe2] px-5 py-5 last:border-0"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-heading text-lg font-extrabold text-forest">{plan.title}</h3><Pill tone={plan.status === 'open' ? 'green' : 'neutral'}>{plan.status === 'open' ? 'Open' : 'Closed'}</Pill></div><p className="mt-2 text-sm text-[#536656]">{plan.host?.display_name || 'Host'} · {plan.category}</p><p className="mt-1 text-xs text-[#6e7e70]">{plan.venue} · {plan.date_label} at {plan.time_label} · {plan.spots} spots open</p></div><div className="shrink-0">{confirmId === plan.id ? <div className="flex items-center gap-2"><button type="button" disabled={busy} onClick={async () => { const okay = await onChange(() => setPlanStatus(plan.id, 'closed'), 'Plan closed.'); if (okay) setConfirmId(null); }} className="rounded-lg bg-[#9f2849] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm close</button><button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#5f7062]">Cancel</button></div> : <button type="button" disabled={busy} onClick={() => plan.status === 'open' ? setConfirmId(plan.id) : onChange(() => setPlanStatus(plan.id, 'open'), 'Plan reopened.')} className="rounded-lg border border-[#d1ddd0] px-3 py-2 text-xs font-bold text-[#386f3b] hover:bg-[#eff5ed] disabled:opacity-50">{plan.status === 'open' ? 'Close plan' : 'Reopen plan'}</button>}</div></div>{confirmId === plan.id && <p className="mt-3 text-xs text-[#9f2849]">Closing this plan stops new join requests. Existing members can still see their details.</p>}</div>)}</div> : <Empty icon={ClipboardList} title="No matching plans" text="Try a different search or refresh the latest activity." />}
    <ListPagination page={currentPage} pageSize={pageSize} total={visible.length} onPageChange={(next) => { setPage(next); listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
  </>;
}

function MembersView({ members, search, setSearch }) {
  const visible = useMemo(() => members.filter((person) => `${person.display_name} ${person.email}`.toLowerCase().includes(search.toLowerCase())), [members, search]);
  return <><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-heading text-3xl font-extrabold tracking-[-.045em] text-forest">Members</h2><p className="mt-2 text-sm text-[#5d6e60]">A read only view of people who have joined Along.</p></div><label className="relative w-full max-w-xs"><Search className="absolute left-3.5 top-3.5 size-4 text-[#6b7b6c]" /><Input aria-label="Search members" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" className="h-11 rounded-xl border-[#d5e0d4] bg-white pl-10" /></label></div>{visible.length ? <div className="overflow-hidden rounded-[22px] border border-[#dee7dc] bg-white">{visible.map((person) => <div key={person.id} className="flex flex-wrap items-center gap-4 border-b border-[#e4ebe2] px-5 py-4 last:border-0"><span className="grid size-11 place-items-center rounded-full bg-[#ffe1ee] text-xs font-extrabold text-[#92305e]">{initials(person.display_name)}</span><div className="min-w-0 flex-1"><strong className="block text-sm text-forest">{person.display_name}</strong><span className="block truncate text-xs text-[#68796a]">{person.email}</span></div><div className="flex max-w-xs flex-wrap gap-1.5">{(person.interests || []).slice(0, 3).map((interest) => <Pill key={interest} tone="yellow">{interest}</Pill>)}</div><span className="text-xs text-[#6d7c6e]">Joined {dateText(person.created_at)}</span></div>)}</div> : <Empty icon={Users} title="No matching members" text="Try another name or email address." />}</>;
}

export function ClerkAdminDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  return <AdminDashboard clerkIdentity={{ user, isLoaded, getToken }} />;
}

export function AdminDashboard({ clerkIdentity = null }) {
  const [phase, setPhase] = useState('loading');
  const [access, setAccess] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try { const next = await loadAdminDashboard(); setData(next); setError(''); }
    catch (failure) { setError(failure.message || 'Could not load the dashboard.'); }
  }, []);

  useEffect(() => {
    if (clerkIdentity && !clerkIdentity.isLoaded) return;
    let active = true;
    (async () => {
      try {
        if (clerkIdentity) setClerkTokenGetter(clerkIdentity.getToken);
        const result = clerkIdentity && !clerkIdentity.user
          ? { user: null, allowed: false }
          : await getAdminAccess(clerkIdentity ? clerkIdentity.user : undefined);
        if (!active) return;
        setAccess(result);
        if (!result.allowed) { setPhase('denied'); return; }
        const next = await loadAdminDashboard();
        if (active) { setData(next); setPhase('ready'); }
      } catch (failure) {
        if (active) { setError(failure.message || 'Could not check admin access.'); setPhase('error'); }
      }
    })();
    return () => { active = false; };
  }, [clerkIdentity?.isLoaded, clerkIdentity?.user?.id]);

  async function runAction(work, message) {
    setBusy(true);
    try { await work(); await refresh(); toast.success(message); return true; }
    catch (failure) { toast.error(failure.message || 'The action could not be completed.'); return false; }
    finally { setBusy(false); }
  }

  if (phase === 'loading') return <div className="grid min-h-screen place-content-center gap-3 bg-[#f7f9f4] text-center text-forest"><LoaderCircle className="mx-auto size-8 animate-spin text-[#3b793f]" /><span className="font-heading font-bold">Checking admin access…</span></div>;
  if (phase === 'denied') return <div className="grid min-h-screen place-content-center bg-[#f7f9f4] px-6 text-center"><LockKeyhole className="mx-auto size-10 text-[#3b793f]" /><h1 className="mt-5 font-heading text-3xl font-extrabold text-forest">Admin access required</h1><p className="mt-2 max-w-sm text-sm text-[#617264]">This area is available only to Along administrators. Sign in with an admin account to continue.</p><Link href="/app" className="mx-auto mt-6 inline-flex items-center gap-2 font-bold text-[#3b793f] hover:underline"><ArrowLeft className="size-4" /> Back to Along</Link></div>;
  if (phase === 'error') return <div className="grid min-h-screen place-content-center bg-[#f7f9f4] px-6 text-center"><h1 className="font-heading text-2xl font-extrabold text-forest">The dashboard could not open</h1><p className="mt-2 text-sm text-[#9f2849]">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-6 font-bold text-[#3b793f] underline">Try again</button></div>;

  const openReports = data.reports.filter((report) => report.status === 'open');
  const selectedReport = data.reports.find((report) => report.id === selectedReportId) || openReports[0] || data.reports[0];
  const visibleReports = tab === 'overview' ? openReports.slice(0, 6) : data.reports;
  const counts = data.counts;
  return <div className="min-h-screen bg-[#f7f9f4] font-sans text-forest"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[250px] flex-col border-r border-white/10 bg-forest px-5 py-6 text-white lg:flex"><AlongLogo compact className="-ml-4 mb-3" /><p className="px-3 text-xs font-bold uppercase tracking-[.12em] text-[#9eb6a2]">Admin workspace</p><nav className="mt-10 grid gap-1" aria-label="Admin navigation">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setSearch(''); }} aria-current={tab === id ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${tab === id ? 'bg-[#315941] text-white' : 'text-[#b7cbb9] hover:bg-[#203d2b] hover:text-white'}`}><Icon className="size-5" />{label}{id === 'reports' && openReports.length > 0 && <span className="ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white">{openReports.length}</span>}</button>)}</nav><div className="mt-auto border-t border-white/15 pt-5"><div className="flex items-center gap-2 text-xs text-[#b7cbb9]"><ShieldCheck className="size-4 text-[#ffb900]" /> Restricted access</div><Link href="/app" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white hover:underline"><ArrowLeft className="size-4" /> Back to Along</Link></div></aside>
    <div className="lg:pl-[250px]"><header className="sticky top-0 z-10 flex min-h-17 items-center justify-between gap-4 border-b border-[#e0e9de] bg-[#f7f9f4]/95 px-5 py-3 backdrop-blur-sm md:px-9"><div className="flex items-center gap-2"><button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open admin menu" className="grid size-9 place-items-center rounded-xl border border-[#d9e3d6] bg-white text-[#3b793f] hover:bg-[#edf5e9] focus-visible:outline-2 focus-visible:outline-[#3b793f] lg:hidden"><Menu className="size-5" /></button><span className="grid size-9 place-items-center rounded-xl bg-[#e7f0e3] text-[#3b793f]"><ShieldCheck className="size-5" /></span><span className="font-heading text-sm font-extrabold">Along admin</span></div><div className="flex items-center gap-3"><span className="hidden max-w-[220px] truncate text-xs font-semibold text-[#657666] sm:block">{access.user.email}</span><button type="button" onClick={refresh} aria-label="Refresh dashboard" title="Refresh dashboard" className="grid size-9 place-items-center rounded-xl border border-[#d9e3d6] bg-white text-[#3b793f] hover:bg-[#edf5e9]"><RefreshCw className="size-4" /></button></div></header>
      <main className="mx-auto max-w-[1400px] px-5 py-9 md:px-9 md:py-11">{error && <div role="alert" className="mb-6 rounded-xl border border-[#f3bdcc] bg-[#fff0f4] p-4 text-sm text-[#9f2849]">Could not refresh: {error}</div>}
        {tab === 'overview' && <><div className="flex flex-wrap items-end justify-between gap-6"><div><h1 className="max-w-[700px] font-heading text-[clamp(2.3rem,4vw,4.25rem)] leading-[1.06] font-extrabold tracking-[-.05em]">Keep good plans <span className="text-[#3b793f]">good.</span></h1><p className="mt-3 max-w-xl text-base leading-relaxed text-[#5d6e60]">A clear view of what needs attention across Along.</p></div><Pill tone={openReports.length ? 'pink' : 'green'}>{openReports.length ? `${openReports.length} reports need review` : 'All reports reviewed'}</Pill></div><div className="mt-9 grid gap-0 overflow-hidden rounded-[22px] border border-[#dce6da] bg-white md:grid-cols-3"><div className="p-6 md:border-r md:border-[#e2eae0]"><span className="text-xs font-bold text-[#617364]">Plans on Along</span><strong className="mt-3 block font-heading text-4xl font-extrabold tracking-[-.05em]">{counts.plans}</strong></div><div className="border-t border-[#e2eae0] p-6 md:border-r md:border-t-0"><span className="text-xs font-bold text-[#617364]">Members</span><strong className="mt-3 block font-heading text-4xl font-extrabold tracking-[-.05em]">{counts.members}</strong></div><div className="border-t border-[#e2eae0] p-6 md:border-t-0"><span className="text-xs font-bold text-[#617364]">Join requests pending</span><strong className="mt-3 block font-heading text-4xl font-extrabold tracking-[-.05em]">{counts.pending}</strong></div></div><div className="mt-12 flex items-center justify-between gap-4"><div><h2 className="font-heading text-2xl font-extrabold tracking-[-.04em]">Needs your eye</h2><p className="mt-1 text-sm text-[#607061]">Reports from members, newest first.</p></div><button type="button" onClick={() => setTab('reports')} className="inline-flex items-center gap-1 text-sm font-bold text-[#3b793f] hover:underline">All reports <ArrowRight className="size-4" /></button></div><div className="mt-5">{visibleReports.length ? <div className="overflow-hidden rounded-[22px] border border-[#dee7dc]">{visibleReports.map((report) => <ReportRow key={report.id} report={report} selected={false} onSelect={(id) => { setSelectedReportId(id); setTab('reports'); }} />)}</div> : <Empty icon={Check} title="Nothing waiting for review" text="New member reports will appear here as soon as they arrive." />}</div></>}
        {tab === 'reports' && <><div className="mb-7"><h1 className="font-heading text-3xl font-extrabold tracking-[-.045em]">Member reports</h1><p className="mt-2 text-sm text-[#5d6e60]">Read the concern, record your decision, and review the plan separately if needed.</p></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(310px,.85fr)]"><div>{visibleReports.length ? <div className="overflow-hidden rounded-[22px] border border-[#dee7dc]">{visibleReports.map((report) => <ReportRow key={report.id} report={report} selected={selectedReport?.id === report.id} onSelect={setSelectedReportId} />)}</div> : <Empty icon={Flag} title="No reports yet" text="Member concerns will appear here for review." />}</div><ReportDetail report={selectedReport} adminId={access.user.id} busy={busy} onChange={runAction} /></div></>}
        {tab === 'plans' && <PlansView plans={data.plans} search={search} setSearch={setSearch} busy={busy} onChange={runAction} />}
        {tab === 'members' && <MembersView members={data.members} search={search} setSearch={setSearch} />}
        {counts.members > 100 || counts.reports > 100 ? <p className="mt-5 text-xs text-[#6d7c6e]">Reports and members show the latest 100 records.</p> : null}
      </main></div><MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Admin menu"><div className="px-5 pt-5"><div className="rounded-2xl bg-[#0f2218] p-4 text-white"><span className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-5 text-[#ffb900]" /> Along administration</span><span className="mt-2 block truncate text-xs text-white/70">{access.user.email}</span></div></div><nav className="mt-6 grid gap-1 px-3" aria-label="Admin drawer navigation">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setSearch(''); setDrawerOpen(false); }} aria-current={tab === id ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${tab === id ? 'bg-[#e9f1e8] text-[#3b793f]' : 'text-[#334b38] hover:bg-[#f1f6ef]'}`}><Icon className="size-5" />{label}{id === 'reports' && openReports.length > 0 && <span className="ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white">{openReports.length}</span>}</button>)}</nav><div className="mt-auto border-t border-[#e0e9de] px-5 py-5"><Link href="/app" onClick={() => setDrawerOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#3b793f] hover:bg-[#edf4eb]"><ArrowLeft className="size-5" /> Back to Along</Link></div></MobileDrawer><Toaster position="bottom-right" />
  </div>;
}
