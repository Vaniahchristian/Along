'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  CalendarDays,
  Crown,
  MapPin,
  MessageCircle,
  Settings2,
  Sun,
  UsersRound
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListPagination } from '@/components/ui/list-pagination';
import { planImage } from '@/lib/media/activity-image';
import { useAlong } from '@/components/providers/along';
import { ActionButton, EmptyState } from '@/components/layout/shared';

const PAGE_SIZE = 8;

function planDate(plan) {
  const dateText = String(plan.date || '')
    .replace(/^[A-Za-z]+,\s*/, '')
    .trim();
  const hasYear = /\b\d{4}\b/.test(dateText);
  const year = new Date().getFullYear();
  const date = new Date(`${dateText}${hasYear ? '' : ` ${year}`} ${plan.time || '12:00 PM'}`);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;
  if (!hasYear && date.getTime() < Date.now() - 86400000) date.setFullYear(year + 1);
  return date.getTime();
}

function ActivityThumbnail({ plan, featured = false }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-soft-green ${featured ? 'size-28 max-[760px]:size-[86px]' : 'size-24 max-[760px]:size-[82px]'}`}
    >
      <Image
        src={planImage(plan)}
        alt={
          plan.imageUrl
            ? `Photo for ${plan.title}`
            : `Illustration for ${plan.category.toLowerCase()} activities`
        }
        fill
        sizes='(max-width: 760px) 86px, 112px'
        className='object-cover'
      />
      {!plan.imageUrl && (
        <span className='absolute inset-x-0 bottom-0 bg-forest/80 px-1 py-0.5 text-center text-[8px] font-bold text-white'>
          Activity illustration
        </span>
      )}
    </div>
  );
}

function PlanBadges({ mine, pending, done, requestCount }) {
  return (
    <div className='flex flex-wrap items-center gap-1.5 text-[11px] font-bold'>
      {mine ? (
        <span className='inline-flex items-center gap-1 rounded-full bg-[#fff3d1] px-2.5 py-1 text-[#805400]'>
          <Crown className='size-3' />
          Hosting
        </span>
      ) : pending ? (
        <span className='rounded-full bg-[#fff3d1] px-2.5 py-1 text-[#805400]'>Requested</span>
      ) : (
        <span className='inline-flex items-center gap-1 rounded-full bg-soft-green px-2.5 py-1 text-forest'>
          <UsersRound className='size-3' />
          Joined
        </span>
      )}
      {done ? (
        <span className='rounded-full bg-secondary px-2.5 py-1 text-forest'>Completed</span>
      ) : pending ? (
        <span className='rounded-full bg-[#fff3d1] px-2.5 py-1 text-[#805400]'>
          Waiting for host
        </span>
      ) : mine && requestCount > 0 ? (
        <span className='rounded-full bg-[#fff3d1] px-2.5 py-1 text-[#805400]'>
          {requestCount} {requestCount === 1 ? 'request' : 'requests'}
        </span>
      ) : (
        <span className='inline-flex items-center gap-1 rounded-full bg-soft-green px-2.5 py-1 text-forest'>
          <span className='size-1.5 rounded-full bg-success' />
          Confirmed
        </span>
      )}
    </div>
  );
}

function PlanItem({ plan, featured, data, busy, openPlan, openChat, cancelRequest }) {
  const mine = plan.host === 'You';
  const pending = data.requests.includes(plan.id);
  const done = data.completed.includes(plan.id);
  const requestCount = data.hostRequests.filter((request) => request.planId === plan.id).length;
  return (
    <article
      className={`rounded-[18px] border border-border ${featured ? 'bg-[#f0f7ef] p-5 max-[760px]:p-3' : 'bg-card p-4 max-[760px]:p-3'}`}
    >
      {featured && (
        <p className='mb-3 flex items-center gap-2 text-xs font-extrabold text-primary'>
          <Sun className='size-4 text-amber' aria-hidden='true' />
          Your next plan
        </p>
      )}
      <div className='flex min-w-0 items-center gap-4 max-[760px]:items-start max-[760px]:gap-3'>
        <ActivityThumbnail plan={plan} featured={featured} />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-2'>
            <div className='min-w-0 flex-1'>
              <h2
                className={`font-heading font-extrabold leading-snug text-forest ${featured ? 'text-xl max-[760px]:text-sm' : 'text-base max-[760px]:text-sm'}`}
              >
                {plan.title}
              </h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                {mine ? 'You’re hosting' : `Hosted by ${plan.host}`}
              </p>
            </div>
            <div className='max-[760px]:hidden'>
              <PlanBadges mine={mine} pending={pending} done={done} requestCount={requestCount} />
            </div>
          </div>
          <p className='mt-2 flex items-center gap-2 text-[13px] text-muted-foreground max-[760px]:text-[11px]'>
            <CalendarDays className='size-4 shrink-0 text-primary max-[760px]:size-3.5' />
            {plan.date} · {plan.time}
          </p>
          <p className='mt-1 flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground max-[760px]:text-[11px]'>
            <MapPin className='size-4 shrink-0 text-primary max-[760px]:size-3.5' />
            <span className='truncate'>{plan.venue}</span>
          </p>
          <div className='mt-2 hidden max-[760px]:flex'>
            <PlanBadges mine={mine} pending={pending} done={done} requestCount={requestCount} />
          </div>
        </div>
      </div>
      <div className='mt-3 flex justify-end gap-2 max-[760px]:ml-[94px] max-[760px]:grid max-[760px]:grid-cols-2 max-[760px]:gap-2'>
        <ActionButton
          type='button'
          tone='secondary'
          className='max-[760px]:min-h-9 max-[760px]:px-2 max-[760px]:text-xs'
          onClick={() => openPlan(plan.id)}
        >
          {featured ? 'View details' : 'Details'}
        </ActionButton>
        {pending ? (
          <ActionButton
            type='button'
            tone='secondary'
            className='max-[760px]:min-h-9 max-[760px]:px-2 max-[760px]:text-xs'
            disabled={busy}
            onClick={() => cancelRequest(plan.id)}
          >
            {busy ? 'Cancelling…' : 'Cancel request'}
          </ActionButton>
        ) : mine && !done ? (
          <ActionButton
            type='button'
            className='max-[760px]:min-h-9 max-[760px]:px-2 max-[760px]:text-xs'
            onClick={() => openPlan(plan.id)}
          >
            <Settings2 className='size-4' />
            Manage plan
          </ActionButton>
        ) : !done ? (
          <ActionButton
            type='button'
            className='max-[760px]:min-h-9 max-[760px]:px-2 max-[760px]:text-xs'
            onClick={() => openChat(plan.id)}
          >
            <MessageCircle className='size-4' />
            {featured ? 'Open chat' : 'Chat'}
          </ActionButton>
        ) : (
          <ActionButton
            type='button'
            tone='secondary'
            className='max-[760px]:min-h-9 max-[760px]:px-2 max-[760px]:text-xs'
            onClick={() => openChat(plan.id)}
          >
            <MessageCircle className='size-4' />
            Chat
          </ActionButton>
        )}
      </div>
    </article>
  );
}

export function PlansScreen() {
  const { data, navigate, openPlan, openChat, cancelRequest, busy } = useAlong();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const listTop = useRef(null);
  const hosted = data.plans.filter((plan) => plan.host === 'You');
  const upcoming = data.plans
    .filter(
      (plan) =>
        (data.joined.includes(plan.id) || hosted.some((item) => item.id === plan.id)) &&
        !data.completed.includes(plan.id)
    )
    .sort((a, b) => planDate(a) - planDate(b));
  const requests = data.plans
    .filter((plan) => data.requests.includes(plan.id))
    .sort((a, b) => planDate(a) - planDate(b));
  const past = data.plans
    .filter(
      (plan) =>
        data.completed.includes(plan.id) &&
        (data.joined.includes(plan.id) || hosted.some((item) => item.id === plan.id))
    )
    .sort((a, b) => planDate(b) - planDate(a));
  const featured = tab === 'upcoming' ? upcoming[0] : null;
  const plans = tab === 'upcoming' ? upcoming.slice(1) : tab === 'requests' ? requests : past;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(plans.length / PAGE_SIZE)));
  const visible = plans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className='pb-4'>
      <div className='mb-5 flex items-start justify-between gap-4'>
        <div>
          <h1 className='font-heading text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-tight tracking-[-.04em]'>
            My plans
          </h1>
          <p className='mt-1 text-sm text-muted-foreground'>Your next steps, all in one place.</p>
        </div>
        <ActionButton
          type='button'
          className='max-[760px]:hidden'
          onClick={() => navigate('create')}
        >
          Start a plan
        </ActionButton>
      </div>
      <div ref={listTop} className='scroll-mt-20'>
        <Tabs
          value={tab}
          onValueChange={(next) => {
            setTab(next);
            setPage(1);
          }}
          className='mb-5'
        >
          <TabsList className='h-auto max-w-full gap-1 overflow-x-auto rounded-xl bg-soft-green p-1'>
            <TabsTrigger
              className='min-h-9 px-3 text-xs font-bold data-active:bg-card data-active:text-primary max-[760px]:px-2.5'
              value='upcoming'
            >
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger
              className='min-h-9 px-3 text-xs font-bold data-active:bg-card data-active:text-primary max-[760px]:px-2.5'
              value='requests'
            >
              Requests ({requests.length})
            </TabsTrigger>
            <TabsTrigger
              className='min-h-9 px-3 text-xs font-bold data-active:bg-card data-active:text-primary max-[760px]:px-2.5'
              value='past'
            >
              Past
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className='grid gap-3'>
        {featured && (
          <PlanItem
            plan={featured}
            featured
            data={data}
            busy={busy}
            openPlan={openPlan}
            openChat={openChat}
            cancelRequest={cancelRequest}
          />
        )}
        {visible.map((plan) => (
          <PlanItem
            key={plan.id}
            plan={plan}
            data={data}
            busy={busy}
            openPlan={openPlan}
            openChat={openChat}
            cancelRequest={cancelRequest}
          />
        ))}
      </div>
      {!featured && !visible.length && (
        <EmptyState
          title={
            tab === 'past'
              ? 'No past plans yet'
              : tab === 'requests'
                ? 'No pending requests'
                : 'Nothing on your calendar yet'
          }
          description={
            tab === 'past'
              ? 'Your completed meetups will appear here.'
              : tab === 'requests'
                ? 'Plans you ask to join will appear here while the host reviews them.'
                : 'Find a plan that makes you want to go.'
          }
          action='Explore plans'
          onAction={() => navigate('explore')}
        />
      )}
      <ListPagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={plans.length}
        onPageChange={(next) => {
          setPage(next);
          listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </div>
  );
}
