'use client';

import { Check, ShieldCheck } from 'lucide-react';
import { useAlong } from './context';
import { ActionButton, PageHeading, Panel, PersonAvatar } from './shared';

export function ProfileScreen() {
  const { data, navigate, acceptRequest, reset } = useAlong();
  return <><PageHeading title="Your profile" description="A little context helps people feel comfortable saying yes." /><div className="detail-layout">
    <Panel><div className="host-large"><PersonAvatar initials="YO" name="You" large /><div><strong>You</strong><span>Kampala · enjoys swimming, coffee and walks</span></div></div><div className="detail-meta"><div><ShieldCheck aria-hidden="true" /><div><strong>Public meetups</strong><span>Keep first plans at public venues and agree on a clear meeting point.</span></div></div><div><Check aria-hidden="true" /><div><strong>Show-up history</strong><span>Appears here after you complete plans. No rating is claimed in this demo.</span></div></div></div><h2>About you</h2><p className="muted">“Trying to spend more weekends doing things instead of thinking about them.”</p></Panel>
    <div className="side-stack"><Panel><h2>Safety tools</h2><p className="small muted">You can start a demo report from a plan or group chat. If you feel unsafe, leave and contact local help.</p><ActionButton type="button" tone="secondary" onClick={() => navigate('explore')}>Browse public plans</ActionButton></Panel><Panel><h2>Demo controls</h2><p className="small muted">Try the full flow without another account. Accepting a request simulates a host response.</p><ActionButton type="button" className="full" disabled={!data.requests.length} onClick={acceptRequest}>Accept my pending request</ActionButton><ActionButton type="button" tone="text" onClick={reset}>Reset sample data</ActionButton></Panel></div>
  </div></>;
}
