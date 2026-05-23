# Spoiled Brats HQ — Project Guide

## Overview
Full-stack booking website for **Spoiled Brats Cafe** and **Kajon Music Studio**.
- **Frontend:** Ionic React (web app)
- **Backend:** Supabase (DB + Auth + Storage) — project: erar404's Project › spoiled-brats-db
- **Design:** Stitch "Spoiled Brats HQ" (Acoustic Brew theme) — project ID `6675066711015401282`
- **Auth:** Supabase Auth — email/password + Google OAuth + phone OTP

## Deployment (Google Cloud Run)

**Files:** `Dockerfile` (multi-stage Node 20 build → nginx:stable-alpine), `nginx.conf` (SPA fallback, gzip, cache headers), `.dockerignore`

Vite bakes `VITE_*` env vars into the bundle at build time — pass them as `--build-arg`. One image per environment.

### Build & push

```bash
# Substitute your project ID and region
PROJECT_ID=your-gcp-project-id
REGION=asia-southeast1
IMAGE=gcr.io/$PROJECT_ID/spoiledbratshq

docker build \
  --build-arg VITE_SUPABASE_URL=https://nhxozevkhypnfueybufj.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  -t $IMAGE .

docker push $IMAGE
```

> **Email**: sent via the `send-email` Supabase Edge Function (Google SMTP).
> SMTP credentials are stored as Supabase secrets — never in the Docker image:
>
> ```bash
> supabase secrets set \
>   SMTP_HOST=smtp.gmail.com \
>   SMTP_PORT=587 \
>   SMTP_USER=you@gmail.com \
>   SMTP_PASS=your-16-char-app-password \
>   SMTP_FROM="Kâjon Music <you@gmail.com>"
> ```
>
> Get a Gmail App Password: Google Account → Security → 2-Step Verification → App passwords.

### Deploy to Cloud Run

```bash
gcloud run deploy spoiledbratshq \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 5
```

### After first deploy — update Supabase settings

1. Copy the Cloud Run service URL (e.g. `https://spoiledbratshq-abc-de.a.run.app`)
2. Supabase Dashboard → Authentication → URL Configuration:
   - **Site URL** → set to the Cloud Run URL
   - **Redirect URLs** → add the Cloud Run URL and `<url>/**`
3. Google Cloud Console → OAuth Client → add `https://nhxozevkhypnfueybufj.supabase.co/auth/v1/callback` as an authorised redirect URI (already done) — no change needed there

### Health check

Cloud Run startup probe uses `GET /healthz` → nginx returns `200 ok`. No extra config needed; Cloud Run auto-detects the port from `EXPOSE 8080`.

## Navigation Structure
- Home tab (first): Combined HQ landing page (`/home`) — both venues, reviews, contact
- Left tab: Spoiled Brats Cafe (`/cafe`)
- Left tab: Kajon Music Studio (`/studio`)
- Admin tab: Admin panel (`/admin`) — visible to admins only
- Right tab: Login / Account Details (`/account`)

## Supabase Tables
| Table | Purpose |
|---|---|
| `users` | User profiles + role (user/admin), linked to Supabase Auth via `auth_id` |
| `cafe_schedule` | Cafe event booking requests |
| `studio_schedule` | Studio session booking requests |
| `cafe_menu` | Menu items with image URLs |
| `system_settings` | Store hours and config (key/value jsonb) |

## Storage
- Bucket: `menu-images` — public bucket for cafe menu item photos

## Configuration

### Content Security Policy (`index.html`)
```
font-src 'self' https://fonts.gstatic.com data:
```
`data:` is required — Ionic's internal component CSS embeds UI glyphs (IonSelect chevron, IonToggle mark, etc.) as base64 `data:` font URIs. Without it, those elements render broken and the browser logs a CSP violation.

### Supabase RLS — `users` table
Applied via migration `users_rls_policies`. All four policies are live in `public` schema:

| Policy | Allows |
|---|---|
| `users_select` | Own row; admins read all (needed for booking join queries) |
| `users_insert_own` | Authenticated users create their own profile only |
| `users_update` | Own row; admins update any user (role changes) |
| `users_delete_admin` | Admins only |

Helper function `public.is_current_user_admin()` — `SECURITY DEFINER` to avoid RLS recursion when the policy checks the same table. `EXECUTE` revoked from `anon` and `authenticated` so it cannot be called directly via `/rest/v1/rpc`.

### Google OAuth (Supabase Dashboard — manual steps required)
These cannot be set via SQL or MCP; must be configured in the dashboard.

