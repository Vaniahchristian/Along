'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { emptyAlongState, ensureViewerProfile, updateInterests, loadAlongState, requestJoinPlan, acceptHostRequest as dbAcceptHostRequest, publishPlan as dbPublishPlan, sendPlanMessage, markCheckIn, markComplete } from '@/lib/along-db';

const AlongContext = createContext(null);

export function AlongProvider({ children }) {
  const [data, setData] = useState(emptyAlongState);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [authScreen, setAuthScreen] = useState('welcome');
  const [screen, setScreen] = useState('explore');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [chatId, setChatId] = useState(null);

  const refresh = useCallback(async (profileId) => {
    const next = await loadAlongState(profileId);
    setData(next);
    setLoadError('');
    setSelectedPlanId((current) => next.plans.some((plan) => plan.id === current) ? current : next.plans[0]?.id || null);
    setChatId((current) => next.plans.some((plan) => plan.id === current) ? current : next.plans[0]?.id || null);
  }, []);

  const activate = useCallback(async (user) => {
    const profile = await ensureViewerProfile(user);
    setViewer(profile);
    try { await refresh(profile.id); }
    catch (error) { setLoadError(error.message || 'Could not load plans.'); }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setAuthScreen('recovery');
      if (event === 'SIGNED_OUT') { setViewer(null); setData(emptyAlongState()); }
    });
    (async () => {
      const { data: authData, error } = await supabase.auth.getUser();
      if (!active) return;
      if (authData?.user) {
        try { await activate(authData.user); }
        catch (profileError) { setLoadError(profileError.message || 'Could not load your profile.'); }
      } else if (error && error.name !== 'AuthSessionMissingError') {
        setLoadError(error.message);
      }
      if (active) setHydrated(true);
    })();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [activate]);

  async function withBusy(work, successMessage) {
    setBusy(true);
    try { const result = await work(); if (successMessage) toast.success(successMessage); return { ok: true, result }; }
    catch (error) { toast.error(error.message || 'Something went wrong. Please try again.'); return { ok: false, error: error.message }; }
    finally { setBusy(false); }
  }

  async function signIn(email, password) {
    return withBusy(async () => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await activate(authData.user);
    });
  }

  async function finishSignup({ name, email, password, interests }) {
    return withBusy(async () => {
      const { data: authData, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name, interests }, emailRedirectTo: `${window.location.origin}/app` }
      });
      if (error) throw error;
      if (authData.session && authData.user) await activate(authData.user);
      else setAuthScreen('verify');
    });
  }

  async function sendPasswordReset(email) {
    return withBusy(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/app` });
      if (error) throw error;
    });
  }

  async function updatePassword(password) {
    return withBusy(async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) await activate(authData.user);
      setAuthScreen('welcome');
    }, 'Password updated.');
  }

  async function signOut() {
    return withBusy(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setViewer(null); setData(emptyAlongState()); setAuthScreen('welcome'); setScreen('explore');
    });
  }

  async function saveInterests(interests) {
    if (!viewer) return;
    const result = await withBusy(() => updateInterests(viewer.id, interests), 'Interests updated.');
    if (result.ok) setViewer((current) => ({ ...current, interests }));
  }

  function navigate(next) { setScreen(next); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function openPlan(id) { setSelectedPlanId(id); navigate('detail'); }
  function openChat(id) { setChatId(id); navigate('chat'); }
  function runAction(work, message) { if (viewer?.id) return withBusy(async () => { await work(); await refresh(viewer.id); }, message); }
  function requestJoin(id) { return runAction(() => requestJoinPlan(viewer.id, id), 'Request sent.'); }
  function approveRequest(planId, requestId) { return runAction(() => dbAcceptHostRequest(planId, requestId), 'Request accepted.'); }
  function publishPlan(plan) { return runAction(async () => { const id = await dbPublishPlan(viewer.id, plan); setSelectedPlanId(id); navigate('detail'); }, 'Your plan is live.'); }
  function sendMessage(id, text) { return runAction(() => sendPlanMessage(viewer.id, id, text)); }
  function checkIn(id) { return runAction(() => markCheckIn(viewer.id, id), 'You’re checked in.'); }
  function complete(id) { return runAction(() => markComplete(viewer.id, id), 'Plan completed.'); }

  const value = { data, busy, hydrated, loadError, refresh, viewer, authScreen, setAuthScreen, signIn, finishSignup, sendPasswordReset, updatePassword, signOut, saveInterests, screen, selectedPlanId, chatId, navigate, openPlan, openChat, requestJoin, approveRequest, publishPlan, sendMessage, checkIn, complete };
  return <AlongContext.Provider value={value}>{children}</AlongContext.Provider>;
}

export function useAlong() {
  const context = useContext(AlongContext);
  if (!context) throw new Error('useAlong must be used inside AlongProvider');
  return context;
}
