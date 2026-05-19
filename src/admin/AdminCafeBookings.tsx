import { useCallback, useEffect, useState } from 'react'
import {
  IonBadge, IonButton, IonIcon, IonItem, IonItemOption,
  IonItemOptions, IonItemSliding, IonList, IonModal,
  IonRippleEffect, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  cafeOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline,
  timeOutline, alertCircleOutline, banOutline, chevronForwardOutline,
  homeOutline, peopleOutline, personOutline, closeOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { BookingListSkeleton } from '../components/Skeletons'
import type { CafeScheduleRow, BookingStatus } from '../types/database'
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

type Filter = 'all' | BookingStatus

type BookingWithUser = CafeScheduleRow & {
  users: { username: string; first_name: string | null; last_name: string | null } | null
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function displayName(b: BookingWithUser) {
  if (!b.users) return `User #${b.user_id}`
  const u = b.users
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}

export default function AdminCafeBookings() {
  const { toast, ToastEl } = useToast()
  const [bookings, setBookings]       = useState<BookingWithUser[]>([])
  const [calEvents, setCalEvents]     = useState<EventInput[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<Filter>('pending')
  const [selected, setSelected]       = useState<BookingWithUser | null>(null)
  const [updating, setUpdating]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cafe_schedule')
      .select('*, users!user_id(username, first_name, last_name)')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as BookingWithUser[]
    setBookings(rows)
    setCalEvents(rows
      .filter(r => ['pending', 'approved'].includes(r.status))
      .map(r => ({
        id:    String(r.id),
        title: r.event_name,
        date:  r.booking_date,
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
    const { error } = await supabase.from('cafe_schedule').update({ status }).eq('id', id)
    setUpdating(false)
    if (error) { toast(error.message, 'danger'); return }
    toast(`Booking ${status}.`, 'success')
    setSelected(null)
    load()
  }

  // Stats
  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  bookings.forEach(b => { counts[b.status as BookingStatus]++ })

  // Filtered + sorted list
  const list = filter === 'all'
    ? [...bookings].sort((a, b) =>
        STATUS_ORDER[a.status as BookingStatus] - STATUS_ORDER[b.status as BookingStatus])
    : bookings.filter(b => b.status === filter)

  return (
    <>
      {/* Stats */}
      <div className="admin-stats">
        {(['pending','approved','rejected','cancelled'] as BookingStatus[]).map(s => (
          <div key={s} className={`admin-stat-card stat-${s}`} onClick={() => setFilter(s)} style={{ cursor: 'pointer' }}>
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

      {/* Booking list */}
      {ToastEl}
      {loading ? (
        <BookingListSkeleton count={4} />
      ) : list.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={cafeOutline} />
          <p>No {filter === 'all' ? '' : filter} cafe bookings yet.</p>
        </div>
      ) : (
        <IonList lines="none" style={{ background: 'transparent', padding: 0 }}>
          {list.map(b => (
            <IonItemSliding key={b.id}>
              <IonItemOptions side="start">
                <IonItemOption color="success" expandable
                  onClick={() => updateStatus(b.id, 'approved')}>
                  <IonIcon slot="icon-only" icon={checkmarkCircleOutline} />
                </IonItemOption>
              </IonItemOptions>

              <IonItem lines="none" detail={false}
                onClick={() => setSelected(b)}
                style={{ '--background':'transparent','--padding-start':'0','--padding-end':'0','--inner-padding-end':'0','--min-height':'0','marginBottom':'8px' }}>
                <div className={`admin-bk-card status-${b.status}`} style={{ width:'100%', marginBottom:0, position:'relative', overflow:'hidden' }}>
                  <IonRippleEffect />
                  <div className="admin-bk-icon"><IonIcon icon={cafeOutline} /></div>
              <div className="admin-bk-body">
                <p className="admin-bk-name">{b.event_name}</p>
                <p className="admin-bk-meta">
                  <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}
                  &nbsp;·&nbsp;
                  <IonIcon icon={b.rent_whole_place ? homeOutline : peopleOutline} />
                  {b.rent_whole_place ? 'Whole place' : `${b.num_seats ?? '?'} seats`}
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
              </IonItem>

              <IonItemOptions side="end">
                <IonItemOption color="danger" expandable
                  onClick={() => updateStatus(b.id, 'rejected')}>
                  <IonIcon slot="icon-only" icon={closeCircleOutline} />
                </IonItemOption>
                <IonItemOption color="medium" expandable
                  onClick={() => updateStatus(b.id, 'cancelled')}>
                  <IonIcon slot="icon-only" icon={banOutline} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>
      )}

      {/* Calendar */}
      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <IonIcon icon={calendarOutline} />
        <h3>Bookings Calendar</h3>
      </div>
      <div className="admin-cal-wrap">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calEvents}
          height="auto"
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
          displayEventTime={false}
          eventDisplay="block"
          eventClick={info => {
            const b = bookings.find(x => String(x.id) === info.event.id)
            if (b) setSelected(b)
          }}
        />
      </div>
      <div className="admin-cal-legend">
        {(Object.entries(STATUS_COLOR) as [BookingStatus, string][]).map(([s,c]) => (
          <div key={s} className="legend-item">
            <span className="legend-dot" style={{ background: c }} />
            <span className="legend-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <IonModal isOpen={!!selected} onDidDismiss={() => setSelected(null)}
        breakpoints={[0, 0.6, 0.9]} initialBreakpoint={0.6}>
        {selected && (
          <div className="detail-modal-content">
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">{selected.event_name}</p>
                <IonBadge className={`status-badge badge-${selected.status}`}>
                  <IonIcon icon={STATUS_ICON[selected.status as BookingStatus]} />
                  {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                </IonBadge>
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
              <span className="detail-key">Reservation</span>
              <p className="detail-val">
                {selected.rent_whole_place ? 'Whole place (exclusive)' : `${selected.num_seats} seats`}
              </p>
            </div>
            {selected.booking_details && (
              <div className="detail-row">
                <span className="detail-key">Details</span>
                <p className="detail-val">{selected.booking_details}</p>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-key">Requested by</span>
              <p className="detail-val">{displayName(selected)}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Submitted</span>
              <p className="detail-val">
                {new Date(selected.created_at).toLocaleString('en-PH', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </p>
            </div>

            <div className="detail-actions">
              {selected.status !== 'approved' && (
                <IonButton color="success" onClick={() => updateStatus(selected.id, 'approved')}
                  disabled={updating}>
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
