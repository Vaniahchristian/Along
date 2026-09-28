'use client';

import { useState } from 'react';
import { ArrowLeft, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAlong } from './context';

export function ActionButton({ tone = 'primary', className, children, ...props }) {
  const tones = {
    primary: 'bg-primary text-primary-foreground hover:bg-forest',
    secondary: 'border border-border bg-card text-primary hover:bg-secondary',
    text: 'min-h-0 bg-transparent px-2 py-2 text-primary hover:bg-secondary'
  };
  return <Button variant={tone === 'secondary' ? 'outline' : tone === 'text' ? 'ghost' : 'default'} className={cn('min-h-11 gap-2 rounded-xl px-4 text-sm font-bold [&_svg]:size-4', tones[tone], className)} {...props}>{children}</Button>;
}

export function Panel({ className, children, ...props }) {
  return <Card className={cn('gap-0 overflow-visible rounded-[20px] border border-border bg-card p-6 text-foreground shadow-none ring-0', className)} {...props}>{children}</Card>;
}

export function PersonAvatar({ initials, name, tone = '', small = false, large = false }) {
  const colors = { green: 'bg-soft-green text-forest', pink: 'bg-accent text-accent-foreground' };
  return <Avatar className={cn('flex shrink-0 items-center justify-center rounded-full border-0 after:hidden', small ? 'size-8' : large ? 'size-[53px]' : 'size-10', colors[tone] ?? 'bg-muted text-forest')} aria-label={name}>
    <AvatarFallback className="size-full bg-transparent text-xs font-extrabold text-inherit">{initials}</AvatarFallback>
  </Avatar>;
}

export function CategoryBadge({ category }) {
  const colors = { Fitness: 'bg-soft-green text-forest', Outings: 'bg-muted text-forest', Learning: 'bg-accent text-accent-foreground' };
  return <Badge className={cn('h-auto rounded-full border-0 px-2.5 py-1 text-[11px] font-extrabold tracking-[.02em]', colors[category] ?? 'bg-muted text-foreground')}>{category}</Badge>;
}

export function BeginnerBadge() {
  return <Badge className="h-auto gap-1.5 rounded-full border-0 bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground"><span className="size-1.5 rounded-full bg-pink" /> Beginner friendly</Badge>;
}

export function PageHeading({ title, description }) {
  return <div className="mb-6 flex items-end justify-between gap-5"><div><h1 className="font-heading text-[clamp(2rem,4vw,3.25rem)] leading-[1.08] font-extrabold tracking-[-.04em]">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></div></div>;
}

export function EmptyState({ title, description, action, onAction }) {
  return <div className="col-span-full rounded-[18px] border border-dashed border-border bg-card px-6 py-10 text-center"><h3 className="font-heading text-xl font-extrabold">{title}</h3><p className="mt-2 mb-5 text-muted-foreground">{description}</p><ActionButton onClick={onAction}>{action}</ActionButton></div>;
}

export function BackButton() {
  const { navigate } = useAlong();
  return <button type="button" className="mb-5 flex items-center gap-2 py-1 font-bold text-muted-foreground hover:text-primary focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => navigate('explore')}><ArrowLeft className="size-4" aria-hidden="true" /> Back to explore</button>;
}

export function ReportForm({ planId }) {
  const { reportPlan, busy } = useAlong();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 10) return;
    const result = await reportPlan(planId, reason);
    if (result?.ok) { setReason(''); setOpen(false); }
  }
  if (!open) return <ActionButton tone="text" type="button" onClick={() => setOpen(true)}><Flag aria-hidden="true" /> Report a concern</ActionButton>;
  return <form className="mt-4 grid gap-2.5" onSubmit={submit}>
    <label className="text-sm font-bold" htmlFor={`report-${planId}`}>Tell us what concerns you</label>
    <Textarea id={`report-${planId}`} className="min-h-24 border-border bg-card" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={500} required placeholder="What happened or seems wrong? Include details that will help us review it." />
    <p className="text-xs text-muted-foreground">An Along admin will review your report. If you are in immediate danger, contact local emergency services.</p>
    <div className="flex flex-wrap gap-2"><ActionButton type="submit" disabled={busy || reason.trim().length < 10}>{busy ? 'Sending…' : 'Send report'}</ActionButton><ActionButton type="button" tone="text" onClick={() => setOpen(false)}>Cancel</ActionButton></div>
  </form>;
}
