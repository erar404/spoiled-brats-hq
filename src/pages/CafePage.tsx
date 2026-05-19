import { useEffect, useState } from 'react'
import {
  IonContent, IonHeader, IonIcon, IonPage,
  IonSegment, IonSegmentButton, IonLabel, IonButton, IonToolbar, IonTitle,
  IonRippleEffect,
  createAnimation, useIonViewDidEnter, useIonViewWillEnter,
} from '@ionic/react'
import {
  locationOutline, callOutline, mailOutline, timeOutline,
  logoInstagram, logoFacebook, star, cafeOutline,
} from 'ionicons/icons'
import { useLocation } from 'react-router-dom'
import CafeBooking from './CafeBooking'
import './landing.css'

const GALLERY = [
  '/cafe1.jpg', '/cafe2.jpg', '/cafe3.jpg', '/cafe4.jpg',
  '/cafe5.jpg', '/cafe6.jpg', '/cafe7.jpg', '/cafe8.jpg',
]
const PROMOS = ['/cafe-promo1.jpg', '/cafe-promo-2.jpg', '/cafe-promo3.jpg']

// Real Google reviews — 5.0 ★ (20 reviews)
const REVIEWS = [
  {
    name: 'Rey S.', role: 'Google Review', date: 'Aug 2023',
    text: 'This place is the chillest place during the weekdays where you could read or just cafe dates with the loved ones then transforms to the best place to chill and hear live music during Fridays and Saturdays.',
  },
  {
    name: 'Lyza G.', role: 'Google Review', date: 'Mar 2024',
    text: 'My Husband and I enjoyed the cozy place with cool music while drinking our coffee.',
  },
  {
    name: 'Ronaldo', role: 'Google Review', date: 'Jul 2023',
    text: 'I performed here as a musician at a private event & the overall vibe of this place is just off the hook.',
  },
  {
    name: 'Keyk G.', role: 'Google Review', date: 'Aug 2023',
    text: 'Ordered Iced White Chocolate Coffee and it was real good.',
  },
  {
    name: 'Gelo A.', role: 'Google Review', date: 'Apr 2023',
    text: 'Good food. Good Music.',
  },
]

type Tab = 'overview' | 'book'

export default function CafePage() {
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') === 'bookings') setTab('book')
  }, [location.search])

  // Reset animated elements before the tab slide-in
  useIonViewWillEnter(() => {
    document.querySelectorAll('.cafe-animate').forEach(el => {
      ;(el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(22px)'
    })
  })

  // Drive staggered entry with Ionic's createAnimation when tab is fully visible
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
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)} className="page-segment">
            <IonSegmentButton value="overview"><IonLabel>Overview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="book"><IonLabel>Book an Event</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tab === 'overview' && <CafeOverview onSchedule={() => setTab('book')} />}
        {tab === 'book' && <CafeBooking />}
      </IonContent>
    </IonPage>
  )
}

function CafeOverview({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="landing-page">

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg" style={{ backgroundImage: "url('/cafe2.jpg')" }} />
        <div className="hero-overlay" />
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
      <section className="section cafe-animate">
        <h2 className="section-title">Our Space</h2>
        <div className="gallery-strip">
          {GALLERY.map(src => (
            <img key={src} src={src} alt="Cafe interior" className="gallery-item" />
          ))}
        </div>
      </section>

      {/* Find Us */}
      <section className="section cafe-animate">
        <h2 className="section-title">Find Us</h2>
        <div className="info-grid">
          <div className="info-card" style={{ position:'relative', overflow:'hidden' }}>
            <IonRippleEffect />
            <IonIcon icon={locationOutline} className="info-icon" />
            <div>
              <p className="info-label">Address</p>
              <p className="info-value">B2 L2 Sampaguita Ave., corner Leonora, Pasong Tamo, Quezon City</p>
            </div>
          </div>
          <div className="info-card">
            <IonIcon icon={callOutline} className="info-icon" />
            <div>
              <p className="info-label">Phone</p>
              <p className="info-value">+63 912 345 6789</p>
            </div>
          </div>
          <div className="info-card">
            <IonIcon icon={mailOutline} className="info-icon" />
            <div>
              <p className="info-label">Email</p>
              <p className="info-value">hello@spoiledbratshq.com</p>
            </div>
          </div>
          <div className="info-card">
            <IonIcon icon={timeOutline} className="info-icon" />
            <div>
              <p className="info-label">Hours</p>
              <p className="info-value">Tuesday – Sunday · 2:00 PM – 10:00 PM</p>
            </div>
          </div>
        </div>
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

      {/* Highlights */}
      <section className="section cafe-animate">
        <h2 className="section-title">What's Brewing</h2>
        <div className="promo-grid">
          <div className="promo-card" style={{ backgroundImage: `url('${PROMOS[0]}')` }}>
            <div className="promo-overlay" />
            <div className="promo-content">
              <h3>Freshly Roasted</h3>
              <p>Single-origin beans sourced from the Benguet highlands.</p>
            </div>
          </div>
          <div className="promo-card" style={{ backgroundImage: `url('${PROMOS[1]}')` }}>
            <div className="promo-overlay" />
            <div className="promo-content">
              <h3>Daily Vibes</h3>
              <p>Live acoustic sessions every Friday night.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
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
          {REVIEWS.map((r, i) => (
            <div key={i} className="review-card" style={{ position:'relative' }}>
              <IonRippleEffect />
              <div className="review-stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <IonIcon key={s} icon={star} className="star-icon" />
                ))}
              </div>
              <p className="review-text">"{r.text}"</p>
              <div className="review-author">
                <div className="review-avatar">{r.name[0]}</div>
                <div>
                  <p className="review-name">{r.name}</p>
                  <p className="review-role">{r.role} · {r.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section cafe-animate">
        <h2 className="cta-title">Ready to Create a Memory?</h2>
        <p className="cta-desc">Reserve the cafe for your next intimate event or gathering.</p>
        <IonButton shape="round" size="large" className="cta-btn" onClick={onSchedule}>
          <IonIcon slot="start" icon={cafeOutline} />
          Schedule an Event
        </IonButton>
      </section>

      <footer className="landing-footer">
        <p>© 2024 Spoiled Brats & Kajon. Crafting moments, capturing sound.</p>
      </footer>
    </div>
  )
}
