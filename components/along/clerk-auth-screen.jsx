'use client';

import Link from 'next/link';
import { useState } from 'react';
import { X } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/nextjs';
import { TagwimiLogo } from './logo';

export function ClerkAuthScreen({ embedded = false, onClose }) {
  const [mode, setMode] = useState(embedded ? 'sign-up' : 'sign-in');
  const form = <div className="w-full max-w-[430px]">{embedded && <div className="mb-6 flex items-start justify-between gap-4"><TagwimiLogo compact /><button type="button" onClick={onClose} aria-label="Close account dialog" className="grid size-10 shrink-0 place-items-center rounded-full text-[#45604a] hover:bg-[#e9f1e8] focus-visible:outline-2 focus-visible:outline-[#3b793f]"><X className="size-5" /></button></div>}<div className="mb-5 flex rounded-2xl bg-[#e9f1e8] p-1" role="tablist" aria-label="Account"><button type="button" role="tab" aria-selected={mode === 'sign-up'} onClick={() => setMode('sign-up')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === 'sign-up' ? 'bg-white text-[#3b793f] shadow-sm' : 'text-[#536655]'}`}>Create account</button><button type="button" role="tab" aria-selected={mode === 'sign-in'} onClick={() => setMode('sign-in')} className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === 'sign-in' ? 'bg-white text-[#3b793f] shadow-sm' : 'text-[#536655]'}`}>Log in</button></div>{embedded && <div className="mb-5"><h2 className="font-heading text-2xl font-extrabold tracking-[-.05em] text-forest">{mode === 'sign-up' ? 'Your next yes starts here.' : 'Welcome back.'}</h2><p className="mt-1 text-sm text-[#5c6d5f]">{mode === 'sign-up' ? 'Make a plan. Find your people. Go.' : 'Pick up where your plans left off.'}</p></div>}<div className="flex justify-center">{mode === 'sign-in' ? <SignIn routing="hash" fallbackRedirectUrl="/app" appearance={{ elements: { footerAction: { display: 'none' } } }} /> : <SignUp routing="hash" fallbackRedirectUrl="/app" appearance={{ elements: { footerAction: { display: 'none' } } }} />}</div>{embedded ? <p className="mt-5 border-t border-[#e0e9de] pt-5 text-center text-xs text-[#5c6d5f]">By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p> : <p className="mt-6 text-center text-xs leading-relaxed text-[#5c6d5f]">Meet at public places, and share only what feels comfortable.</p>}</div>;
  if (embedded) return <div className="px-4 py-6 sm:px-8">{form}</div>;
  return <main className="min-h-screen bg-[#f7f9f4] text-forest lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
    <section className="relative flex flex-col justify-between overflow-hidden bg-forest px-6 py-5 text-white sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
      <TagwimiLogo compact onDark className="relative z-10" />
      <div className="relative z-10 hidden max-w-xl lg:block"><h1 className="font-heading text-[clamp(2.7rem,5vw,5.8rem)] font-extrabold leading-[1.02] tracking-[-.04em]">Make the plan.<br /><span className="text-[#ffb900]">Find your people.</span><br />Go<span className="text-[#ec4899]">.</span></h1><p className="mt-6 max-w-md text-base leading-relaxed text-[#dbe9db]">Find a person for the swim, class, walk, or café visit you’ve been meaning to make.</p></div>
      <p className="relative z-10 mt-3 font-heading text-lg font-extrabold tracking-[-.03em] lg:hidden">Make the plan. <span className="text-[#ffb900]">Find your people.</span> Go<span className="text-[#ec4899]">.</span></p>
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-80 rounded-full bg-[#ec4899]/20 blur-3xl" aria-hidden="true" />
      <p className="relative z-10 hidden text-sm text-[#b7cdbb] lg:block">Small plans. Real places. Good company.</p>
    </section>
    <section className="flex min-h-[500px] items-start justify-center px-4 py-6 sm:px-8 lg:items-center lg:py-10">{form}</section>
  </main>;
}
