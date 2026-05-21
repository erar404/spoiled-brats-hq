import { useEffect, useState } from 'react'
import {
  IonButtons, IonContent, IonHeader, IonIcon, IonPage,
  IonSegment, IonSegmentButton, IonLabel, IonButton, IonToolbar, IonTitle,
  createAnimation, useIonViewDidEnter, useIonViewWillEnter,
} from '@ionic/react'
import {
  locationOutline, callOutline, mailOutline, timeOutline,
  logoInstagram, logoFacebook, star, cafeOutline,
} from 'ionicons/icons'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VENUE_ADDRESS, VENUE_PHONE, VENUE_EMAIL, VENUE_HOURS, VENUE_MAPS_LINK, VENUE_MAPS_EMBED } from '../lib/venueInfo'
import type { CafeGalleryRow, CafeReviewRow, CafePromoRow } from '../types/database'
import CafeBooking from './CafeBooking'
import CafeMenu from './CafeMenu'
import PromotionsSection from './PromotionsSection'
import DarkModeToggle from '../components/DarkModeToggle'
import './landing.css'

type Tab = 'overview' | 'menu' | 'book'

export default function CafePage() {
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') === 'bookings') setTab('book')
  }, [location.search])

  useIonViewWillEnter(() => {
    document.querySelectorAll('.cafe-animate').forEach(el => {
      ;(el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(22px)'
    })
  })

  useIonViewDidEnter(() => {
    const targets = Array.from(document.querySelectorAll('.cafe-animate'))
    targets.forEach((el, i) => {
      createAnimation()
        .addElement(el as HTMLElement)
        .duration(540)
        .delay(i * 70)
        .easing('cubic-bezier(0.22, 1, 0.36, 1)')
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(22px)', 'translateY(0px)')
        .play()
    })
  })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Spoiled Brats Cafe</IonTitle>
          <IonButtons slot="end"><DarkModeToggle /></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)} className="page-segment">
            <IonSegmentButton value="overview"><IonLabel>Overview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="menu"><IonLabel>Menu</IonLabel></IonSegmentButton>
            <IonSegmentButton value="book"><IonLabel>Book an Event</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tab === 'overview' && (
          <div className="tab-content">
            <CafeOverview onSchedule={() => setTab('book')} />
          </div>
        )}
        {tab === 'menu' && (
          <div className="tab-content">
            <CafeMenu />
          </div>
        )}
        {tab === 'book' && (
          <div className="tab-content">
            <CafeBooking />
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

function CafeOverview({ onSchedule }: { onSchedule: () => void }) {
  const [gallery, setGallery] = useState<CafeGalleryRow[]>([])
  const [reviews, setReviews] = useState<CafeReviewRow[]>([])
  const [promos, setPromos] = useState<CafePromoRow[]>([])
  const [heroUrl, setHeroUrl] = useState('/cafe2.jpg')

  useEffect(() => {
    supabase.from('cafe_gallery').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setGallery(data) })

    supabase.from('cafe_reviews').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setReviews(data) })

    supabase.from('cafe_promos').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setPromos(data) })

    supabase.from('system_settings').select('value').eq('key', 'cafe_hero_image').single()
      .then(({ data }) => {
        const val = data?.value as { url?: string } | null
        if (val?.url) setHeroUrl(val.url)
      })
  }, [])

  const featured = gallery[0]
  const thumbs = gallery.slice(1, 7)

  return (
    <div className="landing-page">

      {/* Hero */}
      <section className="hero-section">
        {/* Photo background — lowest layer, Ken Burns, acts as poster while video buffers */}
        <div className="hero-bg" style={{ backgroundImage: `url('${heroUrl}')` }} />
        {/* Video — rendered AFTER hero-bg so it paints on top at the same z-index */}
        <video
          className="hero-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={heroUrl}
          aria-hidden="true"
        >
          <source src="/cafe-hero.webm" type="video/webm" />
          <source src="/cafe-hero.mp4"  type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-grain" />
        <div className="hero-content cafe-animate">
          <img src="/cafe-logo-transparent.png" alt="Spoiled Brats Cafe" className="hero-logo" />
          <h1 className="hero-tagline">Where Coffee Meets Creativity</h1>
          <p className="hero-desc">
            A boutique urban retreat crafted for artisans, dreamers, and creatives —
            nestled in the heart of Quezon City.
          </p>
          <IonButton color="primary" shape="round" className="hero-cta" onClick={onSchedule}>
            Schedule Now
          </IonButton>
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="section cafe-animate">
          <h2 className="section-title">Our Space</h2>
          <div className="gallery-grid">
            {featured && (
              <img
                src={featured.image_url}
                alt={featured.alt_text ?? 'Cafe interior'}
                className="gallery-featured"
                loading="eager"
              />
            )}
            {thumbs.map(item => (
              <img
                key={item.id}
                src={item.image_url}
                alt={item.alt_text ?? 'Cafe interior'}
                className="gallery-thumb"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}

      {/* Find Us */}
      <section className="section cafe-animate">
        <h2 className="section-title">Find Us</h2>
        <div className="info-grid">
          <a
            href={VENUE_MAPS_LINK}
            target="_blank" rel="noreferrer"
            className="info-card"
            style={{ textDecoration: 'none' }}
          >
            <IonIcon icon={locationOutline} className="info-icon" />
            <div>
              <p className="info-label">Address</p>
              <p className="info-value">{VENUE_ADDRESS}</p>
            </div>
          </a>
          <a href={`tel:${VENUE_PHONE.replace(/\s/g, '')}`} className="info-card" style={{ textDecoration: 'none' }}>
            <IonIcon icon={callOutline} className="info-icon" />
            <div>
              <p className="info-label">Phone</p>
              <p className="info-value">{VENUE_PHONE}</p>
            </div>
          </a>
          <a href={`mailto:${VENUE_EMAIL}`} className="info-card" style={{ textDecoration: 'none' }}>
            <IonIcon icon={mailOutline} className="info-icon" />
            <div>
              <p className="info-label">Email</p>
              <p className="info-value">{VENUE_EMAIL}</p>
            </div>
          </a>
          <div className="info-card">
            <IonIcon icon={timeOutline} className="info-icon" />
            <div>
              <p className="info-label">Hours</p>
              <p className="info-value">{VENUE_HOURS}</p>
            </div>
          </div>
        </div>

        {/* Google Maps embed */}
        <div className="venue-map-wrap">
          <iframe
            title="Spoiled Brats HQ — Cafe Location"
            src={VENUE_MAPS_EMBED}
            width="100%"
            height="260"
            style={{ border: 0, borderRadius: 'var(--radius-xl)', display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* Promotions — fetches from promotions table */}
      <PromotionsSection />

      {/* Highlights */}
      {promos.length > 0 && (
        <section className="section cafe-animate">
          <h2 className="section-title">What's Brewing</h2>
          <div className="promo-grid">
            {promos.map(promo => (
              <div key={promo.id} className="promo-card" style={{ backgroundImage: `url('${promo.image_url}')` }}>
                <div className="promo-overlay" />
                <div className="promo-content">
                  <h3>{promo.title}</h3>
                  {promo.description && <p>{promo.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="section cafe-animate">
          <div className="reviews-header">
            <h2 className="section-title" style={{ margin: 0 }}>What Guests Say</h2>
            <a
              href="https://www.google.com/maps/search/Spoiled+Brats+Cafe+Quezon+City"
              target="_blank"
              rel="noreferrer"
              className="google-rating-badge"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <IonIcon icon={star} style={{ color: '#fea451', fontSize: 14 }} />
              <strong>5.0</strong>
              <span>· 20 reviews</span>
            </a>
          </div>
          <div className="reviews-strip" style={{ marginTop: 18 }}>
            {reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-stars">
                  {Array.from({ length: r.rating }).map((_, s) => (
                    <IonIcon key={s} icon={star} className="star-icon" aria-hidden="true" />
                  ))}
                </div>
                <p className="review-text">"{r.review_text}"</p>
                <div className="review-author">
                  <div className="review-avatar">{r.reviewer_name[0]}</div>
                  <div>
                    <p className="review-name">{r.reviewer_name}</p>
                    <p className="review-role">{r.reviewer_role}{r.review_date ? ` · ${r.review_date}` : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section cta-section cafe-animate">
        <h2 className="cta-title">Ready to Create a Memory?</h2>
        <p className="cta-desc">Reserve the cafe for your next intimate event or gathering.</p>
        <IonButton shape="round" size="large" className="cta-btn" onClick={onSchedule}>
          <IonIcon slot="start" icon={cafeOutline} />
          Schedule an Event
        </IonButton>
      </section>

      {/* Social */}
      <section className="section cafe-animate">
        <h2 className="section-title">Follow Us</h2>
        <div className="social-row">
          <a href="https://instagram.com/spoiledbratscafe" target="_blank" rel="noreferrer" className="social-btn social-btn--instagram">
            <IonIcon icon={logoInstagram} />
            <span>@spoiledbratscafe</span>
          </a>
          <a href="https://facebook.com/spoiledbratscafe" target="_blank" rel="noreferrer" className="social-btn social-btn--facebook">
            <IonIcon icon={logoFacebook} />
            <span>Spoiled Brats Cafe</span>
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 Spoiled Brats & Kajon. Crafting moments, capturing sound.</p>
      </footer>
    </div>
  )
}
