import { useCallback, useEffect, useState } from 'react'
import {
  IonBadge, IonButton, IonChip, IonIcon, IonLabel, IonModal,
  IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  musicalNotesOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline,
  timeOutline, alertCircleOutline, banOutline, chevronForwardOutline,
  micOutline, personOutline, closeOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import type { StudioScheduleRow, BookingStatus, BookingType } from '../types/database'
import './AdminBookings.css'

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#fea451', approved: '#687959',
  rejected: '#ba1a1a', cancelled: '#8a7269',
}
const STATUS_ICON: Record<BookingStatus, string> = {
  pending: timeOutline, approved: checkmarkCircleOutline,
  rejected: alertCircleOutline, cancelled: closeCircleOutline,
}
const STATUS_ORDER: Record<BookingStatus, number> = {
  pending: 0, approved: 1, rejected: 2, cancelled: 3,
}
const TYPE_COLOR: Record<BookingType, string> = {
  recording: 'var(--color-primary)',
  rehearsal: 'var(--color-tertiary)',
}

type Filter = 'all' | BookingStatus

type SessionWithUser = StudioScheduleRow & {
  users: { username: string; first_name: string | null; last_name: string | null } | null
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function fmtTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function displayName(b: SessionWithUser) {
  if (!b.users) return `User #${b.user_id}`
  const u = b.users
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}

export default function AdminStudioBookings() {
  const [sessions, setSessions]     = useState<SessionWithUser[]>([])
  const [calEvents, setCalEvents]   = useState<EventInput[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<Filter>('pending')
  const [selected, setSelected]     = useState<SessionWithUser | null>(null)
  const [updating, setUpdating]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('studio_schedule')
      .select('*, users!user_id(username, first_name, last_name)')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as SessionWithUser[]
    setSessions(rows)
    setCalEvents(rows
      .filter(r => ['pending', 'approved'].includes(r.status))
      .map(r => ({
        id:    String(r.id),
        title: r.band_artist_name,
        start: `${r.booking_date}T${r.start_time}`,
        end:   `${r.booking_date}T${r.end_time}`,
        backgroundColor: STATUS_COLOR[r.status as BookingStatus],
        borderColor: 'transparent',
        textColor: '#ffffff',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: number, status: BookingStatus) {
    setUpdating(true)
    await supabase.from('studio_schedule').update({ status }).eq('id', id)
    setUpdating(false)
    setSelected(null)
    load()
  }

  // Stats
  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  sessions.forEach(b => { counts[b.status as BookingStatus]++ })

  // Filtered + sorted
  const list = filter === 'all'
    ? [...sessions].sort((a, b) =>
        STATUS_ORDER[a.status as BookingStatus] - STATUS_ORDER[b.status as BookingStatus])
    : sessions.filter(b => b.status === filter)

  return (
    <>
      {/* Stats */}
      <div className="admin-stats">
        {(['pending','approved','rejected','cancelled'] as BookingStatus[]).map(s => (
          <div key={s} className={`admin-stat-card stat-${s}`}
            onClick={() => setFilter(s)} style={{ cursor: 'pointer' }}>
            <p className="stat-num">{counts[s]}</p>
            <p className="stat-label">{s.charAt(0).toUpperCase() + s.slice(1)}</p>
          </div>
        ))}
      </div>

      {/* Filter segment */}
      <IonSegment value={filter} onIonChange={e => setFilter(e.detail.value as Filter)}
        className="admin-filter-segment" scrollable>
        <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
        <IonSegmentButton value="pending"><IonLabel>Pending</IonLabel></IonSegmentButton>
        <IonSegmentButton value="approved"><IonLabel>Approved</IonLabel></IonSegmentButton>
        <IonSegmentButton value="rejected"><IonLabel>Rejected</IonLabel></IonSegmentButton>
        <IonSegmentButton value="cancelled"><IonLabel>Cancelled</IonLabel></IonSegmentButton>
      </IonSegment>

      {/* Session list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={musicalNotesOutline} />
          <p>No {filter === 'all' ? '' : filter} studio sessions yet.</p>
        </div>
      ) : (
        <div className="admin-bk-list">
          {list.map(b => (
            <div key={b.id} className={`admin-bk-card status-${b.status}`}
              onClick={() => setSelected(b)}>
              <div className="admin-bk-icon">
                <IonIcon icon={b.booking_type === 'recording' ? micOutline : musicalNotesOutline} />
              </div>
              <div className="admin-bk-body">
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <p className="admin-bk-name" style={{ margin:0 }}>{b.band_artist_name}</p>
                  <IonChip style={{
                    '--background': TYPE_COLOR[b.booking_type as BookingType],
                    '--color': '#ffffff', height: 20, fontSize: 10, margin: 0, padding: '0 8px',
                  }}>
                    <IonLabel style={{ fontSize: 10, fontWeight: 600 }}>
                      {b.booking_type.charAt(0).toUpperCase() + b.booking_type.slice(1)}
                    </IonLabel>
                  </IonChip>
                </div>
                <p className="admin-bk-meta">
                  <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}
                  &nbsp;·&nbsp;
                  <IonIcon icon={timeOutline} />{fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                  &nbsp;·&nbsp;
                  <IonIcon icon={personOutline} />{displayName(b)}
                </p>
              </div>
              <div className="admin-bk-right">
                <IonBadge className={`status-badge badge-${b.status}`}>
                  <IonIcon icon={STATUS_ICON[b.status as BookingStatus]} />
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </IonBadge>
                <IonIcon icon={chevronForwardOutline} className="admin-bk-chevron" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <IonIcon icon={calendarOutline} />
        <h3>Sessions Calendar</h3>
      </div>
      <div className="admin-cal-wrap">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={calEvents}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="23:30:00"
          slotDuration="00:30:00"
          headerToolbar={{ left:'prev,next', center:'title', right:'timeGridWeek,dayGridMonth' }}
          buttonText={{ timeGridWeek:'Week', dayGridMonth:'Month' }}
          allDaySlot={false}
          eventClick={info => {
            const b = sessions.find(x => String(x.id) === info.event.id)
            if (b) setSelected(b)
          }}
        />
      </div>
      <div className="admin-cal-legend">
        {(Object.entries(STATUS_COLOR) as [BookingStatus,string][]).map(([s,c]) => (
          <div key={s} className="legend-item">
            <span className="legend-dot" style={{ background: c }} />
            <span className="legend-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <IonModal isOpen={!!selected} onDidDismiss={() => setSelected(null)}
        breakpoints={[0, 0.65, 0.9]} initialBreakpoint={0.65}>
        {selected && (
          <div className="detail-modal-content">
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">{selected.band_artist_name}</p>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                  <IonBadge className={`status-badge badge-${selected.status}`}>
                    <IonIcon icon={STATUS_ICON[selected.status as BookingStatus]} />
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </IonBadge>
                  <IonChip style={{
                    '--background': TYPE_COLOR[selected.booking_type as BookingType],
                    '--color':'#ffffff', height:22, fontSize:11, margin:0,
                  }}>
                    <IonIcon icon={selected.booking_type==='recording'?micOutline:musicalNotesOutline}
                      style={{ fontSize:13 }} />
                    <IonLabel style={{ fontSize:11, fontWeight:600, marginLeft:3 }}>
                      {selected.booking_type.charAt(0).toUpperCase() + selected.booking_type.slice(1)}
                    </IonLabel>
                  </IonChip>
                </div>
              </div>
              <IonButton fill="clear" className="detail-modal-close"
                onClick={() => setSelected(null)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            <div className="detail-row">
              <span className="detail-key">Date</span>
              <p className="detail-val">{fmtDate(selected.booking_date)}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Time Slot</span>
              <p className="detail-val">{fmtTime(selected.start_time)} – {fmtTime(selected.end_time)}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Session Type</span>
              <p className="detail-val" style={{ textTransform:'capitalize' }}>{selected.booking_type}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Requested by</span>
              <p className="detail-val">{displayName(selected)}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Submitted</span>
              <p className="detail-val">
                {new Date(selected.created_at).toLocaleString('en-PH', {
                  dateStyle:'medium', timeStyle:'short',
                })}
              </p>
            </div>

            <div className="detail-actions">
              {selected.status !== 'approved' && (
                <IonButton color="success"
                  onClick={() => updateStatus(selected.id, 'approved')} disabled={updating}>
                  <IonIcon slot="start" icon={checkmarkCircleOutline} />Accept
                </IonButton>
              )}
              {selected.status !== 'rejected' && (
                <IonButton color="danger" fill="outline"
                  onClick={() => updateStatus(selected.id, 'rejected')} disabled={updating}>
                  <IonIcon slot="start" icon={closeCircleOutline} />Decline
                </IonButton>
              )}
              {selected.status !== 'cancelled' && (
                <IonButton color="medium" fill="outline"
                  onClick={() => updateStatus(selected.id, 'cancelled')} disabled={updating}>
                  <IonIcon slot="start" icon={banOutline} />Cancel
                </IonButton>
              )}
            </div>
          </div>
        )}
      </IonModal>
    </>
  )
}
