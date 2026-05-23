import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonBadge, IonButton, IonChip, IonContent, IonIcon, IonInput,
  IonLabel, IonList, IonItem, IonNote,
  IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonSpinner, IonTextarea,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import InvoiceTemplate from '../components/InvoiceTemplate'
import type { InvoiceData } from '../components/InvoiceTemplate'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  addCircleOutline, alertCircleOutline, banOutline, calendarOutline,
  cashOutline, checkmarkCircleOutline, closeCircleOutline, closeOutline,
  cloudUploadOutline, imageOutline, mailOutline, micOutline,
  musicalNotesOutline, personOutline, receiptOutline, timeOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { BookingListSkeleton } from '../components/Skeletons'
import { sendPaymentNotification, sendInvoiceEmail } from '../lib/emailService'
import type { StudioScheduleRow, StudioBookingStatus, BookingType, BlockedScheduleRow } from '../types/database'
import './AdminBookings.css'
import './AdminPhase7.css'

// ── Status metadata ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<StudioBookingStatus, string> = {
  for_approval:    '#5b8dd9',
  pending_payment: '#fea451',
  pending_approval:'#c17f24',
  approved:        '#687959',
  rejected:        '#ba1a1a',
  cancelled:       '#8a7269',
}
const STATUS_ICON: Record<StudioBookingStatus, string> = {
  for_approval:    timeOutline,
  pending_payment: cashOutline,
  pending_approval:cloudUploadOutline,
  approved:        checkmarkCircleOutline,
  rejected:        closeCircleOutline,
  cancelled:       banOutline,
}
const STATUS_LABEL: Record<StudioBookingStatus, string> = {
  for_approval:    'For Approval',
  pending_payment: 'Pending Payment',
  pending_approval:'Pending Approval',
  approved:        'Approved',
  rejected:        'Rejected',
  cancelled:       'Cancelled',
}
const STATUS_ORDER: Record<StudioBookingStatus, number> = {
  for_approval: 0, pending_payment: 1, pending_approval: 2,
  approved: 3, rejected: 4, cancelled: 5,
}
const TYPE_COLOR: Record<BookingType, string> = {
  recording: 'var(--color-primary)',
  rehearsal:  'var(--color-tertiary)',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | StudioBookingStatus

type SessionWithUser = StudioScheduleRow & {
  users: {
    username: string
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

interface GCashInfo { number: string; name: string; qr_url: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  if (!b.users) return b.user_id ? `User #${b.user_id}` : 'Admin (manual)'
  const u = b.users
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}
function today() { return new Date().toISOString().split('T')[0] }

function fmtInvoiceDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function calcHours(start: string, end: string, overnight = false): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins   = overnight ? 24 * 60 + eh * 60 + em : eh * 60 + em
  const diff = endMins - startMins
  return diff > 0 ? diff / 60 : 0
}

function fmtTimeSlot(start: string, end: string, overnight = false): string {
  return `${fmtTime(start)} – ${fmtTime(end)}${overnight ? ' (+1)' : ''}`
}

function buildInvoiceData(b: SessionWithUser): InvoiceData {
  const year = new Date(b.booking_date + 'T00:00:00').getFullYear()
  const invoiceNumber = `KJN-${year}${String(b.id).padStart(3, '0')}`
  const invoiceDate = fmtInvoiceDate(b.booking_date)
  const hours = calcHours(b.start_time, b.end_time, b.overnight)
  const amount = b.admin_price ?? 0
  const rate = hours > 0 ? amount / hours : amount
  const startHour = parseInt(b.start_time.split(':')[0], 10)
  const sessionLabel = `${startHour < 12 ? 'AM' : 'PM'} Session (${fmtTime(b.start_time)} – ${fmtTime(b.end_time)})`
  return {
    invoiceNumber,
    invoiceDate,
    dueDate: invoiceDate,
    terms: 'Custom',
    clientName: b.band_artist_name,
    clientEmail: b.users?.email ?? undefined,
    items: [{
      description: b.booking_type === 'recording' ? 'Recording' : 'Rehearsals',
      subDescription: sessionLabel,
      hours,
      rate,
      amount,
    }],
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminStudioBookings() {
  const { toast, ToastEl } = useToast()
  const proofImgRef = useRef<HTMLImageElement>(null)

  const [sessions,  setSessions]  = useState<SessionWithUser[]>([])
  const [calEvents, setCalEvents] = useState<EventInput[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<Filter>('for_approval')
  const [selected,  setSelected]  = useState<SessionWithUser | null>(null)
  const [updating,  setUpdating]  = useState(false)
  const [gcash,     setGcash]     = useState<GCashInfo>({ number:'', name:'', qr_url:'' })
  const [showInvoice, setShowInvoice] = useState(false)

  // Edit fields (for_approval review)
  const [editStart, setEditStart] = useState('')
  const [editEnd,   setEditEnd]   = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Add manual booking state
  const [showAddBooking,  setShowAddBooking]  = useState(false)
  const [addBandName,     setAddBandName]     = useState('')
  const [addBookingDate,  setAddBookingDate]  = useState('')
  const [addStartTime,    setAddStartTime]    = useState('')
  const [addEndTime,      setAddEndTime]      = useState('')
  const [addBookingType,  setAddBookingType]  = useState<BookingType>('rehearsal')
  const [addPrice,        setAddPrice]        = useState('')
  const [addNotes,        setAddNotes]        = useState('')
  const [addStatus,       setAddStatus]       = useState<StudioBookingStatus>('approved')
  const [addingBooking,   setAddingBooking]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sessions, error }, { data: gcashRow }, { data: blockData }] = await Promise.all([
      supabase.from('studio_schedule')
        .select('*, users!user_id(username, first_name, last_name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('system_settings').select('value').eq('key', 'gcash_info').single(),
      supabase.from('blocked_schedules').select('*').eq('venue', 'studio'),
    ])
    if (error) { setLoading(false); return }
    setSessions((sessions ?? []) as SessionWithUser[])
    const sessionEvents: EventInput[] = (sessions ?? [])
      .filter((r: any) => ['for_approval','pending_payment','pending_approval','approved'].includes(r.status))
      .map((r: any) => {
        const endDate = r.overnight ? nextDay(r.booking_date) : r.booking_date
        return {
          id:    String(r.id),
          title: r.band_artist_name,
          start: `${r.booking_date}T${r.start_time}`,
          end:   `${endDate}T${r.end_time}`,
          backgroundColor: STATUS_COLOR[r.status as StudioBookingStatus],
          borderColor: 'transparent', textColor: '#ffffff',
        }
      })
    const blockedEvents: EventInput[] = ((blockData ?? []) as BlockedScheduleRow[]).map(r => ({
      id:    `bl-${r.id}`,
      title: 'ADMIN BLOCKED SCHED',
      ...(r.start_time && r.end_time
        ? { start: `${r.block_date}T${r.start_time}`, end: `${r.block_date}T${r.end_time}` }
        : { start: `${r.block_date}T00:00:00`, end: `${r.block_date}T23:59:00` }),
      backgroundColor: '#2d1320',
      borderColor: '#2d1320',
      textColor: '#ffffff',
    }))
    setCalEvents([...sessionEvents, ...blockedEvents])
    const gv = gcashRow?.value as unknown as GCashInfo | null
    if (gv) setGcash(gv)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openSelected(b: SessionWithUser) {
    setSelected(b)
    setEditStart(b.start_time)
    setEditEnd(b.end_time)
    setEditPrice(b.admin_price != null ? String(b.admin_price) : '')
    setEditNotes(b.admin_notes ?? '')
  }

  async function approveForPayment() {
    if (!selected) return
    if (!editStart || !editEnd)               return toast('Start and end time required.', 'warning')
    if (editStart === editEnd)                return toast('Start and end time cannot be the same.', 'warning')
    if (!editPrice || parseFloat(editPrice) <= 0) return toast('Set a valid price.', 'warning')

    const overnight = editEnd < editStart

    setUpdating(true)
    const { error } = await supabase.from('studio_schedule').update({
      status:      'pending_payment',
      start_time:  editStart,
      end_time:    editEnd,
      overnight,
      admin_price: parseFloat(editPrice),
      admin_notes: editNotes.trim() || null,
    }).eq('id', selected.id)
    setUpdating(false)
    if (error) { toast(error.message, 'danger'); return }

    // Send payment notification email
    const email = selected.users?.email
    if (email) {
      const sent = await sendPaymentNotification({
        toName:      displayName(selected),
        toEmail:     email,
        bookingId:   selected.id,
        bandName:    selected.band_artist_name,
        sessionType: selected.booking_type,
        bookingDate: fmtDate(selected.booking_date),
        startTime:   fmtTime(editStart),
        endTime:     fmtTime(editEnd),
        amount:      parseFloat(editPrice),
        gcashNumber: gcash.number,
        gcashName:   gcash.name,
        qrCodeUrl:   gcash.qr_url,
      })
      toast(sent ? 'Approved. Payment email sent.' : 'Approved. Email not sent (check EmailJS config).', sent ? 'success' : 'warning')
    } else {
      toast('Approved. No email on file for this user.', 'success')
    }

    setSelected(null)
    load()
  }

  async function confirmPayment() {
    if (!selected) return
    setUpdating(true)
    const { error } = await supabase.from('studio_schedule')
      .update({ status: 'approved' }).eq('id', selected.id)
    setUpdating(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Payment confirmed. Booking approved.', 'success')
    setSelected(null)
    load()
  }

  async function rejectPayment() {
    if (!selected) return
    setUpdating(true)
    await supabase.from('studio_schedule')
      .update({ status: 'pending_payment', payment_proof_url: null }).eq('id', selected.id)
    setUpdating(false)
    toast('Payment proof rejected. User must re-submit.', 'warning')
    setSelected(null)
    load()
  }

  async function reject() {
    if (!selected) return
    setUpdating(true)
    await supabase.from('studio_schedule').update({ status: 'rejected' }).eq('id', selected.id)
    setUpdating(false)
    toast('Booking rejected.', 'danger')
    setSelected(null)
    load()
  }

  async function sendInvoice() {
    if (!selected) return
    const email = selected.users?.email
    if (!email) { toast('No email on file for this user.', 'warning'); return }
    setUpdating(true)
    const sent = await sendInvoiceEmail({
      toName:      displayName(selected),
      toEmail:     email,
      bookingId:   selected.id,
      bandName:    selected.band_artist_name,
      sessionType: selected.booking_type,
      bookingDate: fmtDate(selected.booking_date),
      startTime:   fmtTime(selected.start_time),
      endTime:     fmtTime(selected.end_time),
      amount:      selected.admin_price ?? 0,
    })
    if (sent) {
      await supabase.from('studio_schedule').update({ invoice_sent: true }).eq('id', selected.id)
      load()
    }
    setUpdating(false)
    toast(sent ? 'Invoice sent.' : 'Could not send invoice (check EmailJS config).', sent ? 'success' : 'warning')
  }

  async function addManualBooking() {
    if (!addBandName.trim()) return toast('Band / Artist name is required.', 'warning')
    if (!addBookingDate)     return toast('Booking date is required.', 'warning')
    if (!addStartTime) return toast('Start time is required.', 'warning')
    if (!addEndTime)   return toast('End time is required.', 'warning')
    if (addStartTime === addEndTime) return toast('Start and end time cannot be the same.', 'warning')

    const overnight = addEndTime < addStartTime

    setAddingBooking(true)
    const { error } = await supabase.from('studio_schedule').insert({
      band_artist_name: addBandName.trim(),
      booking_date:     addBookingDate,
      start_time:       addStartTime,
      end_time:         addEndTime,
      overnight,
      booking_type:     addBookingType,
      status:           addStatus,
      admin_price:      addPrice ? parseFloat(addPrice) : null,
      admin_notes:      addNotes.trim() || null,
      user_id:          null,
      invoice_sent:     false,
    })
    setAddingBooking(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Booking added successfully.', 'success')
    setShowAddBooking(false)
    setAddBandName(''); setAddBookingDate(''); setAddStartTime(''); setAddEndTime('')
    setAddBookingType('rehearsal'); setAddPrice(''); setAddNotes(''); setAddStatus('approved')
    load()
  }

  // Stats
  const counts = Object.keys(STATUS_LABEL).reduce((acc, k) => {
    acc[k as StudioBookingStatus] = sessions.filter(s => s.status === k).length
    return acc
  }, {} as Record<StudioBookingStatus, number>)

  const list = filter === 'all'
    ? [...sessions].sort((a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    : sessions.filter(b => b.status === filter)

  return (
    <>
      {ToastEl}

      {/* Page header */}
      <div className="admin-bk-page-header">
        <h3 className="admin-bk-page-title">Studio Bookings</h3>
        <IonButton size="small" color="primary" onClick={() => setShowAddBooking(true)}>
          <IonIcon slot="start" icon={addCircleOutline} />Add Booking
        </IonButton>
      </div>

      {/* Stats */}
      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {(['for_approval','pending_payment','pending_approval','approved','rejected','cancelled'] as StudioBookingStatus[]).map(s => (
          <div key={s} className="admin-stat-card"
            style={{ borderTop: `3px solid ${STATUS_COLOR[s]}`, cursor:'pointer' }}
            onClick={() => setFilter(s)}>
            <p className="stat-num">{counts[s] ?? 0}</p>
            <p className="stat-label" style={{ fontSize:10 }}>{STATUS_LABEL[s]}</p>
          </div>
        ))}
      </div>

      {/* Filter segment */}
      <IonSegment value={filter} onIonChange={e => setFilter(e.detail.value as Filter)}
        className="admin-filter-segment" scrollable>
        <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
        <IonSegmentButton value="for_approval"><IonLabel>For Approval</IonLabel></IonSegmentButton>
        <IonSegmentButton value="pending_payment"><IonLabel>Pending Payment</IonLabel></IonSegmentButton>
        <IonSegmentButton value="pending_approval"><IonLabel>Pending Approval</IonLabel></IonSegmentButton>
        <IonSegmentButton value="approved"><IonLabel>Approved</IonLabel></IonSegmentButton>
        <IonSegmentButton value="rejected"><IonLabel>Rejected</IonLabel></IonSegmentButton>
        <IonSegmentButton value="cancelled"><IonLabel>Cancelled</IonLabel></IonSegmentButton>
      </IonSegment>

      {/* Session list */}
      {loading ? (
        <BookingListSkeleton count={4} />
      ) : list.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={musicalNotesOutline} />
          <p>No {filter === 'all' ? '' : STATUS_LABEL[filter as StudioBookingStatus]} sessions.</p>
        </div>
      ) : (
        <IonList lines="none" style={{ background:'transparent', padding:0 }}>
          {list.map(b => (
            <IonItem key={b.id} lines="none" detail={false} onClick={() => openSelected(b)}
              style={{ '--background':'transparent','--padding-start':'0','--inner-padding-end':'0','marginBottom':'8px' }}>
              <div className={`admin-bk-card admin-bk-card--studio status-${b.status}`} style={{ width:'100%' }}>
                <div className="admin-bk-icon">
                  <IonIcon icon={b.booking_type === 'recording' ? micOutline : musicalNotesOutline} />
                </div>
                <div className="admin-bk-body">
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p className="admin-bk-name" style={{ margin:0 }}>{b.band_artist_name}</p>
                    <IonChip style={{
                      '--background': TYPE_COLOR[b.booking_type as BookingType],
                      '--color':'#ffffff', height:20, fontSize:10, margin:0, padding:'0 8px',
                    }}>
                      <IonLabel style={{ fontSize:10, fontWeight:600 }}>
                        {b.booking_type.charAt(0).toUpperCase() + b.booking_type.slice(1)}
                      </IonLabel>
                    </IonChip>
                  </div>
                  <p className="admin-bk-meta">
                    <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}
                    &nbsp;·&nbsp;
                    <IonIcon icon={timeOutline} />{fmtTimeSlot(b.start_time, b.end_time, b.overnight)}
                    {b.admin_price && <>&nbsp;·&nbsp;₱{b.admin_price.toLocaleString()}</>}
                    &nbsp;·&nbsp;
                    <IonIcon icon={personOutline} />{displayName(b)}
                  </p>
                </div>
                <IonBadge style={{
                  '--background': STATUS_COLOR[b.status],
                  '--color':'#ffffff', flexShrink:0, fontSize:10, padding:'3px 8px',
                }}>
                  <IonIcon icon={STATUS_ICON[b.status]} style={{ marginRight:3, fontSize:11 }} />
                  {STATUS_LABEL[b.status]}
                </IonBadge>
              </div>
            </IonItem>
          ))}
        </IonList>
      )}

      {/* Calendar */}
      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <IonIcon icon={calendarOutline} />
        <h3>Sessions Calendar</h3>
      </div>
      <div className="admin-cal-wrap">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek" events={calEvents} height="auto"
          slotMinTime="08:00:00" slotMaxTime="23:30:00" slotDuration="00:30:00"
          headerToolbar={{ left:'prev,next', center:'title', right:'timeGridWeek,dayGridMonth' }}
          buttonText={{ timeGridWeek:'Week', dayGridMonth:'Month' }} allDaySlot={false}
          eventClick={info => {
            const b = sessions.find(x => String(x.id) === info.event.id)
            if (b) openSelected(b)
          }}
        />
      </div>
      <div className="admin-cal-legend">
        {(Object.entries(STATUS_COLOR) as [StudioBookingStatus,string][]).map(([s,c]) => (
          <div key={s} className="legend-item">
            <span className="legend-dot" style={{ background: c }} />
            <span className="legend-label">{STATUS_LABEL[s]}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#2d1320' }} />
          <span className="legend-label">Admin Blocked</span>
        </div>
      </div>

      {/* ── Detail modal ── */}
      {/* ── Add Manual Booking modal ── */}
      <AppModal isOpen={showAddBooking} onDidDismiss={() => setShowAddBooking(false)}
        breakpoints={[0, 0.95]} initialBreakpoint={0.95}>
        <IonContent>
          <div className="detail-modal-content">
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">Add Manual Booking</p>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: '2px 0 0' }}>
                  Create a studio booking directly
                </p>
              </div>
              <IonButton fill="clear" className="detail-modal-close"
                onClick={() => setShowAddBooking(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            {/* Session type */}
            <p className="studio-flow-heading">Session Type</p>
            <IonSegment value={addBookingType}
              onIonChange={e => setAddBookingType(e.detail.value as BookingType)}
              style={{ marginBottom: 16 }}>
              <IonSegmentButton value="rehearsal">
                <IonIcon icon={musicalNotesOutline} />
                <IonLabel>Rehearsal</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="recording">
                <IonIcon icon={micOutline} />
                <IonLabel>Recording</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            <div className="p7-field">
              <IonInput label="Band / Artist Name *" labelPlacement="stacked" fill="outline"
                value={addBandName} onIonInput={e => setAddBandName(e.detail.value ?? '')}
                placeholder="e.g. The Sound Collective" className="p7-input" />
            </div>

            <div className="p7-field">
              <IonInput label="Booking Date *" labelPlacement="stacked" fill="outline"
                type="date" value={addBookingDate}
                onIonInput={e => setAddBookingDate(e.detail.value ?? '')} className="p7-input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="p7-field" style={{ marginBottom: 0 }}>
                <IonInput label="Start Time *" labelPlacement="stacked" fill="outline"
                  type="time" value={addStartTime}
                  onIonInput={e => setAddStartTime(e.detail.value ?? '')} className="p7-input" />
              </div>
              <div className="p7-field" style={{ marginBottom: 0 }}>
                <IonInput label="End Time *" labelPlacement="stacked" fill="outline"
                  type="time" value={addEndTime}
                  onIonInput={e => setAddEndTime(e.detail.value ?? '')} className="p7-input" />
              </div>
            </div>

            <div className="p7-field">
              <IonInput label="Price (₱)" labelPlacement="stacked" fill="outline"
                type="number" min="0" step="50" value={addPrice}
                onIonInput={e => setAddPrice(e.detail.value ?? '')}
                placeholder="e.g. 1200" className="p7-input" />
            </div>

            <div className="p7-field">
              <IonTextarea label="Notes" labelPlacement="stacked" fill="outline"
                value={addNotes} onIonInput={e => setAddNotes(e.detail.value ?? '')}
                autoGrow rows={2} className="p7-input"
                placeholder="Internal notes, special arrangements…" />
            </div>

            {/* Status selector with color indicator */}
            <div className="p7-field" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 18, right: 40, width: 10, height: 10,
                borderRadius: '50%', background: STATUS_COLOR[addStatus], zIndex: 2,
                pointerEvents: 'none',
              }} />
              <IonSelect
                label="Status"
                labelPlacement="stacked"
                fill="outline"
                value={addStatus}
                onIonChange={e => setAddStatus(e.detail.value as StudioBookingStatus)}
                className="p7-input"
                interface="popover">
                {(Object.keys(STATUS_LABEL) as StudioBookingStatus[]).map(s => (
                  <IonSelectOption key={s} value={s}>{STATUS_LABEL[s]}</IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <IonItem lines="none" style={{
              '--background': `${STATUS_COLOR[addStatus]}18`,
              borderRadius: 'var(--radius)',
              border: `1px solid ${STATUS_COLOR[addStatus]}44`,
              marginBottom: 20,
            }}>
              <IonNote style={{ fontSize: 13, padding: '8px 0', color: STATUS_COLOR[addStatus] }}>
                <strong>{STATUS_LABEL[addStatus]}</strong>
                {addStatus === 'approved' && ' — booking will appear as confirmed on the calendar immediately.'}
                {addStatus === 'for_approval' && ' — booking will enter the normal approval queue.'}
                {addStatus === 'pending_payment' && ' — user will be prompted to upload payment proof.'}
                {addStatus === 'rejected' && ' — booking will be marked as rejected.'}
                {addStatus === 'cancelled' && ' — booking will be marked as cancelled.'}
                {addStatus === 'pending_approval' && ' — awaiting admin review of payment proof.'}
              </IonNote>
            </IonItem>

            <div className="detail-actions">
              <IonButton expand="block" color="primary" onClick={addManualBooking} disabled={addingBooking}>
                {addingBooking
                  ? <IonSpinner name="crescent" />
                  : <><IonIcon slot="start" icon={addCircleOutline} />Add Booking</>}
              </IonButton>
            </div>
          </div>
        </IonContent>
      </AppModal>

      {/* ── Invoice modal ── */}
      <AppModal isOpen={showInvoice} onDidDismiss={() => setShowInvoice(false)}
        className="invoice-modal" breakpoints={[0, 1]} initialBreakpoint={1}>
        <IonContent>
          {selected && (
            <InvoiceTemplate
              data={buildInvoiceData(selected)}
              onClose={() => setShowInvoice(false)}
            />
          )}
        </IonContent>
      </AppModal>

      <AppModal isOpen={!!selected} onDidDismiss={() => setSelected(null)}
        breakpoints={[0, 0.6, 0.95]} initialBreakpoint={0.92}>
        <IonContent>
          {selected && (
            <div className="detail-modal-content">
            {/* Header */}
            <div className="detail-modal-header">
              <div>
                <p className="detail-modal-title">{selected.band_artist_name}</p>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
                  <IonBadge style={{
                    '--background': STATUS_COLOR[selected.status], '--color':'#ffffff',
                    fontSize:10, padding:'3px 9px',
                  }}>
                    <IonIcon icon={STATUS_ICON[selected.status]} style={{ marginRight:3, fontSize:11 }} />
                    {STATUS_LABEL[selected.status]}
                  </IonBadge>
                  <IonChip style={{
                    '--background': TYPE_COLOR[selected.booking_type as BookingType],
                    '--color':'#ffffff', height:22, fontSize:11, margin:0,
                  }}>
                    <IonIcon icon={selected.booking_type==='recording'?micOutline:musicalNotesOutline} style={{ fontSize:13 }} />
                    <IonLabel style={{ fontSize:11, fontWeight:600, marginLeft:3 }}>
                      {selected.booking_type.charAt(0).toUpperCase() + selected.booking_type.slice(1)}
                    </IonLabel>
                  </IonChip>
                </div>
              </div>
              <IonButton fill="clear" className="detail-modal-close" onClick={() => setSelected(null)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            {/* Common info rows */}
            <div className="detail-row">
              <span className="detail-key">Requested by</span>
              <p className="detail-val">
                {displayName(selected)}
                {selected.users?.email && <><br /><small style={{ color:'var(--color-on-surface-variant)' }}>{selected.users.email}</small></>}
              </p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Date</span>
              <p className="detail-val">{fmtDate(selected.booking_date)}</p>
            </div>
            <div className="detail-row">
              <span className="detail-key">Submitted</span>
              <p className="detail-val">
                {new Date(selected.created_at).toLocaleString('en-PH', { dateStyle:'medium', timeStyle:'short' })}
              </p>
            </div>

            {/* ── FOR_APPROVAL: editable review form ── */}
            {selected.status === 'for_approval' && (
              <>
                <p className="studio-flow-heading">Review & Approve</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div className="p7-field" style={{ marginBottom:0 }}>
                    <IonInput label="Start Time" labelPlacement="stacked" fill="outline"
                      type="time" value={editStart}
                      onIonInput={e => setEditStart(e.detail.value ?? '')} className="p7-input" />
                  </div>
                  <div className="p7-field" style={{ marginBottom:0 }}>
                    <IonInput label="End Time" labelPlacement="stacked" fill="outline"
                      type="time" value={editEnd}
                      onIonInput={e => setEditEnd(e.detail.value ?? '')} className="p7-input" />
                  </div>
                </div>
                <div className="p7-field">
                  <IonInput label="Approved Price (₱) *" labelPlacement="stacked" fill="outline"
                    type="number" min="0" step="50" value={editPrice}
                    onIonInput={e => setEditPrice(e.detail.value ?? '')} className="p7-input"
                    placeholder="e.g. 1200" />
                </div>
                <div className="p7-field">
                  <IonTextarea label="Notes to User" labelPlacement="stacked" fill="outline"
                    value={editNotes} rows={2} autoGrow
                    onIonInput={e => setEditNotes(e.detail.value ?? '')} className="p7-input"
                    placeholder="Instructions, special requirements…" />
                </div>
                <div className="detail-actions">
                  <IonButton color="primary" onClick={approveForPayment} disabled={updating}>
                    {updating ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={cashOutline} />Approve & Request Payment</>}
                  </IonButton>
                  <IonButton color="danger" fill="outline" onClick={reject} disabled={updating}>
                    <IonIcon slot="start" icon={closeCircleOutline} />Reject
                  </IonButton>
                </div>
              </>
            )}

            {/* ── PENDING_PAYMENT: waiting for user to pay ── */}
            {selected.status === 'pending_payment' && (
              <>
                <div className="detail-row">
                  <span className="detail-key">Time Slot</span>
                  <p className="detail-val">{fmtTimeSlot(selected.start_time, selected.end_time, selected.overnight)}</p>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Approved Price</span>
                  <p className="detail-val" style={{ color:'var(--color-primary)', fontWeight:700, fontSize:18 }}>
                    ₱{(selected.admin_price ?? 0).toLocaleString()}
                  </p>
                </div>
                {selected.admin_notes && (
                  <div className="detail-row">
                    <span className="detail-key">Notes</span>
                    <p className="detail-val">{selected.admin_notes}</p>
                  </div>
                )}
                <IonItem lines="none" style={{ '--background':'var(--color-surface-container-low)', borderRadius:'var(--radius)', marginTop:8 }}>
                  <IonNote style={{ fontSize:13, padding:'10px 0' }}>
                    Waiting for the user to upload proof of payment via GCash.
                  </IonNote>
                </IonItem>
                <div className="detail-actions">
                  <IonButton color="danger" fill="outline" onClick={reject} disabled={updating}>
                    <IonIcon slot="start" icon={closeCircleOutline} />Reject
                  </IonButton>
                </div>
              </>
            )}

            {/* ── PENDING_APPROVAL: review payment proof ── */}
            {selected.status === 'pending_approval' && (
              <>
                <div className="detail-row">
                  <span className="detail-key">Time Slot</span>
                  <p className="detail-val">{fmtTimeSlot(selected.start_time, selected.end_time, selected.overnight)}</p>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Amount</span>
                  <p className="detail-val" style={{ color:'var(--color-primary)', fontWeight:700, fontSize:18 }}>
                    ₱{(selected.admin_price ?? 0).toLocaleString()}
                  </p>
                </div>
                <p className="studio-flow-heading">Payment Proof</p>
                {selected.payment_proof_url ? (
                  <img
                    ref={proofImgRef}
                    src={selected.payment_proof_url}
                    alt="Payment proof"
                    style={{ width:'100%', borderRadius:'var(--radius-lg)', marginBottom:16, maxHeight:320, objectFit:'contain', background:'var(--color-surface-container-low)' }}
                  />
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'24px 0', color:'var(--color-on-surface-variant)' }}>
                    <IonIcon icon={imageOutline} style={{ fontSize:36 }} />
                    <p style={{ fontSize:13, margin:0 }}>No proof image found.</p>
                  </div>
                )}
                <div className="detail-actions">
                  <IonButton color="success" onClick={confirmPayment} disabled={updating}>
                    {updating ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={checkmarkCircleOutline} />Confirm Payment</>}
                  </IonButton>
                  <IonButton color="danger" fill="outline" onClick={rejectPayment} disabled={updating}>
                    <IonIcon slot="start" icon={closeCircleOutline} />Reject Proof
                  </IonButton>
                </div>
              </>
            )}

            {/* ── APPROVED ── */}
            {selected.status === 'approved' && (
              <>
                <div className="detail-row">
                  <span className="detail-key">Time Slot</span>
                  <p className="detail-val">{fmtTimeSlot(selected.start_time, selected.end_time, selected.overnight)}</p>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Amount Paid</span>
                  <p className="detail-val" style={{ color:'var(--color-tertiary)', fontWeight:700, fontSize:18 }}>
                    ₱{(selected.admin_price ?? 0).toLocaleString()}
                  </p>
                </div>
                {selected.admin_notes && (
                  <div className="detail-row">
                    <span className="detail-key">Notes</span>
                    <p className="detail-val">{selected.admin_notes}</p>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-key">Invoice</span>
                  <p className="detail-val">{selected.invoice_sent ? 'Sent' : 'Not sent yet'}</p>
                </div>
                <div className="detail-actions">
                  <IonButton color="primary" onClick={sendInvoice} disabled={updating || selected.invoice_sent}>
                    {updating ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={selected.invoice_sent ? receiptOutline : mailOutline} />{selected.invoice_sent ? 'Invoice Sent' : 'Send Invoice'}</>}
                  </IonButton>
                  <IonButton fill="outline" onClick={() => setShowInvoice(true)}>
                    <IonIcon slot="start" icon={receiptOutline} />View Invoice
                  </IonButton>
                </div>
              </>
            )}

            {/* ── REJECTED / CANCELLED ── */}
            {(selected.status === 'rejected' || selected.status === 'cancelled') && (
              <>
                <div className="detail-row">
                  <span className="detail-key">Time Slot</span>
                  <p className="detail-val">{fmtTimeSlot(selected.start_time, selected.end_time, selected.overnight)}</p>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Status</span>
                  <p className="detail-val" style={{ textTransform:'capitalize', color: STATUS_COLOR[selected.status] }}>
                    {STATUS_LABEL[selected.status]}
                  </p>
                </div>
              </>
            )}

          </div>
          )}
        </IonContent>
      </AppModal>
    </>
  )
}
