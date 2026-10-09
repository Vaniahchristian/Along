import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

const availabilitySelect = 'id,from_at,until_at,created_at';

/**
 * Load the signed-in profile's own availability row.
 * RLS restricts `availabilities` to the caller's own row; identity is
 * derived server-side from the Clerk JWT, so no profile ID is passed.
 */
export async function loadMyAvailability() {
  const result = await supabase.from('availabilities').select(availabilitySelect).maybeSingle();
  check(result.error);
  return result.data || null;
}

/**
 * Save (insert or reschedule) availability through the trusted RPC.
 * @param {string} p_from_at ISO timestamptz, inclusive start
 * @param {string} p_until_at ISO timestamptz, exclusive end
 * @returns {Promise<string>} availability id
 */
export async function saveAvailability(p_from_at, p_until_at) {
  const result = await supabase.rpc('create_availability', { p_from_at, p_until_at });
  check(result.error);
  return result.data;
}
