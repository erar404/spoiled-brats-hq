import { IonButton, IonContent, IonModal } from '@ionic/react'
import { useAuth } from '../context/AuthContext'
import './EmailConfirmedModal.css'

export default function EmailConfirmedModal() {
  const { justConfirmed, clearJustConfirmed, profile } = useAuth()

  const firstName = profile?.first_name

  return (
    <IonModal
      isOpen={justConfirmed}
      onDidDismiss={clearJustConfirmed}
      className="ecm-modal"
    >
      <IonContent scrollY={false}>
        <div className="ecm-content">

          {/* Logos */}
          <div className="ecm-logos">
            <img src="/cafe-logo-transparent.png"   alt="Spoiled Brats Cafe"  className="ecm-logo" />
            <div className="ecm-logo-divider" />
            <img src="/studio-logo-transparent.png" alt="Kajon Music Studio"  className="ecm-logo" />
          </div>

          {/* Animated checkmark */}
          <div className="ecm-check-wrap">
            <svg className="ecm-check-svg" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="ecm-check-circle" cx="26" cy="26" r="24" />
              <path  className="ecm-check-tick"   d="M14 27l8 8 16-16" />
            </svg>
          </div>

          <h2 className="ecm-title">
            {firstName ? `Welcome, ${firstName}!` : "You're In!"}
          </h2>
          <p className="ecm-body">
            Your email has been confirmed and you're now signed in to{' '}
            <strong>Spoiled Brats HQ</strong>. Start exploring — book a table at
            the cafe or a session in the studio.
          </p>

          <IonButton
            expand="block"
            color="primary"
            shape="round"
            className="ecm-btn"
            onClick={clearJustConfirmed}
          >
            Let's Go
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  )
}
