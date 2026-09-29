'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SsoCallbackPage() {
  return <main className="grid min-h-dvh place-items-center bg-[#f7f9f4] px-5 text-center text-[#0f2218]">
    <div>
      <p className="font-heading text-2xl font-extrabold">Finding your people…</p>
      <p className="mt-2 text-sm text-[#526756]">Finishing your Google sign-in.</p>
      <AuthenticateWithRedirectCallback signInUrl="/app" signUpUrl="/app" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app" />
      <div id="clerk-captcha" />
    </div>
  </main>;
}
