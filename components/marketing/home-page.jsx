'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Coffee,
  Footprints,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
  Waves
} from 'lucide-react';
import { MarketingBrand, SiteFooter } from '@/components/marketing/site-chrome';
import { AuthDialog } from '@/components/marketing/auth-dialog';

const plans = [
  {
    icon: Waves,
    title: 'A slow swim, no pressure',
    place: 'A public pool nearby',
    time: 'A Saturday afternoon',
    tag: 'Beginner friendly',
    tone: 'pink'
  },
  {
    icon: Footprints,
    title: 'The Sunday morning trail',
    place: 'A favourite walking route',
    time: 'A Sunday morning',
    tag: 'Fresh air',
    tone: 'yellow'
  },
  {
    icon: Coffee,
    title: 'Coffee & a little courage',
    place: 'A café around Kampala',
    time: 'An easy Friday evening',
    tag: 'Good company',
    tone: 'green'
  }
];

function PlanCard({ plan, onJoin, className = '' }) {
  const Icon = plan.icon;
  const tones = {
    pink: 'bg-[#ffe0ef] text-[#9b1c62]',
    yellow: 'bg-[#fff0ae] text-[#694c00]',
    green: 'bg-[#e7f3df] text-[#2b6530]'
  };
  return (
    <article
      className={`rounded-[24px] border border-[#dce5d9] bg-white p-5 shadow-[0_24px_60px_-38px_rgba(15,34,24,.38)] ${className}`}
    >
      <div className='mb-6 flex items-start justify-between gap-3'>
        <div className='grid size-12 place-items-center rounded-2xl bg-[#e9f1e8]'>
          <Icon className='size-6 text-[#3b793f]' strokeWidth={1.8} />
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${tones[plan.tone]}`}>
          {plan.tag}
        </span>
      </div>
      <h3 className='font-heading text-xl font-extrabold tracking-[-.05em] text-forest'>
        {plan.title}
      </h3>
      <div className='mt-3 space-y-2 text-[13px] text-[#5a6b5d]'>
        <p className='flex items-center gap-2'>
          <CalendarDays className='size-4' />
          {plan.time}
        </p>
        <p className='flex items-center gap-2'>
          <MapPin className='size-4' />
          {plan.place}
        </p>
      </div>
      <div className='mt-5 flex items-center justify-between border-t border-[#e5ece3] pt-4'>
        <span className='flex -space-x-2'>
          <span className='grid size-8 place-items-center rounded-full border-2 border-white bg-[#ec4899] text-[10px] font-bold text-white'>
            YO
          </span>
          <span className='grid size-8 place-items-center rounded-full border-2 border-white bg-[#ffb900] text-[10px] font-bold text-forest'>
            +1
          </span>
        </span>
        <button
          type='button'
          onClick={onJoin}
          className='text-xs font-semibold text-[#3b793f] hover:underline'
        >
          Browse plans <ArrowRight className='ml-1 inline size-3' />
        </button>
      </div>
    </article>
  );
}

export function HomePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('join')) setDialogOpen(true);
  }, []);
  const openDialog = () => setDialogOpen(true);
  return (
    <main id='top' className='overflow-hidden bg-[#fbfcf8] text-forest'>
      <header className='relative z-20 mx-auto flex max-w-[1340px] items-center justify-between px-6 py-5 md:px-10 md:py-7'>
        <MarketingBrand />
        <nav
          aria-label='Main'
          className='hidden items-center gap-9 text-sm font-semibold text-[#45604a] md:flex'
        >
          <a href='#how-it-works' className='hover:text-[#3b793f]'>
            How it works
          </a>
          <a href='#plans' className='hover:text-[#3b793f]'>
            The possibilities
          </a>
          <a href='#why-tagwimi' className='hover:text-[#3b793f]'>
            Why Tagwimi
          </a>
        </nav>
        <button
          type='button'
          onClick={openDialog}
          className='inline-flex items-center gap-2 rounded-full bg-[#3b793f] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#2c6331] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3b793f] md:px-5 md:py-3 md:text-sm'
        >
          <span className='md:hidden'>Get started</span>
          <span className='hidden md:inline'>Join Tagwimi</span> <ArrowRight className='size-4' />
        </button>
      </header>

      <section className='relative mx-auto grid min-h-[520px] max-w-[1340px] items-center gap-8 px-6 pb-16 pt-10 md:min-h-[710px] md:grid-cols-[.95fr_1.05fr] md:px-10 md:pb-24 md:pt-14'>
        <div className='relative z-10 max-w-[660px]'>
          <div className='mb-7 inline-flex rotate-[-3deg] items-center gap-2 rounded-full bg-[#ffdc58] px-4 py-2 text-xs font-extrabold uppercase tracking-[.09em] text-forest'>
            <Sparkles className='size-4' /> Make the plan. Find your people. Go.
          </div>
          <h1 className='font-heading text-[clamp(2.6rem,10vw,7.5rem)] leading-[.99] font-extrabold tracking-[-.085em] md:text-[clamp(3.6rem,7.2vw,7.5rem)]'>
            Go do{' '}
            <span className='relative text-[#ec4899] md:whitespace-nowrap'>
              the thing
              <span className='absolute -bottom-2 left-0 h-[7px] w-full rotate-[-2deg] rounded-full bg-[#ffb900]' />
            </span>{' '}
            you keep putting off.
          </h1>
          <p className='mt-9 max-w-[530px] text-lg leading-relaxed text-[#516554] md:text-xl'>
            That class. That trail. That café. Make a small plan around Kampala, find someone
            who&apos;s up for it, and actually go.
          </p>
          <div className='mt-9 flex flex-wrap items-center gap-4'>
            <button
              type='button'
              onClick={openDialog}
              className='inline-flex items-center gap-3 rounded-full bg-[#3b793f] px-7 py-4 font-bold text-white shadow-[0_12px_25px_-12px_#3b793f] transition hover:-translate-y-0.5 hover:bg-[#2c6331] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3b793f]'
            >
              Find your next plan <ArrowRight className='size-5' />
            </button>
            <a
              href='#how-it-works'
              className='inline-flex items-center gap-2 rounded-full px-3 py-4 font-bold text-[#3b793f] hover:underline'
            >
              See how it works <ArrowDown className='size-4' />
            </a>
          </div>
          <p className='mt-5 text-xs font-medium text-[#68796a]'>
            Start with one small plan around Kampala.
          </p>
        </div>
        <div
          aria-label='Preview of activity plans'
          className='relative mx-auto h-[550px] w-full max-w-[610px] max-[600px]:h-[485px]'
        >
          <div className='absolute inset-x-[8%] top-[7%] h-[440px] rotate-[7deg] rounded-[45px] bg-[#ffb900] max-[600px]:h-[400px]' />
          <div className='absolute inset-x-[14%] top-[12%] h-[430px] rotate-[-8deg] rounded-[45px] bg-[#ec4899] max-[600px]:h-[390px]' />
          <div className='absolute inset-x-[18%] top-[2%] flex h-[500px] flex-col overflow-hidden rounded-[34px] border-[8px] border-forest bg-[#f8faf5] shadow-[0_32px_70px_-20px_rgba(15,34,24,.34)] max-[600px]:inset-x-[10%] max-[600px]:h-[450px]'>
            <div className='flex items-center justify-between bg-forest px-5 py-4 text-white'>
              <span className='font-heading text-lg font-extrabold'>What could we do?</span>
              <span className='rounded-full bg-[#355a3d] px-3 py-1 text-xs'>Kampala</span>
            </div>
            <div className='space-y-3 overflow-hidden p-4'>
              <PlanCard plan={plans[0]} onJoin={openDialog} />
              <PlanCard plan={plans[1]} onJoin={openDialog} />
            </div>
          </div>
          <div className='absolute -right-1 bottom-5 rotate-[7deg] rounded-2xl bg-[#fff7da] px-5 py-4 shadow-xl max-[600px]:right-0 max-[600px]:bottom-0'>
            <div className='flex items-center gap-2 font-heading text-sm font-extrabold'>
              <span className='grid size-7 place-items-center rounded-full bg-[#ffb900]'>
                <Check className='size-4' />
              </span>{' '}
              Plans feel easier together
            </div>
            <p className='mt-1 pl-9 text-xs text-[#685c42]'>Pick your day and place.</p>
          </div>
        </div>
      </section>

      <section id='how-it-works' className='bg-[#0f2218] px-6 py-24 text-white md:px-10 md:py-32'>
        <div className='mx-auto max-w-[1240px]'>
          <div className='grid gap-8 md:grid-cols-[1fr_1fr]'>
            <h2 className='max-w-[650px] font-heading text-[clamp(2.7rem,5vw,5rem)] leading-[1.04] font-extrabold tracking-[-.07em]'>
              A plan is better when someone says{' '}
              <em className='not-italic text-[#ffb900]'>“I&apos;m in.”</em>
            </h2>
            <p className='max-w-[400px] self-end text-lg leading-relaxed text-[#c3d2c4]'>
              Tagwimi turns a vague “we should” into a real place, a real time, and a few people
              ready to show up.
            </p>
          </div>
          <div className='mt-16 grid gap-0 border-t border-white/20 md:grid-cols-3'>
            {[
              {
                icon: CalendarDays,
                title: 'Put it on the calendar',
                body: 'Choose something you want to do. Add a public place, time, and how many people can join.'
              },
              {
                icon: Users,
                title: 'Find your people',
                body: 'Browse small, specific plans or ask to join one that feels like your kind of thing.'
              },
              {
                icon: MessageCircle,
                title: 'Meet up for real',
                body: 'Confirm the plan, say hello in the group chat, and show up together.'
              }
            ].map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className='border-b border-white/20 py-8 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 md:not-last:border-r'
              >
                <div className='mb-10 flex items-center justify-between'>
                  <Icon
                    className={`size-9 ${i === 1 ? 'text-[#ec4899]' : i === 2 ? 'text-[#ffb900]' : 'text-[#8acb89]'}`}
                    strokeWidth={1.5}
                  />
                  <span className='text-xs font-bold tracking-widest text-[#8fa492]'>0{i + 1}</span>
                </div>
                <h3 className='font-heading text-2xl font-extrabold tracking-[-.045em]'>{title}</h3>
                <p className='mt-4 max-w-[320px] leading-relaxed text-[#bdcdbf]'>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id='plans' className='mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32'>
        <div className='flex flex-wrap items-end justify-between gap-7'>
          <div>
            <h2 className='max-w-[730px] font-heading text-[clamp(2.8rem,5vw,5.5rem)] leading-[1.04] font-extrabold tracking-[-.075em]'>
              There&apos;s a whole world outside your maybe list.
            </h2>
            <p className='mt-6 max-w-[590px] text-lg leading-relaxed text-[#586b5b]'>
              Start with something small. A swim, a walk, an afternoon out. Think of these as
              starting points for the plans you can make together.
            </p>
          </div>
          <button
            type='button'
            onClick={openDialog}
            className='inline-flex items-center gap-2 border-b-2 border-[#3b793f] pb-1 font-bold text-[#3b793f]'
          >
            Browse plans <ArrowRight className='size-4' />
          </button>
        </div>
        <div className='mt-12 grid gap-5 md:grid-cols-3'>
          {plans.map((plan) => (
            <PlanCard key={plan.title} plan={plan} onJoin={openDialog} />
          ))}
        </div>
      </section>

      <section id='why-tagwimi' className='bg-[#fff0b5] px-6 py-24 md:px-10'>
        <div className='mx-auto grid max-w-[1240px] items-center gap-12 md:grid-cols-[1.1fr_.9fr]'>
          <div>
            <h2 className='font-heading text-[clamp(2.8rem,5vw,5.5rem)] leading-[1.04] font-extrabold tracking-[-.075em]'>
              The hard part is often just <span className='text-[#d6377f]'>going alone.</span>
            </h2>
            <p className='mt-7 max-w-[630px] text-lg leading-relaxed text-[#4c5844]'>
              Tagwimi is for the moment between wanting to do something and walking through the
              door. Small groups make it easier to begin. A clear plan makes it easier to follow
              through.
            </p>
          </div>
          <div className='rounded-[30px] bg-white p-7 shadow-[0_20px_60px_-36px_rgba(15,34,24,.3)]'>
            <h3 className='mt-5 font-heading text-2xl font-extrabold tracking-[-.05em]'>
              Comfort comes first.
            </h3>
            <p className='mt-3 leading-relaxed text-[#586b5b]'>
              Plans start at public places. See who you&apos;re meeting, agree on the details in
              chat, and check in when it&apos;s time. Keep the conversation in the group chat before
              you meet.
            </p>
            <div className='mt-7 flex flex-wrap gap-2'>
              <span className='rounded-full bg-[#e9f1e8] px-3 py-2 text-xs font-bold text-[#3b793f]'>
                Public venues
              </span>
              <span className='rounded-full bg-[#ffe0ef] px-3 py-2 text-xs font-bold text-[#9b1c62]'>
                Small groups
              </span>
              <span className='rounded-full bg-[#fff0ae] px-3 py-2 text-xs font-bold text-[#694c00]'>
                Clear plans
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className='bg-[#ec4899] px-6 py-24 text-center text-white md:py-32'>
        <h2 className='mx-auto max-w-[900px] font-heading text-[clamp(3rem,6vw,6.2rem)] leading-[1.02] font-extrabold tracking-[-.075em]'>
          Your next good story starts with <span className='text-[#ffdb58]'>“let&apos;s go.”</span>
        </h2>
        <p className='mx-auto mt-6 max-w-[550px] text-lg text-white/90'>
          Find an activity, make a plan, and invite someone to come along.
        </p>
        <button
          type='button'
          onClick={openDialog}
          className='mt-9 inline-flex items-center gap-3 rounded-full bg-forest px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#23452f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white'
        >
          Take a look around <ArrowRight className='size-5' />
        </button>
      </section>
      <SiteFooter />
      {dialogOpen && <AuthDialog onClose={() => setDialogOpen(false)} />}
    </main>
  );
}