**Google Cloud Console** (console.cloud.google.com → APIs & Services → Credentials):
- Create OAuth 2.0 Client ID (type: Web application)
- Authorized redirect URI: `https://nhxozevkhypnfueybufj.supabase.co/auth/v1/callback`
- Copy Client ID and Client Secret

**Supabase Dashboard → Authentication → Providers → Google:**
- Enable Google provider
- Paste Client ID and Client Secret

**Supabase Dashboard → Authentication → URL Configuration:**
- Site URL: `http://localhost:3000` (update to production URL on deploy)
- Redirect URLs (add both):
  - `http://localhost:3000`
  - `http://localhost:3000/**`
  - *(add production URL here when deploying)*

> The dev server runs on port **3000** (`vite.config.ts: server: { port: 3000 }`). `signInWithOAuth` passes `redirectTo: window.location.origin`, so whatever origin the app runs on must be in this list.

### Phone OTP (Supabase Dashboard — manual steps required)

Supabase uses Twilio (or another SMS provider) to send OTPs. It does **not** send SMS out of the box.

**Step 1 — Enable phone auth in Supabase**

Supabase Dashboard → Authentication → Providers → Phone:
- Toggle **Phone** enabled
- Leave OTP type as **SMS**
- Set OTP expiry (e.g. 300 seconds = 5 minutes)
- Save

**Step 2 — Connect an SMS provider (Twilio recommended)**

Supabase Dashboard → Authentication → Providers → Phone → SMS Provider: **Twilio**

You need a Twilio account (twilio.com):
1. Create a free account and get a phone number (trial gives one free number)
2. From the Twilio Console, copy:
   - **Account SID**
   - **Auth Token**
   - **Phone number** (e.g. `+15551234567`)
3. Paste all three into the Supabase phone provider form and save

**Step 3 — Test**
- In the app, enter a phone number on the login/sign-up screen and click "Send OTP"
- You should receive an SMS within a few seconds
- For local development, Supabase also supports a **test phone number** bypass: Dashboard → Authentication → Settings → scroll to "SMS OTP" → add a test number + fixed OTP code (no real SMS sent)

**Test phone bypass (recommended for dev):**
- Dashboard → Authentication → Providers → Phone → scroll to "Test phone numbers"
- Add e.g. `+639000000000` with OTP `123456`
- Use this number in the app during development without Twilio charges

**Pricing note:** Twilio free trial covers ~$15 USD of SMS. Production usage billed per-message (~$0.0079 USD/SMS outbound US; Philippines rates vary). Alternatively use MessageBird or Vonage — Supabase supports both.

## Stitch Screens (reference HTML available)
| Screen | Screen ID |
|---|---|
| Login / Sign Up | `da67e14d8f414e5896e85dcb0b1aa6a8` |
| Landing Page: Spoiled Brats HQ | `d54bbda5945647cdb2224ec0b06bbb36` |
| Landing Page: Cafe & Studio | `e894f50a10da4d2384eb27bd74a4a443` |
| Landing Page: Full Gallery | `9c2af4126578480a8263d15d8bb6842f` |
| Cafe Booking & Schedule | `d9271732dc7e457a88e0de588710f869` |
| Studio Booking: Spoiled Brats HQ | `283f57a2bd274eb9a4e5eb1a39661da9` |
| Studio Booking & Schedule | `a9196a45c0ee4208887b0f2fb4778462` |
| Admin Management Portal | `81e9acb6c68c4f8da16ad15c83c427a0` |
| Cafe-Studio Management | `7e92cd0ac816487d841b19d56cb4de26` |

## Design Tokens (Acoustic Brew)
- Primary: `#ba5624` (burnt orange)
- Secondary: `#fea451` (apricot)
- Tertiary: `#687959` (sage)
- Background: `#fff8f8` (cream)
- On-surface: `#2d1320` (espresso)
- Headlines: Playfair Display
- Body/UI: Hanken Grotesk

---

## Execution Plan

### Phase 1 — DB Migrations & Ionic Scaffold ✅ COMPLETE
- [x] Alter `users` table: add role, email, google_id, phone, auth_id
- [x] Create `cafe_schedule` table + RLS
- [x] Create `studio_schedule` table + RLS
- [x] Create `cafe_menu` table + RLS
- [x] Create `system_settings` table + RLS + seed data (cafe_hours, studio_hours, cafe_services, studio_services)
- [x] Create `menu-images` storage bucket (public, 5 MB limit, jpg/png/webp/gif)
- [x] Scaffold Ionic React + Vite + TypeScript project
- [x] Install all deps: @ionic/react, @supabase/supabase-js, @fullcalendar/react, ionicons, react-router-dom
- [x] Apply Acoustic Brew Ionic CSS variable theme (src/theme/variables.css)
- [x] Supabase client (src/lib/supabase.ts) + typed Database interface (src/types/database.ts)
- [x] AuthContext (src/context/AuthContext.tsx) — session, profile, isAdmin, signOut
- [x] App shell with IonTabs: /cafe, /studio, /account
- [x] TypeScript check: 0 errors

