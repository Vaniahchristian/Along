'use client';

import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { toast } from 'sonner';
import { demoReducer, initialDemoData, restoreDemoData, STORAGE_KEY } from '@/lib/demo-state.mjs';

const AlongContext = createContext(null);

export function AlongProvider({ children }) {
  const [data, dispatch] = useReducer(demoReducer, undefined, initialDemoData);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState('explore');
  const [selectedPlanId, setSelectedPlanId] = useState(1);
  const [chatId, setChatId] = useState(1);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: 'hydrate', value: restoreDemoData(JSON.parse(saved)) });
    } catch {
      // Corrupt demo storage should never prevent the UI from loading.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

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
    dispatch({ type: 'request', id });
    toast.success('Request sent. Track it in My plans.');
  }

  function acceptRequest() {
    const id = data.requests[0];
    if (!id) return;
    dispatch({ type: 'accept-request', id });
    setChatId(id);
    toast.success('Request accepted. Your group chat is ready.');
  }

  function acceptHostRequest(id) {
    dispatch({ type: 'accept-host', id });
    toast.success('Nina is in. Your group chat is ready.');
  }

  function publishPlan(plan) {
    dispatch({ type: 'publish', plan });
    setSelectedPlanId(plan.id);
    navigate('detail');
    toast.success('Your plan is live. A sample join request is ready to review.');
  }

  function sendMessage(id, text) {
    dispatch({ type: 'message', id, text });
  }

  function checkIn(id) {
    dispatch({ type: 'checkin', id });
    toast.success('Check-in recorded for this demo.');
  }

  function complete(id) {
    dispatch({ type: 'complete', id });
    toast.success('Plan completed. Thanks for showing up!');
  }

  function reset() {
    dispatch({ type: 'reset' });
    window.localStorage.removeItem(STORAGE_KEY);
    setScreen('explore');
    setSelectedPlanId(1);
    setChatId(1);
    toast.success('Sample data reset.');
  }

  const value = { data, dispatch, screen, selectedPlanId, chatId, navigate, openPlan, openChat, requestJoin, acceptRequest, acceptHostRequest, publishPlan, sendMessage, checkIn, complete, reset };
  return <AlongContext.Provider value={value}>{children}</AlongContext.Provider>;
}

export function useAlong() {
  const context = useContext(AlongContext);
  if (!context) throw new Error('useAlong must be used inside AlongProvider');
  return context;
}
