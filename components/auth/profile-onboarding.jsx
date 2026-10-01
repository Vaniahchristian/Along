'use client';

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton } from '@/components/layout/shared';

const interests = [
  'Swimming',
  'Hiking',
  'Coffee',
  'Art',
  'Fitness classes',
  'Walks',
  'Food',
  'Live music',
  'Books'
];

export function ProfileOnboarding({ viewer, busy, onSave }) {
  const [name, setName] = useState(viewer?.name || '');
  const [city, setCity] = useState(viewer?.city || '');
  const [bio, setBio] = useState(viewer?.bio || '');
  const [chosen, setChosen] = useState(viewer?.interests || []);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(viewer?.avatarUrl || '');

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function toggle(interest) {
    setChosen((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : current.length >= 8
          ? current
          : [...current, interest]
    );
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Choose a photo under 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPG, PNG, or WebP photo.');
      return;
    }
    setPhoto(file);
  }

  async function submit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Add a name people can call you.');
      return;
    }
    if (!photo && !viewer?.avatarUrl) {
      toast.error('Add a profile photo so people can recognize you.');
      return;
    }
    if (!chosen.length) {
      toast.error('Pick at least one interest so others know what you’re up for.');
      return;
    }
    const form = new FormData();
    form.set('name', trimmed);
    form.set('city', city.trim());
    form.set('bio', bio.trim());
    form.set('interests', JSON.stringify(chosen));
    if (photo) form.set('photo', photo);
    await onSave(form);
  }

  return (
    <div className='fixed inset-0 z-[70] grid place-items-center bg-forest/70 p-4' role='presentation'>
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='onboarding-title'
        className='max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-[24px] bg-card p-5 shadow-2xl sm:p-6'
      >
        <p className='text-xs font-extrabold uppercase tracking-[.16em] text-[#b43075]'>Welcome</p>
        <h2 id='onboarding-title' className='mt-2 font-heading text-2xl font-extrabold tracking-tight'>
          Finish your profile
        </h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          A photo and a few details help people recognize you when you join a plan.
        </p>
        <form onSubmit={submit} className='mt-5 grid gap-4'>
          <div className='flex items-center gap-4'>
            <div className='relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-soft-green font-heading text-xl font-extrabold text-forest'>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt='' className='size-full object-cover' />
              ) : (
                (name || 'YO').slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <label
                htmlFor='onboarding-photo'
                className='inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-primary px-3 text-xs font-bold text-primary'
              >
                <Camera className='size-4' />
                {preview ? 'Change photo' : 'Add photo'}
              </label>
              <input
                id='onboarding-photo'
                className='sr-only'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={choosePhoto}
              />
              <p className='mt-1 text-[11px] text-muted-foreground'>Required · JPG, PNG, or WebP · up to 5 MB</p>
            </div>
          </div>
          <label className='grid gap-1.5 text-sm font-bold'>
            Your name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              className='min-h-11 rounded-xl border border-border bg-white px-3 text-sm font-normal outline-none focus:border-primary'
              placeholder='What should people call you?'
            />
          </label>
          <label className='grid gap-1.5 text-sm font-bold'>
            City <span className='font-normal text-muted-foreground'>(optional)</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={60}
              className='min-h-11 rounded-xl border border-border bg-white px-3 text-sm font-normal outline-none focus:border-primary'
              placeholder='Kampala'
            />
          </label>
          <label className='grid gap-1.5 text-sm font-bold'>
            Short bio <span className='font-normal text-muted-foreground'>(optional)</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={240}
              rows={3}
              className='rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-primary'
              placeholder='A line about what you like doing with others.'
            />
          </label>
          <div>
            <p className='mb-2 text-sm font-bold'>What are you up for?</p>
            <div className='flex flex-wrap gap-2'>
              {interests.map((interest) => {
                const active = chosen.includes(interest);
                return (
                  <button
                    key={interest}
                    type='button'
                    aria-pressed={active}
                    onClick={() => toggle(interest)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold ${
                      active
                        ? 'border-[#ec4899] bg-[#ffe1ef] text-[#8e285b]'
                        : 'border-border bg-white text-muted-foreground'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>
          <ActionButton type='submit' disabled={busy} className='mt-1 w-full'>
            {busy ? 'Saving…' : 'Save and continue'}
          </ActionButton>
        </form>
      </section>
    </div>
  );
}