### Phase 2 — Auth + Navigation Shell ✅ COMPLETE
- [x] AuthContext: signInWithEmail, signInWithGoogle, signInWithPhone, verifyPhoneOtp, signUpWithEmail, signOut, refreshProfile
- [x] Auto profile creation (ensureProfile) on first OAuth/phone/email sign-in
- [x] LoginSignUp component: Login/Sign Up tabs, email + phone methods, Google OAuth button, OTP verify flow
- [x] ProfileView component: avatar initials, name, email/phone, admin badge, booking shortcuts, sign out
- [x] AccountPage: shows LoginSignUp or ProfileView based on session
- [x] AdminPage: shell with 5 tabs (Cafe Bookings, Studio Bookings, Users, Menu, Settings)
- [x] ProtectedRoute + AdminRoute guards
- [x] AppTabs: Cafe (left), Studio (left), spacer, Admin (admin-only), Account (right)
- [x] Database types fixed with explicit Insert/Update/Relationships fields
- [x] TypeScript check: 0 errors

### Phase 3 — Landing Page ✅ COMPLETE
- [x] CafePage: Overview/Book IonSegment tab switcher; tab syncs from ?tab=bookings query param
- [x] Cafe Overview: hero (bg image + logo + tagline + CTA), horizontal gallery (8 photos), Find Us info grid (address/phone/email/hours), Social links (Instagram/Facebook), Highlights promo cards, 3 Google-style reviews, bottom CTA section, footer
- [x] StudioPage: same Overview/Book pattern
- [x] Studio Overview: hero, gallery, services grid (loaded from system_settings.studio_services), studio amenities list, social links, 3 artist reviews, bottom CTA
- [x] Shared landing.css: hero, gallery strip, info grid, social buttons, promo cards, reviews strip, services grid, features list, CTA section
- [x] vite.config.ts: publicDir set to 'static' so /cafe1.jpg etc. resolve correctly
- [x] Static image paths fixed across LoginSignUp and both landing pages
- [x] TypeScript check: 0 errors

### Phase 4 — Cafe Booking Form & Schedule ✅ COMPLETE
- [x] CafeBooking component (src/pages/CafeBooking.tsx + CafeBooking.css)
- [x] Login guard: non-authenticated users see prompt → redirects to /account
- [x] Booking form: event name, date (min=today), booking details textarea, Rent Whole Place IonToggle → hides/shows num_seats field with IonIcon slot
- [x] Submit → INSERT into cafe_schedule (status: pending), reloads calendar + my bookings
- [x] FullCalendar (dayGridMonth): approved bookings for non-admin (title "Booked"), all pending+approved for admin (title = event_name), Acoustic Brew color-coded by status
- [x] Status color legend below calendar
- [x] My Bookings list: event name, date, seats/whole-place, details preview, color-coded status badges with icons
- [x] CafePage: placeholder replaced with <CafeBooking />
- [x] vite.config.ts: FullCalendar excluded from optimizeDeps (required for Vite)
- [x] TypeScript check: 0 errors

### Phase 5 — Studio Booking Form & Schedule ✅ COMPLETE
- [x] StudioBooking component (src/pages/StudioBooking.tsx + StudioBooking.css)
- [x] Login guard: redirects unauthenticated users to /account
- [x] Session Type IonSegment: Recording (mic icon) | Rehearsal (notes icon) — pill-shaped, orange active state
- [x] Booking form: Band/Artist Name, Booking Date (min=today), Start Time + End Time (side-by-side with divider icon), studio hours note
- [x] Client-side validation: all required fields + end time > start time
- [x] Submit → INSERT into studio_schedule (status: pending), form resets, calendar + list refresh
- [x] FullCalendar timeGridWeek: approved bookings for non-admin ("Booked"), all pending+approved for admin (band name), slotMinTime 08:00, slotMaxTime 23:30, 30-min slots
- [x] Toggle between Week and Month view
- [x] Status color legend
- [x] My Session Requests: band name, session type chip (orange=recording, sage=rehearsal), date + time range, status badge
- [x] StudioPage: placeholder replaced with <StudioBooking />
- [x] node_modules clean reinstall — esbuild extraction error resolved
- [x] TypeScript check: 0 errors

