// ── Shared venue contact information ─────────────────────────────────────────
// Single source of truth — both the Cafe and Studio are at the same location.
// Update these values here and every screen reflects the change automatically.

export const VENUE_ADDRESS = 'B2 L2 Sampaguita Ave., corner Leonora, Pasong Tamo, Quezon City'
export const VENUE_PHONE   = '+63 912 345 6789'
export const VENUE_EMAIL   = 'hello@spoiledbratshq.com'
export const VENUE_HOURS   = 'Tuesday – Sunday · 2:00 PM – 10:00 PM'

// Exact location via Plus Code M3P8+H6 Quezon City
// The '+' in the Plus Code must be %2B in a URL query string
// (bare '+' means space in URL encoding, so '%2B' preserves the literal plus)
const PLUS_CODE_ENCODED = 'M3P8%2BH6+Quezon+City%2C+Metro+Manila%2C+Philippines'

// Opens Google Maps at the pinned location
export const VENUE_MAPS_LINK =
  `https://www.google.com/maps/place/${PLUS_CODE_ENCODED}`

// Iframe embed — centered and pinned at the Plus Code location, z=18 (street level)
export const VENUE_MAPS_EMBED =
  `https://maps.google.com/maps?q=${PLUS_CODE_ENCODED}&output=embed&z=18&hl=en`
