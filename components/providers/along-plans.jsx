'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  requestJoinPlan,
  cancelJoinRequest,
  acceptHostRequest as dbAcceptHostRequest,
  publishPlan as dbPublishPlan,
  updatePlanVisibility as dbUpdatePlanVisibility,
  submitPlanReport
} from '@/lib/along';
import { useAlongCore } from '@/components/providers/along-core';

const AlongPlansContext = createContext(null);

async function flushPlanEmails() {
  try { await fetch('/api/email/dispatch', { method: 'POST', credentials: 'same-origin' }); }
  catch { /* Queued messages are retried by the scheduled worker. */ }
}

export function AlongPlansProvider({ children }) {
  const router = useRouter();
  const { data, viewer, busy, refresh, withBusy, runAction } = useAlongCore();

  const requestJoin = useCallback(
    (id, intro = '') => runAction(async () => { await requestJoinPlan(viewer.id, id, intro); await flushPlanEmails(); }, 'Request sent.'),
    [runAction, viewer?.id]
  );

  const cancelRequest = useCallback(
    (id) => runAction(() => cancelJoinRequest(viewer.id, id), 'Request cancelled.'),
    [runAction, viewer?.id]
  );

  const updateVisibility = useCallback(
    (id, visibility) => runAction(() => dbUpdatePlanVisibility(viewer.id, id, visibility), 'Sharing setting updated.'),
    [runAction, viewer?.id]
  );

  const approveRequest = useCallback(
    (planId, requestId) => runAction(async () => { await dbAcceptHostRequest(planId, requestId); await flushPlanEmails(); }, 'Request accepted.'),
    [runAction]
  );

  const imageRequest = useCallback(async (id, method, file) => {
    const body = file ? new FormData() : undefined;
    if (body) body.set('image', file);
    const response = await fetch(`/api/plans/${id}/image`, {
      method,
      body,
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not update the plan photo.');
  }, []);

  const publishPlan = useCallback(
    (plan, file) => {
      if (!viewer?.id) return;
      return withBusy(async () => {
        const id = await dbPublishPlan(viewer.id, plan);
        let imageError = null;
        if (file)
          try {
            await imageRequest(id, 'POST', file);
          } catch (error) {
            imageError = error.message;
          }
        await refresh(viewer.id);
        router.push(`/app/plans/${id}`);
        if (imageError) toast.error(`Your plan is live, but the photo was not saved: ${imageError}`);
        else toast.success('Your plan is live.');
      });
    },
    [imageRequest, refresh, router, viewer?.id, withBusy]
  );

  const replacePlanImage = useCallback(
    (id, file) => runAction(() => imageRequest(id, 'POST', file), 'Photo updated.'),
    [imageRequest, runAction]
  );

  const removePlanImage = useCallback(
    (id) => runAction(() => imageRequest(id, 'DELETE'), 'Photo removed.'),
    [imageRequest, runAction]
  );

  const reportPlan = useCallback(
    (id, reason, targetType, messageId) =>
      runAction(
        () => submitPlanReport(viewer.id, id, reason, targetType, messageId),
        'Report sent. Thank you for telling us.'
      ),
    [runAction, viewer?.id]
  );

  const value = useMemo(
    () => ({
      data,
      busy,
      requestJoin,
      updateVisibility,
      cancelRequest,
      approveRequest,
      publishPlan,
      replacePlanImage,
      removePlanImage,
      reportPlan
    }),
    [
      approveRequest,
      busy,
      cancelRequest,
      data,
      publishPlan,
      removePlanImage,
      replacePlanImage,
      reportPlan,
      requestJoin,
      updateVisibility
    ]
  );

  return <AlongPlansContext.Provider value={value}>{children}</AlongPlansContext.Provider>;
}

export function useAlongPlans() {
  const context = useContext(AlongPlansContext);
  if (!context) throw new Error('useAlongPlans must be used inside AlongPlansProvider');
  return context;
}
