import { useEffect, useRef, useState } from 'react'
import { IonButton, IonContent, IonIcon } from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  calendarOutline, chevronBackOutline, chevronForwardOutline,
  closeOutline, pricetagOutline, sparklesOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import type { PromotionRow, PromotionType } from '../types/database'
import './PromotionsSection.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const PHOTO_DURATION = 2800   // ms each photo shows in the inner slideshow

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

function getPhotos(p: PromotionRow): string[] {
  if (p.photo_urls?.length) return p.photo_urls
  if (p.image_url) return [p.image_url]
  return ['']
}

const TYPE_META: Record<PromotionType, { label: string; icon: string; color: string }> = {
  event:     { label: 'Event',     icon: calendarOutline, color: 'var(--color-primary)' },
  menu_item: { label: 'Menu Item', icon: pricetagOutline, color: 'var(--color-secondary)' },
  others:    { label: 'Promo',     icon: sparklesOutline, color: 'var(--color-tertiary)' },
}

// ── Component ─────────────────────────────────────────────────────────────────
//
// Two-tier architecture:
//   Outer  — promoIdx:  navigated manually via prev/next buttons
//   Inner  — photoIdx:  auto-advances through photos of the current promo
//
// The caption is keyed by curPromo.id so it re-animates only on promo changes,
// staying stable while photos cycle within the same promo.

