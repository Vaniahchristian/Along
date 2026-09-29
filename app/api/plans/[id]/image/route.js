import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const bucket = 'plan-images';
const maxUploadBytes = 4 * 1024 * 1024;

function fail(message, status) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function ownedPlan(request, params) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return { error: fail('Invalid request origin.', 403) };
  const { userId } = await auth();
  if (!userId) return { error: fail('Sign in to continue.', 401) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: fail('Image uploads are temporarily unavailable.', 503) };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: fail('Invalid plan.', 400) };
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error) return { error: fail('Could not check your account.', 500) };
  if (!profile.data) return { error: fail('Your profile is not ready yet.', 403) };
  const plan = await db.from('plans').select('id,host_id,image_path').eq('id', id).maybeSingle();
  if (plan.error) return { error: fail('Could not load the plan.', 500) };
  if (!plan.data) return { error: fail('Plan not found.', 404) };
  if (plan.data.host_id !== profile.data.id) return { error: fail('Only the host can change this photo.', 403) };
  return { db, plan: plan.data };
}

export async function POST(request, { params }) {
  const access = await ownedPlan(request, params);
  if (access.error) return access.error;
  const form = await request.formData().catch(() => null);
  const file = form?.get('image');
  if (!(file instanceof File)) return fail('Choose a photo to upload.', 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return fail('Use a JPG, PNG, or WebP image.', 400);
  if (file.size < 1 || file.size > maxUploadBytes) return fail('Choose a smaller image.', 400);

  let image;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 36_000_000 })
      .rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch {
    return fail('That image could not be opened. Try another photo.', 400);
  }
  const path = `${access.plan.id}/${crypto.randomUUID()}.webp`;
  const uploaded = await access.db.storage.from(bucket).upload(path, image, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (uploaded.error) return fail('Could not upload the photo. Please try again.', 500);
  const updated = await access.db.from('plans').update({ image_path: path }).eq('id', access.plan.id).eq('host_id', access.plan.host_id).select('id').single();
  if (updated.error) {
    await access.db.storage.from(bucket).remove([path]);
    return fail('Could not save the photo to this plan.', 500);
  }
  if (access.plan.image_path) await access.db.storage.from(bucket).remove([access.plan.image_path]);
  const url = access.db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return Response.json({ imageUrl: url }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request, { params }) {
  const access = await ownedPlan(request, params);
  if (access.error) return access.error;
  if (!access.plan.image_path) return Response.json({ imageUrl: null });
  const updated = await access.db.from('plans').update({ image_path: null }).eq('id', access.plan.id).eq('host_id', access.plan.host_id).select('id').single();
  if (updated.error) return fail('Could not remove the photo from this plan.', 500);
  await access.db.storage.from(bucket).remove([access.plan.image_path]);
  return Response.json({ imageUrl: null }, { headers: { 'Cache-Control': 'no-store' } });
}
