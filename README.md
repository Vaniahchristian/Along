# Along — interactive UI concept

Along helps someone turn a specific activity into a small public plan with company. This is a responsive Next.js App Router prototype built from the Stitch concepts in `stitch_activity_buddy_finder_ui/`.

Run `npm install` and `npm run dev`, then open `http://localhost:3000`. All people, plans, messages, and outcomes are sample data. Changes persist in browser storage until **Profile → Reset sample data**.

The route and metadata live in `app/`. Each screen is a React component in `components/along/`, using the installed shadcn controls. Demo actions are managed by a React provider and a pure reducer in `lib/demo-state.mjs`; browser storage keeps the data between visits.

## The main journey

1. **Explore:** Search or filter small plans around Kampala. Cards show the activity, place, time, host, and remaining spots.
2. **Review:** Open a plan to see the meeting point, what to bring, likely costs, group size, and public-place guidance.
3. **Ask to join:** The plan enters **My plans** as pending. In **Profile → Demo controls**, simulate the host accepting it.
4. **Coordinate:** The confirmed plan opens a group chat. Send a message, check in at the meeting point, and mark the activity complete.
5. **Host:** Create a plan with an activity, public venue, time, group size, and clear meeting instructions. It appears in Explore and My plans. A clearly labeled sample request from Nina appears on the new plan so you can try accepting someone as a host.

The demo includes empty search results, pending and confirmed states, form validation, completed plans, and a simple reporting entry point. Reporting, identity checks, moderation, real messaging, and attendance verification are **not implemented**. The UI avoids claiming they exist.

## Design direction

The visual concept is **a friendly field guide for getting out of the house**. Deep evergreen (`#244D3D`) provides a grounded, trustworthy base; warm paper (`#F6F3EC`) keeps the browsing experience calm; terracotta (`#D9633F`) marks invitations and important actions. Soft mint (`#DCECDF`) communicates confirmation. Ink (`#20332D`) carries the main text. This is warmer and more distinctive than the Stitch screens' pale lavender system while retaining their approachable intent.

Activity cards prioritize the decision facts: what, when, where, who, and whether there is room. Details are written as human instructions rather than generic social-app labels. The demo's date and location are fixed sample content, not a live location service.

## Next product decisions

- Choose a launch community and real venue coverage before connecting live data.
- Define identity, reporting, cancellation, and check-in policies before allowing public meetups.
- Test whether host approval is needed for every plan, and whether one-to-one or small groups lead to more completed activities.
