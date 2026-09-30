import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const fail = (error, status) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const audioTypes = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3'
};

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return fail('Sign in to send media.', 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Invalid request origin.', 403);
  const db = dbClient();
  if (!db) return fail('Media sharing is unavailable.', 503);

  const form = await request.formData().catch(() => null);
  const planId = String(form?.get('planId') || '');
  const file = form?.get('file');
  const caption = String(form?.get('caption') || '').trim();
  if (!uuid.test(planId) || !(file instanceof File) || caption.length > 500)
    return fail('Check your attachment and try again.', 400);

  const type = file.type.split(';')[0];
  const image = ['image/jpeg', 'image/png', 'image/webp'].includes(type);
  const audio = Object.hasOwn(audioTypes, type);
  if (!image && !audio)
    return fail('Choose a JPG, PNG, WebP, WebM, MP4, OGG, or MP3 file.', 400);
  if (file.size < 1 || file.size > (image ? 5 : 8) * 1024 * 1024)
    return fail(`Choose a ${image ? 'photo under 5 MB' : 'recording under 8 MB'}.`, 400);

  const profile = await db
    .from('profiles')
    .select('id,suspended_at')
    .eq('clerk_user_id', userId)
    .maybeSingle();
  if (profile.error || !profile.data || profile.data.suspended_at)
    return fail('Your account cannot send messages.', 403);

  const [membership, bytes] = await Promise.all([
    db
      .from('memberships')
      .select('id')
      .eq('plan_id', planId)
      .eq('profile_id', profile.data.id)
      .maybeSingle(),
    file.arrayBuffer().then((buffer) => Buffer.from(buffer))
  ]);
  if (membership.error || !membership.data)
    return fail('Only plan members can share in this chat.', 403);

  let content;
  let mime;
  let extension;
  try {
    if (image) {
      const alreadyReady = type === 'image/webp' && bytes.length <= 1.5 * 1024 * 1024;
      if (alreadyReady) {
        content = bytes;
        mime = 'image/webp';
        extension = 'webp';
      } else {
        content = await sharp(bytes, { limitInputPixels: 25_000_000 })
          .rotate()
          .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer();
        mime = 'image/webp';
        extension = 'webp';
      }
    } else {
      content = bytes;
      mime = type;
      extension = audioTypes[type];
    }
  } catch {
    return fail('This attachment could not be opened.', 400);
  }
  if (content.length > 8 * 1024 * 1024) return fail('This attachment is too large.', 400);

  const path = `${planId}/${crypto.randomUUID()}.${extension}`;
  const upload = await db.storage
    .from('chat-media')
    .upload(path, content, { contentType: mime, cacheControl: '31536000', upsert: false });
  if (upload.error) return fail('Could not upload the attachment.', 500);

  const inserted = await db
    .from('messages')
    .insert({
      plan_id: planId,
      sender_id: profile.data.id,
      body: caption || (image ? 'Photo' : 'Voice note'),
      media_type: image ? 'image' : 'audio',
      media_path: path,
      media_mime: mime
    })
    .select('id,created_at')
    .single();
  if (inserted.error) {
    await db.storage.from('chat-media').remove([path]);
    return fail('Could not send the attachment.', 500);
  }

  const signed = await db.storage.from('chat-media').createSignedUrl(path, 3600);
  return Response.json(
    {
      id: inserted.data.id,
      createdAt: inserted.data.created_at,
      mediaType: image ? 'image' : 'audio',
      mediaUrl: signed.data?.signedUrl || `/api/chat-media/${inserted.data.id}`
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
