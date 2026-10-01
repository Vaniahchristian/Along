'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  Clock3,
  ImagePlus,
  Pencil,
  Share2,
  Copy,
  MapPin,
  ShieldCheck,
  Tag,
  UsersRound,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { planImage } from '@/lib/media/activity-image';
import { preparePlanImage } from '@/lib/media/prepare-plan-image';
import { sharePlan, planShareUrl } from '@/lib/along/share-plan';
import { isPlanJoinable } from '@/lib/along/plan-lifecycle';
import { useAlongSession, useAlongPlans } from '@/components/providers/along';
import Link from 'next/link';
import {
  ActionButton,
  BackButton,
  BeginnerBadge,
  CategoryBadge,
  Panel,
  PersonAvatar,
  ReportForm
} from '@/components/layout/shared';

function JoinAction({
  plan,
  mine,
  joined,
  requested,
  done,
  busy,
  openChat,
  requestJoin,
  cancelRequest,
  completePlan
}) {
  if (mine || joined) {
    return (
      <div className='grid gap-2'>
        <ActionButton type='button' className='w-full' onClick={() => openChat(plan.id)}>
          Open group chat
        </ActionButton>
        {(mine || joined) && (
          <ActionButton
            type='button'
            tone='secondary'
            className='w-full'
            disabled={busy || done || plan.status !== 'open'}
            onClick={() => completePlan(plan.id)}
          >
            {done || plan.status !== 'open' ? 'Plan completed' : mine ? 'Mark completed · close plan' : 'Mark completed'}
          </ActionButton>
        )}
        {mine && plan.status === 'open' && (
          <p className='text-center text-xs leading-relaxed text-muted-foreground'>
            Marking completed closes the plan for new joiners and moves everyone to Past.
          </p>
        )}
      </div>
    );
  }
  if (requested) {
    return (
      <>
        <ActionButton
          type='button'
          tone='secondary'
          className='w-full'
          disabled={busy}
          onClick={() => cancelRequest(plan.id)}
        >
          {busy ? 'Cancelling…' : 'Cancel request'}
        </ActionButton>
        <p className='mt-2 text-center text-xs leading-relaxed text-muted-foreground'>
          Your request is waiting for the host.
        </p>
      </>
    );
  }
  if (isPlanJoinable(plan)) {
    return (
      <>
        <button
          type='button'
          disabled={busy}
          onClick={() => requestJoin(plan.id)}
          className='min-h-12 w-full rounded-full bg-gradient-to-r from-pink to-amber px-5 text-sm font-extrabold text-forest shadow-[0_8px_18px_rgba(236,72,153,.15)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50'
        >
          {busy ? 'Sending request…' : 'Ask to join'}
        </button>
        <p className='mt-2 text-center text-xs leading-relaxed text-muted-foreground'>
          The host will review your request before chat opens.
        </p>
      </>
    );
  }
  return (
    <p className='rounded-xl bg-secondary p-3 text-center text-sm text-muted-foreground'>
      {plan.status !== 'open' ? 'This plan is closed.' : plan.spots <= 0 ? 'This plan is full.' : 'This plan is no longer accepting people.'}
    </p>
  );
}

function JoinPanel({
  plan,
  mine,
  joined,
  requested,
  done,
  busy,
  openChat,
  requestJoin,
  cancelRequest,
  completePlan,
  showHostProfile
}) {
  const going = Math.max(0, plan.size - plan.spots);
  return (
    <Panel className='p-6 shadow-[0_12px_34px_rgba(15,34,24,.055)]'>
      <h2 className='font-heading text-[clamp(1.35rem,2vw,1.75rem)] font-extrabold tracking-[-.035em] text-forest'>
        {mine ? 'Your plan' : joined ? 'You’re going' : 'Join this plan'}
      </h2>
      <div className='mt-5 flex items-center gap-3'>
        {plan.hostAvatarUrl ? (
          <div className='relative size-[53px] shrink-0 overflow-hidden rounded-full'>
            <Image
              src={plan.hostAvatarUrl}
              alt={`${plan.host}'s profile photo`}
              fill
              sizes='53px'
              className='object-cover'
            />
          </div>
        ) : (
          <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} large />
        )}
        <div className='min-w-0'>
          <strong className='block truncate font-heading text-base font-extrabold text-forest'>
            {plan.host}
          </strong>
          <span className='text-xs text-muted-foreground'>
            {mine ? 'You’re hosting' : plan.hostCity || 'Host'}
          </span>
        </div>
      </div>
      {plan.hostBio && (
        <p className='mt-3 text-xs leading-relaxed text-muted-foreground'>{plan.hostBio}</p>
      )}
      <button
        type='button'
        onClick={showHostProfile}
        className='mt-2 text-xs font-bold text-primary hover:underline'
      >
        View public profile
      </button>
      <div className='mt-5 flex items-center justify-between gap-3 border-t border-border py-4 text-sm'>
        <span className='font-semibold text-muted-foreground'>
          {going} {going === 1 ? 'person' : 'people'} going
        </span>
        <strong className='text-primary'>
          {plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open
        </strong>
      </div>
      <JoinAction
        plan={plan}
        mine={mine}
        joined={joined}
        requested={requested}
        done={done}
        busy={busy}
        openChat={openChat}
        requestJoin={requestJoin}
        cancelRequest={cancelRequest}
        completePlan={completePlan}
      />
    </Panel>
  );
}

