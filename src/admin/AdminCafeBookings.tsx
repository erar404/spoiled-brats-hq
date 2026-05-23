import { useCallback, useEffect, useState } from 'react'
import {
  IonBadge, IonButton, IonChip, IonContent, IonIcon, IonInput,
  IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel,
  IonList, IonNote, IonRippleEffect, IonSegment, IonSegmentButton,
  IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  addCircleOutline, alertCircleOutline, banOutline, cafeOutline,
  calendarOutline, checkmarkCircleOutline, chevronForwardOutline,
  closeCircleOutline, closeOutline, homeOutline, lockClosedOutline,
  lockOpenOutline, pencilOutline, peopleOutline, personOutline,
  ribbonOutline, timeOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { BookingListSkeleton } from '../components/Skeletons'
import type { CafeScheduleRow, BookingStatus, BlockedScheduleRow } from '../types/database'
import './AdminBookings.css'

// ── Constants ──────────────────────────────────────────────────────────────────

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
const EXCL_COLOR = '#ba5624'   // burnt orange — exclusive/blocking admin event
const OPEN_COLOR = '#5b8dd9'   // blue — open admin event (concurrent bookings OK)

// ── Types ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | BookingStatus | 'admin_events'

type BookingWithUser = CafeScheduleRow & {
  users: { username: string; first_name: string | null; last_name: string | null } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function today() { return new Date().toISOString().split('T')[0] }

function displayName(b: BookingWithUser) {
  if (b.is_admin_event) return 'Admin'
  if (!b.users) return `User #${b.user_id}`
  const u = b.users
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminCafeBookings() {
  const { toast, ToastEl } = useToast()

  const [bookings,  setBookings]  = useState<BookingWithUser[]>([])
  const [calEvents, setCalEvents] = useState<EventInput[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<Filter>('pending')
  const [selected,  setSelected]  = useState<BookingWithUser | null>(null)
  const [updating,  setUpdating]  = useState(false)

  // ── Add event modal state ──
  const [showAdd,       setShowAdd]       = useState(false)
  const [addName,       setAddName]       = useState('')
  const [addDate,       setAddDate]       = useState('')
  const [addDetails,    setAddDetails]    = useState('')
  const [addConcurrent, setAddConcurrent] = useState(true)
  const [addingEvent,   setAddingEvent]   = useState(false)

  // ── Edit admin event state ──
  const [editMode,       setEditMode]       = useState(false)
  const [editName,       setEditName]       = useState('')
  const [editDate,       setEditDate]       = useState('')
  const [editDetails,    setEditDetails]    = useState('')
  const [editConcurrent, setEditConcurrent] = useState(true)

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data, error }, { data: blockData }] = await Promise.all([
      supabase
        .from('cafe_schedule')
        .select('*, users!user_id(username, first_name, last_name)')
        .order('created_at', { ascending: false }),
      supabase.from('blocked_schedules').select('*').eq('venue', 'cafe'),
    ])
    if (error) { setLoading(false); return }
    const rows = (data ?? []) as BookingWithUser[]
    setBookings(rows)

    const bookingEvents: EventInput[] = rows
      .filter(r => r.is_admin_event
        ? r.status === 'approved'
        : ['pending', 'approved'].includes(r.status))
      .map(r => {
        if (r.is_admin_event) {
          const excl = !r.allow_concurrent_bookings
          return {
            id: String(r.id),
            title: (excl ? '🔒 ' : '★ ') + r.event_name,
            date: r.booking_date,
            backgroundColor: excl ? EXCL_COLOR : OPEN_COLOR,
            borderColor: 'transparent', textColor: '#ffffff',
          }
        }
        return {
          id: String(r.id),
          title: r.event_name,
          date: r.booking_date,
          backgroundColor: STATUS_COLOR[r.status as BookingStatus],
          borderColor: 'transparent', textColor: '#ffffff',
        }
      })

    const blockedEvents: EventInput[] = ((blockData ?? []) as BlockedScheduleRow[]).map(r => ({
      id: `bl-${r.id}`,
      title: 'ADMIN BLOCKED SCHED',
      date: r.block_date,
      allDay: true,
      backgroundColor: '#2d1320', borderColor: '#2d1320', textColor: '#ffffff',
    }))

    setCalEvents([...bookingEvents, ...blockedEvents])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Select handler ────────────────────────────────────────────────────────

  function openSelected(b: BookingWithUser) {
    setSelected(b)
    setEditMode(false)
    if (b.is_admin_event) {
      setEditName(b.event_name)
      setEditDate(b.booking_date)
      setEditDetails(b.booking_details ?? '')
      setEditConcurrent(b.allow_concurrent_bookings)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function updateStatus(id: number, status: BookingStatus) {
    setUpdating(true)
    const { error } = await supabase.from('cafe_schedule').update({ status }).eq('id', id)
    setUpdating(false)
    if (error) { toast(error.message, 'danger'); return }
    toast(`Booking ${status}.`, 'success')
    setSelected(null)
    load()
  }

  async function addAdminEvent() {
    if (!addName.trim()) return toast('Event name is required.', 'warning')
    if (!addDate)        return toast('Event date is required.', 'warning')
    setAddingEvent(true)
    const { error } = await supabase.from('cafe_schedule').insert({
      event_name:                addName.trim(),
      booking_date:              addDate,
      booking_details:           addDetails.trim() || null,
      is_admin_event:            true,
      allow_concurrent_bookings: addConcurrent,
      rent_whole_place:          false,
      num_seats:                 null,
      user_id:                   null,
      status:                    'approved',
    })
    setAddingEvent(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Event added to calendar.', 'success')
    setShowAdd(false)
    setAddName(''); setAddDate(''); setAddDetails(''); setAddConcurrent(true)
    load()
  }

  async function saveAdminEvent() {
    if (!selected) return
    if (!editName.trim()) return toast('Event name is required.', 'warning')
    if (!editDate)        return toast('Date is required.', 'warning')
    setUpdating(true)
    const { error } = await supabase.from('cafe_schedule').update({
      event_name:                editName.trim(),
      booking_date:              editDate,
      booking_details:           editDetails.trim() || null,
      allow_concurrent_bookings: editConcurrent,
    }).eq('id', selected.id)
    setUpdating(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Event updated.', 'success')
    setSelected(null); setEditMode(false)
    load()
  }

  async function deleteAdminEvent() {
    if (!selected) return
    setUpdating(true)
    await supabase.from('cafe_schedule').delete().eq('id', selected.id)
    setUpdating(false)
    toast('Event deleted.', 'success')
    setSelected(null)
    load()
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  const adminEventCount = bookings.filter(b => b.is_admin_event).length
  bookings.forEach(b => { if (!b.is_admin_event) counts[b.status as BookingStatus]++ })

  const list: BookingWithUser[] = filter === 'all'
    ? [...bookings].sort((a, b) => {
        if (a.is_admin_event !== b.is_admin_event) return a.is_admin_event ? -1 : 1
        return STATUS_ORDER[a.status as BookingStatus] - STATUS_ORDER[b.status as BookingStatus]
      })
    : filter === 'admin_events'
      ? bookings.filter(b => b.is_admin_event)
      : bookings.filter(b => !b.is_admin_event && b.status === filter)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {ToastEl}

      {/* Page header */}
      <div className="admin-bk-page-header">
        <h3 className="admin-bk-page-title">Cafe Bookings</h3>
        <IonButton size="small" color="primary" onClick={() => setShowAdd(true)}>
          <IonIcon slot="start" icon={addCircleOutline} />Add Event
        </IonButton>
      </div>

      {/* Stats — 5 cards */}
      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {(['pending', 'approved', 'rejected', 'cancelled'] as BookingStatus[]).map(s => (
          <div key={s} className={`admin-stat-card stat-${s}`}
            onClick={() => setFilter(s)} style={{ cursor: 'pointer' }}>
            <p className="stat-num">{counts[s]}</p>
            <p className="stat-label">{s.charAt(0).toUpperCase() + s.slice(1)}</p>
          </div>
        ))}
        <div className="admin-stat-card"
          style={{ borderColor: EXCL_COLOR, background: 'rgba(186,86,36,0.07)', cursor: 'pointer' }}
          onClick={() => setFilter('admin_events')}>
          <p className="stat-num">{adminEventCount}</p>
          <p className="stat-label">Events</p>
        </div>
      </div>

      {/* Filter segment */}
      <IonSegment value={filter} onIonChange={e => setFilter(e.detail.value as Filter)}
        className="admin-filter-segment" scrollable>
        <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
        <IonSegmentButton value="pending"><IonLabel>Pending</IonLabel></IonSegmentButton>
        <IonSegmentButton value="approved"><IonLabel>Approved</IonLabel></IonSegmentButton>
        <IonSegmentButton value="rejected"><IonLabel>Rejected</IonLabel></IonSegmentButton>
        <IonSegmentButton value="cancelled"><IonLabel>Cancelled</IonLabel></IonSegmentButton>
        <IonSegmentButton value="admin_events"><IonLabel>Admin Events</IonLabel></IonSegmentButton>
      </IonSegment>

      {/* Booking list */}
      {loading ? (
        <BookingListSkeleton count={4} />
      ) : list.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={cafeOutline} aria-hidden="true" />
          <p>
            {filter === 'all' ? 'No cafe bookings yet.'
              : filter === 'admin_events' ? 'No admin events. Tap "Add Event" to create one.'
              : `No ${filter} bookings.`}
          </p>
        </div>
      ) : (
        <IonList lines="none" style={{ background: 'transparent', padding: 0 }}>
          {list.map(b => b.is_admin_event ? (

            /* ── Admin event card (no swipe) ── */
            <IonItem key={b.id} lines="none" detail={false}
              onClick={() => openSelected(b)}
              style={{ '--background':'transparent','--padding-start':'0','--padding-end':'0',
                       '--inner-padding-end':'0','--min-height':'0', marginBottom:'8px' }}>
              <div className="admin-bk-card admin-event-card" style={{ width: '100%' }}>
                <IonRippleEffect />
                <div className="admin-bk-icon" style={{
                  background: `${b.allow_concurrent_bookings ? OPEN_COLOR : EXCL_COLOR}22`,
                }}>
                  <IonIcon icon={ribbonOutline} style={{
                    color: b.allow_concurrent_bookings ? OPEN_COLOR : EXCL_COLOR,
                  }} />
                </div>
                <div className="admin-bk-body">
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                    <p className="admin-bk-name" style={{ margin: 0 }}>{b.event_name}</p>
                    <IonChip style={{
                      '--background': b.allow_concurrent_bookings ? OPEN_COLOR : EXCL_COLOR,
                      '--color': '#fff', height: 18, fontSize: 10, margin: 0, padding: '0 8px',
                    }}>
                      <IonLabel style={{ fontSize: 10, fontWeight: 600 }}>Admin Event</IonLabel>
                    </IonChip>
                  </div>
                  <p className="admin-bk-meta">
                    <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}
                    &nbsp;·&nbsp;
                    <IonIcon icon={b.allow_concurrent_bookings ? lockOpenOutline : lockClosedOutline} />
                    {b.allow_concurrent_bookings ? 'Concurrent OK' : 'Exclusive'}
                  </p>
                </div>
                <div className="admin-bk-right">
                  <IonBadge style={{
                    '--background': b.allow_concurrent_bookings ? OPEN_COLOR : EXCL_COLOR,
                    '--color': '#fff', fontSize: 10, padding: '3px 8px',
                  }}>
                    <IonIcon icon={b.allow_concurrent_bookings ? lockOpenOutline : lockClosedOutline}
                      style={{ marginRight: 3, fontSize: 11 }} />
                    {b.allow_concurrent_bookings ? 'Open' : 'Exclusive'}
                  </IonBadge>
                  <IonIcon icon={chevronForwardOutline} className="admin-bk-chevron" />
                </div>
              </div>
            </IonItem>

          ) : (

            /* ── User booking card (with swipe) ── */
            <IonItemSliding key={b.id}>
              <IonItemOptions side="start">
                <IonItemOption color="success" expandable
                  onClick={() => updateStatus(b.id, 'approved')}>
                  <IonIcon slot="icon-only" icon={checkmarkCircleOutline} />
                </IonItemOption>
              </IonItemOptions>

              <IonItem lines="none" detail={false}
                onClick={() => openSelected(b)}
                style={{ '--background':'transparent','--padding-start':'0','--padding-end':'0',
                         '--inner-padding-end':'0','--min-height':'0', marginBottom:'8px' }}>
                <div className={`admin-bk-card status-${b.status}`}
                  style={{ width:'100%', marginBottom:0, position:'relative', overflow:'hidden' }}>
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
          initialView="dayGridMonth" events={calEvents} height="auto"
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
          displayEventTime={false} eventDisplay="block"
          eventClick={info => {
            const b = bookings.find(x => String(x.id) === info.event.id)
            if (b) openSelected(b)
          }}
        />
      </div>
      <div className="admin-cal-legend">
        {(Object.entries(STATUS_COLOR) as [BookingStatus, string][]).map(([s, c]) => (
          <div key={s} className="legend-item">
            <span className="legend-dot" style={{ background: c }} />
            <span className="legend-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-dot" style={{ background: OPEN_COLOR }} />
          <span className="legend-label">Admin Event (Open)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: EXCL_COLOR }} />
          <span className="legend-label">Admin Event (Exclusive)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#2d1320' }} />
          <span className="legend-label">Admin Blocked</span>
        </div>
      </div>

      {/* ── Detail modal — branches on is_admin_event ── */}
      <AppModal isOpen={!!selected}
        onDidDismiss={() => { setSelected(null); setEditMode(false) }}
        breakpoints={[0, 0.6, 0.92]}
        initialBreakpoint={selected?.is_admin_event ? 0.75 : 0.6}>
        <IonContent>
          {selected && selected.is_admin_event ? (

            /* Admin event detail / edit */
            <div className="detail-modal-content">
              <div className="detail-modal-header">
                <div>
                  <p className="detail-modal-title">
                    {editMode ? 'Edit Event' : selected.event_name}
                  </p>
                  <IonChip style={{
                    '--background': selected.allow_concurrent_bookings ? OPEN_COLOR : EXCL_COLOR,
                    '--color': '#fff', height: 22, fontSize: 11, marginTop: 4,
                  }}>
                    <IonIcon icon={ribbonOutline} style={{ fontSize: 13 }} />
                    <IonLabel style={{ fontSize: 11, fontWeight: 600, marginLeft: 3 }}>Admin Event</IonLabel>
                  </IonChip>
                </div>
                <IonButton fill="clear" className="detail-modal-close"
                  onClick={() => { setSelected(null); setEditMode(false) }}>
                  <IonIcon slot="icon-only" icon={closeOutline} />
                </IonButton>
              </div>

              {editMode ? (
                <>
                  <div className="p7-field">
                    <IonInput label="Event Name *" labelPlacement="stacked" fill="outline"
                      value={editName} onIonInput={e => setEditName(e.detail.value ?? '')}
                      className="p7-input" />
                  </div>
                  <div className="p7-field">
                    <IonInput label="Date *" labelPlacement="stacked" fill="outline"
                      type="date" value={editDate}
                      onIonInput={e => setEditDate(e.detail.value ?? '')}
                      className="p7-input" />
                  </div>
                  <div className="p7-field">
                    <IonTextarea label="Details" labelPlacement="stacked" fill="outline"
                      value={editDetails} onIonInput={e => setEditDetails(e.detail.value ?? '')}
                      autoGrow rows={2} className="p7-input" />
                  </div>
                  <IonItem lines="none" style={{ '--background': 'var(--color-surface-container-low)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
                    <IonIcon icon={editConcurrent ? lockOpenOutline : lockClosedOutline}
                      slot="start" color={editConcurrent ? 'primary' : 'danger'} />
                    <IonLabel>
                      <h3>Allow Concurrent Bookings</h3>
                      <IonNote>{editConcurrent ? 'Users can request bookings on this date' : 'Users will be blocked from booking on this date'}</IonNote>
                    </IonLabel>
                    <IonToggle slot="end" checked={editConcurrent}
                      onIonChange={e => setEditConcurrent(e.detail.checked)} color="primary" />
                  </IonItem>
                  <div className="detail-actions">
                    <IonButton color="primary" onClick={saveAdminEvent} disabled={updating}>
                      {updating ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={checkmarkCircleOutline} />Save</>}
                    </IonButton>
                    <IonButton fill="outline" onClick={() => setEditMode(false)} disabled={updating}>
                      Cancel
                    </IonButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="detail-row">
                    <span className="detail-key">Date</span>
                    <p className="detail-val">{fmtDate(selected.booking_date)}</p>
                  </div>
                  {selected.booking_details && (
                    <div className="detail-row">
                      <span className="detail-key">Details</span>
                      <p className="detail-val">{selected.booking_details}</p>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-key">Concurrent Bookings</span>
                    <p className="detail-val" style={{
                      color: selected.allow_concurrent_bookings ? '#687959' : EXCL_COLOR,
                      fontWeight: 600,
                    }}>
                      <IonIcon icon={selected.allow_concurrent_bookings ? lockOpenOutline : lockClosedOutline}
                        style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      {selected.allow_concurrent_bookings ? 'Allowed' : 'Not allowed — exclusive event'}
                    </p>
                  </div>
                  <div className="detail-actions">
                    <IonButton fill="outline" onClick={() => setEditMode(true)}>
                      <IonIcon slot="start" icon={pencilOutline} />Edit
                    </IonButton>
                    <IonButton color="danger" fill="outline" onClick={deleteAdminEvent} disabled={updating}>
                      {updating ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={trashOutline} />Delete</>}
                    </IonButton>
                  </div>
                </>
              )}
            </div>

          ) : selected ? (

            /* User booking detail */
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

          ) : null}
        </IonContent>
      </AppModal>

      {/* ── Add Event modal ── */}
      <AppModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)}
        breakpoints={[0, 0.88]} initialBreakpoint={0.88}>
        <IonContent>
          <div className="detail-modal-content">
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">Add Admin Event</p>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: '2px 0 0' }}>
                  Add an event to the cafe calendar
                </p>
              </div>
              <IonButton fill="clear" className="detail-modal-close"
                onClick={() => setShowAdd(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            <div className="p7-field">
              <IonInput label="Event Name *" labelPlacement="stacked" fill="outline"
                value={addName} onIonInput={e => setAddName(e.detail.value ?? '')}
                placeholder="e.g. Christmas Party, Live Music Night" className="p7-input" />
            </div>
            <div className="p7-field">
              <IonInput label="Event Date *" labelPlacement="stacked" fill="outline"
                type="date" value={addDate} min={today()}
                onIonInput={e => setAddDate(e.detail.value ?? '')} className="p7-input" />
            </div>
            <div className="p7-field">
              <IonTextarea label="Event Details" labelPlacement="stacked" fill="outline"
                value={addDetails} onIonInput={e => setAddDetails(e.detail.value ?? '')}
                placeholder="Notes for staff, event description…"
                autoGrow rows={3} className="p7-input" />
            </div>

            <IonItem lines="none" style={{ '--background': 'var(--color-surface-container-low)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
              <IonIcon icon={addConcurrent ? lockOpenOutline : lockClosedOutline}
                slot="start" color={addConcurrent ? 'primary' : 'danger'} />
              <IonLabel>
                <h3>Allow Concurrent Bookings</h3>
                <IonNote>
                  {addConcurrent
                    ? 'Users can still request bookings on this date'
                    : 'Users will be blocked from booking on this date'}
                </IonNote>
              </IonLabel>
              <IonToggle slot="end" checked={addConcurrent}
                onIonChange={e => setAddConcurrent(e.detail.checked)} color="primary" />
            </IonItem>

            {!addConcurrent && (
              <div className="admin-event-excl-notice">
                <IonIcon icon={lockClosedOutline} />
                <p>Exclusive mode: users who try to book on <strong>{addDate || 'this date'}</strong> will see a blocked notice.</p>
              </div>
            )}

            <div className="detail-actions" style={{ marginTop: 20 }}>
              <IonButton expand="block" color="primary" onClick={addAdminEvent} disabled={addingEvent}>
                {addingEvent
                  ? <IonSpinner name="crescent" />
                  : <><IonIcon slot="start" icon={addCircleOutline} />Add to Calendar</>}
              </IonButton>
            </div>
          </div>
        </IonContent>
      </AppModal>
    </>
  )
}
