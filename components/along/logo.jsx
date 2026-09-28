import Image from 'next/image';

export function AlongLogo({ compact = false, className = '' }) {
  if (compact) return <div className={`relative h-[116px] w-[105px] overflow-hidden ${className}`}>
    <Image src="/along-logo.png" alt="Along" width={500} height={500} priority className="absolute top-[-29px] left-[-40px] h-[174px] w-[174px] max-w-none" />
  </div>;
  return <Image src="/along-logo.png" alt="Along" width={500} height={500} priority className={`h-[230px] w-[230px] object-contain max-[760px]:h-[165px] max-[760px]:w-[165px] ${className}`} />;
}
