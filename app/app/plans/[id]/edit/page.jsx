'use client';

import { useParams } from 'next/navigation';
import { CreateScreen } from '@/components/screens/create';
import { useAlongPlans, useAlongSession } from '@/components/providers/along';
import { BackButton, Panel } from '@/components/layout/shared';

export default function EditPlanPage() {
  const params = useParams();
  const planId = params?.id;
  const { data } = useAlongPlans();
  const { viewer } = useAlongSession();
  const plan = data.plans.find((item) => item.id === planId);

  if (!plan) {
    return (
      <>
        <BackButton />
        <Panel>
          <h1 className='font-heading text-2xl font-extrabold'>Plan not found</h1>
          <p className='text-muted-foreground'>This plan may have been removed.</p>
        </Panel>
      </>
    );
  }

  if (plan.hostId !== viewer?.id) {
    return (
      <>
        <BackButton />
        <Panel>
          <h1 className='font-heading text-2xl font-extrabold'>You can’t edit this plan</h1>
          <p className='text-muted-foreground'>Only the host can change plan details.</p>
        </Panel>
      </>
    );
  }

  return <CreateScreen plan={plan} />;
}
