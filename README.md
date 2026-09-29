# Along

Along is a Next.js app for small public activity plans, join requests, group messages, and attendance. It uses Tailwind CSS, Clerk for the new Google sign-in flow, and Supabase for the database and realtime notifications.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key, the site URL, and both Clerk keys.
3. In Clerk, enable Google sign-in and the Supabase integration. In Supabase Authentication → Third-Party Auth, add Clerk's domain as a provider.
4. Run `database/clerk-identity.sql` once on the Along Supabase project. This migration is already applied to project `jjhjuezixwelxcwnnlrt`.
5. Set `NEXT_PUBLIC_AUTH_PROVIDER=clerk` locally, then run `npm run dev`. Add the same variable and **production** Clerk keys to Vercel when the integration and account migration have been verified.

The auth-provider flag keeps the existing Supabase Auth sign-in working during the migration. Clerk users have a `user_...` ID, while Along's plans and messages reference UUID profile IDs. The database bridge stores the Clerk ID alongside the existing profile UUID so those relationships remain intact. Existing accounts need their verified Clerk ID linked to their current profile before they can see their prior plans and messages. In particular, link the administrator's Clerk ID to the existing `vierycalliper@gmail.com` profile before switching the deployed app.

Run `npm run build` before deploying. The production build registers a Progressive Web App service worker and provides an `/offline` fallback.
