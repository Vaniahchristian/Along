'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ClerkAlongProvider, useAlong } from '@/components/along/context';
import { ClerkAuthScreen } from '@/components/along/clerk-auth-screen';

function DialogContent({ onClose }) {
  const router = useRouter();
  const { viewer } = useAlong();
  const panelRef = useRef(null);

  useEffect(() => {
    if (viewer) router.replace('/app');
  }, [viewer, router]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previousFocus = document.activeElement;
    panelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled])'
        )
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07160f]/75 px-3 py-3 backdrop-blur-[5px] sm:px-6 sm:py-8'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label='Join Tagwimi'
        tabIndex={-1}
        className='my-auto w-full max-w-[510px] overflow-y-auto rounded-[28px] bg-white shadow-[0_35px_110px_rgba(0,0,0,.28)] outline-none max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-4rem)]'
      >
        <ClerkAuthScreen onClose={onClose} />
      </section>
    </div>
  );
}

export function AuthDialog({ onClose }) {
  return (
    <ClerkAlongProvider>
      <DialogContent onClose={onClose} />
    </ClerkAlongProvider>
  );
}
