'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, CalendarDays, Compass, LogOut, Menu, MessageCircle, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { AlongProvider, useAlong } from './context';
import { PersonAvatar } from './shared';
import { ExploreScreen } from './explore-screen';
import { DetailScreen } from './detail-screen';
import { PlansScreen } from './plans-screen';
import { CreateScreen } from './create-screen';
import { ChatScreen } from './chat-screen';
import { ProfileScreen } from './profile-screen';
import { AuthScreen } from './auth-screen';
import { AlongLogo } from './logo';
import { MobileDrawer } from './mobile-drawer';
import { NotificationsScreen } from './notifications-screen';

const screens = { explore: ExploreScreen, detail: DetailScreen, plans: PlansScreen, create: CreateScreen, chat: ChatScreen, profile: ProfileScreen, notifications: NotificationsScreen };
const navigation = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'plans', label: 'My plans', icon: CalendarDays },
  { id: 'chat', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: UserRound }
];

function Shell() {
  const { screen, navigate, viewer, isAdmin, signOut, hydrated, loadError, authScreen, refresh, notifications, chatViewOpen } = useAlong();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read_at).length;
  const inMobileChat = screen === 'chat' && chatViewOpen;
  const Screen = screens[screen] ?? ExploreScreen;
  const navClass = (id) => `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition-colors ${screen === id ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-card hover:text-foreground'}`;
  const mobileClass = (id) => `grid justify-items-center gap-1 px-1 py-1 text-[10px] font-extrabold ${screen === id ? 'text-primary' : 'text-muted-foreground'}`;

  if (!hydrated) return <div className="grid min-h-screen place-items-center bg-forest font-heading text-xl font-bold text-white">Opening Along…</div>;
  if (!viewer || authScreen === 'recovery') return <><AuthScreen /><Toaster position="bottom-right" /></>;

  return <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto grid max-w-[1440px] grid-cols-[248px_minmax(0,1fr)] max-[1050px]:grid-cols-[190px_minmax(0,1fr)] max-[760px]:block">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-border px-[18px] pt-8 pb-6 pl-[30px] max-[1050px]:pl-4 max-[760px]:hidden">
        <AlongLogo compact className="mb-7" />
        <nav className="grid gap-1" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={navClass(id)} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon className="size-5 stroke-[1.8]" aria-hidden="true" /><span>{label}</span></button>)}
          <button type="button" className={navClass('notifications')} onClick={() => navigate('notifications')} aria-current={screen === 'notifications' ? 'page' : undefined}><Bell className="size-5 stroke-[1.8]" aria-hidden="true" /><span>Notifications</span>{unread > 0 && <span className="ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white">{unread > 99 ? '99+' : unread}</span>}</button>
        </nav>
        <div className="mt-auto border-t border-border px-2.5 pt-5"><div className="flex items-center gap-2.5"><PersonAvatar initials={viewer.name.slice(0, 2).toUpperCase()} name={viewer.name} /><div><strong>{viewer.name}</strong><div className="text-xs text-muted-foreground">{viewer.email}</div></div></div></div>
      </aside>
      <main className={`min-w-0 px-12 pt-7 pb-20 max-[1050px]:px-6 max-[760px]:pt-0 ${inMobileChat ? 'max-[760px]:px-0 max-[760px]:pb-0' : 'max-[760px]:px-4 max-[760px]:pb-24'}`}>
        <header className={`mb-7 flex items-center justify-between gap-3 max-[760px]:sticky max-[760px]:top-0 max-[760px]:z-10 max-[760px]:-mx-4 max-[760px]:mb-6 max-[760px]:border-b max-[760px]:border-border max-[760px]:bg-background/95 max-[760px]:px-4 max-[760px]:py-3 max-[760px]:backdrop-blur-sm ${inMobileChat ? 'max-[760px]:hidden' : ''}`}>
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="hidden size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-forest hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary max-[760px]:grid"><Menu className="size-5" /></button>
          <button type="button" onClick={() => navigate('notifications')} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative ml-auto grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-forest hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"><Bell className="size-5" />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 h-5 place-items-center rounded-full bg-[#ec4899] px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}</button>
        </header>
        {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-red-50 p-4 text-sm text-destructive"><span>Plans could not load: {loadError}</span><button type="button" className="font-bold underline" onClick={() => refresh(viewer.id)}>Try again</button></div>}
        <Screen />
      </main>
    </div>
    <nav className={`fixed inset-x-0 bottom-0 z-10 hidden grid-cols-5 border-t border-border bg-card px-1 pt-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] ${inMobileChat ? '' : 'max-[760px]:grid'}`} aria-label="Mobile navigation">
      {navigation.slice(0, 2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={mobileClass(id)} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon className="size-5" aria-hidden="true" /><span>{label}</span></button>)}
      <button type="button" className={mobileClass('create')} onClick={() => navigate('create')} aria-current={screen === 'create' ? 'page' : undefined}><Plus className="size-5" aria-hidden="true" /><span>Create</span></button>
      {navigation.slice(2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={mobileClass(id)} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon className="size-5" aria-hidden="true" /><span>{label === 'Messages' ? 'Chat' : label}</span></button>)}
    </nav>
    <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Along menu"><div className="px-5 pt-5"><div className="flex items-center gap-3 rounded-2xl bg-[#e9f1e8] p-4"><PersonAvatar initials={viewer.name.slice(0, 2).toUpperCase()} name={viewer.name} /><div className="min-w-0"><strong className="block truncate text-sm text-forest">{viewer.name}</strong><span className="block truncate text-xs text-[#607061]">{viewer.email}</span></div></div></div><nav className="mt-6 grid gap-1 px-3" aria-label="Drawer navigation">{[...navigation.slice(0, 2), { id: 'create', label: 'Make a plan', icon: Plus }, ...navigation.slice(2), { id: 'notifications', label: 'Notifications', icon: Bell }].map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setDrawerOpen(false); navigate(id); }} aria-current={screen === id ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${screen === id ? 'bg-[#e9f1e8] text-[#3b793f]' : 'text-[#334b38] hover:bg-[#f1f6ef]'}`}><Icon className="size-5" />{label}{id === 'notifications' && unread > 0 && <span className="ml-auto rounded-full bg-[#ec4899] px-2 py-0.5 text-[10px] text-white">{unread > 99 ? '99+' : unread}</span>}</button>)}</nav><div className="mt-auto border-t border-[#e0e9de] px-5 py-5">{isAdmin && <Link href="/admin" onClick={() => setDrawerOpen(false)} className="mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#3b793f] hover:bg-[#edf4eb]"><ShieldCheck className="size-5" /> Admin dashboard</Link>}<Link href="/" onClick={() => setDrawerOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#526a56] hover:bg-[#edf4eb]">About Along</Link><button type="button" onClick={() => { setDrawerOpen(false); signOut(); }} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-[#9f2849] hover:bg-[#fff0f4]"><LogOut className="size-5" /> Sign out</button></div></MobileDrawer>
    <Toaster position="bottom-right" />
  </div>;
}

export function AlongApp() {
  return <AlongProvider><Shell /></AlongProvider>;
}

