'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Coffee, Dumbbell, Eye, EyeOff, Footprints, MapPin, Palette, UsersRound, Waves } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionButton, PersonAvatar } from './shared';
import { AlongLogo } from './logo';
import { useAlong } from './context';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demo-auth.mjs';

const interests = [
  { label: 'Swimming', icon: Waves },
  { label: 'Fitness classes', icon: Dumbbell },
  { label: 'Coffee', icon: Coffee },
  { label: 'Walks', icon: Footprints },
  { label: 'Art & learning', icon: Palette }
];

function Field({ id, label, ...props }) {
  return <div className="grid gap-2"><Label htmlFor={id} className="text-sm font-bold">{label}</Label><Input id={id} className="h-12 rounded-xl border-border bg-white px-3.5" {...props} /></div>;
}

function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete = 'current-password' }) {
  return <div className="grid gap-2">{label && <Label htmlFor={id} className="text-sm font-bold">{label}</Label>}<div className="relative"><Input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={8} className="h-12 rounded-xl border-border bg-white pr-12" /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute top-0 right-0 grid h-12 w-12 place-items-center text-muted-foreground hover:text-primary">{visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}</button></div></div>;
}

function ProductPreview() {
  return <div className="mt-9 max-w-[390px] rotate-[-2deg] rounded-[22px] bg-white p-5 text-forest shadow-[0_20px_45px_rgba(0,0,0,.18)] max-[760px]:hidden">
    <div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber px-3 py-1 text-[11px] font-extrabold text-forest"><CalendarDays className="mr-1 inline size-3" aria-hidden="true" /> Saturday · 10:00 AM</span><span className="rounded-full bg-pink px-3 py-1 text-[11px] font-extrabold text-forest">Beginner friendly</span></div>
    <h3 className="mt-4 font-heading text-xl leading-tight font-extrabold">Morning swim at Silver Springs</h3>
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5 text-primary" aria-hidden="true" /> Bugolobi · 1 spot open</div>
    <div className="mt-5 flex items-center justify-between border-t border-border pt-4"><div className="flex items-center gap-2"><PersonAvatar initials="MK" name="Maya K." tone="pink" small /><span className="text-xs font-bold">Maya is going</span></div><span className="rounded-full bg-soft-green px-3 py-1.5 text-xs font-extrabold text-primary"><UsersRound className="mr-1 inline size-3.5" aria-hidden="true" /> Go together</span></div>
  </div>;
}

