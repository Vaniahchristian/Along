'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  sendPlanMessage,
  sendPlanMedia,
  loadPlanMessages,
  markCheckIn,
  markComplete
} from '@/lib/along';
import { useAlongCore } from '@/components/providers/along-core';

const AlongChatContext = createContext(null);

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
        return {
          ...current,
          messages: { ...current.messages, [planId]: merged }
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
        }
      }));
    },
    [setData]
  );

  const removeLocalMessage = useCallback(
    (planId, messageId) => {
      setData((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [planId]: (current.messages[planId] || []).filter((item) => item.id !== messageId)
        }
      }));
    },
    [setData]
  );

  const patchLocalMessage = useCallback(
    (planId, tempId, next) => {
      setData((current) => ({
        ...current,
        messages: {
          ...current.messages,
          [planId]: (current.messages[planId] || []).map((item) =>
            item.id === tempId ? { ...item, ...next } : item
          )
        }
      }));
    },
    [setData]
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
            pending: false
          });
        } catch (error) {
          removeLocalMessage(id, tempId);
          throw error;
        }
      });
    },
    [appendLocalMessage, patchLocalMessage, removeLocalMessage, viewer, withBusy]
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
            pending: false
          });
        } catch (error) {
          URL.revokeObjectURL(localUrl);
          removeLocalMessage(id, tempId);
          throw error;
        }
      });
    },
    [appendLocalMessage, patchLocalMessage, removeLocalMessage, viewer, withBusy]
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
      checkIn,
      complete
    }),
    [busy, checkIn, complete, data, refreshPlanMessages, sendMedia, sendMessage]
  );

  return <AlongChatContext.Provider value={value}>{children}</AlongChatContext.Provider>;
}

export function useAlongChat() {
  const context = useContext(AlongChatContext);
  if (!context) throw new Error('useAlongChat must be used inside AlongChatProvider');
  return context;
}
