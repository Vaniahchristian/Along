'use client';

import { useState } from 'react';
import { ArrowLeft, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAlong } from './context';

export function ActionButton({ tone = 'primary', className, children, ...props }) {
  return <Button className={cn('button', tone !== 'primary' && tone, className)} {...props}>{children}</Button>;
}

export function Panel({ className, children, ...props }) {
  return <Card className={cn('panel', className)} {...props}>{children}</Card>;
}

export function PersonAvatar({ initials, name, tone = '', small = false, large = false }) {
  return <Avatar className={cn('person-avatar', tone, small && 'small', large && 'large')} aria-label={name}>
    <AvatarFallback className="person-avatar-fallback">{initials}</AvatarFallback>
  </Avatar>;
}

export function CategoryBadge({ category }) {
  return <Badge className={cn('category', category.toLowerCase())}>{category}</Badge>;
}

export function PageHeading({ title, description }) {
  return <div className="page-head"><div><h1>{title}</h1><p>{description}</p></div></div>;
}

export function EmptyState({ title, description, action, onAction }) {
  return <div className="empty"><h3>{title}</h3><p>{description}</p><ActionButton onClick={onAction}>{action}</ActionButton></div>;
}

export function BackButton() {
  const { navigate } = useAlong();
  return <button type="button" className="back" onClick={() => navigate('explore')}><ArrowLeft aria-hidden="true" /> Back to explore</button>;
}

export function ReportForm({ planId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!reason.trim()) return;
    setReason('');
    setOpen(false);
    toast.info('Demo only: reporting is not connected to a moderation service.');
  }

  if (!open) return <ActionButton tone="text" type="button" onClick={() => setOpen(true)}><Flag aria-hidden="true" /> Report this plan</ActionButton>;
  return <form className="report-form" onSubmit={submit}>
    <label htmlFor={`report-${planId}`}>What concerns you about this plan?</label>
    <Textarea id={`report-${planId}`} value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={500} placeholder="Tell us what happened or what seems wrong" />
    <p className="small muted">This prototype does not send reports. In a real app, this would go to a moderation team.</p>
    <div className="report-actions"><ActionButton type="submit">Submit demo report</ActionButton><ActionButton type="button" tone="text" onClick={() => setOpen(false)}>Cancel</ActionButton></div>
  </form>;
}
