'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CalendarDays, Copy, MapPin, Share2, Ticket, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { ClerkAlongProvider, useAlongPlans, useAlongSession } from '@/components/providers/along';
import { AuthDialog } from '@/components/marketing/auth-dialog';
import { TagwimiLogo } from '@/components/layout/logo';
import { sharePlan, planShareUrl } from '@/lib/along/share-plan';

function Invitation({ plan }) {
  const { viewer, hydrated, loadError } = useAlongSession();
  const { data, requestJoin, busy } = useAlongPlans();
  const [authOpen, setAuthOpen] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [intro, setIntro] = useState('');
  const isHost = viewer?.id === plan.hostId;
  const joined = data.joined.includes(plan.id);
  const requested = data.requests.includes(plan.id);
  const available = plan.status === 'open' && plan.spots > 0;

  useEffect(() => {
    if (!hydrated || !viewer || !available) return;
    if (new URLSearchParams(window.location.search).get('join') === '1') {
      setShowRequest(true);
      window.history.replaceState(null, '', `/p/${plan.id}`);
    }
  }, [hydrated, viewer, available, plan.id]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(planShareUrl(plan.id)); toast.success('Plan link copied.'); }
    catch { toast.error('Could not copy the link.'); }
  }
  async function handleShare() {
    try {
      const result = await sharePlan(plan);
      if (result === 'copied') toast.success('Plan link copied.');
    } catch { toast.error('Could not share the plan.'); }
  }
  async function submitRequest(event) {
    event.preventDefault();
    const result = await requestJoin(plan.id, intro);
    if (result?.ok) setShowRequest(false);
  }
  function beginJoin() {
    if (!viewer) { setAuthOpen(true); return; }
    setShowRequest(true);
  }

  return (
    <main className='min-h-dvh bg-[#f7f9f4] pb-28 text-forest md:pb-10'>
      <header className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-7'>
        <Link href='/' aria-label='Tagwimi home'><TagwimiLogo compact /></Link>
        <div className='flex gap-2'>
          <button onClick={copyLink} type='button' aria-label='Copy plan link' className='grid size-11 place-items-center rounded-full border border-border bg-white text-primary hover:bg-soft-green'><Copy size={19} /></button>
          <button onClick={handleShare} type='button' aria-label='Share plan' className='grid size-11 place-items-center rounded-full border border-border bg-white text-primary hover:bg-soft-green'><Share2 size={19} /></button>
        </div>
      </header>
      <div className='mx-auto grid max-w-5xl gap-7 px-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] md:px-8'>
        <article className='min-w-0'>
          <div className='relative aspect-[1.5] overflow-hidden rounded-[22px] bg-soft-green md:aspect-[1.75]'>
            <Image src={plan.image} alt={plan.imageUrl ? `Photo added by the host for ${plan.title}` : `Illustration for ${plan.category} activities`} fill priority sizes='(max-width: 768px) 100vw, 620px' className='object-cover' />
            <span className='absolute bottom-3 left-3 rounded-full bg-forest/90 px-3 py-1.5 text-xs font-semibold text-white'>{plan.imageUrl ? 'Photo added by host' : 'Activity illustration · not the venue'}</span>
          </div>
          <div className='pt-6'>
            <span className='inline-flex rounded-full bg-[#ffe1ef] px-3 py-1.5 text-xs font-bold text-[#8e285b]'>{plan.category}</span>
            <h1 className='mt-3 font-heading text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-.04em]'>{plan.title}</h1>
            <p className='mt-4 max-w-[65ch] text-base leading-relaxed text-[#526756]'>{plan.intro}</p>
            <div className='mt-6 grid grid-cols-2 gap-2.5 text-sm max-[370px]:grid-cols-1'>
              <div className='flex items-start gap-2 rounded-2xl bg-[#e9f1e8] p-3'><CalendarDays className='mt-0.5 size-5 shrink-0 text-primary' /><span><strong className='block'>{plan.date}</strong><small>{plan.time}</small></span></div>
              <div className='flex items-start gap-2 rounded-2xl bg-[#e9f1e8] p-3'><MapPin className='mt-0.5 size-5 shrink-0 text-primary' /><span><strong className='block'>General location</strong><small>{plan.venue}</small></span></div>
              <div className='flex items-start gap-2 rounded-2xl bg-[#e9f1e8] p-3'><UsersRound className='mt-0.5 size-5 shrink-0 text-primary' /><span><strong className='block'>{plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open</strong><small>Host approves requests</small></span></div>
              <div className='flex items-start gap-2 rounded-2xl bg-[#e9f1e8] p-3'><Ticket className='mt-0.5 size-5 shrink-0 text-primary' /><span><strong className='block'>Cost</strong><small>{plan.costNote || 'Check with the venue'}</small></span></div>
            </div>
            <section className='mt-7 border-t border-border pt-6'>
              <h2 className='font-heading text-lg font-extrabold'>Your host</h2>
              <div className='mt-3 flex items-center gap-3'>
                {plan.hostAvatarUrl ? <Image src={plan.hostAvatarUrl} alt={`${plan.host}'s profile photo`} width={56} height={56} className='size-14 rounded-full object-cover' /> : <span className='grid size-14 place-items-center rounded-full bg-soft-green text-xl font-bold'>{plan.host.slice(0,1)}</span>}
                <div><strong className='block'>{plan.host}</strong>{plan.hostCity && <span className='text-sm text-[#526756]'>{plan.hostCity}</span>}</div>
              </div>
              {plan.hostBio && <p className='mt-3 text-sm leading-relaxed text-[#526756]'>{plan.hostBio}</p>}
              {plan.hostInterests.length > 0 && <div className='mt-3 flex flex-wrap gap-2'>{plan.hostInterests.map((interest) => <span key={interest} className='rounded-full bg-[#ffe1ef] px-3 py-1 text-xs font-semibold text-[#8e285b]'>{interest}</span>)}</div>}
            </section>
            <p className='mt-7 text-xs leading-relaxed text-[#526756]'>The exact meeting point and group chat are shared after the host accepts you. A link only plan can still be forwarded by anyone who has its link.</p>
          </div>
        </article>
        <aside className={`h-fit rounded-[22px] border border-border bg-white p-5 shadow-[0_10px_32px_rgba(15,34,24,.05)] md:sticky md:top-6 md:p-6 ${showRequest ? 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:max-h-[80dvh] max-md:overflow-y-auto max-md:rounded-b-none max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'max-md:hidden'}`}>
          <h2 className='font-heading text-2xl font-extrabold tracking-[-.03em]'>{requested ? 'Request sent' : joined ? 'You’re going' : isHost ? 'Your invitation' : 'Come along?'}</h2>
          <p className='mt-2 text-sm leading-relaxed text-[#526756]'>{requested ? `${plan.host} will review your request. Chat opens after acceptance.` : 'A good plan is better with company. The host decides who joins.'}</p>
          {loadError && <p role='alert' className='mt-3 text-sm text-[#912c51]'>{loadError}</p>}
          {showRequest && viewer && available && !requested && !joined ? (
            <form onSubmit={submitRequest} className='mt-5'>
              <label htmlFor='request-intro' className='block text-sm font-bold'>Say hello to {plan.host} <span className='font-normal'>(optional)</span></label>
              <textarea id='request-intro' value={intro} onChange={(event) => setIntro(event.target.value)} maxLength={240} placeholder='A short introduction or what you’re looking forward to' className='mt-2 min-h-24 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-primary' />
              <button disabled={busy} type='submit' className='mt-3 min-h-12 w-full rounded-full bg-gradient-to-r from-pink to-amber px-5 font-bold text-forest disabled:opacity-60'>{busy ? 'Sending…' : 'Send request'}</button>
              <button type='button' onClick={() => setShowRequest(false)} className='mt-2 min-h-10 w-full text-sm font-semibold text-primary'>Back to plan</button>
            </form>
          ) : isHost || joined ? <Link href={`/app/plans/${plan.id}`} className='mt-5 flex min-h-12 items-center justify-center rounded-full bg-primary px-5 font-bold text-white'>Open plan</Link>
            : requested ? <span className='mt-5 block rounded-xl bg-soft-green p-3 text-center text-sm font-semibold text-primary'>Waiting for host approval</span>
            : available ? <button type='button' onClick={beginJoin} disabled={!hydrated} className='mt-5 min-h-12 w-full rounded-full bg-gradient-to-r from-pink to-amber px-5 font-bold text-forest disabled:opacity-60'>{hydrated ? 'Ask to join' : 'Loading…'}</button>
            : <p className='mt-5 rounded-xl bg-soft-green p-3 text-center text-sm'>This plan is no longer taking requests.</p>}
          <p className='mt-4 text-center text-xs leading-relaxed text-[#526756]'>Public venue · Small group · Join approval</p>
        </aside>
      </div>
      {!showRequest && <div className='fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white px-4 pt-3 pb-[calc(.8rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,34,24,.08)] md:hidden'>
        {isHost || joined ? <Link href={`/app/plans/${plan.id}`} className='flex min-h-12 items-center justify-center rounded-full bg-primary font-bold text-white'>Open plan</Link>
          : requested ? <p className='rounded-xl bg-soft-green p-3 text-center text-sm font-semibold text-primary'>Request sent · Waiting for {plan.host}</p>
          : available ? <button type='button' onClick={beginJoin} disabled={!hydrated} className='min-h-12 w-full rounded-full bg-gradient-to-r from-pink to-amber font-bold text-forest disabled:opacity-60'>{hydrated ? 'Ask to join' : 'Loading…'}</button>
          : <p className='rounded-xl bg-soft-green p-3 text-center text-sm'>This plan is no longer taking requests.</p>}
      </div>}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} returnTo={`/p/${plan.id}?join=1`} planSummary={{ title: plan.title, image: plan.image, date: plan.date, time: plan.time, host: plan.host }} />}
    </main>
  );
}

export function PublicPlanPreview({ plan }) {
  return <ClerkAlongProvider><Invitation plan={plan} /></ClerkAlongProvider>;
}
