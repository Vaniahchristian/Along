'use client';

import Link from 'next/link';
import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function errorMessage(reason) {
  return reason?.errors?.[0]?.longMessage || reason?.errors?.[0]?.message || reason?.message || 'Google sign-in could not be completed. Please try again.';
}

export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setError((current) => current || 'Sign-in is taking longer than expected. Please try Google again.');
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!clerk.loaded || !signIn || !signUp || hasRun.current) return;
    hasRun.current = true;

    const navigate = async ({ decorateUrl }) => {
      const url = decorateUrl('/app');
      if (url.startsWith('http')) window.location.assign(url);
      else router.replace(url);
    };

    const finish = async () => {
      try {
        if (signIn.status === 'complete') {
          await signIn.finalize({ navigate });
          return;
        }

        if (signUp.isTransferable) {
          const result = await signIn.create({ transfer: true });
          if (result?.error) throw result.error;
          if (signIn.status === 'complete') {
            await signIn.finalize({ navigate });
            return;
          }
        }

        if (signIn.isTransferable) {
          const result = await signUp.create({ transfer: true });
          if (result?.error) throw result.error;
          if (signUp.status === 'complete') {
            await signUp.finalize({ navigate });
            return;
          }
          const missing = signUp.missingFields?.length ? ` Missing: ${signUp.missingFields.join(', ')}.` : '';
          setError(`Your account needs more information before it can be created.${missing} Please contact support@tagwimi.com.`);
          return;
        }

        if (signUp.status === 'complete') {
          await signUp.finalize({ navigate });
          return;
        }

        const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
        if (sessionId) {
          await clerk.setActive({ session: sessionId, navigate });
          return;
        }

        setError('We could not finish that Google sign-in. Please return and try again.');
      } catch (reason) {
        setError(errorMessage(reason));
      }
    };

    void finish();
  }, [clerk, router, signIn, signUp]);

  return <main className="grid min-h-dvh place-items-center bg-[#f7f9f4] px-5 text-center text-[#0f2218]">
    <div className="max-w-md">
      <p className="font-heading text-2xl font-extrabold">{error ? 'We couldn’t finish signing you in' : 'Finding your people…'}</p>
      {error ? <>
        <p role="alert" className="mt-3 text-sm leading-relaxed text-[#526756]">{error}</p>
        <Link href="/app" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#3b793f] px-6 font-semibold text-white">Try Google again</Link>
      </> : <p className="mt-2 text-sm text-[#526756]">Finishing your Google sign-in.</p>}
      <div id="clerk-captcha" />
    </div>
  </main>;
}
