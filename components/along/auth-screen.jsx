'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Coffee, Dumbbell, Eye, EyeOff, Footprints, MapPin, Palette, UsersRound, Waves } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionButton, PersonAvatar } from './shared';
import { AlongLogo } from './logo';
import { useAlong } from './context';

const interests = [
  { label: 'Swimming', icon: Waves }, { label: 'Fitness classes', icon: Dumbbell },
  { label: 'Coffee', icon: Coffee }, { label: 'Walks', icon: Footprints }, { label: 'Art & learning', icon: Palette }
];

function Field({ id, label, ...props }) {
  return <div className="grid gap-2"><Label htmlFor={id} className="text-sm font-bold">{label}</Label><Input id={id} className="h-12 rounded-xl border-border bg-white px-3.5" {...props} /></div>;
}

function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete = 'current-password' }) {
  return <div className="grid gap-2">{label && <Label htmlFor={id} className="text-sm font-bold">{label}</Label>}<div className="relative"><Input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={8} className="h-12 rounded-xl border-border bg-white pr-12" /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute top-0 right-0 grid h-12 w-12 place-items-center text-muted-foreground hover:text-primary">{visible ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}</button></div></div>;
}

function ProductPreview() {
  return <div className="mt-9 max-w-[390px] rotate-[-2deg] rounded-[22px] bg-white p-5 text-forest shadow-[0_20px_45px_rgba(0,0,0,.18)] max-[760px]:hidden"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber px-3 py-1 text-[11px] font-extrabold text-forest"><CalendarDays className="mr-1 inline size-3" /> Pick a day</span><span className="rounded-full bg-pink px-3 py-1 text-[11px] font-extrabold text-forest">Your pace</span></div><h3 className="mt-4 font-heading text-xl leading-tight font-extrabold">A morning swim with good company</h3><div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5 text-primary" /> A public place nearby</div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><div className="flex items-center gap-2"><PersonAvatar initials="YO" name="You" tone="pink" small /><span className="text-xs font-bold">Make it your plan</span></div><span className="rounded-full bg-soft-green px-3 py-1.5 text-xs font-extrabold text-primary"><UsersRound className="mr-1 inline size-3.5" /> Go together</span></div></div>;
}

