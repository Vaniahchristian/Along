import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const adminEmail = 'christianvaniah@gmail.com';
const previousAdminEmail = 'vierycalliper@gmail.com';

function failure(message, status) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function profileResponse(profile, db) {
  return { id: profile.id, name: profile.display_name, email: profile.email, interests: profile.interests || [], bio: profile.bio || '', city: profile.city || '', avatarUrl: profile.avatar_path ? db.storage.from('profile-photos').getPublicUrl(profile.avatar_path).data.publicUrl : null };
}

const profileColumns = 'id,display_name,email,interests,bio,city,avatar_path,suspended_at';

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return failure('Invalid request origin.', 403);

  const { userId } = await auth();
  if (!userId) return failure('Sign in to continue.', 401);

  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.find((address) => address.id === user.primaryEmailAddressId);
  if (!user || user.id !== userId || !primaryEmail || primaryEmail.verification?.status !== 'verified') {
    return failure('Verify your email before using Tagwimi.', 403);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return failure('Account linking is temporarily unavailable. Please try again shortly.', 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = primaryEmail.emailAddress.toLowerCase();
  const byClerkId = await db.from('profiles').select(profileColumns).eq('clerk_user_id', userId).maybeSingle();
  if (byClerkId.error) return failure('Could not load your profile.', 500);

  let profile = byClerkId.data;
  if (profile?.suspended_at) return failure('This account is suspended. Contact support@tagwimi.com.', 403);
  if (!profile) {
    const byEmail = await db.from('profiles').select(`${profileColumns},clerk_user_id`).eq('email', email).maybeSingle();
    if (byEmail.error) return failure('Could not find your existing profile.', 500);
    if (byEmail.data?.clerk_user_id && byEmail.data.clerk_user_id !== userId) return failure('This email is already linked to another account. Contact support@tagwimi.com.', 409);
    if (byEmail.data?.suspended_at) return failure('This account is suspended. Contact support@tagwimi.com.', 403);

    if (byEmail.data) {
      const linked = await db.from('profiles').update({ clerk_user_id: userId }).eq('id', byEmail.data.id).is('clerk_user_id', null).select(profileColumns).single();
      if (linked.error) return failure('Could not link your existing profile. Please try again.', 500);
      profile = linked.data;
    } else {
      const name = String(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.unsafeMetadata?.display_name || email.split('@')[0]).trim().slice(0, 40);
      const interests = Array.isArray(user.unsafeMetadata?.interests) ? user.unsafeMetadata.interests.filter((item) => typeof item === 'string').slice(0, 5) : [];
      const created = await db.from('profiles').insert({ clerk_user_id: userId, display_name: name, email, initials: name.slice(0, 2).toUpperCase(), tone: '', interests, is_demo_seed: false }).select(profileColumns).single();
      if (created.error) return failure('Could not create your profile. Please try again.', 500);
      profile = created.data;
    }
  }

  if (email === adminEmail) {
    const granted = await db.from('along_admins').upsert({ user_id: profile.id }, { onConflict: 'user_id' });
    if (granted.error) return failure('Your profile is ready, but admin access could not be granted.', 500);
    const previousAdmin = await db.from('profiles').select('id').eq('email', previousAdminEmail).maybeSingle();
    if (previousAdmin.error) return failure('Your admin access is ready, but the previous role could not be reviewed.', 500);
    if (previousAdmin.data && previousAdmin.data.id !== profile.id) {
      const revoked = await db.from('along_admins').delete().eq('user_id', previousAdmin.data.id);
      if (revoked.error) return failure('Your admin access is ready, but the previous role could not be removed.', 500);
    }
  }

  return Response.json({ profile: profileResponse(profile, db) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return failure('Invalid request origin.', 403);
  const { userId } = await auth();
  if (!userId) return failure('Sign in to continue.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return failure('Profile editing is temporarily unavailable.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const existing = await db.from('profiles').select(profileColumns).eq('clerk_user_id', userId).maybeSingle();
  if (existing.error || !existing.data) return failure('Could not load your profile.', 404);
  if (existing.data.suspended_at) return failure('This account is suspended. Contact support@tagwimi.com.', 403);
  const form = await request.formData().catch(() => null);
  if (!form) return failure('Check your profile details and try again.', 400);
  const name = String(form.get('name') || '').trim();
  const bio = String(form.get('bio') || '').trim();
  const city = String(form.get('city') || '').trim();
  let interests;
  try { interests = JSON.parse(String(form.get('interests') || '[]')); }
  catch { return failure('Choose valid interests.', 400); }
  if (name.length < 2 || name.length > 40 || bio.length > 240 || (city.length > 0 && city.length < 2) || city.length > 60) return failure('Check the name, city, and bio lengths.', 400);
  if (!Array.isArray(interests) || interests.length > 8 || interests.some((item) => typeof item !== 'string' || item.length > 30)) return failure('Choose up to eight interests.', 400);
  const file = form.get('photo');
  const removePhoto = form.get('removePhoto') === 'true';
  if (file instanceof File && file.size > 0 && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return failure('Choose a JPG, PNG, or WebP photo under 5 MB.', 400);
  let avatarPath = removePhoto ? null : existing.data.avatar_path;
  if (file instanceof File && file.size > 0) {
    let image;
    try { image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 }).rotate().resize(640, 640, { fit: 'cover' }).webp({ quality: 82 }).toBuffer(); }
    catch { return failure('That photo could not be opened.', 400); }
    if (image.length > 2 * 1024 * 1024) return failure('This photo is too large after processing. Try another.', 400);
    avatarPath = `${existing.data.id}/${crypto.randomUUID()}.webp`;
    const upload = await db.storage.from('profile-photos').upload(avatarPath, image, { contentType: 'image/webp', cacheControl: '31536000' });
    if (upload.error) return failure('Could not upload your photo.', 500);
  }
  const updated = await db.from('profiles').update({ display_name: name, initials: name.slice(0, 2).toUpperCase(), bio, city, interests, avatar_path: avatarPath }).eq('id', existing.data.id).eq('clerk_user_id', userId).select(profileColumns).single();
  if (updated.error) {
    if (avatarPath && avatarPath !== existing.data.avatar_path) await db.storage.from('profile-photos').remove([avatarPath]);
    return failure('Could not save your profile.', 500);
  }
  if (existing.data.avatar_path && existing.data.avatar_path !== avatarPath) await db.storage.from('profile-photos').remove([existing.data.avatar_path]);
  return Response.json({ profile: profileResponse(updated.data, db) }, { headers: { 'Cache-Control': 'no-store' } });
}
