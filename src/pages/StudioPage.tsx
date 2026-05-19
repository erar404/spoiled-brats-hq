import { useEffect, useState } from 'react'
import {
  IonContent, IonHeader, IonIcon, IonPage,
  IonSegment, IonSegmentButton, IonLabel, IonButton, IonToolbar, IonTitle,
  IonRippleEffect,
  createAnimation, useIonViewDidEnter, useIonViewWillEnter,
} from '@ionic/react'
import {
  logoInstagram, logoFacebook, musicalNotesOutline,
  micOutline, headsetOutline, layersOutline, radioOutline, star,
} from 'ionicons/icons'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StudioBooking from './StudioBooking'
import './landing.css'

const GALLERY = ['/studio1.jpg', '/studio2.jpg']

const STUDIO_REVIEWS = [
  {
    name: 'Carlo Mendoza', role: 'Recording Artist', date: 'November 2024',
    text: 'Crystal-clear acoustics and world-class gear. We tracked our entire EP here and the results are stunning.',
  },
  {
    name: 'The Northside Band', role: 'Indie Band', date: 'October 2024',
    text: 'Rehearsed here every weekend for three months before our tour. The space is perfectly treated.',
  },
  {
    name: 'Lia Gonzales', role: 'Podcaster', date: 'October 2024',
    text: 'Amazing isolation booths for podcast recording. Sound quality blew my listeners away.',
  },
]

const SERVICE_MAP: Record<string, { icon: string; desc: string }> = {
  'Multi-Track Recording':   { icon: micOutline,          desc: 'Professional multi-track sessions with high-fidelity pre-amps.' },
  'Live Band Recording':     { icon: musicalNotesOutline,  desc: 'Full live room for bands of up to 8 musicians.' },
  'Podcast Production':      { icon: radioOutline,       desc: 'Isolation booths and broadcast-quality audio.' },
  'Vocal Recording':         { icon: micOutline,           desc: 'Dedicated vocal booth with acoustic treatment.' },
  'Music Production':        { icon: layersOutline,        desc: 'In-house producers and state-of-the-art DAWs.' },
  'Mixing & Mastering':      { icon: headsetOutline,       desc: 'Industry-standard mixing and mastering suite.' },
  'Rehearsal Space':         { icon: musicalNotesOutline,  desc: 'Acoustically treated rehearsal rooms, hourly rates.' },
}

const STUDIO_FEATURES = [
  'SSL console & Neve outboard gear',
  'Isolation booths for drums, vocals, and amps',
  'Yamaha C3 grand piano in the live room',
  'Vintage and modern guitar amp collection',
  'In-house session musicians available on request',
  'Lounge area with high-speed WiFi',
]

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
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)} className="page-segment">
            <IonSegmentButton value="overview"><IonLabel>Overview</IonLabel></IonSegmentButton>
            <IonSegmentButton value="book"><IonLabel>Book a Session</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tab === 'overview' && <StudioOverview onSchedule={() => setTab('book')} />}
        {tab === 'book' && <StudioBooking />}
      </IonContent>
    </IonPage>
  )
}

function StudioOverview({ onSchedule }: { onSchedule: () => void }) {
  const [services, setServices] = useState<string[]>(Object.keys(SERVICE_MAP))

  useEffect(() => {
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'studio_services')
      .single()
      .then(({ data }) => {
        const val = data?.value as { services?: string[] } | null
        if (val?.services?.length) setServices(val.services)
      })
  }, [])

  return (
    <div className="landing-page">

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg" style={{ backgroundImage: "url('/studio1.jpg')" }} />
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
      <section className="section studio-animate">
        <h2 className="section-title">Inside the Studio</h2>
        <div className="gallery-strip">
          {GALLERY.map(src => (
            <img key={src} src={src} alt="Studio" className="gallery-item" style={{ width: '100%', maxWidth: 360 }} />
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="section studio-animate">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {services.map(name => {
            const meta = SERVICE_MAP[name] ?? { icon: musicalNotesOutline, desc: name }
            return (
              <div key={name} className="service-card">
                <IonIcon icon={meta.icon} className="service-icon" />
                <p className="service-name">{name}</p>
                <p className="service-desc">{meta.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Studio features */}
      <section className="section studio-animate">
        <h2 className="section-title">Studio Amenities</h2>
        <ul className="features-list">
          {STUDIO_FEATURES.map(f => (
            <li key={f} className="feature-item">
              <span className="feature-dot" />
              {f}
            </li>
          ))}
        </ul>
      </section>

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
      <section className="section studio-animate">
        <h2 className="section-title">What Artists Say</h2>
        <div className="reviews-strip">
          {STUDIO_REVIEWS.map((r, i) => (
            <div key={i} className="review-card">
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
      <section className="section cta-section">
        <h2 className="cta-title">Ready to Record Your Vision?</h2>
        <p className="cta-desc">Book a session and bring your music to life in a professional environment.</p>
        <IonButton shape="round" size="large" className="cta-btn" onClick={onSchedule}>
          <IonIcon slot="start" icon={musicalNotesOutline} />
          Book a Session
        </IonButton>
      </section>

      <footer className="landing-footer">
        <p>© 2024 Spoiled Brats & Kajon. Crafting moments, capturing sound.</p>
      </footer>
    </div>
  )
}
