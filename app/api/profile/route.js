import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const adminEmail = 'christianvaniah@gmail.com';
const previousAdminEmail = 'vierycalliper@gmail.com';

function failure(message, status) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER !== 'clerk') return failure('Clerk sign-in is not enabled.', 404);
  if (request.headers.get('origin') !== new URL(request.url).origin) return failure('Invalid request origin.', 403);

  const { userId } = await auth();
  if (!userId) return failure('Sign in with Google to continue.', 401);

  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.find((address) => address.id === user.primaryEmailAddressId);
  if (!user || user.id !== userId || !primaryEmail || primaryEmail.verification?.status !== 'verified') {
    return failure('Your Google email must be verified before using Tagwimi.', 403);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return failure('Account linking is temporarily unavailable. Please try again shortly.', 503);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = primaryEmail.emailAddress.toLowerCase();
  const googleAccount = user.externalAccounts?.some((account) =>
    (account.provider === 'google' || account.provider === 'oauth_google') && account.emailAddress?.toLowerCase() === email
  );
  if (!googleAccount) return failure('Continue with the Google account for this email.', 403);
  const byClerkId = await db.from('profiles').select('id,display_name,email,interests').eq('clerk_user_id', userId).maybeSingle();
  if (byClerkId.error) return failure('Could not load your profile.', 500);

  let profile = byClerkId.data;
  if (!profile) {
    const byEmail = await db.from('profiles').select('id,display_name,email,interests,clerk_user_id').eq('email', email).maybeSingle();
    if (byEmail.error) return failure('Could not find your existing profile.', 500);
    if (byEmail.data?.clerk_user_id && byEmail.data.clerk_user_id !== userId) return failure('This email is already linked to another account. Contact support@tagwimi.com.', 409);

    if (byEmail.data) {
      const linked = await db.from('profiles').update({ clerk_user_id: userId }).eq('id', byEmail.data.id).is('clerk_user_id', null).select('id,display_name,email,interests').single();
      if (linked.error) return failure('Could not link your existing profile. Please try again.', 500);
      profile = linked.data;
    } else {
      const name = String(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || email.split('@')[0]).trim().slice(0, 40);
      const created = await db.from('profiles').insert({ clerk_user_id: userId, display_name: name, email, initials: name.slice(0, 2).toUpperCase(), tone: '', interests: [], is_demo_seed: false }).select('id,display_name,email,interests').single();
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

  return Response.json({ profile: { id: profile.id, name: profile.display_name, email: profile.email, interests: profile.interests || [] } }, { headers: { 'Cache-Control': 'no-store' } });
}
