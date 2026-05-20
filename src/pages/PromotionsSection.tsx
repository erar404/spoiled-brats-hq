import { useEffect, useState } from 'react'
import { IonIcon } from '@ionic/react'
import { calendarOutline, pricetagOutline, sparklesOutline } from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import type { PromotionRow, PromotionType } from '../types/database'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActiveNow(p: PromotionRow): boolean {
  if (!p.is_active) return false
  if (p.is_permanent) return true
  const today = new Date().toISOString().split('T')[0]
  if (p.start_date && p.start_date > today) return false
  if (p.end_date   && p.end_date   < today) return false
  return true
}

function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', opts ?? {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const TYPE_META: Record<PromotionType, { label: string; icon: string; color: string }> = {
  event:     { label: 'Event',     icon: calendarOutline,  color: 'var(--color-primary)' },
  menu_item: { label: 'Menu Item', icon: pricetagOutline,  color: 'var(--color-secondary)' },
  others:    { label: 'Promo',     icon: sparklesOutline,  color: 'var(--color-tertiary)' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PromotionsSection() {
  const [promos,  setPromos]  = useState<PromotionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        setPromos((data ?? []).filter(isActiveNow) as PromotionRow[])
        setLoading(false)
      })
  }, [])

  if (loading || promos.length === 0) return null

  return (
    <section className="section cafe-animate">
      <h2 className="section-title">Promotions</h2>
      <div className="promo-list">
        {promos.map(p => {
          const meta = TYPE_META[p.promotion_type]
          return (
            <article key={p.id} className="promo-list-card">

              {/* Image */}
              {p.image_url ? (
                <div
                  className="promo-list-img"
                  style={{ backgroundImage: `url('${p.image_url}')` }}
                  role="img"
                  aria-label={p.title}
                />
              ) : (
                <div className="promo-list-img promo-list-img--empty">
                  <IonIcon icon={meta.icon} aria-hidden="true" />
                </div>
              )}

              {/* Content */}
              <div className="promo-list-body">
                <div className="promo-list-type" style={{ color: meta.color }}>
                  <IonIcon icon={meta.icon} aria-hidden="true" />
                  <span>{meta.label}</span>
                </div>

                <h3 className="promo-list-title">{p.title}</h3>

                {p.description && (
                  <p className="promo-list-desc">{p.description}</p>
                )}

                <div className="promo-list-meta">
                  {p.promotion_type === 'event' && p.event_date && (
                    <span className="promo-list-date promo-list-date--event">
                      <IonIcon icon={calendarOutline} aria-hidden="true" />
                      {fmtDate(p.event_date)}
                    </span>
                  )}
                  {p.is_permanent && (
                    <span className="promo-list-badge promo-list-badge--ongoing">Ongoing</span>
                  )}
                  {!p.is_permanent && p.end_date && (
                    <span className="promo-list-badge promo-list-badge--limited">
                      Until {fmtDate(p.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {!p.is_permanent && p.start_date && !p.end_date && (
                    <span className="promo-list-badge promo-list-badge--ongoing">
                      From {fmtDate(p.start_date, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

            </article>
          )
        })}
      </div>
    </section>
  )
}
