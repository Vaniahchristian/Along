'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, X } from 'lucide-react';
import { TagwimiLogo } from './logo';

const interests = ['Swimming', 'Fitness classes', 'Coffee', 'Walks', 'Art & learning'];

function GoogleMark() {
  return <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.68 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.96 23.96 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

function getError(reason) {
  return reason?.errors?.[0]?.longMessage || reason?.errors?.[0]?.message || reason?.message || 'That did not work. Please try again.';
}

function Field({ label, id, type = 'text', value, onChange, autoComplete, placeholder, minLength, maxLength, right }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-bold text-forest">{label}</label><div className="relative"><input id={id} type={type} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} required minLength={minLength} maxLength={maxLength} className="h-12 w-full rounded-xl border border-[#d3ded0] bg-white px-4 pr-12 text-sm text-forest outline-none transition focus:border-[#3b793f] focus:ring-2 focus:ring-[#3b793f]/20" />{right}</div></div>;
}

export function ClerkAuthScreen({ onClose }) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const [mode, setMode] = useState('signup');
  const [step, setStep] = useState('choice');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [chosen, setChosen] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('code');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next) => { setMode(next); setStep('choice'); setError(''); setCode(''); };
  const run = async (work) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); }
    catch (reason) { setError(getError(reason)); }
    finally { setBusy(false); }
  };
  const assertResult = (result) => { if (result?.error) throw result.error; };
  const navigate = ({ decorateUrl }) => {
    const url = decorateUrl('/app');
    if (url.startsWith('http')) window.location.assign(url);
    else router.replace(url);
  };

  const google = () => run(async () => {
    if (!signIn) throw new Error('Sign-in is still loading. Please try again.');
    assertResult(await signIn.sso({ strategy: 'oauth_google', redirectCallbackUrl: '/sso-callback', redirectUrl: '/app' }));
  });

  const signUpWithEmail = (event) => {
    event.preventDefault();
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    run(async () => {
      if (!signUp) throw new Error('Sign-up is still loading. Please try again.');
      assertResult(await signUp.password({ emailAddress: email.trim(), password, unsafeMetadata: { display_name: name.trim(), interests: chosen } }));
      assertResult(await signUp.verifications.sendEmailCode());
      setPassword(''); setConfirm(''); setStep('verify-signup');
    });
  };

  const verifySignup = (event) => {
    event.preventDefault();
    run(async () => {
      assertResult(await signUp.verifications.verifyEmailCode({ code: code.trim() }));
      if (signUp.status !== 'complete') throw new Error('Your email was verified, but your account still needs more information. Contact support@tagwimi.com.');
      assertResult(await signUp.finalize({ navigate }));
    });
  };

  const signInWithEmail = (event) => {
    event.preventDefault();
    run(async () => {
      if (!signIn) throw new Error('Sign-in is still loading. Please try again.');
      if (loginMethod === 'code') {
        assertResult(await signIn.create({ identifier: email.trim() }));
        assertResult(await signIn.emailCode.sendCode({ emailAddress: email.trim() }));
        setStep('verify-email-login');
        return;
      }
      assertResult(await signIn.password({ emailAddress: email.trim(), password }));
      if (signIn.status === 'complete') { assertResult(await signIn.finalize({ navigate })); return; }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        assertResult(await signIn.mfa.sendEmailCode()); setStep('verify-signin'); return;
      }
      throw new Error('This account needs another sign-in step. Contact support@tagwimi.com.');
    });
  };

  const verifyEmailLogin = (event) => {
    event.preventDefault();
    run(async () => {
      assertResult(await signIn.emailCode.verifyCode({ code: code.trim() }));
      if (signIn.status !== 'complete') throw new Error('The sign-in is not complete. Please try again.');
      assertResult(await signIn.finalize({ navigate }));
    });
  };

  const verifySignin = (event) => {
    event.preventDefault();
    run(async () => {
      assertResult(await signIn.mfa.verifyEmailCode({ code: code.trim() }));
      if (signIn.status !== 'complete') throw new Error('The sign-in is not complete. Please try again.');
      assertResult(await signIn.finalize({ navigate }));
    });
  };

  const sendReset = (event) => {
    event.preventDefault();
    run(async () => {
      assertResult(await signIn.create({ identifier: email.trim() }));
      assertResult(await signIn.resetPasswordEmailCode.sendCode());
      setStep('reset-code');
    });
  };

  const verifyReset = (event) => {
    event.preventDefault();
    run(async () => {
      assertResult(await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }));
      setStep('new-password');
    });
  };

  const finishReset = (event) => {
    event.preventDefault();
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    run(async () => {
      assertResult(await signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true }));
      if (signIn.status !== 'complete') throw new Error('Your password changed, but sign-in needs another step. Please log in again.');
      assertResult(await signIn.finalize({ navigate }));
    });
  };

  const passwordToggle = <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#607061] hover:text-[#3b793f]">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>;
  const primary = 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b793f] px-5 text-sm font-bold text-white transition hover:bg-[#2d6232] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b793f] disabled:cursor-wait disabled:opacity-60';

  return <div className="px-5 py-6 text-forest sm:px-9 sm:py-8">
    <div className="mb-7 flex items-start justify-between gap-4"><TagwimiLogo compact /><button type="button" onClick={onClose} aria-label="Close account dialog" className="grid size-10 shrink-0 place-items-center rounded-full text-[#45604a] hover:bg-[#e9f1e8]"><X className="size-5" /></button></div>
    <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#e9f1e8] p-1" role="tablist" aria-label="Account"><button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')} className={`min-h-11 rounded-xl text-sm font-bold ${mode === 'signup' ? 'bg-white text-[#286932] shadow-sm' : 'text-[#526a56]'}`}>Create account</button><button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')} className={`min-h-11 rounded-xl text-sm font-bold ${mode === 'signin' ? 'bg-white text-[#286932] shadow-sm' : 'text-[#526a56]'}`}>Log in</button></div>
    {step !== 'choice' && <button type="button" onClick={() => { setStep(step === 'email' || step === 'reset-email' ? 'choice' : step === 'new-password' ? 'reset-code' : 'email'); setError(''); }} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#3b793f]"><ArrowLeft className="size-4" /> Back</button>}
    {step === 'choice' && <><span className="inline-flex items-center gap-2 rounded-full bg-[#ffe1ef] px-3 py-1.5 text-xs font-bold text-[#8e285b]"><span className="size-2 rounded-full bg-[#ec4899]" /> Small plans, good company</span><h2 className="mt-5 font-heading text-[clamp(1.9rem,6vw,2.5rem)] font-extrabold leading-tight tracking-[-.05em]">{mode === 'signup' ? 'Your next yes starts here.' : 'Welcome back.'}</h2><p className="mt-3 text-sm leading-relaxed text-[#526756]">{mode === 'signup' ? 'Create an account and find someone to go with.' : 'Log in and pick up where your plans left off.'}</p><div className="mt-7 grid gap-3"><button type="button" onClick={google} disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#c9d9c8] bg-white px-5 text-sm font-bold shadow-sm hover:bg-[#f2f7f0] disabled:opacity-60"><GoogleMark />Continue with Google<ArrowRight className="ml-auto size-4 text-[#3b793f]" /></button><div className="flex items-center gap-3 text-xs text-[#718174]"><span className="h-px flex-1 bg-[#d9e5d6]" />or<span className="h-px flex-1 bg-[#d9e5d6]" /></div><button type="button" onClick={() => setStep('email')} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#c9d9c8] bg-white px-5 text-sm font-bold hover:bg-[#f2f7f0]"><Mail className="size-5 text-[#3b793f]" />Continue with email</button></div></>}
    {step === 'email' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">{mode === 'signup' ? 'Create your account.' : 'Log in with email.'}</h2><p className="mt-2 mb-6 text-sm text-[#526756]">{mode === 'signup' ? 'A few details, then you can make your first plan.' : 'We’ll send a secure code to your inbox.'}</p><form onSubmit={mode === 'signup' ? signUpWithEmail : signInWithEmail} className="grid gap-4">{mode === 'signup' && <Field id="clerk-name" label="Your name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={40} placeholder="What should people call you?" />}<Field id="clerk-email" label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />{(mode === 'signup' || loginMethod === 'password') && <><Field id="clerk-password" label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 15 : undefined} right={passwordToggle} />{mode === 'signup' && <p className="-mt-2 text-xs text-[#607061]">Use at least 15 characters.</p>}</>}{mode === 'signup' && <><Field id="clerk-confirm" label="Confirm password" type={showPassword ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={15} /><div><p className="mb-2 text-sm font-bold">What are you up for? <span className="font-normal text-[#607061]">Optional</span></p><div className="flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} type="button" aria-pressed={chosen.includes(interest)} onClick={() => setChosen((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest])} className={`rounded-full border px-3 py-2 text-xs font-bold ${chosen.includes(interest) ? 'border-[#ec4899] bg-[#ffe1ef] text-[#8e285b]' : 'border-[#d3ded0] bg-white text-[#526756]'}`}>{interest}</button>)}</div></div></>}{mode === 'signin' && <><button type="button" onClick={() => { setLoginMethod((method) => method === 'code' ? 'password' : 'code'); setError(''); }} className="justify-self-start text-xs font-bold text-[#3b793f] hover:underline">{loginMethod === 'code' ? 'Use password instead' : 'Use an email code instead'}</button>{loginMethod === 'password' && <button type="button" onClick={() => { setStep('reset-email'); setError(''); }} className="justify-self-end text-xs font-bold text-[#3b793f] hover:underline">Forgot password?</button>}</>}<button type="submit" disabled={busy} className={primary}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : loginMethod === 'code' ? 'Send login code' : 'Log in'}<ArrowRight className="size-4" /></button></form></>}
    {step === 'verify-email-login' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">Check your email.</h2><p className="mt-3 mb-6 text-sm text-[#526756]">Enter the login code sent to <strong>{email}</strong>.</p><form onSubmit={verifyEmailLogin} className="grid gap-4"><Field id="login-code" label="Login code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /><button type="submit" disabled={busy} className={primary}>Verify and log in</button></form><button type="button" onClick={() => run(async () => assertResult(await signIn.emailCode.sendCode({ emailAddress: email.trim() })))} className="mt-4 text-xs font-bold text-[#3b793f] hover:underline">Send a new code</button></>}
    {step === 'verify-signup' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">Check your email.</h2><p className="mt-3 mb-6 text-sm text-[#526756]">Enter the code we sent to <strong>{email}</strong>.</p><form onSubmit={verifySignup} className="grid gap-4"><Field id="signup-code" label="Verification code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" placeholder="Enter the code" /><button type="submit" disabled={busy} className={primary}>{busy ? 'Verifying…' : 'Verify and continue'}</button></form><button type="button" onClick={() => run(async () => assertResult(await signUp.verifications.sendEmailCode()))} className="mt-4 text-xs font-bold text-[#3b793f] hover:underline">Send a new code</button></>}
    {step === 'verify-signin' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">One more check.</h2><p className="mt-3 mb-6 text-sm text-[#526756]">Enter the security code sent to your email.</p><form onSubmit={verifySignin} className="grid gap-4"><Field id="signin-code" label="Security code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /><button type="submit" disabled={busy} className={primary}>Verify and log in</button></form><button type="button" onClick={() => run(async () => assertResult(await signIn.mfa.sendEmailCode()))} className="mt-4 text-xs font-bold text-[#3b793f] hover:underline">Send a new code</button></>}
    {step === 'reset-email' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">Reset your password.</h2><p className="mt-3 mb-6 text-sm text-[#526756]">We’ll email you a code to choose a new one.</p><form onSubmit={sendReset} className="grid gap-4"><Field id="reset-email" label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /><button type="submit" disabled={busy} className={primary}>Send reset code</button></form></>}
    {step === 'reset-code' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">Check your inbox.</h2><p className="mt-3 mb-6 text-sm text-[#526756]">Enter the reset code sent to {email}.</p><form onSubmit={verifyReset} className="grid gap-4"><Field id="reset-code" label="Reset code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /><button type="submit" disabled={busy} className={primary}>Continue</button></form></>}
    {step === 'new-password' && <><h2 className="font-heading text-3xl font-extrabold tracking-[-.05em]">Choose a new password.</h2><p className="mt-2 text-xs text-[#607061]">Use at least 15 characters.</p><form onSubmit={finishReset} className="mt-6 grid gap-4"><Field id="new-password" label="New password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={15} right={passwordToggle} /><Field id="confirm-new-password" label="Confirm new password" type={showPassword ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={15} /><button type="submit" disabled={busy} className={primary}>Save password and log in</button></form></>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f4] px-4 py-3 text-sm text-[#912c51]">{error}</p>}
    <p className="mt-8 border-t border-[#dfe9dd] pt-5 text-center text-xs leading-relaxed text-[#526756]">By continuing, you agree to our <Link href="/terms" className="font-semibold underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy Policy</Link>.</p>
    <div id="clerk-captcha" />
  </div>;
}
