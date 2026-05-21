// ── Shared venue contact information ─────────────────────────────────────────
// Single source of truth — both the Cafe and Studio are at the same location.
// Update these values here and every screen reflects the change automatically.

export const VENUE_ADDRESS = 'B2 L2 Sampaguita Ave., corner Leonora, Pasong Tamo, Quezon City'
export const VENUE_PHONE   = '+63 912 345 6789'
export const VENUE_EMAIL   = 'hello@spoiledbratshq.com'
export const VENUE_HOURS   = 'Tuesday – Sunday · 2:00 PM – 10:00 PM'

// Google Maps links — update the embed URL once you confirm the exact pin
export const VENUE_MAPS_LINK  =
  `https://www.google.com/maps/search/${encodeURIComponent(VENUE_ADDRESS + ', Philippines')}`

export const VENUE_MAPS_EMBED =
  `https://maps.google.com/maps?q=${encodeURIComponent(VENUE_ADDRESS + ', Philippines')}&output=embed&z=17`
