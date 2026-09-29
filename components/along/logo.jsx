import Image from 'next/image';

export function TagwimiLogo({ compact = false, onDark = false, className = '' }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center ${className}`}>
      <Image
        src={onDark ? '/tagwimi-dark.png' : '/tagwimi-logo.png'}
        alt='Tagwimi'
        width={2172}
        height={724}
        priority
        className={
          compact
            ? 'h-auto w-[166px] max-w-full object-contain'
            : 'h-auto w-[250px] max-w-full object-contain max-[760px]:w-[174px]'
        }
      />
    </span>
  );
}

export function TagwimiSplash({ status = 'Finding your next plan...' }) {
  return (
    <div className='grid min-h-dvh place-items-center bg-forest px-6 text-center'>
      <div className='flex flex-col items-center'>
        <TagwimiLogo onDark />
        <p className='mt-5 text-[15px] font-medium tracking-[-0.01em] text-white sm:text-base'>
          Make a plan. Find your people.
        </p>
        <div className='mt-8 flex items-center gap-2.5' aria-hidden='true'>
          <span className='size-2.5 animate-splash-dot rounded-full bg-[#7cb87f]' />
          <span className='size-2.5 animate-splash-dot rounded-full bg-pink [animation-delay:180ms]' />
          <span className='size-2.5 animate-splash-dot rounded-full bg-amber [animation-delay:360ms]' />
        </div>
        <p className='mt-6 text-sm font-medium text-[#9eb6a2]'>{status}</p>
      </div>
    </div>
  );
}
