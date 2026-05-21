import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonAlert, IonBadge, IonButton, IonChip, IonContent, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote,
  IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  alertCircleOutline, banOutline, calendarOutline, cashOutline,
  checkmarkCircleOutline, closeCircleOutline, cloudUploadOutline,
  imageOutline, listOutline, micOutline, musicalNotesOutline,
  personOutline, sendOutline, timeOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { MyBookingsSkeleton } from '../components/Skeletons'
import type { StudioScheduleRow, StudioBookingStatus, BookingType, BlockedScheduleRow } from '../types/database'
import './CafeBooking.css'
import './StudioBooking.css'

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
  rejected:        alertCircleOutline,
  cancelled:       closeCircleOutline,
}
const STATUS_LABEL: Record<StudioBookingStatus, string> = {
  for_approval:    'For Approval',
  pending_payment: 'Pending Payment',
  pending_approval:'Proof Submitted',
  approved:        'Approved',
  rejected:        'Rejected',
  cancelled:       'Cancelled',
}
const TYPE_COLOR: Record<BookingType, string> = {
  recording: 'var(--color-primary)',
  rehearsal:  'var(--color-tertiary)',
}

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
function today() { return new Date().toISOString().split('T')[0] }

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudioBooking() {
  const { session, profile, isAdmin } = useAuth()
  const history = useHistory()
  const { toast, ToastEl } = useToast()
  const proofFileRef = useRef<HTMLInputElement>(null)

  // Form
  const [bandName,      setBandName]      = useState('')
  const [bookingDate,   setBookingDate]   = useState('')
  const [startTime,     setStartTime]     = useState('')
  const [endTime,       setEndTime]       = useState('')
  const [bookingType,   setBookingType]   = useState<BookingType>('recording')
  const [submitting,    setSubmitting]    = useState(false)

  // Calendar + list
  const [calEvents,   setCalEvents]   = useState<EventInput[]>([])
  const [myBookings,  setMyBookings]  = useState<StudioScheduleRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Pricing
  const [rehearsalRate, setRehearsalRate] = useState(600)
  const [recordingRate, setRecordingRate] = useState(1200)

  // Payment modal
  const [payModalBooking, setPayModalBooking] = useState<StudioScheduleRow | null>(null)
  const [proofFile,       setProofFile]       = useState<File | null>(null)
  const [proofPreview,    setProofPreview]     = useState('')
  const [uploading,       setUploading]        = useState(false)
  const [gcash,           setGcash]            = useState({ number:'', name:'', qr_url:'' })

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<StudioScheduleRow | null>(null)
  const [cancelling,   setCancelling]   = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadCal = useCallback(async () => {
    const [{ data: sessionData }, { data: blockData }] = await Promise.all([
      supabase
        .from('studio_schedule')
        .select('id, band_artist_name, booking_date, start_time, end_time, booking_type, status')
        .in('status', isAdmin
          ? ['for_approval','pending_payment','pending_approval','approved']
          : ['approved']),
      supabase
        .from('blocked_schedules')
        .select('*')
        .eq('venue', 'studio'),
    ])
    const sessionEvents: EventInput[] = (sessionData ?? []).map((row: any) => ({
      id:    `bk-${row.id}`,
      title: isAdmin ? row.band_artist_name : 'Booked',
      start: `${row.booking_date}T${row.start_time}`,
      end:   `${row.booking_date}T${row.end_time}`,
      backgroundColor: STATUS_COLOR[row.status as StudioBookingStatus] ?? '#8a7269',
      borderColor: 'transparent', textColor: '#ffffff',
    }))
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
  }, [isAdmin])

  const loadMine = useCallback(async () => {
    if (!profile) return
    setLoadingList(true)
    const { data } = await supabase
      .from('studio_schedule').select('*')
      .eq('user_id', profile.id).order('booking_date', { ascending: false })
    setMyBookings(data ?? [])
    setLoadingList(false)
  }, [profile])

  useEffect(() => {
    loadCal()
    if (session) loadMine()

    supabase.from('system_settings').select('value').eq('key', 'studio_pricing').single()
      .then(({ data }) => {
        const val = data?.value as { rehearsal?: number; recording?: number } | null
        if (val?.rehearsal) setRehearsalRate(val.rehearsal)
        if (val?.recording) setRecordingRate(val.recording)
      })

    supabase.from('system_settings').select('value').eq('key', 'gcash_info').single()
      .then(({ data }) => {
        const val = data?.value as { number?: string; name?: string; qr_url?: string } | null
        if (val) setGcash({ number: val.number ?? '', name: val.name ?? '', qr_url: val.qr_url ?? '' })
      })
  }, [loadCal, loadMine, session])

  // ── Cost estimator ────────────────────────────────────────────────────────────

  function calcHours(s: string, e: string) {
    if (!s || !e || s >= e) return 0
    const [sh, sm] = s.split(':').map(Number)
    const [eh, em] = e.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60
  }
  const estimatedHours = calcHours(startTime, endTime)
  const ratePerHour    = bookingType === 'rehearsal' ? rehearsalRate : recordingRate
  const estimatedCost  = estimatedHours > 0 ? estimatedHours * ratePerHour : 0

  // ── Submit booking ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!bandName.trim())       return toast('Band / artist name is required.', 'warning')
    if (!bookingDate)           return toast('Booking date is required.', 'warning')
    if (!startTime)             return toast('Start time is required.', 'warning')
    if (!endTime)               return toast('End time is required.', 'warning')
    if (startTime >= endTime)   return toast('End time must be after start time.', 'warning')

    // Check for admin blocks on this date
    const { data: blocks, error: blockErr } = await supabase
      .from('blocked_schedules')
      .select('start_time, end_time')
      .eq('venue', 'studio')
      .eq('block_date', bookingDate)
    if (blockErr) {
      toast('Could not verify time availability. Your request will still be reviewed by the admin.', 'warning')
    } else if (blocks && blocks.length > 0) {
      const overlaps = blocks.some(b => {
        if (!b.start_time || !b.end_time) return true
        return startTime < b.end_time && endTime > b.start_time
      })
      if (overlaps)
        return toast('This date/time has been blocked by the admin and is unavailable for booking.', 'danger')
    }

    setSubmitting(true)
    const { error } = await supabase.from('studio_schedule').insert({
      user_id:          profile!.id,
      band_artist_name: bandName.trim(),
      booking_date:     bookingDate,
      start_time:       startTime,
      end_time:         endTime,
      booking_type:     bookingType,
      status:           'for_approval',
    })
    setSubmitting(false)
    if (error) { toast(error.message, 'danger'); return }
    toast("Session request submitted! We'll review it shortly.", 'success')
    setBandName(''); setBookingDate(''); setStartTime(''); setEndTime('')
    setBookingType('recording')
    loadCal(); loadMine()
  }

  // ── Payment proof upload ──────────────────────────────────────────────────────

  function openPayModal(b: StudioScheduleRow) {
    setPayModalBooking(b)
    setProofFile(null)
    setProofPreview('')
  }

  function handleProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofFile(f)
    setProofPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  async function submitProof() {
    if (!payModalBooking) return
    if (!proofFile) return toast('Please select a payment screenshot.', 'warning')

    setUploading(true)
    const ext  = proofFile.name.split('.').pop() ?? 'jpg'
    const path = `studio/${payModalBooking.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('payment-proofs').upload(path, proofFile)

    if (uploadErr) {
      toast('Upload failed: ' + uploadErr.message, 'danger')
      setUploading(false)
      return
    }

    const proofUrl = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl

    const { error: updateErr } = await supabase.from('studio_schedule').update({
      payment_proof_url: proofUrl,
      status:            'pending_approval',
    }).eq('id', payModalBooking.id)

    setUploading(false)
    if (updateErr) { toast(updateErr.message, 'danger'); return }

    toast('Payment proof submitted! We will verify and confirm your booking.', 'success')
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setPayModalBooking(null)
    loadMine()
  }

  // ── Cancel booking ────────────────────────────────────────────────────────────

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const { error } = await supabase.from('studio_schedule')
      .update({ status: 'cancelled' }).eq('id', cancelTarget.id)
    setCancelling(false)
    setCancelTarget(null)
    if (error) { toast(error.message, 'danger'); return }
    toast('Booking cancelled.', 'medium')
    loadCal(); loadMine()
  }

  // ── Not logged in ─────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="booking-login-prompt">
        {ToastEl}
        <IonIcon icon={personOutline} className="prompt-icon" aria-hidden="true" />
        <h3>Sign in to book studio time</h3>
        <p>Create a free account to reserve sessions, upload payment proof, and track your bookings.</p>
        <IonButton color="primary" shape="round" onClick={() => history.push('/account')}>
          Sign In or Create Account
        </IonButton>
      </div>
    )
  }

  return (
    <div className="booking-page">
      {ToastEl}
      <IonRefresher slot="fixed" onIonRefresh={async e => {
        await Promise.all([loadCal(), loadMine()])
        e.detail.complete()
      }}>
        <IonRefresherContent />
      </IonRefresher>

      {/* ── Booking Form ── */}
      <section className="booking-section">
        <div className="booking-section-header">
          <IonIcon icon={micOutline} className="bsh-icon" />
          <h2 className="bsh-title">Request a Session</h2>
        </div>
        <div className="booking-card">
          <div className="studio-type-wrap">
            <p className="studio-type-label">Session Type</p>
            <IonSegment value={bookingType}
              onIonChange={e => setBookingType(e.detail.value as BookingType)}
              className="studio-type-segment">
              <IonSegmentButton value="recording">
                <IonIcon icon={micOutline} /><IonLabel>Recording</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="rehearsal">
                <IonIcon icon={musicalNotesOutline} /><IonLabel>Rehearsal</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>
          <div className="bk-field">
            <IonInput label="Band / Artist Name *" labelPlacement="stacked" fill="outline"
              value={bandName} onIonInput={e => setBandName(e.detail.value ?? '')}
              placeholder="e.g. The Northside Band" className="bk-input" />
          </div>
          <div className="bk-field">
            <IonInput label="Booking Date *" labelPlacement="stacked" fill="outline"
              type="date" value={bookingDate}
              onIonInput={e => setBookingDate(e.detail.value ?? '')}
              min={today()} className="bk-input" />
          </div>
          <div className="studio-time-row">
            <div className="bk-field" style={{ flex: 1 }}>
              <IonInput label="Start Time *" labelPlacement="stacked" fill="outline"
                type="time" value={startTime}
                onIonInput={e => setStartTime(e.detail.value ?? '')} className="bk-input" />
            </div>
            <div className="studio-time-divider">
              <IonIcon icon={timeOutline} />
            </div>
            <div className="bk-field" style={{ flex: 1 }}>
              <IonInput label="End Time *" labelPlacement="stacked" fill="outline"
                type="time" value={endTime}
                onIonInput={e => setEndTime(e.detail.value ?? '')} className="bk-input" />
            </div>
          </div>
          <IonItem lines="none" className="studio-hours-note-item">
            <IonNote>Studio hours: Tue–Thu 9am–10pm · Fri–Sat 9am–11pm · Sun 10am–9pm</IonNote>
          </IonItem>
          {estimatedCost > 0 && (
            <div className="studio-cost-estimate">
              <span className="studio-cost-label">
                Estimated cost · {estimatedHours}h @ ₱{ratePerHour.toLocaleString()}/hr
              </span>
              <span className="studio-cost-amount">₱{estimatedCost.toLocaleString()}</span>
            </div>
          )}
          <IonButton expand="block" color="primary" className="bk-submit"
            onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <IonSpinner name="crescent" />
              : <><IonIcon slot="start" icon={sendOutline} />Submit Session Request</>}
          </IonButton>
        </div>
      </section>

      {/* ── Availability Calendar ── */}
      <section className="booking-section">
        <div className="booking-section-header">
          <IonIcon icon={calendarOutline} className="bsh-icon" />
          <h2 className="bsh-title">{isAdmin ? 'All Studio Sessions' : 'Studio Availability'}</h2>
        </div>
        {!isAdmin && <p className="cal-note">Booked slots are shown. Choose an available time above.</p>}
        <div className="cal-wrap">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek" events={calEvents} height="auto"
            slotMinTime="08:00:00" slotMaxTime="23:30:00" slotDuration="00:30:00"
            headerToolbar={{ left:'prev,next', center:'title', right:'timeGridWeek,dayGridMonth' }}
            buttonText={{ timeGridWeek:'Week', dayGridMonth:'Month' }} allDaySlot={false}
          />
        </div>
        <div className="cal-legend">
          {(Object.entries(STATUS_COLOR) as [StudioBookingStatus, string][]).map(([s, c]) => (
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
      </section>

      {/* ── My Sessions ── */}
      <section className="booking-section" style={{ paddingBottom: 32 }}>
        <div className="booking-section-header">
          <IonIcon icon={listOutline} className="bsh-icon" />
          <h2 className="bsh-title">My Session Requests</h2>
        </div>
        {loadingList ? (
          <MyBookingsSkeleton count={2} />
        ) : myBookings.length === 0 ? (
          <div className="bk-empty">
            <IonIcon icon={musicalNotesOutline} aria-hidden="true" />
            <p>No sessions booked yet. Pick a date and time above — we'll review and confirm.</p>
          </div>
        ) : (
          <IonList className="my-bk-list" lines="none">
            {myBookings.map(b => (
              <div key={b.id} className="my-bk-item">
                <div className="my-bk-body">
                  <div className="studio-bk-title-row">
                    <p className="my-bk-name">{b.band_artist_name}</p>
                    <IonChip style={{
                      '--background': TYPE_COLOR[b.booking_type as BookingType],
                      '--color': '#ffffff', height: 20, fontSize: 10, margin: 0, padding: '0 8px',
                    }}>
                      <IonLabel style={{ fontSize: 10, fontWeight: 600 }}>
                        {b.booking_type.charAt(0).toUpperCase() + b.booking_type.slice(1)}
                      </IonLabel>
                    </IonChip>
                  </div>
                  <p className="my-bk-meta">
                    <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}&nbsp;·&nbsp;
                    <IonIcon icon={timeOutline} />{fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                  </p>
                  {b.admin_price != null && (
                    <p className="my-bk-meta" style={{ color:'var(--color-primary)', fontWeight:600, marginTop:2 }}>
                      ₱{b.admin_price.toLocaleString()}
                    </p>
                  )}
                  {b.admin_notes && (
                    <p className="my-bk-details">{b.admin_notes}</p>
                  )}

                  {/* Status-based action buttons */}
                  <div className="studio-session-actions">
                    {b.status === 'pending_payment' && (
                      <IonButton size="small" color="primary" shape="round"
                        onClick={() => openPayModal(b)}>
                        <IonIcon slot="start" icon={cashOutline} />Pay Now
                      </IonButton>
                    )}
                    {b.status === 'pending_approval' && (
                      <span className="studio-proof-sent">
                        <IonIcon icon={cloudUploadOutline} />Proof submitted — awaiting confirmation
                      </span>
                    )}
                    {!['approved', 'rejected', 'cancelled'].includes(b.status) && (
                      <IonButton size="small" fill="outline" color="danger" shape="round"
                        onClick={() => setCancelTarget(b)}>
                        <IonIcon slot="start" icon={banOutline} />Cancel
                      </IonButton>
                    )}
                  </div>
                </div>

                <IonBadge style={{
                  '--background': STATUS_COLOR[b.status as StudioBookingStatus],
                  '--color': '#ffffff',
                  fontSize: 10, padding: '3px 8px', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <IonIcon icon={STATUS_ICON[b.status as StudioBookingStatus]} style={{ fontSize: 11 }} />
                  {STATUS_LABEL[b.status as StudioBookingStatus]}
                </IonBadge>
              </div>
            ))}
          </IonList>
        )}
      </section>

      {/* ── Payment Modal ── */}
      <AppModal isOpen={!!payModalBooking} onDidDismiss={() => setPayModalBooking(null)}
        breakpoints={[0, 0.75, 0.95]} initialBreakpoint={0.92}>
        <IonContent>
          {payModalBooking && (
            <div className="detail-modal-content">
            <div className="detail-modal-header">
              <p className="detail-modal-title">Complete Payment</p>
              <IonButton fill="clear" onClick={() => setPayModalBooking(null)}>
                <IonIcon slot="icon-only" icon={closeCircleOutline} />
              </IonButton>
            </div>

            {/* Booking summary */}
            <div className="payment-summary">
              <div className="payment-summary-row">
                <span>{payModalBooking.band_artist_name}</span>
                <span style={{ textTransform:'capitalize' }}>{payModalBooking.booking_type}</span>
              </div>
              <div className="payment-summary-row">
                <span>{fmtDate(payModalBooking.booking_date)}</span>
                <span>{fmtTime(payModalBooking.start_time)} – {fmtTime(payModalBooking.end_time)}</span>
              </div>
              <div className="payment-summary-total">
                <span>Total Amount</span>
                <span className="payment-total-amount">
                  ₱{(payModalBooking.admin_price ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* GCash info */}
            <div className="payment-gcash-section">
              <p className="payment-gcash-title">Pay via GCash</p>
              {gcash.qr_url ? (
                <img src={gcash.qr_url} alt="GCash QR Code"
                  className="payment-qr-img" />
              ) : (
                <div className="payment-qr-placeholder">
                  <IonIcon icon={imageOutline} />
                  <span>QR Code not configured yet</span>
                </div>
              )}
              {gcash.number && (
                <div className="payment-gcash-info">
                  <span className="payment-gcash-label">GCash Number</span>
                  <span className="payment-gcash-value">{gcash.number}</span>
                </div>
              )}
              {gcash.name && (
                <div className="payment-gcash-info">
                  <span className="payment-gcash-label">Account Name</span>
                  <span className="payment-gcash-value">{gcash.name}</span>
                </div>
              )}
            </div>

            {/* Proof upload */}
            <p className="payment-upload-label">Upload Payment Screenshot *</p>
            <div className="payment-proof-upload"
              onClick={() => proofFileRef.current?.click()}
              style={proofPreview ? { backgroundImage:`url('${proofPreview}')`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center' } : undefined}>
              {!proofPreview && (
                <div className="payment-proof-hint">
                  <IonIcon icon={cloudUploadOutline} />
                  <span>Tap to upload screenshot</span>
                </div>
              )}
            </div>
            <input ref={proofFileRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
              style={{ display:'none' }} onChange={handleProofFile} />

            <IonItem lines="none" style={{ '--background':'var(--color-surface-container-low)', borderRadius:'var(--radius)', marginBottom:16 }}>
              <IonNote style={{ fontSize:12, padding:'10px 0', lineHeight:1.55 }}>
                After submitting, our admin will verify your payment and confirm your booking. You will receive an email confirmation.
              </IonNote>
            </IonItem>

            <IonButton expand="block" color="primary" style={{ '--border-radius':'var(--radius)' }}
              onClick={submitProof} disabled={uploading || !proofFile}>
              {uploading ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={sendOutline} />Submit Payment Proof</>}
            </IonButton>
            </div>
          )}
        </IonContent>
      </AppModal>

      {/* ── Cancel Confirmation Alert ── */}
      <IonAlert
        isOpen={!!cancelTarget}
        onDidDismiss={() => setCancelTarget(null)}
        header="Cancel Booking?"
        message="This action cannot be undone. If you have already made a payment, it is non-refundable. Are you sure you want to cancel?"
        buttons={[
          { text:'Keep Booking', role:'cancel', handler: () => setCancelTarget(null) },
          {
            text: cancelling ? 'Cancelling…' : 'Yes, Cancel',
            role: 'destructive',
            handler: confirmCancel,
          },
        ]}
      />
    </div>
  )
}
