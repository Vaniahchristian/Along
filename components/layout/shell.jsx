'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  Compass,
  LogOut,
  MessageCircle,
  Plus,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useAlongSession } from '@/components/providers/along';
import { PersonAvatar } from '@/components/layout/shared';
import { TagwimiLogo, TagwimiSplash } from '@/components/layout/logo';
import { MobileDrawer } from '@/components/layout/mobile-drawer';

const navigation = [
  { id: 'explore', href: '/app/explore', label: 'Explore', icon: Compass },
  { id: 'plans', href: '/app/plans', label: 'My plans', icon: CalendarDays },
  { id: 'chat', href: '/app/chat', label: 'Messages', icon: MessageCircle },
  { id: 'profile', href: '/app/profile', label: 'Profile', icon: UserRound }
];

function activeNavId(pathname) {
  if (pathname.startsWith('/app/plans/') && pathname !== '/app/plans') return 'detail';
  if (pathname.startsWith('/app/chat/')) return 'chat';
  if (pathname.startsWith('/app/notifications')) return 'notifications';
  if (pathname.startsWith('/app/create')) return 'create';
  if (pathname.startsWith('/app/plans')) return 'plans';
  if (pathname.startsWith('/app/chat')) return 'chat';
  if (pathname.startsWith('/app/profile')) return 'profile';
  return 'explore';
}

