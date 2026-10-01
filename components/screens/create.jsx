'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useAlongPlans } from '@/components/providers/along';
import { preparePlanImage } from '@/lib/media/prepare-plan-image';
import { normalizeMapsUrl } from '@/lib/along/maps-url';
import { defaultEndsAt } from '@/lib/along/plan-lifecycle';
import { ActionButton, BackButton, PageHeading, Panel } from '@/components/layout/shared';

function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className='mb-4 grid gap-2'>
      <Label htmlFor={id} className='text-[13px] font-extrabold'>
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className='h-11 w-full rounded-xl border-border bg-card px-3'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, text]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function kampalaParts(iso) {
  if (!iso) return { date: '', time: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function CreateScreen({ plan = null } = {}) {
  const editing = Boolean(plan);
  const { publishPlan, updatePlan, busy } = useAlongPlans();
  const initialWhen = useMemo(() => kampalaParts(plan?.startsAt), [plan?.startsAt]);
  const initialEnd = useMemo(() => {
    if (plan?.endsAt) return kampalaParts(plan.endsAt);
    if (plan?.startsAt) return kampalaParts(defaultEndsAt(plan.startsAt));
    return { date: '', time: '' };
  }, [plan?.endsAt, plan?.startsAt]);
  const [category, setCategory] = useState(plan?.category || 'Fitness');
  const [size, setSize] = useState(String(plan?.size || 2));
  const [visibility, setVisibility] = useState(plan?.visibility || 'public');
  const [startDate, setStartDate] = useState(initialWhen.date);
  const [startTime, setStartTime] = useState(initialWhen.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [endTouched, setEndTouched] = useState(Boolean(plan?.endsAt));
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(plan?.imageUrl || null);
  const [previewIsObjectUrl, setPreviewIsObjectUrl] = useState(false);

  useEffect(() => {
    if (endTouched || !startDate || !startTime) return;
    try {
      const start = new Date(`${startDate}T${startTime}:00+03:00`);
      if (Number.isNaN(start.getTime())) return;
      const parts = kampalaParts(defaultEndsAt(start.toISOString()));
      setEndDate(parts.date);
      setEndTime(parts.time);
    } catch {
      /* ignore while typing */
    }
  }, [startDate, startTime, endTouched]);

  useEffect(
    () => () => {
      if (previewIsObjectUrl && preview) URL.revokeObjectURL(preview);
    },
    [preview, previewIsObjectUrl]
  );

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const prepared = await preparePlanImage(file);
      if (previewIsObjectUrl && preview) URL.revokeObjectURL(preview);
      setPhotoFile(prepared);
      setPreview(URL.createObjectURL(prepared));
      setPreviewIsObjectUrl(true);
    } catch (error) {
      toast.error(error.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = new Date(`${startDate}T${startTime}:00+03:00`);
    if (Number.isNaN(date.getTime())) return toast.error('Choose a valid start date and time.');
    const unchangedStart =
      editing && plan?.startsAt && Math.abs(date.getTime() - new Date(plan.startsAt).getTime()) < 60_000;
    if (!unchangedStart && date <= new Date()) {
      return toast.error('Choose a future start time for your plan.');
    }
    const end = new Date(`${endDate}T${endTime}:00+03:00`);
    if (Number.isNaN(end.getTime())) return toast.error('Choose a valid end date and time.');
    if (end < date) return toast.error('End time must be after the start time.');
    const groupSize = Number(size);
    let mapsUrl = null;
    try {
      mapsUrl = normalizeMapsUrl(form.get('mapsUrl'));
    } catch (error) {
      return toast.error(error.message);
    }
    const payload = {
      category,
      size: groupSize,
      spots: groupSize - 1,
      status: 'open',
      visibility,
      costNote: String(form.get('costNote') || '').trim(),
      title: String(form.get('title')).trim(),
      venue: String(form.get('venue')).trim(),
      intro: String(form.get('intro')).trim(),
      date: date.toLocaleDateString('en-UG', {
        timeZone: 'Africa/Kampala',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      time: date.toLocaleTimeString('en-UG', {
        timeZone: 'Africa/Kampala',
        hour: 'numeric',
        minute: '2-digit'
      }),
      startsAt: date.toISOString(),
      endsAt: end.toISOString(),
      meet: String(form.get('meet')).trim(),
      mapsUrl,
      bring: String(form.get('bring')).trim() || 'Whatever you need for the activity'
    };
    if (editing) updatePlan(plan.id, payload, photoFile);
    else publishPlan(payload, photoFile);
  }

  return (
    <>
      <BackButton />
      <PageHeading
        title={editing ? 'Edit plan' : 'Make a plan'}
        description={
          editing
            ? 'Update the details people see before they ask to join.'
            : 'Give people a clear reason to say “I’m in.”'
        }
      />
      <div className='grid grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)] gap-5 max-[760px]:grid-cols-1'>
        <Panel>
          <form key={plan?.id || 'new'} onSubmit={submit}>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='activity' className='text-[13px] font-extrabold'>
                What do you want to do?
              </Label>
              <Input
                className='h-11 rounded-xl border-border bg-card'
                id='activity'
                name='title'
                required
                maxLength={80}
                defaultValue={plan?.title || ''}
                placeholder='e.g. Try the Saturday beginner swim class'
              />
              <small className='text-xs text-muted-foreground'>
                Make it specific enough to picture the outing.
              </small>
            </div>
            <div className='mb-5'>
              <div className='mb-2 flex items-baseline justify-between gap-3'>
                <Label htmlFor='plan-photo' className='text-[13px] font-extrabold'>
                  Plan photo <span className='font-normal text-muted-foreground'>(optional)</span>
                </Label>
                <span className='text-xs text-muted-foreground'>One photo</span>
              </div>
              <div className='relative overflow-hidden rounded-2xl border border-dashed border-border bg-soft-green'>
                {preview ? (
                  <img
                    src={preview}
                    alt='Preview of your plan photo'
                    className='aspect-[2.3] w-full object-cover'
                  />
                ) : (
                  <div className='flex min-h-32 flex-col items-center justify-center gap-2 px-5 py-6 text-center text-forest'>
                    <ImagePlus className='size-7 text-primary' aria-hidden='true' />
                    <span className='text-sm font-bold'>Show the pool, café, trail, or class</span>
                    <span className='text-xs text-muted-foreground'>
                      A real photo helps people picture your plan.
                    </span>
                  </div>
                )}
              </div>
              <div className='mt-2 flex flex-wrap items-center gap-3'>
                <label
                  htmlFor='plan-photo'
                  className='inline-flex min-h-10 cursor-pointer items-center rounded-full border border-primary px-4 text-xs font-extrabold text-primary hover:bg-secondary'
                >
                  {preview ? 'Replace photo' : 'Add a photo'}
                </label>
                <input
                  id='plan-photo'
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={choosePhoto}
                  className='sr-only'
                />
                {photoFile && (
                  <button
                    type='button'
                    onClick={() => {
                      if (previewIsObjectUrl && preview) URL.revokeObjectURL(preview);
                      setPhotoFile(null);
                      setPreview(plan?.imageUrl || null);
                      setPreviewIsObjectUrl(false);
                    }}
                    className='inline-flex min-h-10 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-forest'
                  >
                    <X className='size-4' aria-hidden='true' /> Undo new photo
                  </button>
                )}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                {editing
                  ? 'Leave this as is to keep the current photo, or choose a new one.'
                  : 'If you skip this, Tagwimi will show a labeled activity illustration instead.'}
              </p>
            </div>
            <div className='grid grid-cols-2 gap-4 max-[760px]:grid-cols-1'>
              <SelectField
                id='category'
                label='Category'
                value={category}
                onChange={setCategory}
                options={['Fitness', 'Outings', 'Learning'].map((value) => [value, value])}
              />
              <SelectField
                id='size'
                label='Group size'
                value={size}
                onChange={setSize}
                options={[
                  ['2', 'Me + 1 person'],
                  ['3', '3 people'],
                  ['4', '4 people'],
                  ['5', '5 people']
                ]}
              />
            </div>
            <SelectField
              id='visibility'
              label='Who can find this plan?'
              value={visibility}
              onChange={setVisibility}
              options={[
                ['public', 'Public · Explore and shared link'],
                ['link_only', 'Link only · shared link']
              ]}
            />
            <p className='-mt-2 mb-4 text-xs text-muted-foreground'>
              Anyone with a link can forward it. You approve every request to join.
            </p>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='venue' className='text-[13px] font-extrabold'>
                General location · visible on the invitation
              </Label>
              <Input
                className='h-11 rounded-xl border-border bg-card'
                id='venue'
                name='venue'
                required
                maxLength={90}
                defaultValue={plan?.venue || ''}
                placeholder='Venue name and neighbourhood'
              />
            </div>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='costNote' className='text-[13px] font-extrabold'>
                Cost information <span className='font-normal text-muted-foreground'>(optional)</span>
              </Label>
              <Input
                id='costNote'
                name='costNote'
                maxLength={120}
                defaultValue={plan?.costNote || ''}
                className='h-11 rounded-xl border-border bg-card'
                placeholder='e.g. Pool entry paid separately'
              />
            </div>
            <div className='grid grid-cols-2 gap-4 max-[760px]:grid-cols-1'>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='date' className='text-[13px] font-extrabold'>
                  Starts
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='date'
                  name='date'
                  type='date'
                  required
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='time' className='text-[13px] font-extrabold'>
                  Start time
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='time'
                  name='time'
                  type='time'
                  required
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4 max-[760px]:grid-cols-1'>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='endDate' className='text-[13px] font-extrabold'>
                  Ends
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='endDate'
                  name='endDate'
                  type='date'
                  required
                  value={endDate}
                  onChange={(event) => {
                    setEndTouched(true);
                    setEndDate(event.target.value);
                  }}
                />
              </div>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='endTime' className='text-[13px] font-extrabold'>
                  End time
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='endTime'
                  name='endTime'
                  type='time'
                  required
                  value={endTime}
                  onChange={(event) => {
                    setEndTouched(true);
                    setEndTime(event.target.value);
                  }}
                />
              </div>
            </div>
            <p className='-mt-2 mb-4 text-xs text-muted-foreground'>
              Defaults to 24 hours after start. Extend it for longer trips. People can still join until
              then, then the plan closes.
            </p>
            <p className='mb-4 text-xs text-muted-foreground'>
              The exact meeting point is shared only after you accept someone.
            </p>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='intro' className='text-[13px] font-extrabold'>
                What should people know?
              </Label>
              <Textarea
                className='min-h-[105px] rounded-xl border-border bg-card'
                id='intro'
                name='intro'
                required
                maxLength={320}
                defaultValue={plan?.intro || ''}
                placeholder="The pace, vibe, and why you'd like company"
              />
            </div>
            <div className='grid grid-cols-2 gap-4 max-[760px]:grid-cols-1'>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='meet' className='text-[13px] font-extrabold'>
                  Where exactly will you meet?
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='meet'
                  name='meet'
                  required
                  defaultValue={plan?.meet || ''}
                  placeholder='e.g. At the front entrance'
                />
              </div>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='bring' className='text-[13px] font-extrabold'>
                  What should they bring?
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='bring'
                  name='bring'
                  defaultValue={plan?.bring || ''}
                  placeholder='e.g. Comfortable shoes'
                />
              </div>
            </div>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='mapsUrl' className='text-[13px] font-extrabold'>
                Google Maps pin <span className='font-normal text-muted-foreground'>(optional)</span>
              </Label>
              <Input
                className='h-11 rounded-xl border-border bg-card'
                id='mapsUrl'
                name='mapsUrl'
                type='url'
                inputMode='url'
                maxLength={500}
                defaultValue={plan?.mapsUrl || ''}
                placeholder='Paste a maps.app.goo.gl or Google Maps link'
              />
              <small className='text-xs text-muted-foreground'>
                Shared only after you accept someone — same as the exact meeting point.
              </small>
            </div>
            <ActionButton type='submit' disabled={busy}>
              {busy ? (editing ? 'Saving…' : 'Publishing…') : editing ? 'Save changes' : 'Publish plan'}{' '}
              <ArrowRight aria-hidden='true' />
            </ActionButton>
          </form>
        </Panel>
        <Panel className='h-fit border-0 bg-soft-green'>
          <h2 className='mb-3 font-heading text-[22px] font-extrabold text-forest'>
            A good plan feels easy to join.
          </h2>
          <p className='text-forest'>
            Specific details help someone decide, show up, and find you when they arrive.
          </p>
          <ol className='mt-4 list-decimal space-y-3 pl-5 text-forest'>
            <li>Choose a public venue with a clear meeting point.</li>
            <li>Say whether it’s beginner friendly and mention likely costs.</li>
            <li>Keep the group small enough to coordinate easily.</li>
          </ol>
        </Panel>
      </div>
    </>
  );
}
