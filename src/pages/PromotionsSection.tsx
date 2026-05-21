import { useEffect, useMemo, useRef, useState } from 'react'
import { IonButton, IonContent, IonIcon } from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  calendarOutline, chevronBackOutline, chevronForwardOutline,
  closeOutline, imagesOutline, pricetagOutline, sparklesOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import type { PromotionRow, PromotionType } from '../types/database'
import './PromotionsSection.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const SLIDE_DURATION = 5000   // ms per slide when promo has one photo
const PHOTO_DURATION = 2500   // ms per slide when promo has multiple photos

// ── Helpers ───────────────────────────────────────────────────────────────────

type Slide = { promo: PromotionRow; src: string }

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

function getPhotos(p: PromotionRow): string[] {
  if (p.photo_urls?.length) return p.photo_urls
  if (p.image_url) return [p.image_url]
  return ['']
}

const TYPE_META: Record<PromotionType, { label: string; icon: string; color: string }> = {
  event:     { label: 'Event',     icon: calendarOutline,  color: 'var(--color-primary)' },
  menu_item: { label: 'Menu Item', icon: pricetagOutline,  color: 'var(--color-secondary)' },
  others:    { label: 'Promo',     icon: sparklesOutline,  color: 'var(--color-tertiary)' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PromotionsSection() {
  const [promos,   setPromos]  = useState<PromotionRow[]>([])
  const [loading,  setLoading] = useState(true)
  const [slideIdx, setSlideIdx] = useState(0)
  const [prevSrc,  setPrevSrc] = useState('')
  const [paused,   setPaused]  = useState(false)
  const [selected, setSelected] = useState<PromotionRow | null>(null)
  const [modalPhoto, setModalPhoto] = useState(0)

  // Stable refs so the interval callback never captures stale state
  const slideIdxRef  = useRef(0)
  const slidesRef    = useRef<Slide[]>([])
  const pausedRef    = useRef(false)
  slideIdxRef.current = slideIdx
  pausedRef.current   = paused

  // ── Flat slide list ─────────────────────────────────────────────────────────
  // One entry per photo per promo. Enables seamless per-photo cycling.

  const slides = useMemo<Slide[]>(() =>
    promos.flatMap(p =>
      getPhotos(p).map(src => ({ promo: p, src }))
    )
  , [promos])
  slidesRef.current = slides

  const count = slides.length
  const cur   = slides[slideIdx] ?? slides[0]

  // ── Data fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        const active = (data ?? []).filter(isActiveNow) as PromotionRow[]
        setPromos(active)
        setLoading(false)
      })
  }, [])

  // ── Timer ─────────────────────────────────────────────────────────────────────
  // Uses a ref-based callback so it never needs to be re-created on every render.
  // The interval duration is computed fresh on every tick from the refs.

  const tickRef = useRef<() => void>(() => {})

  tickRef.current = () => {
    if (pausedRef.current) return
    const all  = slidesRef.current
    if (all.length <= 1) return
    const idx  = slideIdxRef.current
    const next = (idx + 1) % all.length
    setPrevSrc(all[idx].src)
    setSlideIdx(next)
  }

  useEffect(() => {
    if (count <= 1) return
    // Duration for current slide: shorter when cycling within a multi-photo promo
    const multiPhoto = (cur?.promo.photo_urls?.length ?? 1) > 1
    const dur = multiPhoto ? PHOTO_DURATION : SLIDE_DURATION

    const timer = setInterval(() => tickRef.current(), dur)
    return () => clearInterval(timer)
    // Re-create the interval whenever the current slide changes (new promo may
    // have a different duration) or when the slide count changes on data load.
  }, [slideIdx, count, cur?.promo.id])

  // ── Navigation ───────────────────────────────────────────────────────────────

  function goTo(idx: number) {
    if (!count) return
    const target = ((idx % count) + count) % count
    setPrevSrc(slides[slideIdx]?.src ?? '')
    setSlideIdx(target)
  }

  function goPrev(e?: React.MouseEvent) {
    e?.stopPropagation()
    goTo(slideIdx - 1)
  }

  function goNext(e?: React.MouseEvent) {
    e?.stopPropagation()
    goTo(slideIdx + 1)
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  function openModal() { setSelected(cur?.promo ?? null); setModalPhoto(0) }
  function closeModal() { setSelected(null) }

  // ── Derived values ────────────────────────────────────────────────────────────

  if (loading || promos.length === 0) return null

  // Is this a within-promo photo change (same promo, just next photo)?
  const prevSlide   = slides.find(s => s.src === prevSrc)
  const isPhotoOnly = !!prevSlide && prevSlide.promo.id === cur?.promo.id

  // Caption key: changes only when the promo changes — caption animations restart
  const captionKey  = cur?.promo.id ?? ''

  // Duration for the progress bar (matches the interval duration above)
  const multiPhoto  = (cur?.promo.photo_urls?.length ?? 1) > 1
  const progressMs  = multiPhoto ? PHOTO_DURATION : SLIDE_DURATION

  const meta        = TYPE_META[cur.promo.promotion_type]

  // Unique promos list for dot navigation
  const uniquePromos = promos
  const activePromoIdx = uniquePromos.findIndex(p => p.id === cur?.promo.id)

  return (
    <section className="section promo-slideshow-section cafe-animate">
      <h2 className="section-title">Promotions</h2>

      {/* ── Slide frame ── */}
      <div
        className="promo-slide"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label={`View details: ${cur.promo.title}`}
        onKeyDown={e => e.key === 'Enter' && openModal()}
      >
        {/* Outgoing image */}
        {prevSrc && prevSrc !== cur.src && (
          <div
            key={`out-${prevSrc}`}
            className="promo-slide-bg promo-slide-bg--out"
            style={{ backgroundImage: `url('${prevSrc}')` }}
          />
        )}

        {/* Incoming image */}
        <div
          key={`in-${cur.src}`}
          className={`promo-slide-bg ${isPhotoOnly ? 'promo-slide-bg--in-photo' : 'promo-slide-bg--in'}`}
          style={{ backgroundImage: `url('${cur.src}')` }}
        />

        {/* Veil */}
        <div className="promo-slide-veil" />

        {/* Caption — re-mounts only when the promo changes */}
        <div className="promo-slide-caption" key={captionKey}>
          <span className="promo-caption-type" style={{ color: meta.color }}>
            <IonIcon icon={meta.icon} aria-hidden="true" />
            {meta.label}
          </span>
          <h3 className="promo-caption-title">{cur.promo.title}</h3>
          {cur.promo.description && (
            <p className="promo-caption-desc">{cur.promo.description}</p>
          )}
          <div className="promo-caption-meta">
            {cur.promo.promotion_type === 'event' && cur.promo.event_date && (
              <span className="promo-caption-date">
                <IonIcon icon={calendarOutline} aria-hidden="true" />
                {fmtDate(cur.promo.event_date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {cur.promo.is_permanent && (
              <span className="promo-caption-badge promo-caption-badge--ongoing">Ongoing</span>
            )}
            {!cur.promo.is_permanent && cur.promo.end_date && (
              <span className="promo-caption-badge promo-caption-badge--limited">
                Until {fmtDate(cur.promo.end_date, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <span className="promo-caption-tap-hint">Tap to see full details</span>
        </div>

        {/* Within-promo photo position dots */}
        {(cur.promo.photo_urls?.length ?? 0) > 1 && (() => {
          const photos    = getPhotos(cur.promo)
          const photoPos  = photos.indexOf(cur.src)
          return (
            <div className="promo-inner-dots" aria-hidden="true">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`promo-inner-dot${i === photoPos ? ' promo-inner-dot--active' : ''}`}
                />
              ))}
            </div>
          )
        })()}

        {/* Progress bar */}
        {!paused && (
          <div
            className="promo-slide-progress"
            key={`p-${slideIdx}`}
            style={{ animationDuration: `${progressMs}ms` }}
          />
        )}
      </div>

      {/* ── Controls row: prev / dots / next ── */}
      <div className="promo-controls">
        <button
          className="promo-ctrl-btn"
          onClick={goPrev}
          aria-label="Previous promotion"
          disabled={count <= 1}
        >
          <IonIcon icon={chevronBackOutline} />
        </button>

        {/* Promo-level dot indicators */}
        <div className="promo-slide-dots" role="tablist" aria-label="Promotion slides">
          {uniquePromos.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === activePromoIdx}
              aria-label={`${p.title}`}
              className={`promo-dot${i === activePromoIdx ? ' promo-dot--active' : ''}`}
              onClick={() => {
                const firstSlide = slides.findIndex(s => s.promo.id === p.id)
                if (firstSlide !== -1) goTo(firstSlide)
              }}
            />
          ))}
        </div>

        <button
          className="promo-ctrl-btn"
          onClick={goNext}
          aria-label="Next promotion"
          disabled={count <= 1}
        >
          <IonIcon icon={chevronForwardOutline} />
        </button>
      </div>

      {/* ── Detail modal ── */}
      <AppModal
        isOpen={!!selected}
        onDidDismiss={closeModal}
        breakpoints={[0, 0.6, 0.95]}
        initialBreakpoint={0.92}
      >
        <IonContent>
          {selected && (() => {
            const photos  = getPhotos(selected)
            const selMeta = TYPE_META[selected.promotion_type]
            return (
              <div className="promo-modal">
                {/* Photo gallery */}
                <div className="promo-modal-gallery">
                  <div
                    key={`modal-${modalPhoto}`}
                    className="promo-modal-photo"
                    style={{ backgroundImage: `url('${photos[modalPhoto] ?? ''}')` }}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        className="promo-modal-photo-arrow promo-modal-photo-arrow--prev"
                        onClick={() => setModalPhoto(i => (i - 1 + photos.length) % photos.length)}
                        aria-label="Previous photo"
                      >
                        <IonIcon icon={chevronBackOutline} />
                      </button>
                      <button
                        className="promo-modal-photo-arrow promo-modal-photo-arrow--next"
                        onClick={() => setModalPhoto(i => (i + 1) % photos.length)}
                        aria-label="Next photo"
                      >
                        <IonIcon icon={chevronForwardOutline} />
                      </button>
                      <div className="promo-modal-photo-dots">
                        {photos.map((_, i) => (
                          <button
                            key={i}
                            className={`promo-modal-photo-dot${i === modalPhoto ? ' promo-modal-photo-dot--active' : ''}`}
                            onClick={() => setModalPhoto(i)}
                            aria-label={`Photo ${i + 1}`}
                          />
                        ))}
                      </div>
                      <span className="promo-modal-photo-counter">
                        {modalPhoto + 1} / {photos.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="promo-modal-body">
                  <div className="promo-modal-header-row">
                    <span className="promo-modal-type" style={{ color: selMeta.color }}>
                      <IonIcon icon={selMeta.icon} aria-hidden="true" />
                      {selMeta.label}
                    </span>
                    <IonButton fill="clear" size="small" onClick={closeModal} aria-label="Close">
                      <IonIcon slot="icon-only" icon={closeOutline} />
                    </IonButton>
                  </div>

                  <h2 className="promo-modal-title">{selected.title}</h2>

                  {selected.description && (
                    <p className="promo-modal-desc">{selected.description}</p>
                  )}

                  <div className="promo-modal-meta">
                    {selected.promotion_type === 'event' && selected.event_date && (
                      <div className="promo-modal-meta-row">
                        <IonIcon icon={calendarOutline} className="promo-modal-meta-icon" aria-hidden="true" />
                        <div>
                          <p className="promo-modal-meta-label">Event Date</p>
                          <p className="promo-modal-meta-value">{fmtDate(selected.event_date)}</p>
                        </div>
                      </div>
                    )}
                    {!selected.is_permanent && (selected.start_date || selected.end_date) && (
                      <div className="promo-modal-meta-row">
                        <IonIcon icon={calendarOutline} className="promo-modal-meta-icon" aria-hidden="true" />
                        <div>
                          <p className="promo-modal-meta-label">Available</p>
                          <p className="promo-modal-meta-value">
                            {selected.start_date
                              ? fmtDate(selected.start_date, { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'Now'}
                            {selected.end_date
                              ? ` to ${fmtDate(selected.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}`
                              : ' (ongoing)'}
                          </p>
                        </div>
                      </div>
                    )}
                    {selected.is_permanent && (
                      <span className="promo-modal-badge promo-modal-badge--ongoing">
                        Ongoing promotion
                      </span>
                    )}
                  </div>

                  <IonButton
                    expand="block"
                    color="primary"
                    shape="round"
                    style={{ marginTop: 20 }}
                    routerLink="/cafe?tab=bookings"
                    onClick={closeModal}
                  >
                    Book an Event
                  </IonButton>
                </div>
              </div>
            )
          })()}
        </IonContent>
      </AppModal>
    </section>
  )
}