export function AppShell({ children }) {
  const {
    navigate,
    viewer,
    clerkSignedIn,
    isAdmin,
    signOut,
    hydrated,
    loadError,
    refresh,
    notifications
  } = useAlongSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read_at).length;
  const screen = activeNavId(pathname);
  const inMobileChat = pathname.startsWith('/app/chat/');
  const inMobileDetail = pathname.startsWith('/app/plans/') && pathname !== '/app/plans';
  const navClass = (id) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition-colors ${screen === id ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`;
  const mobileClass = (id) =>
    `grid min-h-12 justify-items-center content-center gap-0.5 px-1 py-1 text-[10px] font-extrabold ${screen === id ? 'text-primary' : 'text-muted-foreground'}`;

  useEffect(() => {
    if (hydrated && !viewer && !clerkSignedIn) router.replace('/?join=1');
  }, [clerkSignedIn, hydrated, router, viewer]);

  if (!hydrated) return <TagwimiSplash />;
  if (!viewer) {
    if (!clerkSignedIn) return <TagwimiSplash />;
    return (
      <main className='grid min-h-dvh place-items-center bg-[#f7f9f4] px-5 text-center text-forest'>
        <div className='max-w-md'>
          <TagwimiLogo compact className='mx-auto' />
          <h1 className='mt-8 font-heading text-2xl font-extrabold'>Your account needs a moment</h1>
          <p role='alert' className='mt-3 text-sm text-[#526756]'>
            {loadError || 'Your profile could not load yet.'}
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-6 rounded-full bg-[#3b793f] px-6 py-3 font-bold text-white'
          >
            Try again
          </button>
          <button
            type='button'
            onClick={() => signOut()}
            className='ml-4 text-sm font-bold text-[#526756] underline'
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <div className='mx-auto grid max-w-[1440px] grid-cols-[248px_minmax(0,1fr)] max-[1050px]:grid-cols-[190px_minmax(0,1fr)] max-[760px]:block'>
        <aside className='sticky top-0 flex h-screen flex-col border-r border-border px-[18px] pt-8 pb-6 pl-[30px] max-[1050px]:pl-4 max-[760px]:hidden'>
          <TagwimiLogo compact className='mb-7' />
          <nav className='grid gap-1' aria-label='Main navigation'>
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type='button'
                className={navClass(id)}
                onClick={() => navigate(id)}
                aria-current={screen === id ? 'page' : undefined}
              >
                <Icon className='size-5 stroke-[1.8]' aria-hidden='true' />
                <span>{label}</span>
              </button>
            ))}
            <button
              type='button'
              className={navClass('notifications')}
              onClick={() => navigate('notifications')}
              aria-current={screen === 'notifications' ? 'page' : undefined}
            >
              <Bell className='size-5 stroke-[1.8]' aria-hidden='true' />
              <span>Notifications</span>
              {unread > 0 && (
                <span className='ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white'>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </nav>
          <div className='mt-auto border-t border-border px-2.5 pt-5 pb-1'>
            <div className='flex min-w-0 items-center gap-2.5'>
              <PersonAvatar
                initials={viewer.name.slice(0, 2).toUpperCase()}
                name={viewer.name}
                src={viewer.avatarUrl}
              />
              <div className='min-w-0 flex-1'>
                <strong className='block truncate'>{viewer.name}</strong>
                <button
                  type='button'
                  onClick={() => signOut()}
                  className='mt-0.5 text-xs font-bold text-[#9f2849] hover:underline'
                >
                  Log out
                </button>
                <div className='truncate text-xs text-muted-foreground' title={viewer.email}>
                  {viewer.email}
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main
          className={`min-w-0 px-12 pt-7 pb-20 max-[1050px]:px-6 ${inMobileChat ? 'max-[760px]:px-0 max-[760px]:pb-0 max-[760px]:pt-0' : inMobileDetail ? 'max-[760px]:px-5 max-[760px]:pt-[max(1rem,env(safe-area-inset-top))] max-[760px]:pb-28' : 'max-[760px]:px-4 max-[760px]:pt-0 max-[760px]:pb-24'}`}
        >
          <header className='mb-7 flex items-center justify-end max-[760px]:hidden'>
            <button
              type='button'
              onClick={() => navigate('notifications')}
              aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
              className='relative ml-auto grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-forest hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary'
            >
              <Bell className='size-5' />
              {unread > 0 && (
                <span className='absolute -right-1 -top-1 grid min-w-5 h-5 place-items-center rounded-full bg-[#ec4899] px-1 text-[10px] font-bold text-white'>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </header>
          <header
            className={`hidden max-[760px]:sticky max-[760px]:top-0 max-[760px]:z-20 max-[760px]:-mx-4 max-[760px]:mb-2 max-[760px]:flex max-[760px]:min-h-16 max-[760px]:items-center max-[760px]:justify-between max-[760px]:gap-2 max-[760px]:bg-background/95 max-[760px]:px-4 max-[760px]:py-2 max-[760px]:backdrop-blur-sm ${inMobileChat || inMobileDetail ? 'max-[760px]:hidden' : ''}`}
          >
            <TagwimiLogo compact className='max-[760px]:[&_img]:w-[132px]' />
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => navigate('notifications')}
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                className='relative grid size-10 place-items-center rounded-full text-forest hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary'
              >
                <Bell className='size-5' aria-hidden='true' />
                {unread > 0 && (
                  <span className='absolute right-0 top-0 grid min-w-4 h-4 place-items-center rounded-full bg-pink px-0.5 text-[9px] font-bold text-white'>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <button
                type='button'
                onClick={() => setDrawerOpen(true)}
                aria-label='Open profile menu'
                className='rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
              >
                <PersonAvatar
                  initials={viewer.name.slice(0, 2).toUpperCase()}
                  name={viewer.name}
                  src={viewer.avatarUrl}
                />
              </button>
            </div>
          </header>
          {loadError && (
            <div
              role='alert'
              className='mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-red-50 p-4 text-sm text-destructive'
            >
              <span>Plans could not load: {loadError}</span>
              <button
                type='button'
                className='font-bold underline'
                onClick={() => refresh(viewer.id)}
              >
                Try again
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
      <nav
        className={`fixed inset-x-0 bottom-0 z-20 hidden grid-cols-4 border-t border-border bg-card px-2 pt-1 pb-[calc(.4rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(15,34,24,.04)] ${inMobileChat || inMobileDetail ? '' : 'max-[760px]:grid'}`}
        aria-label='Mobile navigation'
      >
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type='button'
            className={mobileClass(id)}
            onClick={() => navigate(id)}
            aria-current={screen === id ? 'page' : undefined}
          >
            <span
              className={`grid size-7 place-items-center rounded-full ${screen === id ? 'bg-primary text-white' : ''}`}
            >
              <Icon className='size-[18px]' aria-hidden='true' />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title='Tagwimi menu'>
        <div className='px-5 pt-5'>
          <div className='flex items-center gap-3 rounded-2xl bg-[#e9f1e8] p-4'>
            <PersonAvatar
              initials={viewer.name.slice(0, 2).toUpperCase()}
              name={viewer.name}
              src={viewer.avatarUrl}
            />
            <div className='min-w-0'>
              <strong className='block truncate text-sm text-forest'>{viewer.name}</strong>
              <span className='block truncate text-xs text-[#607061]'>{viewer.email}</span>
            </div>
          </div>
        </div>
        <nav className='mt-6 grid gap-1 px-3' aria-label='Drawer navigation'>
          {[
            ...navigation.slice(0, 2),
            { id: 'create', label: 'Make a plan', icon: Plus },
            ...navigation.slice(2),
            { id: 'notifications', label: 'Notifications', icon: Bell }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type='button'
              onClick={() => {
                setDrawerOpen(false);
                navigate(id);
              }}
              aria-current={screen === id ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${screen === id ? 'bg-[#e9f1e8] text-[#3b793f]' : 'text-[#334b38] hover:bg-[#f1f6ef]'}`}
            >
              <Icon className='size-5' />
              {label}
              {id === 'notifications' && unread > 0 && (
                <span className='ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white'>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className='mt-auto border-t border-[#e0e9de] px-5 py-5'>
          {isAdmin && (
            <Link
              href='/admin'
              onClick={() => setDrawerOpen(false)}
              className='mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#3b793f] hover:bg-[#edf4eb]'
            >
              <ShieldCheck className='size-5' /> Admin dashboard
            </Link>
          )}
          <Link
            href='/'
            onClick={() => setDrawerOpen(false)}
            className='flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#526a56] hover:bg-[#edf4eb]'
          >
            About Tagwimi
          </Link>
          <button
            type='button'
            onClick={() => {
              setDrawerOpen(false);
              signOut();
            }}
            className='mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#9f2849] hover:bg-[#fff0f4]'
          >
            <LogOut className='size-5' /> Sign out
          </button>
        </div>
      </MobileDrawer>
      <Toaster position='bottom-right' />
    </div>
  );
}
