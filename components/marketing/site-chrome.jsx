import Link from 'next/link';
import { TagwimiLogo } from '@/components/along/logo';

export function MarketingBrand({ light = false }) {
  return (
    <Link href='/' aria-label='Tagwimi home' className='inline-flex items-center'>
      <TagwimiLogo compact onDark={light} />
    </Link>
  );
}

const footerLinks = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/help', label: 'Help' }
];

export function SiteFooter() {
  return (
    <footer className='bg-forest px-6 py-10 text-sm text-white/70 md:px-10'>
      <div className='mx-auto flex max-w-[1340px] flex-col gap-8'>
        <div className='flex flex-wrap items-start justify-between gap-6'>
          <div className='max-w-sm'>
            <MarketingBrand light />
            <p className='mt-4 leading-relaxed'>
              Make the plan. Find your people. Go. · Made in Kampala
            </p>
            <p className='mt-2 text-xs font-semibold tracking-wide text-white/55'>
              Tagwimi is for adults 18 years and older.
            </p>
          </div>
          <nav aria-label='Legal and help' className='flex flex-wrap gap-x-6 gap-y-3 font-semibold'>
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className='hover:text-white'>
                {link.label}
              </Link>
            ))}
            <a href='#top' className='hover:text-white'>
              Back to top ↑
            </a>
          </nav>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/55'>
          <p>© 2026 Tagwimi. All rights reserved.</p>
          <p>By using Tagwimi you agree to our Terms and Privacy Policy.</p>
        </div>
      </div>
    </footer>
  );
}

export function LegalShell({ title, updated, children }) {
  return (
    <main id='top' className='min-h-screen bg-[#fbfcf8] text-forest'>
      <header className='border-b border-[#dce5d9] bg-white/80 backdrop-blur'>
        <div className='mx-auto flex max-w-[920px] items-center justify-between px-6 py-5 md:px-10'>
          <MarketingBrand />
          <Link href='/app' className='text-sm font-bold text-[#3b793f] hover:underline'>
            Open Tagwimi
          </Link>
        </div>
      </header>
      <article className='mx-auto max-w-[920px] px-6 py-12 md:px-10 md:py-16'>
        <p className='text-xs font-bold tracking-[0.08em] text-[#68796a] uppercase'>
          Tagwimi legal
        </p>
        <h1 className='mt-3 font-heading text-[clamp(2.4rem,5vw,4rem)] leading-[1.05] font-extrabold tracking-[-.06em]'>
          {title}
        </h1>
        {updated ? <p className='mt-4 text-sm text-[#586b5b]'>Effective date: {updated}</p> : null}
        <div className='legal-prose mt-10 space-y-6 text-[15px] leading-relaxed text-[#3f5244] [&_a]:font-semibold [&_a]:text-[#3b793f] [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-forest [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-extrabold [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-forest [&_ul]:list-disc [&_ul]:pl-5'>
          {children}
        </div>
        <nav className='mt-14 flex flex-wrap gap-4 border-t border-[#dce5d9] pt-6 text-sm font-bold text-[#3b793f]'>
          <Link href='/terms' className='hover:underline'>
            Terms
          </Link>
          <Link href='/privacy' className='hover:underline'>
            Privacy
          </Link>
          <Link href='/help' className='hover:underline'>
            Help
          </Link>
          <Link href='/' className='hover:underline'>
            Home
          </Link>
        </nav>
      </article>
      <SiteFooter />
    </main>
  );
}