export default function PromotionsSection() {
  const [promos,      setPromos]      = useState<PromotionRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [promoIdx,    setPromoIdx]    = useState(0)
  const [photoIdx,    setPhotoIdx]    = useState(0)
  const [prevSrc,     setPrevSrc]     = useState('')
  const [isPhotoTx,   setIsPhotoTx]   = useState(false)
  const [captionKey,  setCaptionKey]  = useState(0)
  const [progressKey, setProgressKey] = useState(0)
  const [paused,      setPaused]      = useState(false)
  const [selected,    setSelected]    = useState<PromotionRow | null>(null)
  const [modalPhoto,  setModalPhoto]  = useState(0)

  // Refs let the interval callback read the latest state without stale closures
  const promoIdxRef = useRef(0)
  const photoIdxRef = useRef(0)
  const promosRef   = useRef<PromotionRow[]>([])
  const pausedRef   = useRef(false)
  promoIdxRef.current = promoIdx
  photoIdxRef.current = photoIdx
  promosRef.current   = promos
  pausedRef.current   = paused

  // ── Data ──────────────────────────────────────────────────────────────────────

  const len = promos.length

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

  // ── Inner auto-advance (photos within current promo) ─────────────────────────
  //
  // The effect restarts whenever promoIdx or len changes:
  //   • promoIdx change → new promo has its own photos, reset the cycle
  //   • len change (data loaded) → start the first cycle
  //
  // pausedRef is checked inside the tick so the interval doesn't need to restart
  // just because the user hovered (no stale closure on pause state).

  useEffect(() => {
    if (len === 0) return
    const photos = getPhotos(promosRef.current[promoIdxRef.current] ?? promosRef.current[0])
    if (photos.length <= 1) return  // single photo promo: nothing to cycle

    const timer = setInterval(() => {
      if (pausedRef.current) return  // skip tick while hovered; keep interval alive

      const currentPhotos = getPhotos(promosRef.current[promoIdxRef.current])
      const oldIdx = photoIdxRef.current
      const oldSrc = currentPhotos[oldIdx] ?? ''
      const nextIdx = (oldIdx + 1) % currentPhotos.length

      setPrevSrc(oldSrc)
      setPhotoIdx(nextIdx)
      setIsPhotoTx(true)
      setProgressKey(k => k + 1)
    }, PHOTO_DURATION)

    return () => clearInterval(timer)
  }, [promoIdx, len])  // NOT photoIdx — interval must not restart on every tick

  // ── Outer navigation (per-promo) ─────────────────────────────────────────────

  function goToPromo(nextPi: number) {
    if (len === 0) return
    const target = ((nextPi % len) + len) % len
    const currentPhotos = getPhotos(promosRef.current[promoIdxRef.current])
    const oldSrc = currentPhotos[photoIdxRef.current] ?? ''

    setPrevSrc(oldSrc)
    setIsPhotoTx(false)   // promo change → scale+fade transition
    setPromoIdx(target)
    setPhotoIdx(0)        // inner resets to photo 0 of new promo
    setCaptionKey(k => k + 1)
    setProgressKey(k => k + 1)
  }

  function goPrev(e?: React.MouseEvent) { e?.stopPropagation(); goToPromo(promoIdxRef.current - 1) }
  function goNext(e?: React.MouseEvent) { e?.stopPropagation(); goToPromo(promoIdxRef.current + 1) }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  function openModal()  { setSelected(curPromo); setModalPhoto(0) }
  function closeModal() { setSelected(null) }

  // ── Render guard ──────────────────────────────────────────────────────────────

  if (loading || len === 0) return null

  const curPromo  = promos[promoIdx]
  const curPhotos = getPhotos(curPromo)
  const activeSrc = curPhotos[photoIdx] ?? ''
  const meta      = TYPE_META[curPromo.promotion_type]

  return (
    <section className="section promo-slideshow-section cafe-animate">
      <h2 className="section-title">Promotions</h2>

      {/* ── Outer: slide frame ────────────────────────────────────────────────── */}
      <div
        className="promo-slide"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label={`View details: ${curPromo.title}`}
        onKeyDown={e => e.key === 'Enter' && openModal()}
      >
        {/* Outgoing background */}
        {prevSrc && prevSrc !== activeSrc && (
          <div
            key={`out-${prevSrc}`}
            className="promo-slide-bg promo-slide-bg--out"
            style={{ backgroundImage: `url('${prevSrc}')` }}
          />
        )}

        {/* Incoming background
            promo change  → scale+fade (promo-slide-bg--in)
            photo change  → pure crossfade (promo-slide-bg--in-photo) */}
        <div
          key={`in-${activeSrc}`}
          className={`promo-slide-bg ${isPhotoTx ? 'promo-slide-bg--in-photo' : 'promo-slide-bg--in'}`}
          style={{ backgroundImage: `url('${activeSrc}')` }}
        />

        {/* Gradient veil */}
        <div className="promo-slide-veil" />

        {/* Caption — keyed by promo id: re-animates on promo change only */}
        <div className="promo-slide-caption" key={`caption-${captionKey}`}>
          <span className="promo-caption-type" style={{ color: meta.color }}>
            <IonIcon icon={meta.icon} aria-hidden="true" />
            {meta.label}
          </span>
          <h3 className="promo-caption-title">{curPromo.title}</h3>
          {curPromo.description && (
            <p className="promo-caption-desc">{curPromo.description}</p>
          )}
          <div className="promo-caption-meta">
            {curPromo.promotion_type === 'event' && curPromo.event_date && (
              <span className="promo-caption-date">
                <IonIcon icon={calendarOutline} aria-hidden="true" />
                {fmtDate(curPromo.event_date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {curPromo.is_permanent && (
              <span className="promo-caption-badge promo-caption-badge--ongoing">Ongoing</span>
            )}
            {!curPromo.is_permanent && curPromo.end_date && (
              <span className="promo-caption-badge promo-caption-badge--limited">
                Until {fmtDate(curPromo.end_date, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <span className="promo-caption-tap-hint">Tap to see full details</span>
        </div>

        {/* Inner: photo position dots — visible when promo has multiple photos */}
        {curPhotos.length > 1 && (
          <div className="promo-inner-dots" aria-hidden="true">
            {curPhotos.map((_, i) => (
              <span
                key={i}
                className={`promo-inner-dot${i === photoIdx ? ' promo-inner-dot--active' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Inner: progress bar for current photo (only when cycling) */}
        {curPhotos.length > 1 && !paused && (
          <div
            className="promo-slide-progress"
            key={`progress-${progressKey}`}
            style={{ animationDuration: `${PHOTO_DURATION}ms` }}
          />
        )}
      </div>

      {/* ── Outer: prev / dots / next ─────────────────────────────────────────── */}
      <div className="promo-controls">
        <button
          className="promo-ctrl-btn"
          onClick={goPrev}
          aria-label="Previous promotion"
          disabled={len <= 1}
        >
          <IonIcon icon={chevronBackOutline} />
        </button>

        <div className="promo-slide-dots" role="tablist" aria-label="Promotion slides">
          {promos.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === promoIdx}
              aria-label={p.title}
              className={`promo-dot${i === promoIdx ? ' promo-dot--active' : ''}`}
              onClick={e => { e.stopPropagation(); goToPromo(i) }}
            />
          ))}
        </div>

        <button
          className="promo-ctrl-btn"
          onClick={goNext}
          aria-label="Next promotion"
          disabled={len <= 1}
        >
          <IonIcon icon={chevronForwardOutline} />
        </button>
      </div>

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
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
                    key={`modal-photo-${modalPhoto}`}
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
