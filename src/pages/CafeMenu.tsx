import { useEffect, useState } from 'react'
import { IonIcon, IonSpinner } from '@ionic/react'
import { cafeOutline } from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import type { CafeMenuRow } from '../types/database'
import './CafeMenu.css'

const ALL = 'All'

function today() {
  return new Date().toISOString().split('T')[0]
}

function isVisible(item: CafeMenuRow): boolean {
  if (!item.is_available) return false
  if (!item.is_limited) return true
  const t = today()
  if (item.start_date && item.start_date > t) return false
  if (item.end_date   && item.end_date   < t) return false
  return true
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric',
  })
}

export default function CafeMenu() {
  const [items,          setItems]          = useState<CafeMenuRow[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeCategory, setActiveCategory] = useState(ALL)

  useEffect(() => {
    supabase.from('cafe_menu')
      .select('*')
      .eq('is_available', true)
      .order('category', { nullsFirst: false })
      .order('name')
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  const visible    = items.filter(isVisible)
  const categories = [
    ALL,
    ...Array.from(new Set(visible.map(i => i.category).filter(Boolean) as string[])),
  ]
  const filtered = activeCategory === ALL
    ? visible
    : visible.filter(i => i.category === activeCategory)

  return (
    <div className="cafe-menu-page">

      {/* Category filter chips */}
      {!loading && categories.length > 1 && (
        <div className="cafe-menu-filter" role="tablist">
          {categories.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`menu-cat-chip ${activeCategory === cat ? 'menu-cat-chip--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="cafe-menu-loading">
          <IonSpinner name="crescent" color="primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="cafe-menu-empty">
          <IonIcon icon={cafeOutline} aria-hidden="true" />
          <p>No items available right now.</p>
        </div>
      ) : (
        <div className="cafe-menu-grid">
          {filtered.map(item => (
            <article key={item.id} className="cafe-menu-card">

              {/* Image */}
              <div className="cafe-menu-card-img">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} loading="lazy" />
                  : (
                    <div className="cafe-menu-card-img-placeholder">
                      <IonIcon icon={cafeOutline} aria-hidden="true" />
                    </div>
                  )
                }
                {item.is_limited && (
                  <span className="cafe-menu-limited-badge" aria-label="Limited time item">
                    LIMITED
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="cafe-menu-card-body">
                {item.category && (
                  <span className="cafe-menu-card-cat">{item.category}</span>
                )}
                <p className="cafe-menu-card-name">{item.name}</p>
                {item.description && (
                  <p className="cafe-menu-card-desc">{item.description}</p>
                )}
                <div className="cafe-menu-card-footer">
                  <span className="cafe-menu-card-price">₱{item.price.toFixed(2)}</span>
                  {item.is_limited && item.end_date && (
                    <span className="cafe-menu-card-until">
                      Until {fmtDate(item.end_date)}
                    </span>
                  )}
                </div>
              </div>

            </article>
          ))}
        </div>
      )}
    </div>
  )
}