### Phase 6 — Admin Panel: Booking Management ✅ COMPLETE
- [x] AdminCafeBookings (src/admin/AdminCafeBookings.tsx): stats bar (Pending/Approved/Rejected/Cancelled counts, clickable to filter), status filter segment (All|Pending|Approved|Rejected|Cancelled), booking list sorted by status with left-color-border cards, dayGridMonth FullCalendar with event-click, detail IonModal (bottom sheet, breakpoints) with all fields + Accept/Decline/Cancel action buttons
- [x] AdminStudioBookings (src/admin/AdminStudioBookings.tsx): same pattern but studio-specific (band name, time range, type chip), timeGridWeek FullCalendar with Week/Month toggle, same detail modal pattern
- [x] Both components: embedded user join (users!user_id) to show requester's full name in list and modal
- [x] Action buttons are context-aware: only show relevant transitions (e.g. no Accept if already approved)
- [x] AdminBookings.css: stats cards, filter segment, booking list cards, modal, calendar overrides, legend
- [x] AdminPage.tsx: wired both components into their tabs; Users/Menu/Settings remain as Phase 7 placeholders
- [x] TypeScript check: 0 errors

### Phase 7 — Admin Panel: Users, Menu, Settings ✅ COMPLETE
- [x] AdminUserList (src/admin/AdminUserList.tsx): stat cards (total users / admins), search by name/username/email, user cards with avatar initials (orange=user, sage=admin), role badge, edit modal with first/last name + username + role IonSelect → UPDATE users
- [x] AdminMenuList (src/admin/AdminMenuList.tsx): item count header, Add Item button, 2-col grid with thumbnail/name/price/category/availability; modal for add/edit: tap-to-upload image (Supabase storage → menu-images bucket, public URL saved), name, description, price, category IonSelect, availability IonToggle, delete button → DELETE; INSERT or UPDATE cafe_menu
- [x] AdminScheduleSettings (src/admin/AdminScheduleSettings.tsx): Cafe/Studio venue segment, hours table (Mon–Sun rows with open/close IonInput type="time"), Save button with "Saved!" confirmation → UPSERT system_settings
- [x] AdminPhase7.css: user cards, menu grid + cards, image upload UI, hours table, venue segment
- [x] AdminPage.tsx: all three tabs wired in, no more placeholders
- [x] TypeScript check: 0 errors

### Phase 9 — Design Polish & Visual Fixes ✅ COMPLETE
- [x] Removed banned side-stripe `border-left` from `.info-card` → warm surface tint instead
- [x] Removed banned side-stripe `border-top` + gradient `::before` from `.service-card`
- [x] Broke identical service card grid: first service uses `.service-card--featured` (full-width horizontal layout)
- [x] Fixed section spacing collapse: removed `.section + .section { padding-top: 8px }`, bumped base to 48px
- [x] Fixed review avatar gradient → flat cream bg + burnt orange initial + subtle border
- [x] Bumped sub-minimum font sizes: `info-label` 10→11px, `service-desc` 11.5→12px, `review-role` 11→12px
- [x] Fixed footer contrast: `rgba(255,255,255,0.45)` → `0.70` (now ~9:1, passes WCAG AAA)
- [x] Reordered Cafe page sections: Social moved after CTA (Hero→Gallery→Find Us→Highlights→Reviews→CTA→Social→Footer)
- [x] Removed misleading `IonRippleEffect` from non-interactive info-cards and review cards
- [x] Studio gallery now uses `gallery-featured` for first image (consistent with Cafe gallery)
- [x] Copyright years updated to 2026 in CafePage.tsx and StudioPage.tsx

### Phase 10 — Combined Home Page ✅ COMPLETE
- [x] `src/pages/HomePage.tsx` + `src/pages/HomePage.css` — new combined landing page
- [x] Split-photo hero: cafe (left) + studio (right), both Ken Burns animated with offset timing
- [x] Cafe venue section: warm cream background, logo, tagline, service chips (from `system_settings.cafe_services`), address + phone (tappable), 2 reviews (from `cafe_reviews`), "Book an Event" CTA → `/cafe?tab=bookings`
- [x] Studio venue section: deep espresso background, same structure, apricot/sage palette, "Book a Session" CTA → `/studio?tab=bookings`
- [x] Fallback service lists for when `system_settings` is empty
- [x] App.tsx: `/home` route added as first tab (Home icon); default redirect `/ → /home`
- [x] TypeScript check: 0 errors

