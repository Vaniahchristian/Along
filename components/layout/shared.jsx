'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Flag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAlongSession, useAlongPlans } from '@/components/providers/along';

export function ActionButton({ tone = 'primary', className, children, ...props }) {
  const tones = {
    primary: 'bg-primary text-primary-foreground hover:bg-forest',
    secondary: 'border border-border bg-card text-primary hover:bg-secondary',
    text: 'min-h-0 bg-transparent px-2 py-2 text-primary hover:bg-secondary'
  };
  return (
    <Button
      variant={tone === 'secondary' ? 'outline' : tone === 'text' ? 'ghost' : 'default'}
      className={cn(
        'min-h-11 gap-2 rounded-xl px-4 text-sm font-bold [&_svg]:size-4',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Panel({ className, children, ...props }) {
  return (
    <Card
      className={cn(
        'gap-0 overflow-visible rounded-[20px] border border-border bg-card p-6 text-foreground shadow-none ring-0',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function PersonAvatar({
  initials,
  name,
  tone = '',
  small = false,
  large = false,
  src = null
}) {
  const colors = { green: 'bg-soft-green text-forest', pink: 'bg-accent text-accent-foreground' };
  return (
    <Avatar
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-0 after:hidden',
        small ? 'size-8' : large ? 'size-[53px]' : 'size-10',
        colors[tone] ?? 'bg-muted text-forest'
      )}
      aria-label={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name ? `${name}'s profile photo` : 'Profile photo'}
          fill
          sizes={large ? '53px' : small ? '32px' : '40px'}
          className='object-cover'
        />
      ) : (
        <AvatarFallback className='size-full bg-transparent text-xs font-extrabold text-inherit'>
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export function CategoryBadge({ category }) {
  const colors = {
    Fitness: 'bg-soft-green text-forest',
    Outings: 'bg-muted text-forest',
    Learning: 'bg-accent text-accent-foreground'
  };
  return (
    <Badge
      className={cn(
        'h-auto rounded-full border-0 px-2.5 py-1 text-[11px] font-extrabold tracking-[.02em]',
        colors[category] ?? 'bg-muted text-foreground'
      )}
    >
      {category}
    </Badge>
  );
}

export function BeginnerBadge() {
  return (
    <Badge className='h-auto gap-1.5 rounded-full border-0 bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground'>
      <span className='size-1.5 rounded-full bg-pink' /> Beginner friendly
    </Badge>
  );
}

export function PageHeading({ title, description }) {
  return (
    <div className='mb-6 flex items-end justify-between gap-5'>
      <div>
        <h1 className='font-heading text-[clamp(2rem,4vw,3.25rem)] leading-[1.08] font-extrabold tracking-[-.04em]'>
          {title}
        </h1>
        <p className='mt-2 text-muted-foreground'>{description}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  onAction,
  hint = '',
  imageSrc = '',
  imageAlt = '',
  tone = 'default'
}) {
  const soft = tone === 'soft';
  return (
    <div
      className={cn(
        'col-span-full px-6 py-10 text-center',
        soft
          ? 'rounded-[28px] border-0 bg-[#e9f1e8] px-5 py-12'
          : 'rounded-[18px] border border-dashed border-border bg-card'
      )}
    >
      {imageSrc ? (
        <div className='relative mx-auto mb-6 aspect-[4/3] w-full max-w-[280px] overflow-hidden'>
          <Image src={imageSrc} alt={imageAlt || ''} fill sizes='280px' className='object-contain' />
        </div>
      ) : null}
      <h3 className='font-heading text-xl font-extrabold text-forest'>{title}</h3>
      <p className='mx-auto mt-2 max-w-[34ch] text-muted-foreground'>{description}</p>
      {action ? (
        <button
          type='button'
          onClick={onAction}
          className='mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ec4899] px-6 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(236,72,153,.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec4899]'
        >
          <Plus className='size-4' aria-hidden='true' />
          {action}
        </button>
      ) : null}
      {hint ? <p className='mt-5 text-xs font-semibold text-[#5a6f5d]'>{hint}</p> : null}
    </div>
  );
}

export function BackButton() {
  const { navigate } = useAlongSession();
  return (
    <button
      type='button'
      className='mb-6 flex min-h-11 items-center gap-2 font-bold text-muted-foreground hover:text-primary focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[760px]:mb-8'
      onClick={() => navigate('explore')}
    >
      <ArrowLeft className='size-4' aria-hidden='true' /> Back to explore
    </button>
  );
}

export function ReportForm({ planId, hasPhoto = false, messages = [] }) {
  const { reportPlan, busy } = useAlongPlans();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [targetType, setTargetType] = useState('plan');
  const [messageId, setMessageId] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!reason.trim() || (targetType === 'message' && !messageId)) return;
    const result = await reportPlan(planId, reason, targetType, messageId);
    if (result?.ok) {
      setReason('');
      setMessageId('');
      setTargetType('plan');
      setOpen(false);
    }
  }
  if (!open)
    return (
      <ActionButton tone='text' type='button' onClick={() => setOpen(true)}>
        <Flag aria-hidden='true' /> Report a concern
      </ActionButton>
    );
  return (
    <form className='mt-4 grid gap-2.5' onSubmit={submit}>
      <label className='text-sm font-bold' htmlFor={`report-type-${planId}`}>
        What are you reporting?
      </label>
      <select
        id={`report-type-${planId}`}
        value={targetType}
        onChange={(event) => setTargetType(event.target.value)}
        className='min-h-11 rounded-xl border border-border bg-white px-3 text-sm'
      >
        <option value='plan'>Plan details</option>
        <option value='member'>The host</option>
        {hasPhoto && <option value='image'>Plan photo</option>}
        {messages.length > 0 && <option value='message'>A group message</option>}
      </select>
      {targetType === 'message' && (
        <>
          <label className='text-sm font-bold' htmlFor={`report-message-${planId}`}>
            Select the message
          </label>
          <select
            id={`report-message-${planId}`}
            required
            value={messageId}
            onChange={(event) => setMessageId(event.target.value)}
            className='min-h-11 max-w-full rounded-xl border border-border bg-white px-3 text-sm'
          >
            <option value=''>Choose a message</option>
            {messages.map((message) => (
              <option key={message.id} value={message.id}>
                {message.senderName}: {message.text?.slice(0, 80) || (message.mediaType === 'image' ? 'Photo' : message.mediaType === 'audio' ? 'Voice note' : 'Message')}
              </option>
            ))}
          </select>
        </>
      )}
      <label className='text-sm font-bold' htmlFor={`report-${planId}`}>
        Tell us what concerns you
      </label>
      <Textarea
        id={`report-${planId}`}
        className='min-h-24 border-border bg-card'
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        required
        placeholder='What happened or seems wrong? Include details that will help us review it.'
      />
      <p className='text-xs text-muted-foreground'>
        A Tagwimi admin will review your report. If you are in immediate danger, contact local
        emergency services.
      </p>
      <div className='flex flex-wrap gap-2'>
        <ActionButton type='submit' disabled={busy || !reason.trim()}>
          {busy ? 'Sending…' : 'Send report'}
        </ActionButton>
        <ActionButton type='button' tone='text' onClick={() => setOpen(false)}>
          Cancel
        </ActionButton>
      </div>
    </form>
  );
}
