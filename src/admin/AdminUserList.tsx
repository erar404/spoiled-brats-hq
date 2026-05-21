import { useCallback, useEffect, useState } from 'react'
import {
  IonButton, IonIcon, IonInput,
  IonSelect, IonSelectOption, IonSpinner,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  chevronForwardOutline, closeOutline, createOutline,
  peopleOutline, searchOutline, shieldCheckmarkOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { UserListSkeleton } from '../components/Skeletons'
import type { UserRow, UserRole } from '../types/database'
import './AdminBookings.css'
import './AdminPhase7.css'

function initials(u: UserRow) {
  return [u.first_name, u.last_name].filter(Boolean).map(s => s![0].toUpperCase()).join('')
    || u.username[0].toUpperCase()
}
function fullName(u: UserRow) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}

export default function AdminUserList() {
  const { toast, ToastEl } = useToast()
  const [users,    setUsers]    = useState<UserRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [saving,   setSaving]   = useState(false)

  // Edit fields
  const [eFirst,    setEFirst]    = useState('')
  const [eLast,     setELast]     = useState('')
  const [eUsername, setEUsername] = useState('')
  const [eRole,     setERole]     = useState<UserRole>('user')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (!error) setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(u: UserRow) {
    setSelected(u)
    setEFirst(u.first_name ?? '')
    setELast(u.last_name ?? '')
    setEUsername(u.username)
    setERole(u.role)
  }

  async function save() {
    if (!selected) return
    if (!eUsername.trim()) return toast('Username is required.', 'warning')
    setSaving(true)
    const { error } = await supabase.from('users').update({
      first_name: eFirst.trim() || null,
      last_name:  eLast.trim()  || null,
      username:   eUsername.trim(),
      role:       eRole,
    }).eq('id', selected.id)
    setSaving(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('User updated.', 'success')
    setSelected(null)
    load()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q
      || u.username.toLowerCase().includes(q)
      || (u.first_name ?? '').toLowerCase().includes(q)
      || (u.last_name  ?? '').toLowerCase().includes(q)
      || (u.email      ?? '').toLowerCase().includes(q)
  })

  return (
    <>
      {/* Summary */}
      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="admin-stat-card stat-approved">
          <p className="stat-num">{users.length}</p>
          <p className="stat-label">Total Users</p>
        </div>
        <div className="admin-stat-card stat-pending">
          <p className="stat-num">{users.filter(u => u.role === 'admin').length}</p>
          <p className="stat-label">Admins</p>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search">
        <IonInput fill="outline" label="Search users" labelPlacement="floating"
          value={search} onIonInput={e => setSearch(e.detail.value ?? '')}
          className="p7-input">
          <IonIcon slot="start" icon={searchOutline} />
        </IonInput>
      </div>

      {ToastEl}
      {loading ? (
        <UserListSkeleton count={5} />
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={peopleOutline} />
          <p>{search ? 'No users match your search.' : 'No users registered yet.'}</p>
        </div>
      ) : (
        <div className="user-list">
          {filtered.map(u => (
            <div key={u.id} className="user-card" onClick={() => openEdit(u)}>
              <div className={`user-avatar ${u.role === 'admin' ? 'is-admin' : ''}`}>
                {initials(u)}
              </div>
              <div className="user-info">
                <p className="user-name">{fullName(u)}</p>
                <p className="user-sub">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className={`user-role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                  {u.role === 'admin' && <IonIcon icon={shieldCheckmarkOutline} />}
                  {u.role}
                </span>
                <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--color-outline)', fontSize: 18 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AppModal isOpen={!!selected} onDidDismiss={() => setSelected(null)}
        breakpoints={[0, 0.6, 0.85]} initialBreakpoint={0.6}>
        {selected && (
          <div className="detail-modal-content">
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">Edit User</p>
                <p style={{ fontSize:13, color:'var(--color-on-surface-variant)', margin:0 }}>
                  @{selected.username}
                </p>
              </div>
              <IonButton fill="clear" className="detail-modal-close"
                onClick={() => setSelected(null)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="First Name" labelPlacement="stacked" fill="outline"
                  value={eFirst} onIonInput={e => setEFirst(e.detail.value ?? '')}
                  maxlength={50} className="p7-input" />
              </div>
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="Last Name" labelPlacement="stacked" fill="outline"
                  value={eLast} onIonInput={e => setELast(e.detail.value ?? '')}
                  maxlength={50} className="p7-input" />
              </div>
            </div>

            <div className="p7-field">
              <IonInput label="Username" labelPlacement="stacked" fill="outline"
                value={eUsername} onIonInput={e => setEUsername(e.detail.value ?? '')}
                maxlength={30} className="p7-input" />
            </div>

            <div className="p7-field">
              <IonSelect label="Role" labelPlacement="stacked" fill="outline"
                value={eRole} onIonChange={e => setERole(e.detail.value as UserRole)}
                interface="popover">
                <IonSelectOption value="user">User</IonSelectOption>
                <IonSelectOption value="admin">Admin</IonSelectOption>
              </IonSelect>
            </div>

            {selected.email && (
              <div className="detail-row">
                <span className="detail-key">Email</span>
                <p className="detail-val">{selected.email}</p>
              </div>
            )}
            {selected.phone && (
              <div className="detail-row">
                <span className="detail-key">Phone</span>
                <p className="detail-val">{selected.phone}</p>
              </div>
            )}
            <div className="detail-row" style={{ border: 'none' }}>
              <span className="detail-key">Member since</span>
              <p className="detail-val">
                {new Date(selected.created_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}
              </p>
            </div>

            <div className="p7-modal-actions">
              <IonButton fill="outline" color="medium" onClick={() => setSelected(null)}>
                Cancel
              </IonButton>
              <IonButton className="p7-save-btn" onClick={save} disabled={saving}>
                {saving ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={createOutline} />Save Changes</>}
              </IonButton>
            </div>
          </div>
        )}
      </AppModal>
    </>
  )
}
