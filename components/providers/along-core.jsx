'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase, setClerkTokenGetter } from '@/lib/supabase/client';
import {
  emptyAlongState,
  ensureClerkViewerProfile,
  loadAlongState,
  loadNotifications
} from '@/lib/along';

const AlongCoreContext = createContext(null);

export function AlongCoreProvider({ children, clerkIdentity = null }) {
  const clerkRef = useRef(clerkIdentity);
  clerkRef.current = clerkIdentity;
  const [data, setData] = useState(emptyAlongState);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');

  const refreshNotifications = useCallback(async (profileId) => {
    try {
      setNotifications(await loadNotifications(profileId));
      setNotificationError('');
    } catch (error) {
      setNotificationError(error.message || 'Notifications could not load.');
    }
  }, []);

  const refresh = useCallback(
    async (profileId) => {
      const next = await loadAlongState(profileId);
      setData(next);
      setLoadError('');
      await refreshNotifications(profileId);
      return next;
    },
    [refreshNotifications]
  );

  const activateClerk = useCallback(
    async (user) => {
      const profile = await ensureClerkViewerProfile(user);
      setViewer(profile);
      const admin = await supabase
        .from('along_admins')
        .select('user_id')
        .eq('user_id', profile.id)
        .maybeSingle();
      setIsAdmin(!admin.error && Boolean(admin.data));
      try {
        await refresh(profile.id);
      } catch (error) {
        setLoadError(error.message || 'Could not load plans.');
      }
    },
    [refresh]
  );

  useEffect(() => {
    if (!clerkRef.current?.isLoaded) return;
    setClerkTokenGetter(() => clerkRef.current?.getToken() ?? null);
    let active = true;
    (async () => {
      if (clerkRef.current?.user) {
        try {
          await activateClerk(clerkRef.current.user);
        } catch (error) {
          if (active) setLoadError(error.message || 'Could not load your profile.');
        }
      } else {
        setViewer(null);
        setIsAdmin(false);
        setData(emptyAlongState());
        setNotifications([]);
      }
      if (active) setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [activateClerk, clerkIdentity?.isLoaded, clerkIdentity?.user?.id]);

  useEffect(() => {
    if (!viewer?.id) return;
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') refreshNotifications(viewer.id);
    };
    const channel = supabase
      .channel(`along-notifications-${viewer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${viewer.id}`
        },
        () => refreshNotifications(viewer.id)
      )
      .subscribe();
    const interval = window.setInterval(refreshOnFocus, 30000);
    document.addEventListener('visibilitychange', refreshOnFocus);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshOnFocus);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [viewer?.id, refreshNotifications]);

  const withBusy = useCallback(async (work, successMessage) => {
    setBusy(true);
    try {
      const result = await work();
      if (successMessage) toast.success(successMessage);
      return { ok: true, result };
    } catch (error) {
      toast.error(error.message || 'Something went wrong. Please try again.');
      return { ok: false, error: error.message };
    } finally {
      setBusy(false);
    }
  }, []);

  const runAction = useCallback(
    (work, message) => {
      if (!viewer?.id) return;
      return withBusy(async () => {
        await work();
        await refresh(viewer.id);
      }, message);
    },
    [refresh, viewer?.id, withBusy]
  );

  const value = useMemo(
    () => ({
      clerkRef,
      clerkIdentity,
      data,
      setData,
      busy,
      hydrated,
      loadError,
      setLoadError,
      viewer,
      setViewer,
      isAdmin,
      setIsAdmin,
      notifications,
      setNotifications,
      notificationError,
      refresh,
      refreshNotifications,
      withBusy,
      runAction,
      clerkSignedIn: Boolean(clerkIdentity?.user)
    }),
    [
      busy,
      clerkIdentity,
      data,
      hydrated,
      isAdmin,
      loadError,
      notificationError,
      notifications,
      refresh,
      refreshNotifications,
      runAction,
      viewer,
      withBusy
    ]
  );

  return <AlongCoreContext.Provider value={value}>{children}</AlongCoreContext.Provider>;
}

export function useAlongCore() {
  const context = useContext(AlongCoreContext);
  if (!context) throw new Error('useAlongCore must be used inside AlongCoreProvider');
  return context;
}
