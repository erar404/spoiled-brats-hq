---
target: CafePage + StudioPage landing pages
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-05-20T18-13-35Z
slug: src-pages-cafepage-studiopage-landing
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Calendar fetches show no loading state; data freshness is invisible |
| 2 | Match Between System / Real World | 3 | Language is warm, but "Booking Details" textarea gives no guidance on what to write |
| 3 | User Control and Freedom | 2 | No way to cancel or edit a pending booking request from the user-facing view |
| 4 | Consistency and Standards | 2 | "Schedule Now" vs "Book an Event" for the same action; round vs block button shapes; side-stripe borders on some cards but not others |
| 5 | Error Prevention | 3 | Date min constraint and required-field toasts work; but no capacity info means users guess seat count |
| 6 | Recognition Rather Than Recall | 3 | Sections are clearly titled; studio service cards lack pricing hints |
| 7 | Flexibility and Efficiency | 2 | No quick-rebook for returning users; no calendar-click-to-prefill |
| 8 | Aesthetic and Minimalist Design | 2 | Banned side-stripe pattern on info-cards; identical card grid for services; 8px section spacing collapses the page |
| 9 | Error Recovery | 2 | Toast errors fire correctly, but raw Supabase error messages surface to users; no inline field-level errors |
| 10 | Help and Documentation | 1 | Zero pricing, zero capacity, zero FAQ, no estimated response time for pending bookings |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

### Anti-Patterns Verdict

**LLM assessment:** The brand identity is genuinely strong. The Acoustic Brew palette is warm and distinctive; it does not read as a category reflex. Playfair Display + Hanken Grotesk is a tasteful pairing. The Ken Burns hero animation and staggered entrance are thoughtful. However, three banned structural patterns appear:

1. Side-stripe border (BANNED) — `.info-card { border-left: 3px solid var(--color-primary) }` at `landing.css:246`.
2. Gradient single-letter avatar — `.review-avatar` uses a gradient background with a single letter at `landing.css:417-420`.
3. Identical card grid (BANNED) — `.services-grid` repeats `icon + service-name + service-desc` for every service.

**Deterministic scan:** CLI detector unavailable (bundled script missing).
**Visual overlays:** Browser automation unavailable. No overlay injection attempted.

### Overall Impression

The bones are solid — brand identity, typography, and animation timing are all above average. What undermines it is structural: a linear stack of same-width sections with collapsing spacing, banned stripe patterns, and a critical help gap (users cannot see prices, capacity, or expected wait time before booking).

### What's Working

1. Hero execution is genuine — Ken Burns background layer, three-layer gradient overlay, and staggered fade-up on content are well-crafted.
2. Booking flow is thoughtfully gated — Overview/Book tab separation, login guard, calendar availability, date constraint, and Rent Whole Place toggle are complete.
3. The Cafe reviews section has real craft — horizontal scroll strip, decorative quotation mark watermark, Google rating badge with inline SVG logo.

### Priority Issues

**[P1] Side-stripe borders on info-cards and service-cards**
- What: `landing.css:246` — `border-left: 3px solid` on `.info-card`. `landing.css:450-452` — gradient `::before` + top border on `.service-card`.
- Why it matters: Signature AI slop tell. Adds visual weight without meaning.
- Fix: Remove all edge stripes. Use `--color-surface-container-low` tint instead of white + stripe for info-cards. Remove top border from service-cards; amplify the icon instead.
- Suggested command: /impeccable bolder

**[P1] Section spacing collapse**
- What: `.section + .section { padding-top: 8px }` at `landing.css:174`.
- Why it matters: Sections feel cramped; rhythm is destroyed after the spacious hero.
- Fix: Remove the 8px override. Let each section carry its own 44px top padding.
- Suggested command: /impeccable layout

**[P1] No user control over submitted bookings**
- What: `CafeBooking.tsx:210-246` — My Booking Requests shows status but offers no cancel/edit action.
- Why it matters: Users who change plans are trapped with no in-app recourse.
- Fix: Add "Cancel Request" on pending bookings — status update to cancelled, no modal needed.
- Suggested command: /impeccable harden

**[P2] No pricing or capacity anchor in the booking flow**
- What: Neither booking form shows pricing or capacity limits.
- Why it matters: Users cannot make a decision; "How many seats?" with no capacity max allows nonsense submissions.
- Fix: Add a single context line above the form. Add max attribute to seats input.
- Suggested command: /impeccable clarify

**[P2] Section order undermines conversion on the Cafe page**
- What: `CafePage.tsx:179-209` — Social buttons appear before Highlights and Reviews.
- Why it matters: Social links invite users to leave before seeing the strongest persuasion content.
- Fix: Move social section just above the footer, after CTA.
- Suggested command: /impeccable layout

### Persona Red Flags

**Jordan (First-Timer):** No pricing, no capacity, no explanation of what "Booking Details" means, no timeframe for "We'll confirm shortly," no way to contact the venue through the app. Booking generates a lead but creates no confidence.

**Casey (Distracted Mobile User):** Hero blocks 72vh; form is above the calendar so she fills out dates before checking availability; Overview sections are too long to scan quickly on mobile.

**Riley (Stress Tester):** No max on seat count (5000 seats inserts successfully); no closed-day block on date picker; footer says "© 2024"; `toast(error.message)` exposes raw Supabase errors.

### Minor Observations

- Footer text contrast ~2.9:1 fails WCAG AA (requires 4.5:1)
- `review-role` at 11px, `service-desc` at 11.5px, `info-label` at 10px — all below readable minimum on mobile
- Copyright year "© 2024" is two years stale
- Studio gallery does not use `gallery-featured` pattern; inconsistent with Cafe gallery
- `IonRippleEffect` on non-interactive info-cards creates false interactive affordance
- All section title `::after` decorative lines are identical max-width; monotone treatment

### Questions to Consider

- "What if the availability calendar came first, and the form appeared after the user tapped a date?"
- "Does the cafe need a menu section on its landing page?"
- "What would 'pending' feel like if users knew it would resolve in 24 hours?"
