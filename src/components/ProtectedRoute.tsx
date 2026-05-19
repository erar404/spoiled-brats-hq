import { IonPage, IonContent, IonSpinner } from '@ionic/react'
import { Redirect } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props { children: React.ReactNode }

export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth()
  if (loading) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <IonSpinner name="crescent" color="primary" style={{ marginTop: '40%' }} />
      </IonContent>
    </IonPage>
  )
  if (!session) return <Redirect to="/account" />
  return <>{children}</>
}

export function AdminRoute({ children }: Props) {
  const { isAdmin, loading } = useAuth()
  if (loading) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <IonSpinner name="crescent" color="primary" style={{ marginTop: '40%' }} />
      </IonContent>
    </IonPage>
  )
  if (!isAdmin) return <Redirect to="/" />
  return <>{children}</>
}
