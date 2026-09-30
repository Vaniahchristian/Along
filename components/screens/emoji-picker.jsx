'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function EmojiPicker({ onSelect, onClose }) {
  const container = useRef(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let picker;
    (async () => {
      try {
        const [{ Picker }, { default: data }] = await Promise.all([import('emoji-mart'), import('@emoji-mart/data')]);
        if (!active || !container.current) return;
        picker = new Picker({
          data,
          dynamicWidth: true,
          emojiButtonColors: ['#e9f1e8', '#ffe5f0'],
          navPosition: 'bottom',
          previewPosition: 'none',
          searchPosition: 'sticky',
          set: 'native',
          theme: 'light',
          onEmojiSelect: (emoji) => onSelect(emoji.native)
        });
        picker.style.width = '100%';
        picker.style.height = '100%';
        container.current.appendChild(picker);
        setLoaded(true);
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; picker?.remove(); };
  }, [onSelect]);

  return <section aria-label='Emoji picker' className='mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(15,34,24,.12)]'>
    <div className='flex items-center justify-between px-3 py-1.5 text-xs font-bold text-forest'><span>Choose an emoji</span><button type='button' onClick={onClose} aria-label='Close emoji picker' className='grid size-8 place-items-center rounded-lg hover:bg-soft-green'><X className='size-4' /></button></div>
    <div className='relative h-[min(330px,42dvh)] w-full border-t border-border'><div ref={container} className='h-full w-full' />{!loaded && <p className='absolute inset-0 p-4 text-sm text-muted-foreground'>{error ? 'Emoji picker could not load. You can still use your keyboard’s emojis.' : 'Loading emojis…'}</p>}</div>
  </section>;
}
