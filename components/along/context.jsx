'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { initialDemoData } from '@/lib/demo-state.mjs';
import { AUTH_STORAGE_KEY, demoViewer, isDemoLogin, restoreDemoViewer } from '@/lib/demo-auth.mjs';
import {
  FIRST_SEED_PLAN_ID,
  acceptHostRequest as dbAcceptHostRequest,
  acceptJoinRequest,
  ensureViewerProfile,
  loadAlongState,
  markCheckIn,
  markComplete,
  publishPlan as dbPublishPlan,
  requestJoinPlan,
  resetAlongDemo,
  sendPlanMessage
} from '@/lib/along-db';

const AlongContext = createContext(null);

export function AlongProvider({ children }) {
  const [data, setData] = useState(initialDemoData);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [authScreen, setAuthScreen] = useState('welcome');
  const [screen, setScreen] = useState('explore');
  const [selectedPlanId, setSelectedPlanId] = useState(FIRST_SEED_PLAN_ID);
  const [chatId, setChatId] = useState(FIRST_SEED_PLAN_ID);

  const refresh = useCallback(async (profileId) => {
    if (!profileId) {
      setData(initialDemoData());
      return;
    }
    const next = await loadAlongState(profileId);
    setData(next);
    setSelectedPlanId((current) => (next.plans.some((plan) => plan.id === current) ? current : (next.plans[0]?.id ?? FIRST_SEED_PLAN_ID)));
    setChatId((current) => (next.plans.some((plan) => plan.id === current) ? current : (next.plans[0]?.id ?? FIRST_SEED_PLAN_ID)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedViewer = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (!savedViewer) return;
        const restored = restoreDemoViewer(JSON.parse(savedViewer));
        if (!restored) return;
        const profile = await ensureViewerProfile(restored);
        if (cancelled) return;
        setViewer(profile);
        await refresh(profile.id);
      } catch (error) {
        console.error(error);
        toast.error('Could not restore your Along session from Supabase.');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (!hydrated) return;
    if (viewer) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(viewer));
    else window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [viewer, hydrated]);

  async function withBusy(work, successMessage) {
    setBusy(true);
    try {
      await work();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Something went wrong talking to Supabase.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function activateViewer(draft) {
    const profile = await ensureViewerProfile(draft);
    setViewer(profile);
    await refresh(profile.id);
    return profile;
  }

  function continueAsGuest() {
    withBusy(async () => {
      await activateViewer(demoViewer({ name: 'Guest', guest: true }));
    }, 'You’re exploring with live sample plans from Supabase.');
  }

  async function signIn(email, password) {
    if (!isDemoLogin(email, password)) return false;
    return withBusy(async () => {
      await activateViewer(demoViewer({ name: 'You', email }));
    }, 'Signed in. Your plans sync to Supabase.');
  }

  function finishSignup({ name, email, interests }) {
    withBusy(async () => {
      await activateViewer(demoViewer({ name, email, interests }));
    }, 'Welcome to Along. Your profile is saved in Supabase.');
  }

  function signOut() {
    setViewer(null);
    setAuthScreen('welcome');
    setScreen('explore');
    setData(initialDemoData());
    toast.info('You’ve left the demo session.');
  }

  function navigate(next) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function openPlan(id) {
    setSelectedPlanId(id);
    navigate('detail');
  }

  function openChat(id) {
    setChatId(id);
    navigate('chat');
  }

  function requestJoin(id) {
    if (!viewer?.id) return;
    withBusy(async () => {
      await requestJoinPlan(viewer.id, id);
      await refresh(viewer.id);
    }, 'Request sent. Track it in My plans.');
  }

  function acceptRequest() {
    if (!viewer?.id) return;
    const id = data.requests[0];
    if (!id) return;
    withBusy(async () => {
      await acceptJoinRequest(viewer.id, id);
      setChatId(id);
      await refresh(viewer.id);
    }, 'Request accepted. Your group chat is ready.');
  }

  function acceptHostRequest(id) {
    if (!viewer?.id) return;
    withBusy(async () => {
      await dbAcceptHostRequest(id);
      await refresh(viewer.id);
    }, 'Nina is in. Your group chat is ready.');
  }

  function publishPlan(plan) {
    if (!viewer?.id) return;
    withBusy(async () => {
      const id = await dbPublishPlan(viewer.id, plan);
      setSelectedPlanId(id);
      await refresh(viewer.id);
      navigate('detail');
    }, 'Your plan is live in Supabase. A sample join request is ready to review.');
  }

  function sendMessage(id, text) {
    if (!viewer?.id) return;
    withBusy(async () => {
      await sendPlanMessage(viewer.id, id, text);
      await refresh(viewer.id);
    });
  }

  function checkIn(id) {
    if (!viewer?.id) return;
    withBusy(async () => {
      await markCheckIn(viewer.id, id);
      await refresh(viewer.id);
    }, 'Check-in recorded in Supabase.');
  }

  function complete(id) {
    if (!viewer?.id) return;
    withBusy(async () => {
      await markComplete(viewer.id, id);
      await refresh(viewer.id);
    }, 'Plan completed. Thanks for showing up!');
  }

  function reset() {
    if (!viewer?.id) return;
    withBusy(async () => {
      await resetAlongDemo();
      const profile = await ensureViewerProfile(viewer);
      setViewer(profile);
      setScreen('explore');
      setSelectedPlanId(FIRST_SEED_PLAN_ID);
      setChatId(FIRST_SEED_PLAN_ID);
      await refresh(profile.id);
    }, 'Sample data reset in Supabase.');
  }

  const value = {
    data,
    busy,
    hydrated,
    viewer,
    authScreen,
    setAuthScreen,
    continueAsGuest,
    signIn,
    finishSignup,
    signOut,
    screen,
    selectedPlanId,
    chatId,
    navigate,
    openPlan,
    openChat,
    requestJoin,
    acceptRequest,
    acceptHostRequest,
    publishPlan,
    sendMessage,
    checkIn,
    complete,
    reset
  };

  return <AlongContext.Provider value={value}>{children}</AlongContext.Provider>;
}

export function useAlong() {
  const context = useContext(AlongContext);
  if (!context) throw new Error('useAlong must be used inside AlongProvider');
  return context;
}
