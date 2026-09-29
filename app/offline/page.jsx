import Link from 'next/link';
import { MarketingBrand } from '@/components/marketing/site-chrome';

export const metadata = {
  title: 'You are offline · Tagwimi',
  description: 'Tagwimi needs a connection to load plans and messages.'
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfcf8] px-6 text-forest">
      <div className="max-w-md text-center">
        <MarketingBrand />
        <h1 className="mt-8 font-heading text-4xl font-extrabold tracking-[-.05em]">You&apos;re offline</h1>
        <p className="mt-4 leading-relaxed text-[#586b5b]">
          Tagwimi needs an internet connection to load plans, chat, and your account. Check your connection and try again.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#3b793f] px-6 py-3 text-sm font-bold text-white hover:bg-[#2c6331]"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
