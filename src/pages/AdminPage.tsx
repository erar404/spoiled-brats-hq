import {
  IonButtons, IonContent, IonHeader, IonIcon, IonItem,
  IonLabel, IonList, IonListHeader, IonMenu, IonMenuButton,
  IonMenuToggle, IonPage, IonSplitPane, IonTitle, IonToolbar,
} from '@ionic/react'
import { useState } from 'react'
import {
  banOutline, cafeOutline, cameraOutline, imagesOutline,
  mailOutline, musicalNotesOutline, peopleOutline, pricetagOutline,
  restaurantOutline, settingsOutline,
} from 'ionicons/icons'
import { AdminRoute } from '../components/ProtectedRoute'
import DarkModeToggle from '../components/DarkModeToggle'
import AdminCafeBookings from '../admin/AdminCafeBookings'
import AdminStudioBookings from '../admin/AdminStudioBookings'
import AdminUserList from '../admin/AdminUserList'
import AdminMenuList from '../admin/AdminMenuList'
import AdminScheduleSettings from '../admin/AdminScheduleSettings'
import { AdminPhotosTab } from '../admin/AdminGalleryManager'
import AdminPromotions from '../admin/AdminPromotions'
import AdminBlockedSchedules from '../admin/AdminBlockedSchedules'
import AdminEmailSettings from '../admin/AdminEmailSettings'
import './AdminPage.css'

type AdminTab = 'cafe-bookings' | 'studio-bookings' | 'users' | 'menu' | 'photos' | 'promotions' | 'blocked' | 'settings' | 'email'

const NAV_ITEMS: { value: AdminTab; label: string; icon: string }[] = [
  { value: 'cafe-bookings',   label: 'Cafe Bookings',   icon: cafeOutline },
  { value: 'studio-bookings', label: 'Studio Bookings', icon: musicalNotesOutline },
  { value: 'users',           label: 'Users',           icon: peopleOutline },
  { value: 'menu',            label: 'Menu',            icon: restaurantOutline },
  { value: 'photos',          label: 'Photos',          icon: imagesOutline },
  { value: 'promotions',      label: 'Promotions',      icon: pricetagOutline },
  { value: 'blocked',         label: 'Blocked Dates',   icon: banOutline },
  { value: 'settings',        label: 'Settings',        icon: settingsOutline },
  { value: 'email',           label: 'Email',           icon: mailOutline },
]

const MENU_ID = 'admin-menu'

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('cafe-bookings')
  const current = NAV_ITEMS.find(n => n.value === tab)!

  return (
    <IonSplitPane contentId="admin-content" when="xl" className="admin-split-pane">
      {/* ── Side menu ── */}
      <IonMenu menuId={MENU_ID} contentId="admin-content" type="overlay" id="admin-menu">
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Admin Panel</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList lines="none" className="admin-nav-list">
            <IonListHeader className="admin-nav-section-label">Management</IonListHeader>
            {NAV_ITEMS.map(item => (
              <IonMenuToggle key={item.value} autoHide={false}>
                <IonItem
                  button
                  detail={false}
                  className={`admin-nav-item${tab === item.value ? ' admin-nav-item--active' : ''}`}
                  onClick={() => setTab(item.value)}
                >
                  <IonIcon slot="start" icon={item.icon} className="admin-nav-icon" />
                  <IonLabel>{item.label}</IonLabel>
                  {tab === item.value && (
                    <span slot="end" className="admin-nav-active-dot" />
                  )}
                </IonItem>
              </IonMenuToggle>
            ))}
          </IonList>
        </IonContent>
      </IonMenu>

      {/* ── Main content ── */}
      <IonPage id="admin-content">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton menu={MENU_ID} />
            </IonButtons>
            <IonTitle className="admin-page-title">
              <IonIcon icon={current.icon} className="admin-title-icon" />
              {current.label}
            </IonTitle>
            <IonButtons slot="end"><DarkModeToggle /></IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className="admin-panel-body">
            {tab === 'cafe-bookings'   && <AdminCafeBookings />}
            {tab === 'studio-bookings' && <AdminStudioBookings />}
            {tab === 'users'           && <AdminUserList />}
            {tab === 'menu'            && <AdminMenuList />}
            {tab === 'photos'          && <AdminPhotosTab />}
            {tab === 'promotions'      && <AdminPromotions />}
            {tab === 'blocked'         && <AdminBlockedSchedules />}
            {tab === 'settings'        && <AdminScheduleSettings />}
            {tab === 'email'           && <AdminEmailSettings />}
          </div>
        </IonContent>
      </IonPage>
    </IonSplitPane>
  )
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  )
}
