import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Missing Supabase URL or publishable key');
}

let clerkTokenGetter = null;
export function setClerkTokenGetter(getter) { clerkTokenGetter = getter; }

export const supabase = createClient(url ?? '', anonKey ?? '', {
  ...(process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
    ? { accessToken: async () => clerkTokenGetter ? await clerkTokenGetter() : null }
    : { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
});
