import { useEffect, useState } from 'react'
import {
  IonButtons, IonContent, IonHeader, IonIcon, IonPage,
  IonSegment, IonSegmentButton, IonLabel, IonButton, IonToolbar, IonTitle,
  createAnimation, useIonViewDidEnter, useIonViewWillEnter,
} from '@ionic/react'
import {
  logoInstagram, logoFacebook, musicalNotesOutline,
  micOutline, headsetOutline, layersOutline, radioOutline, star,
} from 'ionicons/icons'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { StudioGalleryRow, StudioReviewRow } from '../types/database'
import StudioBooking from './StudioBooking'
import DarkModeToggle from '../components/DarkModeToggle'
import './landing.css'

const SERVICE_MAP: Record<string, { icon: string; desc: string }> = {
  'Multi-Track Recording':   { icon: micOutline,          desc: 'Professional multi-track sessions with high-fidelity pre-amps.' },
  'Live Band Recording':     { icon: musicalNotesOutline,  desc: 'Full live room for bands of up to 8 musicians.' },
  'Podcast Production':      { icon: radioOutline,         desc: 'Isolation booths and broadcast-quality audio.' },
  'Vocal Recording':         { icon: micOutline,           desc: 'Dedicated vocal booth with acoustic treatment.' },
  'Music Production':        { icon: layersOutline,        desc: 'In-house producers and state-of-the-art DAWs.' },
  'Mixing & Mastering':      { icon: headsetOutline,       desc: 'Industry-standard mixing and mastering suite.' },
  'Rehearsal Space':         { icon: musicalNotesOutline,  desc: 'Acoustically treated rehearsal rooms, hourly rates.' },
}

type Tab = 'overview' | 'book'

