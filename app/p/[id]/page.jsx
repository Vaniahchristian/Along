import { notFound } from 'next/navigation';
import { getPublicPlan } from '@/lib/along/public-plan';
import { getSiteUrl } from '@/lib/seo';
import { PublicPlanPreview } from '@/components/marketing/public-plan-preview';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const plan = await getPublicPlan(id).catch(() => null);
  if (!plan) return { title: 'Plan unavailable', robots: { index: false } };
  const description = `${plan.date} at ${plan.time} · ${plan.venue} · ${plan.spots} ${plan.spots === 1 ? 'spot' : 'spots'} open. Come along with ${plan.host} on Tagwimi.`;
  const image = new URL(plan.image, getSiteUrl()).toString();
  return {
    title: plan.title, description,
    alternates: { canonical: `/p/${id}` },
    robots: { index: plan.visibility === 'public', follow: plan.visibility === 'public' },
    openGraph: { title: plan.title, description, url: `${getSiteUrl()}/p/${id}`, images: [{ url: image, alt: plan.imageUrl ? `Photo for ${plan.title}` : `Illustration for ${plan.category} plans` }] },
    twitter: { card: 'summary_large_image', title: plan.title, description, images: [image] }
  };
}

export default async function PublicPlanPage({ params }) {
  const { id } = await params;
  let plan;
  try { plan = await getPublicPlan(id); } catch {
    return <main className='grid min-h-dvh place-items-center p-6 text-center'><p>Plan previews are temporarily unavailable. Please try again shortly.</p></main>;
  }
  if (!plan) notFound();
  return <PublicPlanPreview plan={plan} />;
}
