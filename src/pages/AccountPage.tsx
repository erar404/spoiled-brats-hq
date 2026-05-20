import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSpinner } from '@ionic/react'
import DarkModeToggle from '../components/DarkModeToggle'
import { useAuth } from '../context/AuthContext'
import LoginSignUp from '../components/LoginSignUp'
import ProfileView from '../components/ProfileView'

export default function AccountPage() {
  const { session, loading } = useAuth()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{session ? 'My Account' : 'Login / Sign Up'}</IonTitle>
          <IonButtons slot="end"><DarkModeToggle /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40%' }}>
            <IonSpinner name="crescent" color="primary" />
          </div>
        ) : session ? (
          <ProfileView />
        ) : (
          <LoginSignUp />
        )}
      </IonContent>
    </IonPage>
  )
}
