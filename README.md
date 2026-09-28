# Along

Along helps people make a specific public activity plan and find someone to join them. The site uses Next.js App Router, React, Tailwind CSS, shadcn controls, and Supabase.

## Run locally

1. Copy `.env.example` to `.env.local` and set the Along project's URL and publishable key.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:3000` for the public home page or `/app` for the product.

The browser client uses Supabase Auth for email signup, confirmation, sign in, password recovery, session restore, and sign out. It never stores passwords in local storage. User profiles, plans, join requests, memberships, and messages use the project's database.

## Launch checks

The database's Row Level Security and grants must be reviewed before public launch. A proposed setup is in `database/launch-readiness.sql`. The current Codex Supabase MCP connection cannot access project `jjhjuezixwelxcwnnlrt`, so that SQL could not be installed or verified. The join approval action requires its `accept_along_request` transaction. Configure Supabase Auth URL settings to allow the deployed site and `/app` redirects. Test signup, email confirmation, password recovery, joining, hosting, and chat with two real accounts after the database setup is applied.

The home page's activity cards illustrate ideas; they do not represent current available plans. `/app` only displays real plans whose host profile is not marked as old seed content. Reporting and moderation are not yet implemented, so the interface does not present a nonfunctional report form.
