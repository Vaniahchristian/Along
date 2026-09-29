'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { ArrowRight, X } from 'lucide-react';
import { TagwimiLogo } from './logo';

function GoogleMark() {
  return <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.68 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.96 23.96 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

export function ClerkAuthScreen({ embedded = false, onClose }) {
  const { signIn } = useSignIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function continueWithGoogle() {
    if (busy) return;
    if (!signIn) { setError('Google sign-in is still loading. Please try again.'); return; }
    setBusy(true);
    setError('');
    try {
      const result = await signIn.sso({ strategy: 'oauth_google', redirectCallbackUrl: '/sso-callback', redirectUrl: '/app' });
      if (result?.error) throw result.error;
    } catch (reason) {
      setError(reason?.errors?.[0]?.longMessage || reason?.errors?.[0]?.message || reason?.message || 'Google sign-in could not start. Please try again.');
      setBusy(false);
    }
  }

  const form = <div className="w-full max-w-[430px]">
    {embedded && <div className="mb-8 flex items-start justify-between gap-4"><TagwimiLogo compact /><button type="button" onClick={onClose} aria-label="Close account dialog" className="grid size-11 shrink-0 place-items-center rounded-full text-[#45604a] transition-colors hover:bg-[#e9f1e8] focus-visible:outline-2 focus-visible:outline-[#3b793f]"><X className="size-5" /></button></div>}
    <h2 className="font-heading text-[clamp(1.9rem,6vw,2.7rem)] font-extrabold leading-[1.1] tracking-[-.04em] text-forest">Come along.</h2>
    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#526756]">Join a plan, bring someone with you, or make your own. Your next good day starts with a yes.</p>
    <button type="button" onClick={continueWithGoogle} disabled={busy} className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#c9d9c8] bg-white px-5 text-[15px] font-bold text-forest shadow-[0_3px_12px_rgba(15,34,24,.07)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#f2f7f0] hover:shadow-[0_6px_18px_rgba(15,34,24,.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b793f] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0">
      <GoogleMark />{busy ? 'Connecting to Google…' : 'Continue with Google'}<ArrowRight className="ml-auto size-4 text-[#3b793f]" />
    </button>
    {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f4] px-4 py-3 text-sm text-[#912c51]">{error}</p>}
    <p className="mt-4 text-center text-xs leading-relaxed text-[#526756]">New here or coming back? The same Google button works for both.</p>
    <p className="mt-10 border-t border-[#dfe9dd] pt-5 text-center text-xs leading-relaxed text-[#526756]">By continuing, you agree to our <Link href="/terms" className="font-semibold underline underline-offset-2 hover:text-[#3b793f]">Terms</Link> and <Link href="/privacy" className="font-semibold underline underline-offset-2 hover:text-[#3b793f]">Privacy Policy</Link>.</p>
  </div>;

  if (embedded) return <div className="px-5 py-6 sm:px-9 sm:py-8">{form}</div>;
  return <main className="min-h-screen bg-[#f7f9f4] text-forest lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
    <section className="relative flex flex-col justify-between overflow-hidden bg-forest px-6 py-5 text-white sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
      <TagwimiLogo compact onDark className="relative z-10" />
      <div className="relative z-10 hidden max-w-xl lg:block"><h1 className="font-heading text-[clamp(2.7rem,5vw,5.8rem)] font-extrabold leading-[1.02] tracking-[-.04em]">Make the plan.<br /><span className="text-[#ffb900]">Find your people.</span><br />Go<span className="text-[#ec4899]">.</span></h1><p className="mt-6 max-w-md text-base leading-relaxed text-[#dbe9db]">Find a person for the swim, class, walk, or café visit you’ve been meaning to make.</p></div>
      <p className="relative z-10 mt-3 font-heading text-lg font-extrabold tracking-[-.03em] lg:hidden">Make the plan. <span className="text-[#ffb900]">Find your people.</span> Go<span className="text-[#ec4899]">.</span></p>
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-80 rounded-full bg-[#ec4899]/20 blur-3xl" aria-hidden="true" />
      <p className="relative z-10 hidden text-sm text-[#b7cdbb] lg:block">Small plans. Real places. Good company.</p>
    </section>
    <section className="flex min-h-[500px] items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-10">{form}</section>
  </main>;
}
