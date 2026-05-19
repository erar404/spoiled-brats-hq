import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react'
import { useState } from 'react'
import { AdminRoute } from '../components/ProtectedRoute'
import AdminCafeBookings from '../admin/AdminCafeBookings'
import AdminStudioBookings from '../admin/AdminStudioBookings'

type AdminTab = 'cafe-bookings' | 'studio-bookings' | 'users' | 'menu' | 'settings'

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('cafe-bookings')

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            value={tab}
            onIonChange={e => setTab(e.detail.value as AdminTab)}
            scrollable
          >
            <IonSegmentButton value="cafe-bookings">
              <IonLabel>Cafe Bookings</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="studio-bookings">
              <IonLabel>Studio Bookings</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="users">
              <IonLabel>Users</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="menu">
              <IonLabel>Menu</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="settings">
              <IonLabel>Settings</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '20px 16px 0' }}>
          {tab === 'cafe-bookings'   && <AdminCafeBookings />}
          {tab === 'studio-bookings' && <AdminStudioBookings />}
          {tab === 'users' && (
            <p style={{ color:'var(--color-on-surface-variant)', fontStyle:'italic', textAlign:'center', marginTop:40 }}>
              User management — Phase 7
            </p>
          )}
          {tab === 'menu' && (
            <p style={{ color:'var(--color-on-surface-variant)', fontStyle:'italic', textAlign:'center', marginTop:40 }}>
              Menu management — Phase 7
            </p>
          )}
          {tab === 'settings' && (
            <p style={{ color:'var(--color-on-surface-variant)', fontStyle:'italic', textAlign:'center', marginTop:40 }}>
              Schedule settings — Phase 7
            </p>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  )
}
