'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  sendPlanMessage,
  sendPlanMedia,
  loadPlanMessages,
  hydrateMessage,
  markCheckIn,
  markComplete
} from '@/lib/along';
import { supabase } from '@/lib/supabase/client';
import { useAlongCore } from '@/components/providers/along-core';

const AlongChatContext = createContext(null);

function previewFromMessage(message) {
  if (!message) return null;
  return {
    id: message.id,
    mine: message.mine,
    senderId: message.senderId,
    senderName: message.senderName,
    senderInitials: message.senderInitials,
    senderTone: message.senderTone,
    text: message.text,
    mediaType: message.mediaType,
    mediaUrl: null,
    createdAt: message.createdAt,
    time: message.time
  };
}

export function AlongChatProvider({ children }) {
  const { data, setData, viewer, busy, withBusy, runAction } = useAlongCore();

  const refreshPlanMessages = useCallback(
    async (planId) => {
      if (!viewer?.id || !planId) return;
      const messages = await loadPlanMessages(viewer.id, planId);
      setData((current) => {
        const pending = (current.messages[planId] || []).filter(
          (item) => item.pending || String(item.id).startsWith('temp-')
        );
        const merged = [...messages];
        for (const item of pending) {
          if (!merged.some((row) => row.id === item.id)) merged.push(item);
        }
        const last = merged.at(-1);
        return {
          ...current,
          messages: { ...current.messages, [planId]: merged },
          messagePreviews: last
            ? { ...current.messagePreviews, [planId]: previewFromMessage(last) }
            : current.messagePreviews
        };
      });
    },
    [setData, viewer?.id]
  );

  const appendLocalMessage = useCallback(
    (planId, message) => {
      setData((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [planId]: [...(current.messages[planId] || []), message]
        },
        messagePreviews: {
          ...current.messagePreviews,
          [planId]: previewFromMessage(message)
        }
      }));
    },
    [setData]
  );

  const removeLocalMessage = useCallback(
    (planId, messageId) => {
      setData((current) => {
        const nextMessages = (current.messages[planId] || []).filter((item) => item.id !== messageId);
        const last = nextMessages.at(-1);
        return {
          ...current,
          messages: { ...current.messages, [planId]: nextMessages },
          messagePreviews: last
            ? { ...current.messagePreviews, [planId]: previewFromMessage(last) }
            : current.messagePreviews
        };
      });
    },
    [setData]
  );

  const patchLocalMessage = useCallback(
    (planId, tempId, next) => {
      setData((current) => {
        const nextMessages = (current.messages[planId] || []).map((item) =>
          item.id === tempId ? { ...item, ...next } : item
        );
        const last = nextMessages.at(-1);
        return {
          ...current,
          messages: { ...current.messages, [planId]: nextMessages },
          messagePreviews: last
            ? { ...current.messagePreviews, [planId]: previewFromMessage(last) }
            : current.messagePreviews
        };
      });
    },
    [setData]
  );

  const ingestRemoteMessage = useCallback(
    async (planId, row) => {
      if (!viewer?.id || !row?.id) return;
      const mapped = await hydrateMessage(viewer.id, row);
      if (!mapped) return;
      setData((current) => {
        const existing = current.messages[planId] || [];
        if (existing.some((item) => item.id === mapped.id)) return current;
        const withoutTemp = existing.filter(
          (item) =>
            !(
              item.pending &&
              item.mine &&
              item.text === mapped.text &&
              item.mediaType === mapped.mediaType
            )
        );
        const nextMessages = [...withoutTemp, mapped];
        return {
          ...current,
          messages: { ...current.messages, [planId]: nextMessages },
          messagePreviews: { ...current.messagePreviews, [planId]: previewFromMessage(mapped) }
        };
      });
    },
    [setData, viewer?.id]
  );

  const subscribePlanMessages = useCallback(
    (planId) => {
      if (!viewer?.id || !planId) return () => {};
      const channel = supabase
        .channel(`along-chat-${planId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `plan_id=eq.${planId}`
          },
          (payload) => {
            ingestRemoteMessage(planId, payload.new).catch(() => {});
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    [ingestRemoteMessage, viewer?.id]
  );

  const sendMessage = useCallback(
    (id, text) => {
      if (!viewer?.id) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      appendLocalMessage(id, {
        id: tempId,
        mine: true,
        senderId: viewer.id,
        senderName: viewer.name,
        senderInitials: viewer.name?.slice(0, 2).toUpperCase() || 'YO',
        senderTone: '',
        text: text.trim(),
        mediaType: null,
        mediaUrl: null,
        createdAt,
        time: '',
        pending: true
      });
      return withBusy(async () => {
        try {
          const row = await sendPlanMessage(viewer.id, id, text);
          patchLocalMessage(id, tempId, {
            id: row.id,
            createdAt: row.created_at,
            pending: false,
            failed: false
          });
        } catch (error) {
          patchLocalMessage(id, tempId, { pending: false, failed: true });
          throw error;
        }
      });
    },
    [appendLocalMessage, patchLocalMessage, viewer, withBusy]
  );

  const sendMedia = useCallback(
    (id, file, caption) => {
      if (!viewer?.id) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      const localUrl = URL.createObjectURL(file);
      const mediaType = file.type.startsWith('image/') ? 'image' : 'audio';
      appendLocalMessage(id, {
        id: tempId,
        mine: true,
        senderId: viewer.id,
        senderName: viewer.name,
        senderInitials: viewer.name?.slice(0, 2).toUpperCase() || 'YO',
        senderTone: '',
        text: caption?.trim() || (mediaType === 'image' ? 'Photo' : 'Voice note'),
        mediaType,
        mediaUrl: localUrl,
        createdAt,
        time: '',
        pending: true
      });
      return withBusy(async () => {
        try {
          const result = await sendPlanMedia(id, file, caption);
          URL.revokeObjectURL(localUrl);
          patchLocalMessage(id, tempId, {
            id: result.id,
            createdAt: result.createdAt,
            mediaType: result.mediaType,
            mediaUrl: result.mediaUrl,
            pending: false,
            failed: false
          });
        } catch (error) {
          patchLocalMessage(id, tempId, { pending: false, failed: true });
          throw error;
        }
      });
    },
    [appendLocalMessage, patchLocalMessage, viewer, withBusy]
  );

  const dismissFailedMessage = useCallback(
    (planId, messageId) => {
      removeLocalMessage(planId, messageId);
    },
    [removeLocalMessage]
  );

  const checkIn = useCallback(
    (id) => runAction(() => markCheckIn(viewer.id, id), 'You’re checked in.'),
    [runAction, viewer?.id]
  );

  const complete = useCallback(
    (id) => runAction(() => markComplete(viewer.id, id), 'Plan completed.'),
    [runAction, viewer?.id]
  );

  const value = useMemo(
    () => ({
      data,
      busy,
      sendMessage,
      sendMedia,
      refreshPlanMessages,
      subscribePlanMessages,
      dismissFailedMessage,
      checkIn,
      complete
    }),
    [
      busy,
      checkIn,
      complete,
      data,
      dismissFailedMessage,
      refreshPlanMessages,
      sendMedia,
      sendMessage,
      subscribePlanMessages
    ]
  );

  return <AlongChatContext.Provider value={value}>{children}</AlongChatContext.Provider>;
}

export function useAlongChat() {
  const context = useContext(AlongChatContext);
  if (!context) throw new Error('useAlongChat must be used inside AlongChatProvider');
  return context;
}
