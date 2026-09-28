# Along

Along helps people make a specific public activity plan and find someone to join them. The site uses Next.js App Router, React, Tailwind CSS, shadcn controls, and Supabase.

## Run locally

1. Copy `.env.example` to `.env.local` and set the Along project's URL, publishable key, and site URL.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:3000` for the public home page or `/app` for the product.

Along is set up as a Progressive Web App. Production builds register a service worker (`@ducanh2912/next-pwa`), expose `/manifest.webmanifest`, and include install icons under `public/icons/`. The service worker is disabled in development. After `npm run build && npm start`, you can install Along from a supporting browser. An `/offline` fallback is shown when navigation fails without a network.

## Test accounts

Re-seed with `database/seed-test-data.sql` when needed. Every seeded account uses password `along123`:

| Email | Role to try |
| --- | --- |
| `maya@along.test` | Host with open swim plan, pending request, chat, completed past plan |
| `david@along.test` | Host coffee plan + closed brunch for reports |
| `brenda@along.test` | Host circuit class with a pending request |
| `aisha@along.test` | Host walk with multiple pending requests |
| `joel@along.test` | Host art workshop |
| `nina@along.test` | Joiner with pending requests + accepted coffee membership |
| `sam@along.test` | Joiner in swim chat; completed lakeside plan |
| `alex@along.test` | Joiner with pending requests |

Admin stays on your real account in `along_admins` (currently Mukisa). Open `/admin` while signed in as that admin to review seeded reports.

The browser client uses Supabase Auth for email signup, confirmation, sign in, password recovery, session restore, and sign out. It never stores passwords in local storage. User profiles, plans, join requests, memberships, and messages use the project's database.

## Launch checks

The database's Row Level Security and grants must be reviewed before public launch. A proposed setup is in `database/launch-readiness.sql`. The current Codex Supabase MCP connection cannot access project `jjhjuezixwelxcwnnlrt`, so that SQL could not be installed or verified. The join approval action requires its `accept_along_request` transaction. Configure Supabase Auth URL settings to allow the deployed site and `/app` redirects. Test signup, email confirmation, password recovery, joining, hosting, and chat with two real accounts after the database setup is applied.

The home page's activity cards illustrate ideas; they do not represent current available plans. `/app` only displays real plans whose host profile is not marked as old seed content. Reporting and moderation are not yet implemented, so the interface does not present a nonfunctional report form.
