import Link from 'next/link';
import { LegalShell } from '@/components/marketing/site-chrome';

export const metadata = {
  title: 'Help',
  description:
    'How to use Tagwimi in Kampala: join plans, create activities, stay safe at public venues, and get support. Adults 18+.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help · Tagwimi',
    description:
      'How to use Tagwimi in Kampala: join plans, create activities, stay safe at public venues, and get support. Adults 18+.',
    url: '/help'
  }
};

export default function HelpPage() {
  return (
    <LegalShell title="Help Center" updated="29 September 2026">
      <p>
        Tagwimi helps adults find company for small, specific plans at real places. This page covers the basics, safety tips, and how to get support.
      </p>
      <p className="rounded-2xl bg-[#fff0b5] px-4 py-3 text-sm font-semibold text-forest">
        Tagwimi is for people 18 years and older.
      </p>

      <h2>Getting started</h2>
      <h3>How do I join Tagwimi?</h3>
      <p>
        Open <Link href="/app">Tagwimi</Link> and continue with Google. Confirm you are 18+, then add a few interests so people understand what you enjoy.
      </p>
      <h3>What can I do on Tagwimi?</h3>
      <ul>
        <li>Browse open plans around Kampala</li>
        <li>Ask to join a plan</li>
        <li>Create your own plan with a public venue, time, and group size</li>
        <li>Coordinate in group chat once a plan is confirmed</li>
        <li>Check in and mark a plan complete after you meet</li>
      </ul>

      <h2>Making and joining plans</h2>
      <h3>What makes a good plan?</h3>
      <p>Be specific. Include the activity, public venue, meeting point, date, time, group size, and anything people should bring or expect to pay.</p>
      <h3>Do I have to accept every join request?</h3>
      <p>No. Hosts review requests before chat opens. Only accept people you are comfortable meeting.</p>
      <h3>Who pays?</h3>
      <p>
        Unless you clearly agree otherwise, everyone covers their own costs. Say expected fees up front when you create a plan.
      </p>

      <h2>Staying safe</h2>
      <ul>
        <li>Meet at public venues for first meetups</li>
        <li>Tell someone you trust where you are going</li>
        <li>Keep early coordination in Tagwimi chat</li>
        <li>Arrange your own transport when possible</li>
        <li>Leave if anything feels wrong</li>
        <li>In an emergency, contact local authorities first</li>
      </ul>
      <p>
        Tagwimi connects people but does not supervise meetups. Read the safety sections in our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>Reporting a concern</h2>
      <p>
        You can report a plan from its detail page or group chat. Tell us what happened in enough detail for an admin to review it.
      </p>
      <p>
        Reports should be made in good faith. Deliberately false reports can lead to account restrictions.
      </p>

      <h2>Account and privacy</h2>
      <h3>How do I sign back in?</h3>
      <p>Choose Continue with Google and select the same Google account you used to join. Tagwimi does not use a separate password.</p>
      <h3>How is my data used?</h3>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for details on collection, use, sharing, retention, and your rights.
      </p>
      <h3>Can I delete my account?</h3>
      <p>
        Email <a href="mailto:support@tagwimi.com">support@tagwimi.com</a> from the address on your account and ask for deletion. We will confirm once it is processed.
      </p>

      <h2>Contact support</h2>
      <p>
        <strong>Tagwimi Support</strong>
        <br />
        Kampala, Uganda
        <br />
        Email: <a href="mailto:support@tagwimi.com">support@tagwimi.com</a>
      </p>
      <p>We aim to reply within a few business days. Safety emergencies should go to local authorities first.</p>
    </LegalShell>
  );
}
