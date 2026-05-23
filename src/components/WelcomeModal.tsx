import { IonButton, IonContent, IonIcon, IonModal } from '@ionic/react'
import { useHistory } from 'react-router-dom'
import {
  arrowForwardOutline, cafeOutline, chevronForwardOutline,
  musicalNotesOutline, sparklesOutline,
} from 'ionicons/icons'
import { useAuth } from '../context/AuthContext'
import './WelcomeModal.css'

export default function WelcomeModal() {
  const { showWelcome, clearWelcome, profile } = useAuth()
  const history = useHistory()

  function goTo(path: string) {
    clearWelcome()
    history.push(path)
  }

  const firstName = profile?.first_name

  return (
    <IonModal
      isOpen={showWelcome}
      onDidDismiss={clearWelcome}
      className="welcome-modal"
    >
      <IonContent scrollY>
        <div className="wm-wrap">

          {/* Logos */}
          <div className="wm-logos">
            <img src="/cafe-logo-transparent.png"   alt="Spoiled Brats Cafe"  className="wm-logo" />
            <div className="wm-logo-divider" />
            <img src="/studio-logo-transparent.png" alt="Kâjon Music Studio"  className="wm-logo" />
          </div>

          {/* Greeting */}
          <div className="wm-greeting">
            <IonIcon icon={sparklesOutline} className="wm-sparkle" aria-hidden="true" />
            <h2 className="wm-title">
              {firstName ? `Welcome, ${firstName}!` : 'Welcome!'}
            </h2>
            <p className="wm-subtitle">
              You've just unlocked the full Spoiled Brats HQ experience — where great
              coffee meets professional sound. Here's a quick look at what's waiting for you.
            </p>
          </div>

          {/* Venue cards */}
          <div className="wm-venues">

            <button className="wm-venue-card wm-cafe" onClick={() => goTo('/cafe')}>
              <div className="wm-venue-icon-wrap">
                <IonIcon icon={cafeOutline} className="wm-venue-icon" />
              </div>
              <div className="wm-venue-body">
                <h3 className="wm-venue-name">Spoiled Brats Cafe</h3>
                <p className="wm-venue-desc">
                  Artisanal coffee, warm vibes, and event spaces. Browse our menu,
                  book a table, or reserve the whole place for your next gathering.
                </p>
                <span className="wm-venue-cta">
                  Explore Cafe <IonIcon icon={chevronForwardOutline} />
                </span>
              </div>
            </button>

            <button className="wm-venue-card wm-studio" onClick={() => goTo('/studio')}>
              <div className="wm-venue-icon-wrap">
                <IonIcon icon={musicalNotesOutline} className="wm-venue-icon" />
              </div>
              <div className="wm-venue-body">
                <h3 className="wm-venue-name">Kâjon Music Studio</h3>
                <p className="wm-venue-desc">
                  Professional recording and rehearsal space. Reserve a session,
                  upload your payment proof, and bring your music to life.
                </p>
                <span className="wm-venue-cta">
                  Explore Studio <IonIcon icon={chevronForwardOutline} />
                </span>
              </div>
            </button>

          </div>

          {/* Pro tip */}
          <div className="wm-tip">
            <p>
              <strong>Pro tip:</strong> Use the tabs at the bottom to switch between Cafe,
              Studio, and your Account at any time.
            </p>
          </div>

          {/* Start exploring */}
          <IonButton
            expand="block"
            color="primary"
            shape="round"
            className="wm-cta-btn"
            onClick={clearWelcome}
          >
            Start Exploring
            <IonIcon slot="end" icon={arrowForwardOutline} />
          </IonButton>

        </div>
      </IonContent>
    </IonModal>
  )
}
