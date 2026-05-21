import { useEffect, useRef, useState } from 'react'
import {
  IonButtons, IonContent, IonHeader, IonIcon, IonPage,
  IonToolbar, IonTitle, IonButton,
  createAnimation, useIonViewDidEnter, useIonViewWillEnter,
} from '@ionic/react'
import {
  locationOutline, callOutline, cafeOutline,
  musicalNotesOutline, arrowForwardOutline, star,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import { supabase } from '../lib/supabase'
import type { CafeReviewRow, StudioReviewRow } from '../types/database'
import './landing.css'
import './HomePage.css'

const CAFE_SERVICES_FB   = ['Coffee & Beverages', 'Artisan Pastries', 'Private Event Hosting', 'Curated Desserts']
const STUDIO_SERVICES_FB = ['Multi-Track Recording', 'Live Band Recording', 'Mixing & Mastering', 'Rehearsal Space']

/* ── Character-stagger animated headline ─────────────────────────────────── */
function AnimatedTagline({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chars = Array.from(el.querySelectorAll<HTMLElement>('.hq-char'))
    chars.forEach((span, i) => {
      span.animate(
        [
          { opacity: '0', transform: 'translateY(18px)' },
          { opacity: '1', transform: 'translateY(0)' },
        ],
        {
          duration: 520,
          delay: 280 + i * 42,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      )
    })
  }, [text])

  return (
    <h1 className={className} ref={ref} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} className="hq-char" aria-hidden="true">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </h1>
  )
}

/* ── Animated EQ bars — music venue identity ─────────────────────────────── */
function EqBars({ variant = 'studio' }: { variant?: 'cafe' | 'studio' }) {
  return (
    <div className={`hq-eq-bars hq-eq-bars--${variant}`} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="eq-bar" />
      ))}
    </div>
  )
}

