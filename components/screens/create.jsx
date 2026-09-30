'use client';

import { useEffect, useState } from 'react';
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

export function CreateScreen() {
  const { publishPlan, busy } = useAlongPlans();
  const [category, setCategory] = useState('Fitness');
  const [size, setSize] = useState('2');
  const [visibility, setVisibility] = useState('public');
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const prepared = await preparePlanImage(file);
      setPhotoFile(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (error) {
      toast.error(error.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = new Date(`${form.get('date')}T${form.get('time')}:00+03:00`);
    if (Number.isNaN(date.getTime())) return toast.error('Choose a valid date and time.');
    if (date <= new Date()) return toast.error('Choose a future date for your plan.');
    const groupSize = Number(size);
    publishPlan(
      {
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
        time: date.toLocaleTimeString('en-UG', { timeZone: 'Africa/Kampala', hour: 'numeric', minute: '2-digit' }),
        startsAt: date.toISOString(),
        meet: String(form.get('meet')).trim(),
        bring: String(form.get('bring')).trim() || 'Whatever you need for the activity'
      },
      photoFile
    );
  }

  return (
    <>
      <BackButton />
      <PageHeading title='Make a plan' description='Give people a clear reason to say “I’m in.”' />
      <div className='grid grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)] gap-5 max-[760px]:grid-cols-1'>
        <Panel>
          <form onSubmit={submit}>
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
                {preview && (
                  <button
                    type='button'
                    onClick={() => {
                      setPhotoFile(null);
                      setPreview(null);
                    }}
                    className='inline-flex min-h-10 items-center gap-1 text-xs font-bold text-muted-foreground hover:text-forest'
                  >
                    <X className='size-4' aria-hidden='true' /> Remove
                  </button>
                )}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                If you skip this, Tagwimi will show a labeled activity illustration instead.
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
              options={[["public", "Public · Explore and shared link"], ["link_only", "Link only · shared link"]]}
            />
            <p className='-mt-2 mb-4 text-xs text-muted-foreground'>Anyone with a link can forward it. You approve every request to join.</p>
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
                placeholder='Venue name and neighbourhood'
              />
            </div>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='costNote' className='text-[13px] font-extrabold'>Cost information <span className='font-normal text-muted-foreground'>(optional)</span></Label>
              <Input id='costNote' name='costNote' maxLength={120} className='h-11 rounded-xl border-border bg-card' placeholder='e.g. Pool entry paid separately' />
            </div>
            <div className='grid grid-cols-2 gap-4 max-[760px]:grid-cols-1'>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='date' className='text-[13px] font-extrabold'>
                  Date
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='date'
                  name='date'
                  type='date'
                  required
                />
              </div>
              <div className='mb-4 grid gap-2'>
                <Label htmlFor='time' className='text-[13px] font-extrabold'>
                  Time
                </Label>
                <Input
                  className='h-11 rounded-xl border-border bg-card'
                  id='time'
                  name='time'
                  type='time'
                  required
                />
              </div>
            </div>
            <p className='mb-4 text-xs text-muted-foreground'>The exact meeting point is shared only after you accept someone.</p>
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
                  placeholder='e.g. Comfortable shoes'
                />
              </div>
            </div>
            <ActionButton type='submit' disabled={busy}>
              {busy ? 'Publishing…' : 'Publish plan'} <ArrowRight aria-hidden='true' />
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
