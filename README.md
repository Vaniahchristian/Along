# Tagwimi

Tagwimi is a Next.js app for small public activity plans, join requests, group messages, and attendance. **Make the plan. Find your people. Go.** It uses Tailwind CSS, Clerk for Google and email authentication, and Supabase for the database and realtime notifications.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key, the site URL, Clerk development keys, and a server-only Supabase secret key. Production Clerk keys only work on the configured Tagwimi domain.
3. In Clerk, enable Google sign-in, email sign-up with password and email verification, email-code sign-in, and the Supabase integration. In Supabase Authentication → Third-Party Auth, add Clerk's domain as a provider.
4. Run `database/clerk-identity.sql` once on the Tagwimi Supabase project. This migration is already applied to project `jjhjuezixwelxcwnnlrt`.
5. Run `npm run dev`. Set the same non-secret variables, production Clerk keys, and server-only Supabase key in Vercel. A legacy `SUPABASE_SERVICE_ROLE_KEY` also works. Never prefix the privileged Supabase key with `NEXT_PUBLIC_` or expose it to the browser.

Clerk users have a `user_...` ID, while Tagwimi's plans and messages reference UUID profile IDs. The database bridge stores the Clerk ID alongside the existing profile UUID so those relationships remain intact. On first sign-in, the server checks the verified Clerk email, links any existing profile with that exact email, and otherwise creates a profile. The administrator is `christianvaniah@gmail.com`; after that verified identity has a linked Tagwimi profile, the server grants its admin role and revokes the previous admin role.

The public domain is `tagwimi.com` with `www.tagwimi.com` also configured. Set Clerk's production domain to `tagwimi.com`, complete its required DNS records, add the production Clerk instance domain to Supabase Third-Party Auth, and set `NEXT_PUBLIC_SITE_URL` in Vercel to the canonical site URL.

Run `npm run build` before deploying. The production build registers a Progressive Web App service worker and provides an `/offline` fallback.
