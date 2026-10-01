import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { defaultActivityImage } from '@/lib/media/activity-image';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicPlan(id) {
  if (!uuid.test(id || '')) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Plan previews are temporarily unavailable.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: row, error } = await db.from('plans')
    .select('id,host_id,category,title,venue,date_label,time_label,spots,size,intro,status,visibility,cost_note,image_path,ends_at,host:profiles!plans_host_id_fkey(display_name,avatar_path,bio,city,interests,is_demo_seed)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row || row.host?.is_demo_seed || !['open', 'closed'].includes(row.status)) return null;
  const imageUrl = row.image_path ? db.storage.from('plan-images').getPublicUrl(row.image_path).data.publicUrl : null;
  const avatarUrl = row.host?.avatar_path ? db.storage.from('profile-photos').getPublicUrl(row.host.avatar_path).data.publicUrl : null;
  return {
    id: row.id, hostId: row.host_id, category: row.category, title: row.title,
    venue: row.venue, date: row.date_label, time: row.time_label, spots: row.spots,
    size: row.size, intro: row.intro, status: row.status, visibility: row.visibility,
    endsAt: row.ends_at || null,
    costNote: row.cost_note || '', imageUrl, image: imageUrl || defaultActivityImage(row),
    host: row.host?.display_name || 'a Tagwimi member', hostAvatarUrl: avatarUrl,
    hostBio: row.host?.bio || '', hostCity: row.host?.city || '',
    hostInterests: row.host?.interests || []
  };
}