export default function StudioPage() {
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') === 'bookings') setTab('book')
  }, [location.search])

  useIonViewWillEnter(() => {
    document.querySelectorAll('.studio-animate').forEach(el => {
      ;(el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(22px)'
    })
  })

  useIonViewDidEnter(() => {
    const targets = Array.from(document.querySelectorAll('.studio-animate'))
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
          <IonTitle>Kajon Music Studio</IonTitle>
          <IonButtons slot="end"><DarkModeToggle /></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)} className="page-segment">
            <IonSegmentButton value="overview"><IonLabel>Overview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="book"><IonLabel>Book a Session</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tab === 'overview' && (
          <div className="tab-content">
            <StudioOverview onSchedule={() => setTab('book')} />
          </div>
        )}
        {tab === 'book' && (
          <div className="tab-content">
            <StudioBooking />
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

function StudioOverview({ onSchedule }: { onSchedule: () => void }) {
  const [gallery, setGallery] = useState<StudioGalleryRow[]>([])
  const [reviews, setReviews] = useState<StudioReviewRow[]>([])
  const [services, setServices] = useState<string[]>(Object.keys(SERVICE_MAP))
  const [features, setFeatures] = useState<string[]>([])
  const [heroUrl, setHeroUrl] = useState('/studio1.jpg')
  const [rehearsalRate, setRehearsalRate] = useState(600)
  const [recordingRate, setRecordingRate] = useState(1200)

  useEffect(() => {
    supabase.from('studio_gallery').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setGallery(data) })

    supabase.from('studio_reviews').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setReviews(data) })

    supabase.from('system_settings').select('value').eq('key', 'studio_services').single()
      .then(({ data }) => {
        const val = data?.value as { services?: string[] } | null
        if (val?.services?.length) setServices(val.services)
      })

    supabase.from('system_settings').select('value').eq('key', 'studio_features').single()
      .then(({ data }) => {
        const val = data?.value as { features?: string[] } | null
        if (val?.features?.length) setFeatures(val.features)
      })

    supabase.from('system_settings').select('value').eq('key', 'studio_hero_image').single()
      .then(({ data }) => {
        const val = data?.value as { url?: string } | null
        if (val?.url) setHeroUrl(val.url)
      })

    supabase.from('system_settings').select('value').eq('key', 'studio_pricing').single()
      .then(({ data }) => {
        const val = data?.value as { rehearsal?: number; recording?: number } | null
        if (val?.rehearsal) setRehearsalRate(val.rehearsal)
        if (val?.recording) setRecordingRate(val.recording)
      })
  }, [])

  return (
    <div className="landing-page">

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg" style={{ backgroundImage: `url('${heroUrl}')` }} />
        <div className="hero-overlay" />
        <div className="hero-content studio-animate">
          <img src="/studio-logo-transparent.png" alt="Kajon Music Studio" className="hero-logo" />
          <h1 className="hero-tagline">Precision. Sound. Soul.</h1>
          <p className="hero-desc">
            A professional sonic environment where creativity meets cutting-edge technology.
            Built for musicians who refuse to compromise.
          </p>
          <IonButton color="primary" shape="round" className="hero-cta" onClick={onSchedule}>
            Book a Session
          </IonButton>
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="section studio-animate">
          <h2 className="section-title">Inside the Studio</h2>
          <div className="gallery-grid">
            {gallery[0] && (
              <img
                src={gallery[0].image_url}
                alt={gallery[0].alt_text ?? 'Studio'}
                className="gallery-featured"
              />
            )}
            {gallery.slice(1).map(item => (
              <img
                key={item.id}
                src={item.image_url}
                alt={item.alt_text ?? 'Studio'}
                className="gallery-thumb"
              />
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      <section className="section studio-animate">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {services.map((name, i) => {
            const meta = SERVICE_MAP[name] ?? { icon: musicalNotesOutline, desc: name }
            return (
              <div key={name} className={`service-card${i === 0 ? ' service-card--featured' : ''}`}>
                <IonIcon icon={meta.icon} className="service-icon" />
                <p className="service-name">{name}</p>
                <p className="service-desc">{meta.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Session Rates */}
      <section className="section studio-animate">
        <h2 className="section-title">Session Rates</h2>
        <div className="studio-rates-grid">
          <div className="studio-rate-card">
            <p className="studio-rate-label">Rehearsal</p>
            <p className="studio-rate-price">₱{rehearsalRate.toLocaleString()}<span>/hr</span></p>
          </div>
          <div className="studio-rate-card">
            <p className="studio-rate-label">Recording · Mixing · Mastering</p>
            <p className="studio-rate-price">₱{recordingRate.toLocaleString()}<span>/hr</span></p>
          </div>
        </div>
      </section>

      {/* Amenities */}
      {features.length > 0 && (
        <section className="section studio-animate">
          <h2 className="section-title">Studio Amenities</h2>
          <ul className="features-list">
            {features.map(f => (
              <li key={f} className="feature-item">
                <span className="feature-dot" />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Social */}
      <section className="section studio-animate">
        <h2 className="section-title">Follow the Sound</h2>
        <div className="social-row">
          <a href="https://instagram.com/kajonmusicstudio" target="_blank" rel="noreferrer" className="social-btn social-btn--instagram">
            <IonIcon icon={logoInstagram} />
            <span>@kajonmusicstudio</span>
          </a>
          <a href="https://facebook.com/kajonmusicstudio" target="_blank" rel="noreferrer" className="social-btn social-btn--facebook">
            <IonIcon icon={logoFacebook} />
            <span>Kajon Music Studio</span>
          </a>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="section studio-animate">
          <h2 className="section-title">What Artists Say</h2>
          <div className="reviews-strip">
            {reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-stars">
                  {Array.from({ length: r.rating }).map((_, s) => (
                    <IonIcon key={s} icon={star} className="star-icon" />
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
      <section className="section cta-section">
        <h2 className="cta-title">Ready to Record Your Vision?</h2>
        <p className="cta-desc">Book a session and bring your music to life in a professional environment.</p>
        <IonButton shape="round" size="large" className="cta-btn" onClick={onSchedule}>
          <IonIcon slot="start" icon={musicalNotesOutline} />
          Book a Session
        </IonButton>
      </section>

      <footer className="landing-footer">
        <p>© 2026 Spoiled Brats & Kajon. Crafting moments, capturing sound.</p>
      </footer>
    </div>
  )
}
