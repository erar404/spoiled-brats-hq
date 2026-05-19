# Spoiled Brats HQ — Project Guide

## Overview
Full-stack booking website for **Spoiled Brats Cafe** and **Kajon Music Studio**.
- **Frontend:** Ionic React (web app)
- **Backend:** Supabase (DB + Auth + Storage) — project: erar404's Project › spoiled-brats-db
- **Design:** Stitch "Spoiled Brats HQ" (Acoustic Brew theme) — project ID `6675066711015401282`
- **Auth:** Supabase Auth — email/password + Google OAuth + phone OTP

## Navigation Structure
- Left tab: Spoiled Brats Cafe
- Left tab: Kajon Music Studio
- Right tab: Login / Account Details

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

### Phase 6 — Admin Panel: Booking Management
**Start prompt:** `Phase 6 — Admin booking management (cafe + studio)`
- Admin route guard (role === 'admin')
- Cafe Booking Requests: list sorted by status, click → modal with Accept/Decline/Cancel
- Studio Booking Requests: same pattern
- FullCalendar views for both

### Phase 7 — Admin Panel: Users, Menu, Settings
**Start prompt:** `Phase 7 — Admin user list, menu list, and schedule settings`
- User list: edit name/role/status
- Menu list: CRUD + image upload to menu-images bucket
- Schedule Settings: edit store hours from system_settings

### Phase 8 — Polish & End-to-End Testing
**Start prompt:** `Phase 8 — Polish and end-to-end testing`
- Acoustic Brew CSS variable audit
- Responsive layout (Ionic adaptive)
- IonSkeletonText on all data loads
- IonToast for success/error states
- Full flow test: auth → booking → admin action
