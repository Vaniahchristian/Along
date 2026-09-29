'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Camera, Eye, MapPin, Pencil, Plus, ShieldCheck, X } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useAlong } from './context';
import { ActionButton, Panel } from './shared';

const choices = ['Swimming', 'Hiking', 'Coffee', 'Art', 'Fitness classes', 'Walks', 'Food', 'Live music', 'Books'];
const interestColors = ['bg-[#e4f4ff] text-[#07598a]', 'bg-[#e8f6e6] text-[#206b32]', 'bg-[#fff2d9] text-[#8c5200]', 'bg-[#ffe4f1] text-[#a01c60]'];

function Avatar({ viewer, size = 'size-28' }) {
  return <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-soft-green font-heading text-3xl font-extrabold text-forest shadow-sm ${size}`}>{viewer.avatarUrl ? <Image src={viewer.avatarUrl} alt={`${viewer.name}'s profile photo`} fill sizes="112px" className="object-cover" /> : viewer.name.slice(0, 2).toUpperCase()}</div>;
}

function Interests({ items }) {
  return <div className="flex flex-wrap gap-2">{items.map((interest, index) => <span key={interest} className={`rounded-full px-3 py-1.5 text-xs font-bold ${interestColors[index % interestColors.length]}`}>{interest}</span>)}</div>;
}

