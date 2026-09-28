---
name: Companion Warmth
colors:
  surface: '#fbf8fc'
  surface-dim: '#dcd9dd'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f6'
  surface-container: '#f0edf1'
  surface-container-high: '#eae7eb'
  surface-container-highest: '#e4e1e5'
  on-surface: '#1b1b1e'
  on-surface-variant: '#5a413a'
  inverse-surface: '#303033'
  inverse-on-surface: '#f3f0f4'
  outline: '#8e7069'
  outline-variant: '#e3beb6'
  surface-tint: '#b32a04'
  primary: '#af2801'
  on-primary: '#ffffff'
  primary-container: '#d2411c'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a2'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a2'
  on-primary-fixed: '#3c0700'
  on-primary-fixed-variant: '#8a1d00'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e1e5'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.015em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-sm: 0.75rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is crafted for a social companion and activity platform that pairs individuals for shared experiences—from casual cafe sessions and lap swimming to gallery visits and trail hiking. The primary objective is to dissolve the psychological friction and social hesitation of doing things alone, replacing anxiety with warmth, agency, and absolute personal reassurance.

### Brand Personality & Emotional Drivers
- **Approachable & Inviting:** The interface feels like an encouraging friend—human, candid, and easygoing. No high-pressure social posturing or sterile corporate neutrality.
- **Rooted & Trustworthy:** Because matching with strangers in physical spaces demands acute psychological safety, visual markers prioritize clear host validation, verified meetup spots, and trackable community reliability metrics.
- **Dynamic & Motivating:** Fresh, energizing accents spark momentum and curiosity to try new routines outside the screen.

### Design Movement & Aesthetic Form
The system employs a **Tactile-Humanist Modern** style. It combines expansive warm-sand canvas planes with generously rounded card structures, crisp micro-borders, organic elevation glows, and pill-shaped controls. It sidesteps generic cold SaaS patterns in favor of tactile surfaces, human-scale micro-badges, and vibrant focal points.

## Colors

The palette balances energizing warmth with steadfast verification anchors on an organic, paper-inspired neutral ground.

### Palette Architecture
- **Primary (`#E8502A` - Vibrant Persimmon):** Drives key calls-to-action, active selection states, match confirmation highlights, and critical engagement touchpoints. Conveys vitality and warmth without the aggressiveness of pure warning reds.
- **Secondary (`#059669` - Trust Emerald):** Anchors user verification badges, vetted public venues, positive show-up reliability rates, and completed safety verifications.
- **Tertiary (`#F59E0B` - Amber Glow):** Reserved for casual time alerts, limited spot availability, and social energy milestones.
- **Neutral Base & Canvas:**
  - Canvas Background: `#FAF7F2` (Warm Sand). Softens glare and builds a calm, editorial atmosphere.
  - Surface Neutral: `#FFFFFF` (Pure Base) for elevated interactive cards and containers.
  - Borders & Dividers: `#E7E2DA` (Muted Warm Stone) for soft, low-friction structure.
  - Typography Primary: `#18181B` (Deep Carbon) for razor-sharp, accessible reading contrast.
  - Typography Muted: `#71717A` (Neutral Gray) for metadata, timestamps, and supplementary labels.
- **Auxiliary Accent (`#0284C7` - Sky Blue):** Used selectively for venue navigation badges and weather context indicators.

### Color Tokens & Semantics
- Surfaces: `bg-canvas` (`#FAF7F2`), `bg-surface` (`#FFFFFF`), `bg-surface-elevated` (`#FFFFFF`).
- Text: `text-primary` (`#18181B`), `text-secondary` (`#52525B`), `text-tertiary` (`#71717A`), `text-inverse` (`#FFFFFF`).
- Trust Indicators: `badge-verified` (`#059669` with tint background `#ECFDF5`), `badge-attendance` (`#047857` with tint background `#E6F4EA`).

## Typography

The type hierarchy leverages **Plus Jakarta Sans** across all roles to ensure geometric clarity and open, humanist apertures that convey warmth, approachability, and rapid cognitive scanning on handheld devices.

### Hierarchy & Usage
- **Headlines:** Set with tight tracking (`-0.01em` to `-0.02em`) and strong weights (`600`, `700`) to anchor event titles, host introductions, and category explorations. Large screen displays scale smoothly down to dedicated mobile sizes to prevent line-wrapping awkwardness on narrower screens.
- **Body:** Standardized on `14px` and `16px` with generous line-height ratios (`1.45` to `1.5`) for scanning activity descriptions, venue protocols, and buddy requirements.
- **Labels & Micro-data:** Elevated weights (`600`, `700`) ensure that micro trust badges, attendance stats (e.g., `98% show-up`), and capacity indicators remain legible at sizes as small as `11px` to `12px`.

## Layout & Spacing

The layout philosophy follows a mobile-first, fluid column structure with fixed outer safe paddings to guarantee easy one-handed thumb interaction.

### Screen Adaptability
- **Mobile (<640px):** Single-column fluid stack. Outer canvas margins lock strictly to `1rem` (`16px`) to maximize surface utility for activity cards. Horizontal chip carousels extend past edge margins with right-padding buffers.
- **Tablet (640px - 1024px):** 2-column masonry grid with `1.5rem` gutters, facilitating side-by-side feed browsing and dedicated activity detail sheets.
- **Desktop (>1024px):** Content conforms to a max-width centered canvas (`1120px`) with split dual-column views: live listing feed on the left, interactive venue map and verification details on the right.

