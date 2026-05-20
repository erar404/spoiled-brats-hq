import {
  IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react'
import { useState } from 'react'
import { AdminRoute } from '../components/ProtectedRoute'
import DarkModeToggle from '../components/DarkModeToggle'
import AdminCafeBookings from '../admin/AdminCafeBookings'
import AdminStudioBookings from '../admin/AdminStudioBookings'
import AdminUserList from '../admin/AdminUserList'
import AdminMenuList from '../admin/AdminMenuList'
import AdminScheduleSettings from '../admin/AdminScheduleSettings'
import { AdminPhotosTab } from '../admin/AdminGalleryManager'
import AdminPromotions from '../admin/AdminPromotions'

type AdminTab = 'cafe-bookings' | 'studio-bookings' | 'users' | 'menu' | 'photos' | 'promotions' | 'settings'

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('cafe-bookings')

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButtons slot="end"><DarkModeToggle /></IonButtons>
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
            <IonSegmentButton value="photos">
              <IonLabel>Photos</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="promotions">
              <IonLabel>Promotions</IonLabel>
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
          {tab === 'users'    && <AdminUserList />}
          {tab === 'menu'     && <AdminMenuList />}
          {tab === 'photos'      && <AdminPhotosTab />}
          {tab === 'promotions'  && <AdminPromotions />}
          {tab === 'settings'    && <AdminScheduleSettings />}
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