### Phase 8 — Polish & End-to-End Testing ✅ COMPLETE
- [x] src/hooks/useToast.tsx — reusable hook returning {toast, ToastEl}; used across all 8 components
- [x] src/components/Skeletons.tsx — BookingCardSkeleton, BookingListSkeleton, UserListSkeleton, MenuGridSkeleton, MyBookingsSkeleton
- [x] App.tsx — splash screen while auth loads (cafe logo + spinner on cream background)
- [x] LoginSignUp.tsx — all setError/setSuccess replaced with toast(); inline message divs removed
- [x] CafeBooking.tsx — toast for all feedback; MyBookingsSkeleton for loading; IonRefresher pull-to-refresh
- [x] StudioBooking.tsx — same pattern as CafeBooking
- [x] AdminCafeBookings.tsx — BookingListSkeleton + toast on status updates
- [x] AdminStudioBookings.tsx — same
- [x] AdminUserList.tsx — UserListSkeleton + toast on save
- [x] AdminMenuList.tsx — MenuGridSkeleton + toast on save/delete
- [x] AdminScheduleSettings.tsx — toast on save; removed saved state
- [x] variables.css — font-smoothing (-webkit-font-smoothing: antialiased), smooth scroll, IonToast/IonModal/IonSegment/IonRefresher/IonSkeletonText global polish
- [x] TypeScript check: 0 errors across all 17 .tsx files

---

## Technical Audit (2026-05-21)

**Score: 13/20 — Acceptable**

| Dimension | Score | Top Finding |
|---|---|---|
| Accessibility | 2/4 | No `focus-visible` on custom buttons; `venue-review-role` contrast 4.40:1 fails AA |
| Performance | 3/4 | Gallery images lack `loading="lazy"`; Ken Burns missing `will-change: transform` |
| Theming | 2/4 | `#1e1020` not tokenized; `#ffffff` hard-coded in 5 locations vs `var(--color-surface)` |
| Responsive | 3/4 | `.venue-more-link` touch target ~18px; `.method-btn` ~36px — both below 44px minimum |
| Anti-Patterns | 3/4 | `© 2024` in `LoginSignUp.tsx`; dead `.bk-msg` CSS; decorative star icons lack `aria-hidden` |

### Open Issues

**P1 — Fix before release**
- [ ] Add `:focus-visible` outline to `.method-btn`, `.auth-text-link`, `.venue-more-link` (`LoginSignUp.css`, `HomePage.css`)
- [ ] Fix `venue-review-role` contrast: `rgba(255,255,255,0.42)` → `0.52` on `#1e1020` (`HomePage.css:130`)
- [ ] `.venue-more-link`: add `min-height: 44px; padding: 10px 4px` (`HomePage.css`)
- [ ] `.method-btn`: increase to `min-height: 44px` or `padding: 12px 16px` (`LoginSignUp.css`)

**P2 — Fix in next pass**
- [ ] Add `loading="lazy"` to `.gallery-thumb` images in `CafePage.tsx` and `StudioPage.tsx`
- [ ] OTP input: change `type="number"` → `type="text" inputMode="numeric" maxLength={6}` (`LoginSignUp.tsx:183`)
- [ ] Add `aria-pressed={method === 'email'/'phone'}` to method toggle buttons (`LoginSignUp.tsx:137-141`)
- [ ] Tokenize `#1e1020` → add `--color-surface-inverse` to `variables.css`; reference in `HomePage.css:67`
- [ ] Replace `background: #ffffff` with `var(--color-surface)` in `CafeBooking.css:52,112,199` and `Skeletons.tsx:10,60`
- [ ] Verify studio time row (side-by-side inputs) at 320px viewport; add column fallback if needed

**P3 — Polish**
- [ ] Fix `© 2024` → `2026` in `LoginSignUp.tsx:255`
- [ ] Delete dead `.bk-msg` CSS block (`CafeBooking.css:82-91`) — replaced by toast in Phase 8
- [ ] Add `aria-hidden="true"` to decorative star `IonIcon` elements in all review components
- [ ] Add `aria-hidden="true"` to decorative arrow `IonIcon` in `.venue-more-link` buttons
- [ ] Add `will-change: transform` to `.hero-bg` (`landing.css`) and `.hq-hero-half` (`HomePage.css`)

### Systemic Gaps (apply to all future components)
- All custom `<button>` elements need `:focus-visible` styles — add to global base or a shared utility class
- Touch targets on text-link buttons need `min-height: 44px` as a baseline rule
- New card backgrounds should use `var(--color-surface)` not `#ffffff` or `#fff`