export function ProfileScreen() {
  const { viewer, data, isAdmin, navigate, signOut, busy, saveProfile } = useAlong();
  const clerk = useClerk();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [name, setName] = useState(viewer.name);
  const [city, setCity] = useState(viewer.city || '');
  const [bio, setBio] = useState(viewer.bio || '');
  const [interests, setInterests] = useState(viewer.interests || []);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const completed = data.plans.filter((plan) => data.completed.includes(plan.id) && (plan.hostId === viewer.id || data.joined.includes(plan.id)));
  const hosted = data.plans.filter((plan) => plan.hostId === viewer.id);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function reset() {
    setName(viewer.name); setCity(viewer.city || ''); setBio(viewer.bio || ''); setInterests(viewer.interests || []);
    setPhoto(null); setPhotoPreview(''); setRemovePhoto(false); setEditing(false); setShowInterests(false);
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); setRemovePhoto(false);
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData();
    form.set('name', name); form.set('city', city); form.set('bio', bio); form.set('interests', JSON.stringify(interests));
    if (photo) form.set('photo', photo);
    if (removePhoto) form.set('removePhoto', 'true');
    const result = await saveProfile(form);
    if (result?.ok) {
      const updated = result.result;
      setName(updated.name); setCity(updated.city); setBio(updated.bio); setInterests(updated.interests);
      setPhoto(null); setPhotoPreview(''); setRemovePhoto(false); setEditing(false); setShowInterests(false);
    }
  }

  return <div className="pb-8"><div className="mb-5"><h1 className="font-heading text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight tracking-[-.04em]">Your profile</h1><p className="mt-1 text-sm text-muted-foreground">Let people get to know you.</p></div>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(255px,.44fr)] items-start gap-5 max-[900px]:grid-cols-1">
      <div className="grid gap-4">
        <Panel className="overflow-hidden p-0"><div className="relative h-28 overflow-hidden bg-[#edf6e9]"><span className="absolute -bottom-16 left-1/4 size-40 rounded-full bg-[#dcefd8]" /><span className="absolute -bottom-16 right-1/4 size-36 rounded-full bg-[#cde7c6]" /><span className="absolute right-8 top-5 size-8 rounded-full bg-amber/70" /></div><div className="relative px-5 pb-5 max-[760px]:px-4"><div className="-mt-12 flex items-end gap-4 max-[760px]:block"><Avatar viewer={viewer} /><div className="min-w-0 flex-1 pb-1 max-[760px]:mt-2"><h2 className="font-heading text-2xl font-extrabold text-forest">{viewer.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 text-primary" />{viewer.city || 'Add your location'}</p></div></div><p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{viewer.bio || 'Add a short introduction so people know what you enjoy doing together.'}</p><div className="mt-5 grid grid-cols-2 gap-2 max-[480px]:grid-cols-1"><ActionButton type="button" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit profile</ActionButton><ActionButton type="button" tone="secondary" onClick={() => setPreview(true)}><Eye className="size-4" />See how others see you</ActionButton></div></div></Panel>

        <Panel className="p-5 max-[760px]:p-4"><div className="mb-3"><h2 className="font-heading text-lg font-extrabold text-forest">My interests</h2><p className="mt-1 text-xs text-muted-foreground">Find plans and people who like the same things.</p></div>{viewer.interests?.length ? <Interests items={viewer.interests} /> : <p className="text-sm text-muted-foreground">No interests yet. Add a few things you’d like to do.</p>}<button type="button" onClick={() => { setEditing(true); setShowInterests(true); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-primary px-4 text-xs font-bold text-primary hover:bg-secondary"><Plus className="size-4" />{viewer.interests?.length ? 'Edit interests' : 'Add interests'}</button></Panel>

        <Panel className="p-5 max-[760px]:p-4"><h2 className="font-heading text-lg font-extrabold text-forest">Activity history</h2><p className="mt-1 text-xs text-muted-foreground">{hosted.length} {hosted.length === 1 ? 'plan hosted' : 'plans hosted'} · {completed.length} completed</p>{hosted.length > 0 && <div className="mt-4"><h3 className="text-xs font-extrabold text-forest">Hosted plans</h3><ul className="mt-1 divide-y divide-border">{hosted.slice(0, 3).map((plan) => <li key={plan.id} className="flex items-center gap-3 py-2 text-sm"><CalendarDays className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{plan.title}</span><span className="shrink-0 text-xs text-muted-foreground">{plan.date}</span></li>)}</ul></div>}{completed.length ? <ul className="mt-4 divide-y divide-border">{completed.slice(0, 5).map((plan) => <li key={plan.id} className="flex items-center gap-3 py-3 text-sm"><CalendarDays className="size-5 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate font-semibold">{plan.title}</span><span className="shrink-0 text-xs text-muted-foreground">{plan.date}</span></li>)}</ul> : <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#f5f8f3] p-4"><CalendarDays className="size-6 shrink-0 text-primary" /><div><strong className="text-sm">No completed plans yet</strong><p className="mt-1 text-xs text-muted-foreground">When you finish a plan, it will show up here.</p><button type="button" onClick={() => navigate('explore')} className="mt-2 text-xs font-bold text-primary hover:underline">Browse plans →</button></div></div>}</Panel>
      </div>

      <aside className="grid gap-4"><Panel className="p-5"><h2 className="font-heading text-base font-extrabold text-forest">Account settings</h2><p className="mt-4 text-xs font-bold text-forest">Email · Private</p><p className="mt-1 break-all text-sm text-muted-foreground">{viewer.email}</p><p className="mt-2 text-xs text-muted-foreground">Your email is not shown to other members.</p><ActionButton type="button" tone="secondary" className="mt-4 w-full" onClick={() => clerk.openUserProfile()}>Manage account</ActionButton><ActionButton type="button" tone="secondary" className="mt-2 w-full text-[#aa244c]" disabled={busy} onClick={signOut}>Sign out</ActionButton></Panel>{isAdmin && <Panel className="p-5"><h2 className="font-heading text-base font-extrabold text-forest">Admin workspace</h2><p className="mt-2 text-xs text-muted-foreground">Review reports, plans, and member activity.</p><Link href="/admin" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-forest">Open dashboard</Link></Panel>}<Panel className="p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-heading text-base font-extrabold text-forest">Meet safely</h2></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Choose public venues, share your plans with someone you trust, and leave if anything feels wrong.</p></Panel></aside>
    </div>

    {editing && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-forest/65 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="my-auto w-full max-w-lg rounded-[22px] bg-card p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="edit-profile-title" className="font-heading text-xl font-extrabold">Edit profile</h2><button type="button" onClick={reset} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button></div><form onSubmit={submit} className="mt-4 grid gap-4"><div className="flex items-center gap-4"><div className="relative size-20 overflow-hidden rounded-full bg-soft-green">{photoPreview || (!removePhoto && viewer.avatarUrl) ? <img src={photoPreview || viewer.avatarUrl} alt="Profile preview" className="size-full object-cover" /> : <span className="grid size-full place-items-center font-bold text-forest">{name.slice(0, 2).toUpperCase()}</span>}</div><div><label htmlFor="profile-photo" className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-primary px-3 text-xs font-bold text-primary"><Camera className="size-4" />Choose photo</label><input id="profile-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />{(viewer.avatarUrl || photoPreview) && <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(''); setRemovePhoto(true); }} className="ml-2 text-xs text-muted-foreground hover:underline">Remove</button>}<p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG, or WebP · up to 5 MB</p></div></div><label className="grid gap-1 text-xs font-bold">Display name<input required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-border px-3 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-bold">Location<input maxLength={60} value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-xl border border-border px-3 text-sm font-normal" /></label><label className="grid gap-1 text-xs font-bold">Short bio<textarea maxLength={240} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What do you enjoy doing with others?" className="rounded-xl border border-border p-3 text-sm font-normal" /><span className="text-right font-normal text-muted-foreground">{bio.length}/240</span></label><div><p className="text-xs font-bold">Interests</p><button type="button" onClick={() => setShowInterests((value) => !value)} className="mt-1 text-xs font-bold text-primary">{showInterests ? 'Hide choices' : 'Choose interests'}</button>{showInterests && <div className="mt-2 flex flex-wrap gap-2">{choices.map((interest) => <button key={interest} type="button" aria-pressed={interests.includes(interest)} onClick={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : current.length < 8 ? [...current, interest] : current)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${interests.includes(interest) ? 'bg-primary text-white' : 'border border-border text-forest hover:bg-secondary'}`}>{interest}</button>)}</div>}<div className="mt-2"><Interests items={interests} /></div></div><div className="flex justify-end gap-2 border-t border-border pt-4"><ActionButton type="button" tone="secondary" onClick={reset}>Cancel</ActionButton><ActionButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</ActionButton></div></form></section></div>}
    {preview && <div className="fixed inset-0 z-50 grid place-items-center bg-forest/65 p-3" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="public-preview-title" className="w-full max-w-md rounded-[22px] bg-card p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="public-preview-title" className="font-heading text-xl font-extrabold">Public profile preview</h2><button type="button" onClick={() => setPreview(false)} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button></div><p className="mb-5 text-xs text-muted-foreground">This is what other members can see. Your email stays private.</p><div className="flex items-center gap-3"><Avatar viewer={viewer} size="size-20" /><div><strong className="font-heading text-lg font-extrabold">{viewer.name}</strong><p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{viewer.city || 'Location not shared'}</p></div></div><p className="my-4 text-sm text-muted-foreground">{viewer.bio || 'No bio added yet.'}</p><Interests items={viewer.interests || []} /><p className="mt-5 text-xs text-muted-foreground">{hosted.length} plans hosted</p></section></div>}
  </div>;
}