export default function HomePage() {
  const history = useHistory()
  const [cafeReviews,    setCafeReviews]    = useState<CafeReviewRow[]>([])
  const [studioReviews,  setStudioReviews]  = useState<StudioReviewRow[]>([])
  const [cafeServices,   setCafeServices]   = useState<string[]>(CAFE_SERVICES_FB)
  const [studioServices, setStudioServices] = useState<string[]>(STUDIO_SERVICES_FB)
  const [cafeHero,       setCafeHero]       = useState('/cafe2.jpg')
  const [studioHero,     setStudioHero]     = useState('/studio1.jpg')

  useEffect(() => {
    supabase.from('cafe_reviews').select('*').eq('is_active', true).order('sort_order').limit(2)
      .then(({ data }) => { if (data?.length) setCafeReviews(data) })

    supabase.from('studio_reviews').select('*').eq('is_active', true).order('sort_order').limit(2)
      .then(({ data }) => { if (data?.length) setStudioReviews(data) })

    supabase.from('system_settings').select('value').eq('key', 'cafe_services').single()
      .then(({ data }) => {
        const val = data?.value as { services?: string[] } | null
        if (val?.services?.length) setCafeServices(val.services.slice(0, 4))
      })

    supabase.from('system_settings').select('value').eq('key', 'studio_services').single()
      .then(({ data }) => {
        const val = data?.value as { services?: string[] } | null
        if (val?.services?.length) setStudioServices(val.services.slice(0, 4))
      })

    supabase.from('system_settings').select('value').eq('key', 'cafe_hero_image').single()
      .then(({ data }) => {
        const val = data?.value as { url?: string } | null
        if (val?.url) setCafeHero(val.url)
      })

    supabase.from('system_settings').select('value').eq('key', 'studio_hero_image').single()
      .then(({ data }) => {
        const val = data?.value as { url?: string } | null
        if (val?.url) setStudioHero(val.url)
      })
  }, [])

  useIonViewWillEnter(() => {
    document.querySelectorAll('.home-animate').forEach(el => {
      ;(el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(22px)'
    })
  })

  useIonViewDidEnter(() => {
    Array.from(document.querySelectorAll('.home-animate')).forEach((el, i) => {
      createAnimation()
        .addElement(el as HTMLElement)
        .duration(540)
        .delay(i * 80)
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
          <IonTitle>Spoiled Brats HQ</IonTitle>
          <IonButtons slot="end"><DarkModeToggle /></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="landing-page">

          {/* ── Dual-photo brand hero ── */}
          <section className="hq-hero home-animate">
            <div className="hq-hero-split">
              <div className="hq-hero-half" style={{ backgroundImage: `url('${cafeHero}')` }} />
              <div className="hq-hero-half hq-hero-half--alt" style={{ backgroundImage: `url('${studioHero}')` }} />
            </div>
            <div className="hq-hero-veil" />
            <div className="hero-grain" />
            <div className="hq-hero-content">
              <img src="/cafe-logo-transparent.png" alt="Spoiled Brats HQ" className="hq-hero-logo" />
              <AnimatedTagline text="Two Spaces. One Soul." className="hq-hero-tagline" />
              <p className="hq-hero-desc">
                A boutique cafe and a professional music studio, crafting moments
                and capturing sound in Quezon City.
              </p>
              <div className="hq-hero-ctas">
                <IonButton color="primary" shape="round" className="hq-btn-primary"
                  onClick={() => history.push('/cafe')}>
                  <IonIcon slot="start" icon={cafeOutline} />
                  Explore Cafe
                </IonButton>
                <IonButton fill="outline" shape="round" className="hq-btn-outline"
                  onClick={() => history.push('/studio')}>
                  <IonIcon slot="start" icon={musicalNotesOutline} />
                  Explore Studio
                </IonButton>
              </div>
            </div>
          </section>

          {/* ── Cafe venue ── */}
          <VenueSection
            type="cafe"
            logo="/cafe-logo-transparent.png"
            name="Spoiled Brats Cafe"
            tagline="Where Coffee Meets Creativity"
            description="A boutique urban retreat crafted for artisans, dreamers, and creatives. Available for private bookings and intimate gatherings."
            services={cafeServices}
            address="B2 L2 Sampaguita Ave., corner Leonora, Pasong Tamo, Quezon City"
            phone="+63 912 345 6789"
            reviews={cafeReviews}
            ctaLabel="Book an Event"
            onCta={() => history.push('/cafe?tab=bookings')}
            onLearnMore={() => history.push('/cafe')}
          />

          {/* ── Studio venue ── */}
          <VenueSection
            type="studio"
            logo="/studio-logo-transparent.png"
            name="Kajon Music Studio"
            tagline="Precision. Sound. Soul."
            description="A professional sonic environment where creativity meets cutting-edge technology. Built for musicians who refuse to compromise."
            services={studioServices}
            address="B2 L2 Sampaguita Ave., corner Leonora, Pasong Tamo, Quezon City"
            phone="+63 912 345 6789"
            reviews={studioReviews}
            ctaLabel="Book a Session"
            onCta={() => history.push('/studio?tab=bookings')}
            onLearnMore={() => history.push('/studio')}
          />

          <footer className="landing-footer">
            <p>© 2026 Spoiled Brats & Kajon. Crafting moments, capturing sound.</p>
          </footer>

        </div>
      </IonContent>
    </IonPage>
  )
}

/* ── Shared venue section component ── */

interface VenueSectionProps {
  type: 'cafe' | 'studio'
  logo: string
  name: string
  tagline: string
  description: string
  services: string[]
  address: string
  phone: string
  reviews: (CafeReviewRow | StudioReviewRow)[]
  ctaLabel: string
  onCta: () => void
  onLearnMore: () => void
}

function VenueSection({
  type, logo, name, tagline, description,
  services, address, phone, reviews, ctaLabel, onCta, onLearnMore,
}: VenueSectionProps) {
  return (
    <section className={`venue-section venue-section--${type} home-animate`}>
      <div className="venue-content">

        {/* EQ bars for studio identity */}
        {type === 'studio' && <EqBars variant="studio" />}

        {/* Header */}
        <div className="venue-header">
          <img src={logo} alt={name} className="venue-logo" loading="lazy" />
          <div>
            <h2 className="venue-name">{name}</h2>
            <p className="venue-tagline">{tagline}</p>
          </div>
        </div>

        <p className="venue-desc">{description}</p>

        {/* Offerings chips */}
        <div className="venue-chips">
          {services.map(s => (
            <span key={s} className="venue-chip">{s}</span>
          ))}
        </div>

        {/* Contact */}
        <div className="venue-contact">
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(address)}`}
            target="_blank" rel="noreferrer"
            className="venue-contact-row"
          >
            <IonIcon icon={locationOutline} />
            <span>{address}</span>
          </a>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="venue-contact-row">
            <IonIcon icon={callOutline} />
            <span>{phone}</span>
          </a>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="venue-reviews">
            {reviews.map(r => (
              <div key={r.id} className="venue-review">
                <div className="venue-review-stars">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <IonIcon key={i} icon={star} className="star-icon" aria-hidden="true" />
                  ))}
                </div>
                <p className="venue-review-text">"{r.review_text}"</p>
                <div className="venue-review-byline">
                  <div className="venue-review-avatar">{r.reviewer_name[0]}</div>
                  <div>
                    <p className="venue-review-name">{r.reviewer_name}</p>
                    <p className="venue-review-role">{r.reviewer_role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="venue-actions">
          <IonButton
            color={type === 'studio' ? 'secondary' : 'primary'}
            shape="round"
            className="venue-cta-btn"
            onClick={onCta}
          >
            {ctaLabel}
          </IonButton>
          <button
            className={`venue-more-link venue-more-link--${type}`}
            onClick={onLearnMore}
          >
            Full overview <IonIcon icon={arrowForwardOutline} />
          </button>
        </div>

      </div>
    </section>
  )
}
