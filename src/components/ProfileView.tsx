import { useRef, useState } from 'react'
import {
  IonButton, IonBadge, IonIcon, IonInput, IonSpinner,
} from '@ionic/react'
import {
  cafeOutline, musicalNotesOutline, shieldCheckmarkOutline,
  logOutOutline, settingsOutline, pencilOutline, cameraOutline,
  checkmarkOutline, closeOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import './ProfileView.css'

export default function ProfileView() {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth()
  const history = useHistory()
  const { toast, ToastEl } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editMode, setEditMode]           = useState(false)
  const [firstName, setFirstName]         = useState('')
  const [lastName, setLastName]           = useState('')
  const [middleInitial, setMiddleInitial] = useState('')
  const [username, setUsername]           = useState('')
  const [avatarFile, setAvatarFile]       = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)

  if (!profile) return null

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map(s => s![0].toUpperCase()).join('') || profile.username[0].toUpperCase()
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
  const memberYear = new Date(profile.created_at).getFullYear()

  function enterEditMode() {
    setFirstName(profile!.first_name ?? '')
    setLastName(profile!.last_name ?? '')
    setMiddleInitial(profile!.middle_initial ?? '')
    setUsername(profile!.username)
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditMode(true)
  }

  function handleCancel() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditMode(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSave() {
    if (!username.trim()) return toast('Username is required.', 'warning')

    setSaving(true)

    let avatarUrl = profile!.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${profile!.id}/${Date.now()}.${ext}`

      // Remove old avatar from storage if it exists
      if (profile!.avatar_url) {
        const oldPath = profile!.avatar_url.split('/avatars/')[1]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }

      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(path, avatarFile)

      if (uploadErr) {
        toast('Avatar upload failed. Please try again.', 'danger')
        setSaving(false)
        return
      }

      avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('users').update({
      first_name:     firstName.trim()     || null,
      last_name:      lastName.trim()      || null,
      middle_initial: middleInitial.trim() || null,
      username:       username.trim(),
      avatar_url:     avatarUrl,
    }).eq('id', profile!.id)

    setSaving(false)

    if (error) {
      toast(error.message, 'danger')
      return
    }

    await refreshProfile()
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview(null)
    setEditMode(false)
    toast('Profile updated.', 'success')
  }

  async function handleSignOut() {
    await signOut()
    history.replace('/account')
  }

  const displayAvatar = avatarPreview ?? profile.avatar_url

  return (
    <div className="profile-wrap">
      {ToastEl}

      {/* ── Avatar ── */}
      <div className="profile-hero">
        {editMode ? (
          <button
            className="profile-avatar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            aria-label="Change profile photo"
          >
            {displayAvatar
              ? <img src={displayAvatar} className="profile-avatar profile-avatar--img" alt={fullName} />
              : <div className="profile-avatar">{initials}</div>
            }
            <div className="profile-avatar-overlay">
              <IonIcon icon={cameraOutline} />
              <span>Change photo</span>
            </div>
          </button>
        ) : (
          <div className="profile-avatar-btn profile-avatar-btn--static">
            {displayAvatar
              ? <img src={displayAvatar} className="profile-avatar profile-avatar--img" alt={fullName} />
              : <div className="profile-avatar">{initials}</div>
            }
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {!editMode && (
          <>
            <h2 className="profile-name">{fullName}</h2>
            <p className="profile-username">@{profile.username}</p>
            {isAdmin && (
              <IonBadge className="profile-admin-badge">
                <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Administrator
              </IonBadge>
            )}
          </>
        )}
      </div>

      {/* ── View mode ── */}
      {!editMode && (
        <>
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

          <button className="profile-edit-trigger" onClick={enterEditMode}>
            <IonIcon icon={pencilOutline} />
            Edit Profile
          </button>

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

          <IonButton
            expand="block" fill="outline" color="danger"
            className="profile-signout-btn"
            onClick={handleSignOut}
          >
            <IonIcon slot="start" icon={logOutOutline} />
            Sign Out
          </IonButton>
        </>
      )}

      {/* ── Edit mode ── */}
      {editMode && (
        <div className="profile-edit-form">
          <p className="profile-edit-hint">Tap your photo to change it.</p>

          <div className="profile-edit-row">
            <div className="profile-edit-field">
              <IonInput
                label="First Name" labelPlacement="stacked" fill="outline"
                value={firstName}
                onIonInput={e => setFirstName(e.detail.value ?? '')}
                placeholder="Juan"
                className="profile-edit-input"
              />
            </div>
            <div className="profile-edit-field">
              <IonInput
                label="Last Name" labelPlacement="stacked" fill="outline"
                value={lastName}
                onIonInput={e => setLastName(e.detail.value ?? '')}
                placeholder="Dela Cruz"
                className="profile-edit-input"
              />
            </div>
          </div>

          <div className="profile-edit-field profile-edit-field--mi">
            <IonInput
              label="Middle Initial" labelPlacement="stacked" fill="outline"
              value={middleInitial}
              onIonInput={e => setMiddleInitial(e.detail.value ?? '')}
              placeholder="B"
              maxlength={1}
              className="profile-edit-input"
            />
          </div>

          <div className="profile-edit-field">
            <IonInput
              label="Username *" labelPlacement="stacked" fill="outline"
              value={username}
              onIonInput={e => setUsername(e.detail.value ?? '')}
              placeholder="juandelacruz"
              className="profile-edit-input"
            />
          </div>

          <div className="profile-edit-actions">
            <IonButton
              expand="block" color="primary"
              className="profile-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <IonSpinner name="crescent" />
                : <><IonIcon slot="start" icon={checkmarkOutline} />Save Changes</>
              }
            </IonButton>
            <button className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
              <IonIcon icon={closeOutline} />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
