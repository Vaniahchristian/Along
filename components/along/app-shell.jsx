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

const screens = { explore: ExploreScreen, detail: DetailScreen, plans: PlansScreen, create: CreateScreen, chat: ChatScreen, profile: ProfileScreen };
const navigation = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'plans', label: 'My plans', icon: CalendarDays },
  { id: 'chat', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: UserRound }
];

function Shell() {
  const { screen, navigate } = useAlong();
  const Screen = screens[screen] ?? ExploreScreen;

  return <div id="app">
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">a</span>along</div>
        <nav className="nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={screen === id ? 'active' : ''} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-bottom"><div className="mini-profile"><PersonAvatar initials="YO" name="You" /><div><strong>You</strong><div className="small muted">Kampala, Uganda</div></div></div></div>
      </aside>
      <main className="content">
        <header className="topbar"><div className="location"><MapPin aria-hidden="true" /> Kampala · demo neighbourhood</div><div className="top-actions"><span className="demo-pill">Interactive concept · sample data</span><ActionButton type="button" onClick={() => navigate('create')}><Plus aria-hidden="true" /> Make a plan</ActionButton></div></header>
        <Screen />
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.slice(0, 2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={screen === id ? 'active' : ''} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label}</span></button>)}
      <button type="button" className="create-nav" onClick={() => navigate('create')} aria-current={screen === 'create' ? 'page' : undefined}><Plus aria-hidden="true" /><span>Create</span></button>
      {navigation.slice(2).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={screen === id ? 'active' : ''} onClick={() => navigate(id)} aria-current={screen === id ? 'page' : undefined}><Icon aria-hidden="true" /><span>{label === 'Messages' ? 'Chat' : label}</span></button>)}
    </nav>
    <Toaster position="bottom-right" />
  </div>;
}

export function AlongApp() {
  return <AlongProvider><Shell /></AlongProvider>;
}
