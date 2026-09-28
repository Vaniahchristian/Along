'use client';

import { Check, ShieldCheck } from 'lucide-react';
import { useAlong } from './context';
import { ActionButton, PageHeading, Panel, PersonAvatar } from './shared';

export function ProfileScreen() {
  const { data, navigate, acceptRequest, reset } = useAlong();
  return <><PageHeading title="Your profile" description="A little context helps people feel comfortable saying yes." /><div className="grid grid-cols-[minmax(0,1.3fr)_minmax(290px,.7fr)] gap-5 max-[760px]:grid-cols-1">
    <Panel><div className="flex items-center gap-3"><PersonAvatar initials="YO" name="You" large /><div><strong className="block">You</strong><span className="text-xs text-muted-foreground">Kampala · enjoys swimming, coffee and walks</span></div></div><div className="my-6 grid gap-3 border-y border-border py-5"><div className="flex items-start gap-3"><ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" /><div><strong className="block">Public meetups</strong><span className="text-[13px] text-muted-foreground">Keep first plans at public venues and agree on a clear meeting point.</span></div></div><div className="flex items-start gap-3"><Check className="size-5 shrink-0 text-primary" aria-hidden="true" /><div><strong className="block">Show-up history</strong><span className="text-[13px] text-muted-foreground">Appears here after you complete plans. No rating is claimed in this demo.</span></div></div></div><h2 className="mb-3 font-heading text-lg font-extrabold">About you</h2><p className="text-muted-foreground">“Trying to spend more weekends doing things instead of thinking about them.”</p></Panel>
    <div className="grid content-start gap-4"><Panel><h2 className="mb-3 font-heading text-lg font-extrabold">Safety tools</h2><p className="mb-4 text-xs text-muted-foreground">You can start a demo report from a plan or group chat. If you feel unsafe, leave and contact local help.</p><ActionButton type="button" tone="secondary" onClick={() => navigate('explore')}>Browse public plans</ActionButton></Panel><Panel><h2 className="mb-3 font-heading text-lg font-extrabold">Demo controls</h2><p className="mb-4 text-xs text-muted-foreground">Try the full flow without another account. Accepting a request simulates a host response.</p><ActionButton type="button" className="w-full" disabled={!data.requests.length} onClick={acceptRequest}>Accept my pending request</ActionButton><ActionButton type="button" tone="text" className="mt-2" onClick={reset}>Reset sample data</ActionButton></Panel></div>
  </div></>;
}