export function DetailScreen() {
  const [hostPreview, setHostPreview] = useState(false);
  const params = useParams();
  const planId = params?.id;
  const {
    data,
    requestJoin,
    cancelRequest,
    approveRequest,
    replacePlanImage,
    removePlanImage,
    updateVisibility,
    completePlan,
    busy
  } = useAlongPlans();
  const { viewer, openChat } = useAlongSession();
  const plan = data.plans.find((item) => item.id === planId);
  if (!plan)
    return (
      <>
        <BackButton />
        <Panel>
          <h1 className='font-heading text-2xl font-extrabold'>Plan not found</h1>
          <p className='text-muted-foreground'>This plan may have been removed.</p>
        </Panel>
      </>
    );

  const requested = data.requests.includes(plan.id);
  const joined = data.joined.includes(plan.id);
  const mine = plan.hostId === viewer?.id;
  const done = data.completed.includes(plan.id) || plan.status !== 'open';
  const incoming = data.hostRequests.filter((request) => request.planId === plan.id);
  const joinProps = {
    plan,
    mine,
    joined,
    requested,
    done,
    busy,
    openChat,
    requestJoin,
    cancelRequest,
    completePlan,
    showHostProfile: () => setHostPreview(true)
  };
  const going = Math.max(0, plan.size - plan.spots);

  async function changePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await replacePlanImage(plan.id, await preparePlanImage(file));
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function handleShare() {
    try {
      const result = await sharePlan(plan);
      if (result === 'copied') toast.success('Plan link copied.');
    } catch { toast.error('Could not share this plan.'); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(planShareUrl(plan.id)); toast.success('Plan link copied.'); }
    catch { toast.error('Could not copy the link.'); }
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <BackButton />
        <div className='flex flex-wrap gap-2'>
          {mine && (
            <Link
              href={`/app/plans/${plan.id}/edit`}
              className='inline-flex min-h-10 items-center gap-2 rounded-full border border-primary px-3 text-xs font-bold text-primary hover:bg-secondary'
            >
              <Pencil className='size-4' /> Edit plan
            </Link>
          )}
          <button type='button' onClick={copyLink} className='inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-xs font-bold text-primary'><Copy className='size-4' /> Copy link</button>
          <button type='button' onClick={handleShare} className='inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-bold text-white'><Share2 className='size-4' /> Share plan</button>
        </div>
      </div>
      <div className='grid grid-cols-[minmax(0,1fr)_minmax(285px,330px)] items-start gap-6 max-[900px]:grid-cols-1'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <CategoryBadge category={plan.category} />
            {plan.beginnerFriendly && <BeginnerBadge />}
          </div>
          <h1 className='mt-5 max-w-[20ch] font-heading text-[clamp(2rem,3.3vw,3.15rem)] leading-[1.12] font-extrabold tracking-[-.04em] text-forest max-[760px]:mt-6'>
            {plan.title}
          </h1>
          <p className='mt-4 max-w-[65ch] text-base leading-relaxed text-muted-foreground'>
            {plan.intro}
          </p>

          <div className='mt-7 grid grid-cols-3 gap-3 max-[760px]:mt-8 max-[760px]:grid-cols-2 max-[760px]:gap-2.5'>
            <div className='flex min-w-0 items-start gap-2.5 rounded-2xl bg-[#f0f6ef] p-3.5'>
              <CalendarDays className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
              <div className='min-w-0'>
                <strong className='block text-[13px] font-extrabold leading-snug text-forest'>
                  {plan.date}
                </strong>
                <span className='mt-0.5 block text-xs text-muted-foreground'>{plan.time}</span>
              </div>
            </div>
            <div className='flex min-w-0 items-start gap-2.5 rounded-2xl bg-[#f0f6ef] p-3.5'>
              <MapPin className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
              <div className='min-w-0'>
                <strong className='block text-[13px] font-extrabold leading-snug text-forest'>
                  {plan.venue}
                </strong>
                <span className='mt-0.5 block text-xs text-muted-foreground'>Listed by host</span>
              </div>
            </div>
            <div className='flex min-w-0 items-start gap-2.5 rounded-2xl bg-[#f0f6ef] p-3.5'>
              <UsersRound className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
              <div className='min-w-0'>
                <strong className='block text-[13px] font-extrabold leading-snug text-forest'>
                  {going} going
                </strong>
                <span className='mt-0.5 block text-xs text-muted-foreground'>
                  {plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} open
                </span>
              </div>
            </div>
            <div className='hidden min-w-0 items-start gap-2.5 rounded-2xl bg-[#f0f6ef] p-3.5 max-[760px]:flex'>
              <Tag className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
              <div className='min-w-0'>
                <strong className='block text-[13px] font-extrabold leading-snug text-forest'>
                  {plan.costNote || 'Check with venue'}
                </strong>
                <span className='mt-0.5 block text-xs text-muted-foreground'>Ask about fees</span>
              </div>
            </div>
          </div>

          <div className='relative mt-6 aspect-[1.85] overflow-hidden rounded-[22px] bg-soft-green max-[760px]:mt-7 max-[620px]:aspect-[1.45]'>
            <Image
              src={planImage(plan)}
              alt={
                plan.imageUrl
                  ? `Photo added by the host for ${plan.title}`
                  : `Illustrative image for ${plan.category.toLowerCase()} activities`
              }
              fill
              sizes='(max-width: 900px) 100vw, 58vw'
              className='object-cover'
            />
            <span className='absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-forest/85 px-3 py-1.5 text-xs font-bold text-white'>
              {plan.imageUrl ? 'Photo added by host' : 'Activity illustration · not the venue'}
            </span>
          </div>
          {mine && (
            <div className='mt-3 flex flex-wrap items-center gap-3'>
              <label
                htmlFor={`replace-photo-${plan.id}`}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-primary px-4 text-xs font-extrabold text-primary ${busy ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-secondary'}`}
              >
                <ImagePlus className='size-4' aria-hidden='true' />
                {busy ? 'Saving…' : plan.imageUrl ? 'Replace photo' : 'Add your photo'}
              </label>
              <input
                id={`replace-photo-${plan.id}`}
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={changePhoto}
                disabled={busy}
                className='sr-only'
              />
              {plan.imageUrl && (
                <button
                  type='button'
                  disabled={busy}
                  onClick={() => removePlanImage(plan.id)}
                  className='inline-flex min-h-10 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-forest disabled:opacity-50'
                >
                  <X className='size-4' aria-hidden='true' /> Remove photo
                </button>
              )}
            </div>
          )}
          {mine && <div className='mt-5 rounded-2xl bg-soft-green p-4'>
            <strong className='block text-sm text-forest'>Who can find this plan?</strong>
            <div className='mt-3 flex gap-2'>
              {[['public','Public'],['link_only','Link only']].map(([value,label]) => <button key={value} type='button' disabled={busy} onClick={() => updateVisibility(plan.id,value)} aria-pressed={plan.visibility === value} className={`min-h-10 rounded-full px-4 text-xs font-bold ${plan.visibility === value ? 'bg-primary text-white' : 'bg-white text-primary'}`}>{label}</button>)}
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>Link only plans stay off Explore. Anyone with the link can still forward it.</p>
          </div>}

          <section className='mt-8 border-t border-border pt-7'>
            <h2 className='font-heading text-xl font-extrabold tracking-[-.03em] text-forest'>
              The plan
            </h2>
            <dl className='mt-4 grid gap-3 text-sm leading-relaxed'>
              {(mine || joined) ? (
                <>
                  <div className='flex gap-3'>
                    <MapPin className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
                    <dt className='shrink-0 font-extrabold'>Meet:</dt>
                    <dd className='min-w-0 flex-1 break-words text-muted-foreground'>{plan.meet}</dd>
                  </div>
                  {plan.mapsUrl ? (
                    <div className='flex gap-3'>
                      <MapPin className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
                      <dt className='shrink-0 font-extrabold'>Maps:</dt>
                      <dd className='min-w-0 flex-1 break-words'>
                        <a
                          href={plan.mapsUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='font-semibold text-primary underline-offset-2 hover:underline'
                        >
                          Open pin in Google Maps
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  The exact meeting point appears after the host accepts your request.
                </p>
              )}
              <div className='flex gap-3'>
                <ShieldCheck className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
                <dt className='shrink-0 font-extrabold'>Bring:</dt>
                <dd className='min-w-0 flex-1 break-words text-muted-foreground'>{plan.bring}</dd>
              </div>
              <div className='flex gap-3'>
                <Clock3 className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
                <dt className='shrink-0 font-extrabold'>Costs:</dt>
                <dd className='min-w-0 flex-1 break-words text-muted-foreground'>
                  {plan.costNote || 'Ask the host about venue or activity fees. Everyone covers their own costs unless the group agrees otherwise.'}
                </dd>
              </div>
            </dl>
            <div className='mt-6 hidden items-center gap-3 max-[760px]:flex'>
              <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} large />
              <div>
                <strong className='block text-sm font-extrabold text-forest'>{plan.host}</strong>
                <span className='text-xs text-muted-foreground'>Host</span>
                <button
                  type='button'
                  onClick={() => setHostPreview(true)}
                  className='block text-xs font-bold text-primary'
                >
                  View public profile
                </button>
              </div>
            </div>
          </section>
        </div>
        <aside className='grid gap-4'>
          <div className='max-[760px]:hidden'>
            <JoinPanel {...joinProps} />
          </div>
          {mine && (
            <Panel>
              <h2 className='font-heading text-lg font-extrabold text-forest'>Join requests</h2>
              {incoming.length ? (
                <div className='mt-4 grid gap-4'>
                  {incoming.map((request) => (
                    <div key={request.id} className='flex flex-wrap items-center gap-3'>
                      <PersonAvatar
                        initials={request.initials}
                        name={request.name}
                        tone='pink'
                        large
                      />
                      <div className='min-w-0 flex-1'>
                        <strong className='block'>{request.name}</strong>
                        <span className='text-xs text-muted-foreground'>Interested in joining</span>
                        {request.intro && <p className='mt-1 text-xs text-muted-foreground'>{request.intro}</p>}
                      </div>
                      <ActionButton
                        type='button'
                        disabled={busy}
                        onClick={() => approveRequest(plan.id, request.id)}
                      >
                        Accept
                      </ActionButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='mt-3 text-xs text-muted-foreground'>No requests are waiting.</p>
              )}
            </Panel>
          )}
          <Panel>
            <div className='flex items-start gap-3'>
              <ShieldCheck className='mt-0.5 size-6 shrink-0 text-primary' aria-hidden='true' />
              <div>
                <h2 className='font-heading text-lg font-extrabold text-forest'>Before you meet</h2>
                <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
                  Meet at the public venue. Share your plans with someone you trust.
                </p>
              </div>
            </div>
            <div className='mt-5 border-t border-border pt-3'>
              <ReportForm planId={plan.id} hasPhoto={Boolean(plan.imageUrl)} />
            </div>
          </Panel>
        </aside>
      </div>
      <div className='fixed inset-x-0 bottom-0 z-30 hidden border-t border-border bg-white px-4 pt-2 pb-[calc(.45rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,34,24,.08)] max-[760px]:block'>
        <JoinAction {...joinProps} />
      </div>
      {hostPreview && (
        <div
          className='fixed inset-0 z-50 grid place-items-center bg-forest/65 p-4'
          role='presentation'
        >
          <section
            role='dialog'
            aria-modal='true'
            aria-label={`${plan.host}'s public profile`}
            className='w-full max-w-md rounded-[22px] bg-white p-5 shadow-2xl'
          >
            <div className='flex justify-end'>
              <button
                type='button'
                onClick={() => setHostPreview(false)}
                aria-label='Close profile'
                className='grid size-10 place-items-center rounded-full hover:bg-secondary'
              >
                <X className='size-5' />
              </button>
            </div>
            <div className='flex items-center gap-3'>
              {plan.hostAvatarUrl ? (
                <div className='relative size-20 shrink-0 overflow-hidden rounded-full'>
                  <Image
                    src={plan.hostAvatarUrl}
                    alt={`${plan.host}'s profile photo`}
                    fill
                    sizes='80px'
                    className='object-cover'
                  />
                </div>
              ) : (
                <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} large />
              )}
              <div>
                <h2 className='font-heading text-xl font-extrabold text-forest'>{plan.host}</h2>
                {plan.hostCity && <p className='text-xs text-muted-foreground'>{plan.hostCity}</p>}
              </div>
            </div>
            <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
              {plan.hostBio || 'No bio added yet.'}
            </p>
            {plan.hostInterests.length > 0 && (
              <div className='mt-4 flex flex-wrap gap-2'>
                {plan.hostInterests.map((interest) => (
                  <span
                    key={interest}
                    className='rounded-full bg-soft-green px-3 py-1 text-xs font-bold text-forest'
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
            <p className='mt-4 text-xs text-muted-foreground'>
              {data.plans.filter((item) => item.hostId === plan.hostId).length} plans hosted
            </p>
          </section>
        </div>
      )}
    </>
  );
}
