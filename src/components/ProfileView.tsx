import {
  IonButton, IonBadge, IonIcon,
} from '@ionic/react'
import { cafeOutline, musicalNotesOutline, shieldCheckmarkOutline, logOutOutline, settingsOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfileView.css'

export default function ProfileView() {
  const { profile, isAdmin, signOut } = useAuth()
  const history = useHistory()

  if (!profile) return null

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map(s => s![0].toUpperCase()).join('') || profile.username[0].toUpperCase()

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
  const memberYear = new Date(profile.created_at).getFullYear()

  async function handleSignOut() {
    await signOut()
    history.replace('/account')
  }

  return (
    <div className="profile-wrap">
      {/* Avatar + name */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <h2 className="profile-name">{fullName}</h2>
        <p className="profile-username">@{profile.username}</p>
        {isAdmin && (
          <IonBadge className="profile-admin-badge">
            <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Administrator
          </IonBadge>
        )}
      </div>

      {/* Info rows */}
      <div className="profile-info-card">
        {profile.email && (
          <div className="profile-info-row">
            <span className="profile-info-label">Email</span>
            <span className="profile-info-value">{profile.email}</span>
          </div>
        )}
        {profile.phone && (
          <div className="profile-info-row">
            <span className="profile-info-label">Phone</span>
            <span className="profile-info-value">{profile.phone}</span>
          </div>
        )}
        <div className="profile-info-row">
          <span className="profile-info-label">Member since</span>
          <span className="profile-info-value">{memberYear}</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="profile-actions">
        <button className="profile-action-btn" onClick={() => history.push('/cafe?tab=bookings')}>
          <IonIcon icon={cafeOutline} />
          <span>My Cafe Bookings</span>
        </button>
        <button className="profile-action-btn" onClick={() => history.push('/studio?tab=bookings')}>
          <IonIcon icon={musicalNotesOutline} />
          <span>My Studio Bookings</span>
        </button>
        {isAdmin && (
          <button className="profile-action-btn profile-action-btn--admin" onClick={() => history.push('/admin')}>
            <IonIcon icon={settingsOutline} />
            <span>Admin Dashboard</span>
          </button>
        )}
      </div>

      {/* Sign out */}
      <IonButton
        expand="block"
        fill="outline"
        color="danger"
        className="profile-signout-btn"
        onClick={handleSignOut}
      >
        <IonIcon slot="start" icon={logOutOutline} />
        Sign Out
      </IonButton>
    </div>
  )
}
