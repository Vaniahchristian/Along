'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { supabase, setClerkTokenGetter } from '@/lib/supabase/client';
import { emptyAlongState, ensureClerkViewerProfile, updateInterests, loadAlongState, requestJoinPlan, cancelJoinRequest, acceptHostRequest as dbAcceptHostRequest, publishPlan as dbPublishPlan, sendPlanMessage, markCheckIn, markComplete, submitPlanReport, loadNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification as dbDeleteNotification, clearNotifications as dbClearNotifications } from '@/lib/along-db';

const AlongContext = createContext(null);

export function ClerkAlongProvider({ children }) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  return <AlongProvider clerkIdentity={{ user, isLoaded, getToken, signOut }}>{children}</AlongProvider>;
}

export function AlongProvider({ children, clerkIdentity = null }) {
  const clerkRef = useRef(clerkIdentity);
  clerkRef.current = clerkIdentity;
  const [data, setData] = useState(emptyAlongState);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [screen, setScreen] = useState('explore');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatViewOpen, setChatViewOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');

  const refreshNotifications = useCallback(async (profileId) => {
    try { setNotifications(await loadNotifications(profileId)); setNotificationError(''); }
    catch (error) { setNotificationError(error.message || 'Notifications could not load.'); }
  }, []);

  const refresh = useCallback(async (profileId) => {
    const next = await loadAlongState(profileId);
    setData(next);
    setLoadError('');
    setSelectedPlanId((current) => next.plans.some((plan) => plan.id === current) ? current : next.plans[0]?.id || null);
    setChatId((current) => next.plans.some((plan) => plan.id === current) ? current : next.plans[0]?.id || null);
    await refreshNotifications(profileId);
  }, [refreshNotifications]);

  const activateClerk = useCallback(async (user) => {
    const profile = await ensureClerkViewerProfile(user);
    setViewer(profile);
    const admin = await supabase.from('along_admins').select('user_id').eq('user_id', profile.id).maybeSingle();
    setIsAdmin(!admin.error && Boolean(admin.data));
    try { await refresh(profile.id); }
    catch (error) { setLoadError(error.message || 'Could not load plans.'); }
  }, [refresh]);

  useEffect(() => {
    if (!clerkRef.current?.isLoaded) return;
    setClerkTokenGetter(() => clerkRef.current?.getToken() ?? null);
    let active = true;
    (async () => {
      if (clerkRef.current?.user) {
        try { await activateClerk(clerkRef.current.user); }
        catch (error) { if (active) setLoadError(error.message || 'Could not load your profile.'); }
      } else {
        setViewer(null); setIsAdmin(false); setData(emptyAlongState()); setNotifications([]);
      }
      if (active) setHydrated(true);
    })();
    return () => { active = false; };
  }, [activateClerk, clerkIdentity?.isLoaded, clerkIdentity?.user?.id]);

  useEffect(() => {
    if (!viewer?.id) return;
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') refreshNotifications(viewer.id); };
    const channel = supabase.channel(`along-notifications-${viewer.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${viewer.id}` }, () => refreshNotifications(viewer.id))
      .subscribe();
    const interval = window.setInterval(refreshOnFocus, 30000);
    document.addEventListener('visibilitychange', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);
    return () => { supabase.removeChannel(channel); window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshOnFocus); window.removeEventListener('focus', refreshOnFocus); };
  }, [viewer?.id, refreshNotifications]);

  async function withBusy(work, successMessage) {
    setBusy(true);
    try { const result = await work(); if (successMessage) toast.success(successMessage); return { ok: true, result }; }
    catch (error) { toast.error(error.message || 'Something went wrong. Please try again.'); return { ok: false, error: error.message }; }
    finally { setBusy(false); }
  }

  async function signOut() {
    return withBusy(async () => {
      await clerkRef.current.signOut();
      setViewer(null); setIsAdmin(false); setData(emptyAlongState()); setNotifications([]); setScreen('explore'); setChatViewOpen(false);
    });
  }

  async function saveInterests(interests) {
    if (!viewer) return;
    const result = await withBusy(() => updateInterests(viewer.id, interests), 'Interests updated.');
    if (result.ok) setViewer((current) => ({ ...current, interests }));
  }

  function navigate(next) { setScreen(next); setChatViewOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function openPlan(id) { setSelectedPlanId(id); navigate('detail'); }
  function openChat(id) {
    setChatId(id); navigate('chat'); setChatViewOpen(true);
    if (!viewer?.id) return;
    const unread = notifications.filter((item) => item.plan_id === id && item.kind === 'message' && !item.read_at);
    if (!unread.length) return;
    setNotifications((current) => current.map((item) => unread.some((notice) => notice.id === item.id) ? { ...item, read_at: new Date().toISOString() } : item));
    Promise.all(unread.map((item) => markNotificationRead(viewer.id, item.id)))
      .catch(() => refreshNotifications(viewer.id));
  }
  async function openNotification(notification) {
    if (!viewer) return;
    if (!notification.read_at) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      try { await markNotificationRead(viewer.id, notification.id); }
      catch (error) { toast.error(error.message || 'Could not mark notification as read.'); await refreshNotifications(viewer.id); }
    }
    if (notification.plan_id) {
      try { await refresh(viewer.id); } catch (error) { toast.error(error.message || 'Could not load the plan.'); }
      if (notification.kind === 'message' || notification.kind === 'request_accepted' || notification.kind === 'check_in' || notification.kind === 'plan_completed') openChat(notification.plan_id);
      else openPlan(notification.plan_id);
    }
  }
  async function readAllNotifications() {
    if (!viewer) return;
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    try { await markAllNotificationsRead(viewer.id); }
    catch (error) { setNotifications(previous); toast.error(error.message || 'Could not mark notifications as read.'); }
  }
  async function deleteNotification(id) {
    if (!viewer) return;
    const previous = notifications;
    setNotifications((current) => current.filter((item) => item.id !== id));
    try { await dbDeleteNotification(viewer.id, id); toast.success('Notification removed.'); }
    catch (error) { setNotifications(previous); toast.error(error.message || 'Could not delete notification.'); }
  }
  async function clearNotifications() {
    if (!viewer || !notifications.length) return;
    const previous = notifications;
    setNotifications([]);
    try { await dbClearNotifications(viewer.id); toast.success('Notifications cleared.'); }
    catch (error) { setNotifications(previous); toast.error(error.message || 'Could not clear notifications.'); }
  }
  function runAction(work, message) { if (viewer?.id) return withBusy(async () => { await work(); await refresh(viewer.id); }, message); }
  function requestJoin(id) { return runAction(() => requestJoinPlan(viewer.id, id), 'Request sent.'); }
  function cancelRequest(id) { return runAction(() => cancelJoinRequest(viewer.id, id), 'Request cancelled.'); }
  function approveRequest(planId, requestId) { return runAction(() => dbAcceptHostRequest(planId, requestId), 'Request accepted.'); }
  async function imageRequest(id, method, file) {
    const body = file ? new FormData() : undefined;
    if (body) body.set('image', file);
    const response = await fetch(`/api/plans/${id}/image`, { method, body, credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not update the plan photo.');
  }
  function publishPlan(plan, file) {
    if (!viewer?.id) return;
    return withBusy(async () => {
      const id = await dbPublishPlan(viewer.id, plan);
      let imageError = null;
      if (file) try { await imageRequest(id, 'POST', file); }
      catch (error) { imageError = error.message; }
      await refresh(viewer.id);
      setSelectedPlanId(id);
      navigate('detail');
      if (imageError) toast.error(`Your plan is live, but the photo was not saved: ${imageError}`);
      else toast.success('Your plan is live.');
    });
  }
  function replacePlanImage(id, file) { return runAction(() => imageRequest(id, 'POST', file), 'Photo updated.'); }
  function removePlanImage(id) { return runAction(() => imageRequest(id, 'DELETE'), 'Photo removed.'); }
  function sendMessage(id, text) { return runAction(() => sendPlanMessage(viewer.id, id, text)); }
  function checkIn(id) { return runAction(() => markCheckIn(viewer.id, id), 'You’re checked in.'); }
  function complete(id) { return runAction(() => markComplete(viewer.id, id), 'Plan completed.'); }
  function reportPlan(id, reason) { return runAction(() => submitPlanReport(viewer.id, id, reason), 'Report sent. Thank you for telling us.'); }

  const value = { data, busy, hydrated, loadError, refresh, viewer, clerkSignedIn: Boolean(clerkIdentity?.user), isAdmin, signOut, saveInterests, screen, selectedPlanId, chatId, chatViewOpen, setChatViewOpen, navigate, openPlan, openChat, requestJoin, cancelRequest, approveRequest, publishPlan, replacePlanImage, removePlanImage, sendMessage, checkIn, complete, reportPlan, notifications, notificationError, refreshNotifications, openNotification, readAllNotifications, deleteNotification, clearNotifications };
  return <AlongContext.Provider value={value}>{children}</AlongContext.Provider>;
}

export function useAlong() {
  const context = useContext(AlongContext);
  if (!context) throw new Error('useAlong must be used inside AlongProvider');
  return context;
}
