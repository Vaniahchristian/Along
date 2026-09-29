import Image from 'next/image';

export function TagwimiLogo({ compact = false, onDark = false, className = '' }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center ${className}`}>
      <Image
        src={onDark ? '/tagwimi-dark.png' : '/tagwimi-logo.png'}
        alt="Tagwimi"
        width={2172}
        height={724}
        priority
        className={compact ? 'h-auto w-[166px] max-w-full object-contain' : 'h-auto w-[250px] max-w-full object-contain max-[760px]:w-[174px]'}
      />
    </span>
  );
}