### Rhythm & Proportions
The design relies on a base 4px/8px rhythm. Internal card padding uses `space-md` (`1rem`) for standard cards and `space-lg` (`1.5rem`) for featured host spotlights. Gaps between distinct structural groups maintain consistent `space-xl` spacing.

## Elevation & Depth

Visual hierarchy uses warm, ambient diffusion rather than harsh drop shadows. The goal is a clean, physical feel reminiscent of layered paper goods.

### Elevation Levels
- **Level 0 (Flat):** Base canvas layer (`#FAF7F2`). Borderless and unshadowed.
- **Level 1 (Resting Card / Container):** Pure white background (`#FFFFFF`) with a delicate warm hairline outline (`1px solid #E7E2DA`) and an ultra-soft tinted shadow:
  - `box-shadow: 0 2px 8px -2px rgba(39, 39, 42, 0.04), 0 1px 3px 0 rgba(39, 39, 42, 0.02)`
- **Level 2 (Active Cards & Floating Elements):** Used for elevated cards on scroll and floating pill filters:
  - `box-shadow: 0 8px 24px -4px rgba(232, 80, 42, 0.08), 0 4px 12px -2px rgba(39, 39, 42, 0.04)`
- **Level 3 (Modal Sheets & Bottom Dock):** Bottom navigation dock and booking action bars use a subtle glass backdrop blur (`backdrop-filter: blur(12px)`) combined with:
  - `box-shadow: 0 12px 32px -4px rgba(24, 24, 27, 0.12), 0 2px 6px 0 rgba(24, 24, 27, 0.04)`
  - Surface color: `rgba(255, 255, 255, 0.92)`

## Shapes

The design system embraces an ultra-friendly, pill-dominant shape language (`roundedness: 3`) to evoke friendliness, safety, and modern social ergonomics.

### Shape Applications
- **Pill Forms (`9999px`):** Used universally for action buttons (CTAs), search and filter chips, category toggles, avatar trust indicators, and capacity pills.
- **Card Surfaces (`rounded-2xl` / `1.5rem` to `rounded-3xl` / `2rem`):** Activity listing cards, host verification dossiers, and chat preview surfaces.
- **Micro-Containers (`rounded-lg` / `0.75rem`):** Small venue thumbnails, calendar day badges, and safety checkmark tags.

## Components

### Buttons & Interactive Triggers
- **Primary CTA:** Full pill contour, filled with primary persimmon (`#E8502A`), text in pure white with `label-lg` typography. Subtle scale effect (`transform: scale(0.98)`) on press, supported by a warm diffuse glow shadow (`rgba(232, 80, 42, 0.25)`).
- **Secondary CTA:** Full pill contour, transparent fill, bordered with `1.5px solid #E7E2DA`, neutral charcoal text (`#18181B`).
- **Safety / Verification Action:** Pill contour, emerald fill tint (`#ECFDF5`), bold emerald text (`#059669`) with an embedded shield or checkmark icon.

### Chips & Filter Tags
- **Activity & Vibe Badges:** Height `32px`, pill shape, background `#FFFFFF`, bordered by `1px solid #E7E2DA`, typography `label-md`.
- **Selected State:** Background `#18181B`, text `#FFFFFF`, border-color `#18181B`.
- **Informational Micro-Badges:** Compact tags (`24px` height) with soft thematic colors:
  - Trust / Reliability: Emerald tint (`bg-#ECFDF5`, `text-#059669`).
  - Beginner Friendly: Amber tint (`bg-#FFFBEB`, `text-#D97706`).
  - Spot Capacity: Sand neutral tint (`bg-#F4EFE6`, `text-#52525B`).

### Activity Cards
- **Structure:** Encased in pure white (`#FFFFFF`) with `rounded-3xl` borders, `1px solid #E7E2DA`, and Level 1 elevation.
- **Card Header:** Activity title in `headline-md`, relative time distance (e.g., "Today, 5:30 PM"), accompanied by a capacity pill (e.g., "1 of 2 spots open").
- **Host Anchor:** Host avatar positioned beside verified name, hosting score badge (`98% show-up`), and public venue anchor ("Blue Bottle Coffee, 4th St").
- **Card Footer:** Row of activity trait pills ("Cafe Work", "Quiet Focus", "Indoor") and an inline primary "Join In" pill CTA.

### Input Fields & Search Bars
- **Floating Global Search Bar:** Full pill shape, elevated with Level 2 shadow, background `#FFFFFF`, height `54px`, leading activity search glyph, trailing filter icon inside a contrasting dark pill.
- **Form Fields:** `rounded-2xl`, background `#FFFFFF`, border `1px solid #E7E2DA`. Active focus transition: `border-color: #E8502A` with a delicate `3px` focus ring in `rgba(232, 80, 42, 0.15)`.

### Trust Badges & Avatars
- **User Avatar:** Circular, encased with a `2px` white inner border and a micro emerald badge on the bottom-right corner featuring a white checkmark.
- **Host Reliability Scorecard:** Pill container with an emerald outline containing a check icon, percentage indicator (`99% Show-up`), and review tally count in `label-sm`.

### Checkboxes & Radio Selectors
- **Radio Buttons:** Custom rounded circular check with an active `#E8502A` fill and white inner dot.
- **Checkboxes:** `rounded-lg` with `2px` stroke. Checked state transitions into solid `#059669` emerald with a crisp white check vector.

### Navigation Dock
- **Floating Bottom Bar:** Detached floating pill bar positioned `16px` above the bottom screen safe area. Built with frosted glass (`rgba(255, 255, 255, 0.9)`), containing 4 key icons: Discover, My Buddies, Messages, and Profile, with active state highlighted by a soft persimmon dot indicator.