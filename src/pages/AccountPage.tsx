import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSpinner } from '@ionic/react'
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
