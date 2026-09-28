# Along — interactive UI concept

Along helps someone turn a specific activity into a small public plan with company. This is a responsive Next.js App Router prototype built from the Stitch concepts in `stitch_activity_buddy_finder_ui/`.

Run `npm install` and `npm run dev`, then open `http://localhost:3000` for the public landing page. Its calls to action open the interactive demo at `/app`. The entry screens use the supplied Along logo in `public/along-logo.png`. Sign in with `demo@along.app` / `along123`, create a demo profile, or continue as a guest. All people, plans, messages, and outcomes are sample data. Changes persist in browser storage until **Profile → Reset sample data**.

The route and metadata live in `app/`. Each screen is a React component in `components/along/`, styled with Tailwind utilities and the installed shadcn controls. `app/globals.css` contains only the Tailwind imports, theme tokens, and browser base styles. Demo actions are managed by a React provider and a pure reducer in `lib/demo-state.mjs`; browser storage keeps the data between visits.

## The main journey

0. **Enter:** Welcome, sign in, sign up, interest selection, and password-reset preview are interactive. Sign-up saves only name, email, and selected interests in browser storage. It discards passwords. Password reset sends no email.
1. **Explore:** Search or filter small plans around Kampala. Cards show the activity, place, time, host, and remaining spots.
2. **Review:** Open a plan to see the meeting point, what to bring, likely costs, group size, and public-place guidance.
3. **Ask to join:** The plan enters **My plans** as pending. In **Profile → Demo controls**, simulate the host accepting it.
4. **Coordinate:** The confirmed plan opens a group chat. Send a message, check in at the meeting point, and mark the activity complete.
5. **Host:** Create a plan with an activity, public venue, time, group size, and clear meeting instructions. It appears in Explore and My plans. A clearly labeled sample request from Nina appears on the new plan so you can try accepting someone as a host.

The demo includes empty search results, pending and confirmed states, form validation, completed plans, and a simple reporting entry point. Reporting, identity checks, moderation, real messaging, and attendance verification are **not implemented**. The UI avoids claiming they exist.

## Design direction

The visual concept is **a friendly field guide for getting out of the house**. White (`#FFFFFF`) keeps the main screens quiet; YoTip green (`#3B793F`) leads actions and navigation; forest (`#0F2218`) anchors the welcome panel. Vivid green (`#22C55E`) marks confirmed outcomes, pink (`#EC4899`) appears in small interest cues, and amber (`#FFB900`) signals pending states. Text and borders use `#0A0A0A`, `#636C61`, and `#DEE3DE`.

Activity cards prioritize the decision facts: what, when, where, who, and whether there is room. Details are written as human instructions rather than generic social-app labels. The demo's date and location are fixed sample content, not a live location service.

## Next product decisions

- Choose a launch community and real venue coverage before connecting live data.
- Define identity, reporting, cancellation, and check-in policies before allowing public meetups.
- Test whether host approval is needed for every plan, and whether one-to-one or small groups lead to more completed activities.
