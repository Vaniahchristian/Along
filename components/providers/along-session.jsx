'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { emptyAlongState } from '@/lib/along';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification as dbDeleteNotification,
  clearNotifications as dbClearNotifications
} from '@/lib/along';
import { useAlongCore } from '@/components/providers/along-core';

const ROUTES = {
  explore: '/app/explore',
  plans: '/app/plans',
  create: '/app/create',
  chat: '/app/chat',
  profile: '/app/profile',
  notifications: '/app/notifications'
};

const AlongSessionContext = createContext(null);

export function AlongSessionProvider({ children }) {
  const router = useRouter();
  const {
    clerkRef,
    viewer,
    setViewer,
    setIsAdmin,
    setData,
    setNotifications,
    notifications,
    refresh,
    refreshNotifications,
    withBusy,
    hydrated,
    loadError,
    busy,
    isAdmin,
    clerkSignedIn,
    notificationError
  } = useAlongCore();

  const signOut = useCallback(() => {
    return withBusy(async () => {
      await clerkRef.current.signOut();
      setViewer(null);
      setIsAdmin(false);
      setData(emptyAlongState());
      setNotifications([]);
      router.replace('/?join=1');
    });
  }, [clerkRef, router, setData, setIsAdmin, setNotifications, setViewer, withBusy]);

  const saveProfile = useCallback(
    (form) => {
      return withBusy(async () => {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          body: form,
          credentials: 'same-origin'
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not save your profile.');
        setViewer(result.profile);
        await refresh(viewer.id);
        return result.profile;
      }, 'Profile updated.');
    },
    [refresh, setViewer, viewer?.id, withBusy]
  );

  const saveEmailPreferences = useCallback(async (preferences) => {
    const response = await fetch('/api/email/preferences', {
      method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preferences)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not save email preferences.');
    setViewer((current) => current ? { ...current, ...result } : current);
    return result;
  }, [setViewer]);

  const navigate = useCallback(
    (next) => {
      const href = ROUTES[next] || `/app/${next}`;
      router.push(href);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [router]
  );

  const openPlan = useCallback(
    (id) => {
      router.push(`/app/plans/${id}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [router]
  );

  const openChat = useCallback(
    (id) => {
      router.push(`/app/chat/${id}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (!viewer?.id) return;
      const unread = notifications.filter(
        (item) => item.plan_id === id && item.kind === 'message' && !item.read_at
      );
      if (!unread.length) return;
      setNotifications((current) =>
        current.map((item) =>
          unread.some((notice) => notice.id === item.id)
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
      Promise.all(unread.map((item) => markNotificationRead(viewer.id, item.id))).catch(() =>
        refreshNotifications(viewer.id)
      );
    },
    [notifications, refreshNotifications, router, setNotifications, viewer?.id]
  );

  const openNotification = useCallback(
    async (notification) => {
      if (!viewer) return;
      if (!notification.read_at) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
          )
        );
        try {
          await markNotificationRead(viewer.id, notification.id);
        } catch (error) {
          toast.error(error.message || 'Could not mark notification as read.');
          await refreshNotifications(viewer.id);
        }
      }
      if (notification.plan_id) {
        try {
          await refresh(viewer.id);
        } catch (error) {
          toast.error(error.message || 'Could not load the plan.');
        }
        if (
          notification.kind === 'message' ||
          notification.kind === 'request_accepted' ||
          notification.kind === 'check_in' ||
          notification.kind === 'plan_completed'
        )
          openChat(notification.plan_id);
        else openPlan(notification.plan_id);
      }
    },
    [openChat, openPlan, refresh, refreshNotifications, setNotifications, viewer]
  );

  const readAllNotifications = useCallback(async () => {
    if (!viewer) return;
    const previous = notifications;
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))
    );
    try {
      await markAllNotificationsRead(viewer.id);
    } catch (error) {
      setNotifications(previous);
      toast.error(error.message || 'Could not mark notifications as read.');
    }
  }, [notifications, setNotifications, viewer]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!viewer) return;
      const previous = notifications;
      setNotifications((current) => current.filter((item) => item.id !== id));
      try {
        await dbDeleteNotification(viewer.id, id);
        toast.success('Notification removed.');
      } catch (error) {
        setNotifications(previous);
        toast.error(error.message || 'Could not delete notification.');
      }
    },
    [notifications, setNotifications, viewer]
  );

  const clearNotifications = useCallback(async () => {
    if (!viewer || !notifications.length) return;
    const previous = notifications;
    setNotifications([]);
    try {
      await dbClearNotifications(viewer.id);
      toast.success('Notifications cleared.');
    } catch (error) {
      setNotifications(previous);
      toast.error(error.message || 'Could not clear notifications.');
    }
  }, [notifications, setNotifications, viewer]);

  const value = useMemo(
    () => ({
      viewer,
      hydrated,
      loadError,
      busy,
      isAdmin,
      clerkSignedIn,
      signOut,
      saveProfile,
      saveEmailPreferences,
      navigate,
      openPlan,
      openChat,
      notifications,
      notificationError,
      refreshNotifications,
      openNotification,
      readAllNotifications,
      deleteNotification,
      clearNotifications,
      refresh
    }),
    [
      busy,
      clearNotifications,
      clerkSignedIn,
      deleteNotification,
      hydrated,
      isAdmin,
      loadError,
      navigate,
      notificationError,
      notifications,
      openChat,
      openNotification,
      openPlan,
      readAllNotifications,
      refresh,
      refreshNotifications,
      saveProfile,
      saveEmailPreferences,
      signOut,
      viewer
    ]
  );

  return <AlongSessionContext.Provider value={value}>{children}</AlongSessionContext.Provider>;
}

export function useAlongSession() {
  const context = useContext(AlongSessionContext);
  if (!context) throw new Error('useAlongSession must be used inside AlongSessionProvider');
  return context;
}