export function AuthScreen() {
  const { authScreen, setAuthScreen, continueAsGuest, signIn, finishSignup } = useAlong();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [chosen, setChosen] = useState([]);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  function changeScreen(next) { setError(''); setAuthScreen(next); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function submitSignIn(event) { event.preventDefault(); if (!signIn(email, password)) setError('Use the demo account details below to preview sign in.'); }
  function submitSignup(event) {
    event.preventDefault();
    if (signupPassword.length < 8) return setError('Use at least 8 characters for the demo password.');
    if (signupPassword !== confirmPassword) return setError('The passwords do not match. Try again.');
    setSignupPassword(''); setConfirmPassword(''); setError(''); changeScreen('interests');
  }
  function toggleInterest(label) { setChosen((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]); }

  const backTarget = authScreen === 'interests' ? 'signup' : authScreen === 'reset' ? 'signin' : 'welcome';
  return <div className="min-h-screen bg-white text-foreground"><div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] max-[760px]:grid-cols-1">
    <aside className="flex min-h-screen flex-col overflow-hidden bg-forest px-[clamp(2rem,5vw,5rem)] pt-2 pb-10 text-white max-[760px]:min-h-[290px] max-[760px]:px-6 max-[760px]:pb-7">
      <AlongLogo className="-ml-9 max-[760px]:-ml-6" />
      <div className="mt-auto max-[760px]:mt-[-5px]"><h1 className="max-w-[620px] font-heading text-[clamp(2.2rem,4vw,4.5rem)] leading-[1.08] font-extrabold tracking-[-.05em] max-[760px]:text-[2.1rem]">Good plans deserve good company.</h1><p className="mt-5 max-w-[490px] text-base leading-relaxed text-white/75 max-[760px]:mt-3 max-[760px]:text-sm">A swim, a walk, a new class. Make the plan, find your person, and actually go.</p><ProductPreview /></div>
      <div className="mt-9 text-xs font-semibold tracking-wide text-white/50 max-[760px]:hidden">SMALL PLANS · REAL PLACES · KAMPALA</div>
    </aside>
    <main className="flex min-h-screen items-center justify-center px-8 py-12 max-[760px]:min-h-0 max-[760px]:px-5 max-[760px]:py-9"><div className="w-full max-w-[430px]">
      {authScreen !== 'welcome' && <button type="button" onClick={() => changeScreen(backTarget)} className="mb-8 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" /> Back</button>}
      {authScreen === 'welcome' && <>
        <div className="mb-5 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"><span className="size-2 rounded-full bg-pink" /> You don’t have to go alone</span><span className="rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">Weekend plans start here</span></div>
        <h2 className="font-heading text-[clamp(2.4rem,4vw,3.5rem)] leading-[1.08] font-extrabold tracking-[-.05em]">Your next yes starts here.</h2>
        <p className="mt-5 mb-8 text-base leading-relaxed text-muted-foreground">Meet people around a specific plan, at a real place and time. Start small. Show up together.</p>
        <div className="grid gap-3"><ActionButton type="button" className="w-full justify-between" onClick={() => changeScreen('signup')}>Create a demo profile <ArrowRight aria-hidden="true" /></ActionButton><ActionButton type="button" tone="secondary" className="w-full" onClick={() => changeScreen('signin')}>I already have an account</ActionButton></div>
        <button type="button" onClick={continueAsGuest} className="mt-6 w-full py-2 text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">Explore the demo as a guest</button>
        <p className="mt-7 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">This is a product preview with sample people and plans. No real account is created.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowLeft className="size-4" /> About Along</Link>
      </>}
      {authScreen === 'signin' && <>
        <h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">Welcome back.</h2><p className="mt-2 mb-7 text-muted-foreground">Pick up where your plans left off.</p>
        <form className="grid gap-5" onSubmit={submitSignIn}><Field id="signin-email" label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /><div><div className="mb-2 flex items-center justify-between"><Label htmlFor="signin-password" className="text-sm font-bold">Password</Label><button type="button" onClick={() => changeScreen('reset')} className="text-xs font-bold text-primary hover:underline">Forgot password?</button></div><PasswordField id="signin-password" label="" value={password} onChange={(event) => setPassword(event.target.value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</p>}<ActionButton type="submit" className="w-full">Sign in to demo <ArrowRight aria-hidden="true" /></ActionButton></form>
        <div className="mt-7 rounded-2xl border border-border bg-soft-green p-4"><div className="flex items-center justify-between gap-3"><strong className="flex items-center gap-2 text-sm text-forest"><span className="size-2 rounded-full bg-pink" /> Try the sample account</strong><button type="button" onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setError(''); }} className="text-xs font-extrabold text-primary hover:underline">Fill details</button></div><p className="mt-1 text-xs text-muted-foreground">{DEMO_EMAIL} · {DEMO_PASSWORD}</p></div>
        <p className="mt-7 text-center text-sm text-muted-foreground">New to Along? <button type="button" onClick={() => changeScreen('signup')} className="font-bold text-primary hover:underline">Create a demo profile</button></p>
      </>}
      {authScreen === 'signup' && <>
        <div className="mb-4 inline-flex rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">A plan is better with you in it</div>
        <h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">Start with a plan.</h2><p className="mt-2 mb-7 text-muted-foreground">Make a profile, then choose what you’d like to try.</p>
        <form className="grid gap-4" onSubmit={submitSignup}><Field id="signup-name" label="First name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" required maxLength={40} placeholder="Your first name" /><Field id="signup-email" label="Email address" type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /><PasswordField id="signup-password" label="Password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" /><PasswordField id="signup-confirm" label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete="new-password" />{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</p>}<ActionButton type="submit" className="mt-1 w-full">Continue <ArrowRight aria-hidden="true" /></ActionButton></form>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Demo only: your password is discarded when you continue. No account is created on a server.</p><p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <button type="button" className="font-bold text-primary hover:underline" onClick={() => changeScreen('signin')}>Sign in</button></p>
      </>}
      {authScreen === 'interests' && <>
        <div className="mb-4 inline-flex rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">Choose at least one</div><h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">What are you up for?</h2><p className="mt-2 mb-7 text-muted-foreground">This helps your demo profile feel like yours. You can explore everything either way.</p>
        <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1" role="group" aria-label="Activity interests">{interests.map(({ label, icon: Icon }) => <button type="button" key={label} aria-pressed={chosen.includes(label)} onClick={() => toggleInterest(label)} className={`flex min-h-14 items-center gap-2.5 rounded-2xl border px-4 text-left text-sm font-bold transition-colors ${chosen.includes(label) ? 'border-pink bg-pink text-forest' : 'border-border bg-white text-foreground hover:border-pink hover:bg-accent'}`}><Icon className="size-[18px] shrink-0" aria-hidden="true" />{label}</button>)}</div>
        <ActionButton type="button" className="mt-7 w-full" disabled={!chosen.length} onClick={() => finishSignup({ name, email: signupEmail, interests: chosen })}>Enter Along <ArrowRight aria-hidden="true" /></ActionButton><p className="mt-4 text-center text-xs text-muted-foreground">Your interests stay in this browser as demo data.</p>
      </>}
      {authScreen === 'reset' && <>
        <h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">Reset your password.</h2><p className="mt-2 mb-7 text-muted-foreground">Preview how recovery would work when Along has real accounts.</p>
        {resetSent ? <div className="rounded-2xl border border-border bg-soft-green p-5"><strong className="text-forest">Recovery preview complete</strong><p className="mt-2 text-sm text-muted-foreground">No email was sent. A live version would send a reset link to {resetEmail}.</p><ActionButton type="button" tone="secondary" className="mt-5" onClick={() => changeScreen('signin')}>Back to sign in</ActionButton></div> : <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); setResetSent(true); }}><Field id="reset-email" label="Email address" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required placeholder="you@example.com" /><ActionButton type="submit" className="w-full">Preview reset flow <ArrowRight aria-hidden="true" /></ActionButton></form>}
      </>}
    </div></main>
  </div></div>;
}
