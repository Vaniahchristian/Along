'use client';

import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { AlongCoreProvider } from '@/components/providers/along-core';
import { AlongSessionProvider, useAlongSession } from '@/components/providers/along-session';
import { AlongPlansProvider, useAlongPlans } from '@/components/providers/along-plans';
import { AlongChatProvider, useAlongChat } from '@/components/providers/along-chat';

export function ClerkAlongProvider({ children }) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  return (
    <AlongProvider clerkIdentity={{ user, isLoaded, getToken, signOut }}>{children}</AlongProvider>
  );
}

export function AlongProvider({ children, clerkIdentity = null }) {
  return (
    <AlongCoreProvider clerkIdentity={clerkIdentity}>
      <AlongSessionProvider>
        <AlongPlansProvider>
          <AlongChatProvider>{children}</AlongChatProvider>
        </AlongPlansProvider>
      </AlongSessionProvider>
    </AlongCoreProvider>
  );
}

/** Compatibility hook — prefer useAlongSession / useAlongPlans / useAlongChat when possible. */
export function useAlong() {
  const session = useAlongSession();
  const plans = useAlongPlans();
  const chat = useAlongChat();
  return {
    ...session,
    ...plans,
    ...chat,
    data: plans.data,
    busy: session.busy || plans.busy || chat.busy
  };
}

export { useAlongSession, useAlongPlans, useAlongChat };
