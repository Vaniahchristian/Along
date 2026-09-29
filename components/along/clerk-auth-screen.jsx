'use client';

import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import { TagwimiLogo } from './logo';

export function ClerkAuthScreen() {
  const [mode, setMode] = useState('sign-in');
  return <main className="min-h-screen bg-[#f7f9f4] text-forest lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
    <section className="relative flex flex-col justify-between overflow-hidden bg-forest px-6 py-5 text-white sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
      <TagwimiLogo compact onDark className="relative z-10" />
      <div className="relative z-10 hidden max-w-xl lg:block"><h1 className="font-heading text-[clamp(2.7rem,5vw,5.8rem)] font-extrabold leading-[1.02] tracking-[-.04em]">Make the plan.<br /><span className="text-[#ffb900]">Find your people.</span><br />Go<span className="text-[#ec4899]">.</span></h1><p className="mt-6 max-w-md text-base leading-relaxed text-[#dbe9db]">Find a person for the swim, class, walk, or café visit you’ve been meaning to make.</p></div>
      <p className="relative z-10 mt-3 font-heading text-lg font-extrabold tracking-[-.03em] lg:hidden">Make the plan. <span className="text-[#ffb900]">Find your people.</span> Go<span className="text-[#ec4899]">.</span></p>
      <div className="pointer-events-none absolute -bottom-24 -right-20 size-80 rounded-full bg-[#ec4899]/20 blur-3xl" aria-hidden="true" />
      <p className="relative z-10 hidden text-sm text-[#b7cdbb] lg:block">Small plans. Real places. Good company.</p>
    </section>
    <section className="flex min-h-[500px] items-start justify-center px-4 py-6 sm:px-8 lg:items-center lg:py-10"><div className="w-full max-w-[430px]"><div className="mb-5 flex rounded-full bg-[#e9f1e8] p-1" role="tablist" aria-label="Account"><button type="button" role="tab" aria-selected={mode === 'sign-in'} onClick={() => setMode('sign-in')} className={`min-h-11 flex-1 rounded-full text-sm font-bold ${mode === 'sign-in' ? 'bg-white text-[#3b793f] shadow-sm' : 'text-[#536655]'}`}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'sign-up'} onClick={() => setMode('sign-up')} className={`min-h-11 flex-1 rounded-full text-sm font-bold ${mode === 'sign-up' ? 'bg-white text-[#3b793f] shadow-sm' : 'text-[#536655]'}`}>Create account</button></div><div className="flex justify-center">{mode === 'sign-in' ? <SignIn routing="hash" fallbackRedirectUrl="/app" appearance={{ elements: { footerAction: { display: 'none' } } }} /> : <SignUp routing="hash" fallbackRedirectUrl="/app" appearance={{ elements: { footerAction: { display: 'none' } } }} />}</div><p className="mt-6 text-center text-xs leading-relaxed text-[#5c6d5f]">Meet at public places, and share only what feels comfortable.</p></div></section>
  </main>;
}
