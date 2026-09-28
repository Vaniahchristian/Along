'use client';

import { CalendarDays, Compass, MapPin, MessageCircle, Plus, UserRound } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { AlongProvider, useAlong } from './context';
import { ActionButton, PersonAvatar } from './shared';
import { ExploreScreen } from './explore-screen';
import { DetailScreen } from './detail-screen';
import { PlansScreen } from './plans-screen';
import { CreateScreen } from './create-screen';
import { ChatScreen } from './chat-screen';
import { ProfileScreen } from './profile-screen';
import { AuthScreen } from './auth-screen';
import { AlongLogo } from './logo';

const screens = { explore: ExploreScreen, detail: DetailScreen, plans: PlansScreen, create: CreateScreen, chat: ChatScreen, profile: ProfileScreen };
const navigation = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'plans', label: 'My plans', icon: CalendarDays },
  { id: 'chat', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: UserRound }
];

function Shell() {
  const { screen, navigate, viewer, hydrated, loadError, authScreen, refresh } = useAlong();
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
        </nav>
        <div className="mt-auto border-t border-border px-2.5 pt-5"><div className="flex items-center gap-2.5"><PersonAvatar initials={viewer.name.slice(0, 2).toUpperCase()} name={viewer.name} /><div><strong>{viewer.name}</strong><div className="text-xs text-muted-foreground">{viewer.email}</div></div></div></div>
      </aside>
      <main className="min-w-0 px-12 pt-7 pb-20 max-[1050px]:px-6 max-[760px]:px-4 max-[760px]:pt-5 max-[760px]:pb-24">
        <header className="mb-7 flex items-center justify-between gap-4 max-[760px]:mb-6"><div className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground max-[420px]:text-[11px]"><MapPin className="size-4 text-primary" aria-hidden="true" /> Kampala, Uganda</div><ActionButton className="max-[420px]:px-3 max-[420px]:text-xs" type="button" onClick={() => navigate('create')}><Plus aria-hidden="true" /> Make a plan</ActionButton></header>
        {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-red-50 p-4 text-sm text-destructive"><span>Plans could not load: {loadError}</span><button type="button" className="font-bold underline" onClick={() => refresh(viewer.id)}>Try again</button></div>}
        <Screen />
      </main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-10 hidden grid-cols-5 border-t border-border bg-card px-1 pt-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] max-[760px]:grid" aria-label="Mobile navigation">
      {navigation.slice(0, 2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={mobileClass(id)} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon className="size-5" aria-hidden="true" /><span>{label}</span></button>)}
      <button type="button" className={mobileClass('create')} onClick={() => navigate('create')} aria-current={screen === 'create' ? 'page' : undefined}><Plus className="size-5" aria-hidden="true" /><span>Create</span></button>
      {navigation.slice(2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={mobileClass(id)} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon className="size-5" aria-hidden="true" /><span>{label === 'Messages' ? 'Chat' : label}</span></button>)}
    </nav>
    <Toaster position="bottom-right" />
  </div>;
}

export function AlongApp() {
  return <AlongProvider><Shell /></AlongProvider>;
}

