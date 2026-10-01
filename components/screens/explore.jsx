'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, MapPin, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import { planImage } from '@/lib/media/activity-image';
import { useAlongSession, useAlongPlans } from '@/components/providers/along';
import { BeginnerBadge, CategoryBadge, EmptyState, PersonAvatar } from '@/components/layout/shared';

const categories = ['All', 'Fitness', 'Outings', 'Learning'];
const PAGE_SIZE = 6;

function PlanCard({ plan }) {
  const { openPlan } = useAlongSession();
  return (
    <article className='group grid min-w-0 grid-cols-[minmax(145px,42%)_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_8px_28px_rgba(15,34,24,.055)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,34,24,.1)] max-[600px]:grid-cols-1'>
      <div className='relative min-h-[265px] overflow-hidden bg-soft-green max-[600px]:min-h-0 max-[600px]:aspect-[1.7]'>
        <Image
          src={planImage(plan)}
          alt={
            plan.imageUrl
              ? `Photo added by the host for ${plan.title}`
              : `Illustrative image for ${plan.category.toLowerCase()} activities`
          }
          fill
          sizes='(max-width: 600px) 100vw, (max-width: 1050px) 40vw, 23vw'
          className='object-cover transition-transform duration-500 group-hover:scale-[1.045]'
        />
        <div className='absolute left-3 top-3'>
          <CategoryBadge category={plan.category} />
        </div>
        <span className='absolute bottom-2 left-3 rounded-full bg-forest/75 px-2 py-1 text-[10px] font-semibold text-white'>
          {plan.imageUrl ? 'Added by host' : 'Activity illustration · not the venue'}
        </span>
      </div>
      <div className='flex min-w-0 flex-col p-5 max-[1050px]:p-4'>
        <div className='flex flex-wrap items-center gap-2'>
          {plan.beginnerFriendly && <BeginnerBadge />}
          <span className='ml-auto text-xs font-extrabold text-primary'>
            {plan.spots} {plan.spots === 1 ? 'spot' : 'spots'} left
          </span>
        </div>
        <h3 className='mt-3 font-heading text-[clamp(1.04rem,1.35vw,1.3rem)] leading-[1.25] font-extrabold tracking-[-.03em] text-forest'>
          {plan.title}
        </h3>
        <p className='mt-1.5 line-clamp-2 text-[13px] leading-[1.45] text-muted-foreground'>
          {plan.intro}
        </p>
        <div className='mt-4 grid gap-2 text-xs font-semibold text-[#43594a]'>
          <span className='flex min-w-0 items-start gap-2'>
            <CalendarDays className='size-4 shrink-0 text-primary' aria-hidden='true' />
            <span>
              {plan.date} · {plan.time}
            </span>
          </span>
          <span className='flex min-w-0 items-start gap-2'>
            <MapPin className='size-4 shrink-0 text-primary' aria-hidden='true' />
            <span className='line-clamp-2'>{plan.venue}</span>
          </span>
        </div>
        <div className='mt-auto flex min-w-0 flex-wrap items-end gap-3 pt-5'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <PersonAvatar initials={plan.initials} name={plan.host} tone={plan.tone} small />
            <span className='min-w-0'>
              <strong className='block truncate text-xs text-forest'>{plan.host}</strong>
              <small className='block text-[10px] text-muted-foreground'>Hosting this plan</small>
            </span>
          </div>
          <button
            type='button'
            onClick={() => openPlan(plan.id)}
            aria-label={`View ${plan.title} and tag along`}
            className='inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-full bg-pink px-4 text-xs font-extrabold text-white transition-colors hover:bg-[#c52472] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest'
          >
            Tag along <ArrowUpRight className='size-3.5' aria-hidden='true' />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ExploreScreen() {
  const { navigate } = useAlongSession();
  const { data } = useAlongPlans();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const listTop = useRef(null);
  const filtered = useMemo(
    () =>
      data.plans.filter(
        (plan) =>
          plan.status === 'open' &&
          plan.visibility !== 'link_only' &&
          plan.spots > 0 &&
          (category === 'All' || plan.category === category) &&
          `${plan.title} ${plan.venue} ${plan.category}`.toLowerCase().includes(query.toLowerCase())
      ),
    [data.plans, category, query]
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <section className='relative mb-9 grid min-h-[300px] grid-cols-[minmax(0,1fr)_minmax(280px,.78fr)] overflow-hidden rounded-[28px] bg-forest text-white max-[1050px]:mb-5 max-[1050px]:min-h-[215px] max-[1050px]:grid-cols-1 max-[1050px]:rounded-[19px]'>
        <div className='relative z-[1] flex flex-col items-start justify-center p-9 max-[1050px]:p-5 max-[1050px]:pr-[40%] max-[600px]:pr-[34%]'>
          <h1 className='max-w-[650px] font-heading text-[clamp(2rem,3.7vw,3.5rem)] leading-[1.09] font-extrabold tracking-[-.04em] max-[1050px]:text-[clamp(1.45rem,5.2vw,2rem)]'>
            The good stuff happens <span className='text-[#6ce681]'>when you go.</span>
          </h1>
          <p className='mt-3 max-w-[35ch] text-base leading-relaxed text-white/85 max-[1050px]:hidden'>
            Find someone to do it with. Small plans, real places, good company.
          </p>
          <button
            type='button'
            onClick={() => navigate('create')}
            className='mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-pink to-amber px-6 text-sm font-extrabold text-forest shadow-[0_8px_20px_rgba(0,0,0,.16)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-[1050px]:mt-4 max-[1050px]:min-h-10 max-[1050px]:px-4 max-[1050px]:text-[12px]'
          >
            <Plus className='size-5 max-[1050px]:size-4' aria-hidden='true' /> Start a plan
          </button>
        </div>
        <div className='relative min-h-[300px] overflow-hidden max-[1050px]:absolute max-[1050px]:inset-y-0 max-[1050px]:right-0 max-[1050px]:w-[58%] max-[1050px]:min-h-0 max-[600px]:w-[62%]'>
          <Image
            src='/activity/hero-people.webp'
            alt='Illustration of friends enjoying an outing together'
            fill
            priority
            sizes='(max-width: 1050px) 58vw, 40vw'
            className='object-cover max-[1050px]:object-[58%_center]'
          />
          <div className='absolute inset-0 bg-gradient-to-r from-forest/50 via-transparent to-transparent max-[1050px]:bg-gradient-to-r max-[1050px]:from-forest max-[1050px]:via-forest/25 max-[1050px]:to-transparent' />
          <div className='absolute bottom-4 right-4 rounded-2xl bg-forest/85 px-4 py-3 text-right text-sm font-extrabold text-white shadow-[0_6px_18px_rgba(0,0,0,.2)] max-[1050px]:hidden'>
            Same activities.
            <br />
            <span className='text-[#ffd54a]'>New people.</span>
          </div>
        </div>
      </section>
      <div className='mb-5 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h2 className='font-heading text-[clamp(1.8rem,3vw,2.65rem)] leading-tight font-extrabold tracking-[-.04em] text-forest'>
            Explore plans
          </h2>
          <p className='mt-1 text-muted-foreground'>
            Find something you’d like to do around Kampala.
          </p>
        </div>
        <span className='text-sm font-bold text-primary'>
          {filtered.length} {filtered.length === 1 ? 'plan' : 'plans'} to explore
        </span>
      </div>
      <div className='mb-6 flex flex-wrap items-center gap-3'>
        <label className='relative min-w-0 flex-1 basis-[min(100%,210px)]'>
          <Search
            className='pointer-events-none absolute left-4 top-3.5 size-[18px] text-muted-foreground'
            aria-hidden='true'
          />
          <Input
            className='h-12 rounded-full border-border bg-card pl-11'
            aria-label='Search plans'
            placeholder='Search activities or places'
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div
          className='flex max-w-full gap-2 overflow-x-auto pb-1'
          role='group'
          aria-label='Activity categories'
        >
          {categories.map((item) => (
            <button
              type='button'
              className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-[13px] font-bold transition-colors ${category === item ? 'border-primary bg-primary text-white' : 'border-border bg-card text-forest hover:bg-secondary'}`}
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div ref={listTop} className='scroll-mt-20' />
      <div className='grid grid-cols-2 gap-4 max-[1050px]:grid-cols-1'>
        {filtered.length ? (
          visible.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        ) : (
          <EmptyState
            title='No plans match that search.'
            description='Try another activity or put your own plan out there.'
            action='Make a plan'
            onAction={() => navigate('create')}
          />
        )}
      </div>
      <ListPagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={(next) => {
          setPage(next);
          listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </>
  );
}