export function AuthScreen() {
  const { authScreen, setAuthScreen, busy, loadError, signIn, finishSignup, sendPasswordReset, updatePassword } = useAlong();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [chosen, setChosen] = useState([]);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const changeScreen = (next) => { setError(''); setAuthScreen(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const toggleInterest = (label) => setChosen((items) => items.includes(label) ? items.filter((item) => item !== label) : [...items, label]);

  async function submitSignIn(event) {
    event.preventDefault(); setError('');
    const result = await signIn(email.trim(), password);
    if (!result.ok) setError(result.error || 'Could not sign in.');
  }
  function submitSignup(event) {
    event.preventDefault();
    if (signupPassword !== confirmPassword) return setError('The passwords do not match.');
    setError(''); changeScreen('interests');
  }
  async function submitRegistration() {
    setError('');
    const result = await finishSignup({ name: name.trim(), email: signupEmail.trim(), password: signupPassword, interests: chosen });
    if (!result.ok) setError(result.error || 'Could not create your account.');
    else { setSignupPassword(''); setConfirmPassword(''); }
  }
  async function submitReset(event) {
    event.preventDefault(); setError('');
    const result = await sendPasswordReset(resetEmail.trim());
    if (result.ok) setResetSent(true);
    else setError(result.error || 'Could not send the reset email.');
  }
  async function submitNewPassword(event) {
    event.preventDefault(); setError('');
    const result = await updatePassword(newPassword);
    if (!result.ok) setError(result.error || 'Could not update your password.');
    else setNewPassword('');
  }

  const backTarget = authScreen === 'interests' ? 'signup' : authScreen === 'reset' ? 'signin' : 'welcome';
  return <div className="min-h-screen bg-white text-foreground"><div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] max-[760px]:grid-cols-1">
    <aside className="flex min-h-screen flex-col overflow-hidden bg-forest px-[clamp(2rem,5vw,5rem)] pt-2 pb-10 text-white max-[760px]:min-h-[290px] max-[760px]:px-6 max-[760px]:pb-7"><AlongLogo className="-ml-9 max-[760px]:-ml-6" /><div className="mt-auto max-[760px]:mt-[-5px]"><h1 className="max-w-[620px] font-heading text-[clamp(2.2rem,4vw,4.5rem)] leading-[1.08] font-extrabold tracking-[-.05em] max-[760px]:text-[2.1rem]">Good plans deserve good company.</h1><p className="mt-5 max-w-[490px] text-base leading-relaxed text-white/75 max-[760px]:mt-3 max-[760px]:text-sm">A swim, a walk, a new class. Make the plan, find your person, and actually go.</p><ProductPreview /></div><div className="mt-9 text-xs font-semibold tracking-wide text-white/50 max-[760px]:hidden">SMALL PLANS · REAL PLACES · KAMPALA</div></aside>
    <main className="flex min-h-screen items-center justify-center px-8 py-12 max-[760px]:min-h-0 max-[760px]:px-5 max-[760px]:py-9"><div className="w-full max-w-[430px]">
      {!['welcome', 'verify', 'recovery'].includes(authScreen) && <button type="button" onClick={() => changeScreen(backTarget)} className="mb-8 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Back</button>}
      {authScreen === 'welcome' && <><div className="mb-5 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"><span className="size-2 rounded-full bg-pink" /> You don’t have to go alone</span><span className="rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">Weekend plans start here</span></div><h2 className="font-heading text-[clamp(2.4rem,4vw,3.5rem)] leading-[1.08] font-extrabold tracking-[-.05em]">Your next yes starts here.</h2><p className="mt-5 mb-8 text-base leading-relaxed text-muted-foreground">Meet people around a specific plan, at a real place and time. Start small. Show up together.</p>{loadError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-destructive">Could not open your account: {loadError}</p>}<div className="grid gap-3"><ActionButton type="button" className="w-full justify-between" onClick={() => changeScreen('signup')}>Create an account <ArrowRight /></ActionButton><ActionButton type="button" tone="secondary" className="w-full" onClick={() => changeScreen('signin')}>Sign in</ActionButton></div><Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ArrowLeft className="size-4" /> About Along</Link></>}
      {authScreen === 'signin' && <><h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">Welcome back.</h2><p className="mt-2 mb-7 text-muted-foreground">Pick up where your plans left off.</p><form className="grid gap-5" onSubmit={submitSignIn}><Field id="signin-email" label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /><div><div className="mb-2 flex items-center justify-between"><Label htmlFor="signin-password" className="text-sm font-bold">Password</Label><button type="button" onClick={() => changeScreen('reset')} className="text-xs font-bold text-primary hover:underline">Forgot password?</button></div><PasswordField id="signin-password" label="" value={password} onChange={(event) => setPassword(event.target.value)} visible={visible} onToggle={() => setVisible(!visible)} /></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</p>}<ActionButton type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight /></ActionButton></form><p className="mt-7 text-center text-sm text-muted-foreground">New to Along? <button type="button" onClick={() => changeScreen('signup')} className="font-bold text-primary hover:underline">Create an account</button></p></>}
      {authScreen === 'signup' && <><div className="mb-4 inline-flex rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">A plan is better with you in it</div><h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">Start with a plan.</h2><p className="mt-2 mb-7 text-muted-foreground">Make a profile, then choose what you’d like to try.</p><form className="grid gap-4" onSubmit={submitSignup}><Field id="signup-name" label="First name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" required maxLength={40} placeholder="Your first name" /><Field id="signup-email" label="Email address" type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /><PasswordField id="signup-password" label="Password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} visible={visible} onToggle={() => setVisible(!visible)} autoComplete="new-password" /><PasswordField id="signup-confirm" label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} visible={visible} onToggle={() => setVisible(!visible)} autoComplete="new-password" />{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</p>}<ActionButton type="submit" className="mt-1 w-full">Continue <ArrowRight /></ActionButton></form><p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <button type="button" className="font-bold text-primary hover:underline" onClick={() => changeScreen('signin')}>Sign in</button></p></>}
      {authScreen === 'interests' && <><div className="mb-4 inline-flex rounded-full bg-amber px-3 py-1.5 text-xs font-extrabold text-forest">Choose at least one</div><h2 className="font-heading text-[clamp(2.25rem,4vw,3.2rem)] leading-tight font-extrabold tracking-[-.05em]">What are you up for?</h2><p className="mt-2 mb-7 text-muted-foreground">Choose a few interests to help people get to know you.</p><div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1" role="group" aria-label="Activity interests">{interests.map(({ label, icon: Icon }) => <button type="button" key={label} aria-pressed={chosen.includes(label)} onClick={() => toggleInterest(label)} className={`flex min-h-14 items-center gap-2.5 rounded-2xl border px-4 text-left text-sm font-bold transition-colors ${chosen.includes(label) ? 'border-pink bg-pink text-forest' : 'border-border bg-white text-foreground hover:border-pink hover:bg-accent'}`}><Icon className="size-[18px] shrink-0" />{label}</button>)}</div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</p>}<ActionButton type="button" className="mt-7 w-full" disabled={!chosen.length || busy} onClick={submitRegistration}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight /></ActionButton></>}
      {authScreen === 'verify' && <><h2 className="font-heading text-4xl font-extrabold tracking-[-.05em]">Check your email.</h2><p className="mt-4 text-muted-foreground">We sent a confirmation link to <strong>{signupEmail}</strong>. Open it to finish creating your account.</p><ActionButton type="button" tone="secondary" className="mt-8" onClick={() => changeScreen('signin')}>Back to sign in</ActionButton></>}
      {authScreen === 'reset' && <><h2 className="font-heading text-4xl font-extrabold tracking-[-.05em]">Reset your password.</h2><p className="mt-3 mb-7 text-muted-foreground">We’ll email you a link to choose a new one.</p>{resetSent ? <div className="rounded-2xl border border-border bg-soft-green p-5"><strong>Check your inbox</strong><p className="mt-2 text-sm text-muted-foreground">If an account exists for {resetEmail}, you’ll receive a reset link.</p><ActionButton type="button" tone="secondary" className="mt-5" onClick={() => changeScreen('signin')}>Back to sign in</ActionButton></div> : <form className="grid gap-5" onSubmit={submitReset}><Field id="reset-email" label="Email address" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required placeholder="you@example.com" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<ActionButton type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'} <ArrowRight /></ActionButton></form>}</>}
      {authScreen === 'recovery' && <><h2 className="font-heading text-4xl font-extrabold tracking-[-.05em]">Choose a new password.</h2><p className="mt-3 mb-7 text-muted-foreground">Use at least eight characters.</p><form className="grid gap-5" onSubmit={submitNewPassword}><PasswordField id="new-password" label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} visible={visible} onToggle={() => setVisible(!visible)} autoComplete="new-password" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<ActionButton type="submit" disabled={busy} className="w-full">{busy ? 'Updating…' : 'Update password'}</ActionButton></form></>}
    </div></main>
  </div></div>;
}
