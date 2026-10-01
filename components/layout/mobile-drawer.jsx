'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function MobileDrawer({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className='fixed inset-y-0 left-0 right-auto m-0 mr-auto h-dvh max-h-dvh w-[min(86vw,360px)] max-w-none overflow-hidden border-0 bg-white p-0 text-forest shadow-[20px_0_60px_rgba(15,34,24,.18)] backdrop:bg-[#0f2218]/65 open:animate-in open:slide-in-from-left open:duration-200'
    >
      <div className='flex h-dvh max-h-dvh flex-col'>
        <div className='flex shrink-0 items-center justify-between border-b border-[#e0e9de] px-5 py-4'>
          <strong className='font-heading text-lg font-extrabold'>{title}</strong>
          <button
            type='button'
            onClick={onClose}
            aria-label='Close menu'
            className='grid size-10 place-items-center rounded-xl text-[#526a56] hover:bg-[#edf4eb] focus-visible:outline-2 focus-visible:outline-[#3b793f]'
          >
            <X className='size-5' />
          </button>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
          <div className='flex min-h-full flex-col'>{children}</div>
        </div>
      </div>
    </dialog>
  );
}
