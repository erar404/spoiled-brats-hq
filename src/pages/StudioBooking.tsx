import { useCallback, useEffect, useState } from 'react'
import {
  IonBadge, IonButton, IonChip, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonNote,
  IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  sendOutline, calendarOutline, listOutline, personOutline,
  checkmarkCircleOutline, alertCircleOutline, timeOutline,
  closeCircleOutline, micOutline, musicalNotesOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { MyBookingsSkeleton } from '../components/Skeletons'
import type { StudioScheduleRow, BookingStatus, BookingType } from '../types/database'
import './CafeBooking.css'
import './StudioBooking.css'

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#fea451', approved: '#687959', rejected: '#ba1a1a', cancelled: '#8a7269',
}
const STATUS_ICON: Record<BookingStatus, string> = {
  pending: timeOutline, approved: checkmarkCircleOutline,
  rejected: alertCircleOutline, cancelled: closeCircleOutline,
}
const TYPE_COLOR: Record<BookingType, string> = {
  recording: 'var(--color-primary)', rehearsal: 'var(--color-tertiary)',
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
function today() { return new Date().toISOString().split('T')[0] }

export default function StudioBooking() {
  const { session, profile, isAdmin } = useAuth()
  const history = useHistory()
  const { toast, ToastEl } = useToast()

  const [bandName,    setBandName]    = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [endTime,     setEndTime]     = useState('')
  const [bookingType, setBookingType] = useState<BookingType>('recording')
  const [submitting,  setSubmitting]  = useState(false)
  const [calEvents,   setCalEvents]   = useState<EventInput[]>([])
  const [myBookings,  setMyBookings]  = useState<StudioScheduleRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const loadCal = useCallback(async () => {
    const { data } = await supabase
      .from('studio_schedule')
      .select('id, band_artist_name, booking_date, start_time, end_time, booking_type, status')
      .in('status', isAdmin ? ['pending', 'approved'] : ['approved'])
    setCalEvents((data ?? []).map(row => ({
      id: String(row.id),
      title: isAdmin ? row.band_artist_name : 'Booked',
      start: `${row.booking_date}T${row.start_time}`,
      end:   `${row.booking_date}T${row.end_time}`,
      backgroundColor: STATUS_COLOR[row.status as BookingStatus] ?? '#8a7269',
      borderColor: 'transparent', textColor: '#ffffff',
    })))
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

  useEffect(() => { loadCal(); if (session) loadMine() }, [loadCal, loadMine, session])

  async function handleSubmit() {
    if (!bandName.trim())  return toast('Band / artist name is required.', 'warning')
    if (!bookingDate)       return toast('Booking date is required.', 'warning')
    if (!startTime)         return toast('Start time is required.', 'warning')
    if (!endTime)           return toast('End time is required.', 'warning')
    if (startTime >= endTime) return toast('End time must be after start time.', 'warning')

    setSubmitting(true)
    const { error } = await supabase.from('studio_schedule').insert({
      user_id: profile!.id, band_artist_name: bandName.trim(),
      booking_date: bookingDate, start_time: startTime,
      end_time: endTime, booking_type: bookingType,
    })
    setSubmitting(false)

    if (error) {
      toast(error.message, 'danger')
    } else {
      toast("Session request submitted! We'll confirm shortly.", 'success')
      setBandName(''); setBookingDate(''); setStartTime(''); setEndTime('')
      setBookingType('recording')
      loadCal(); loadMine()
    }
  }

  if (!session) {
    return (
      <div className="booking-login-prompt">
        {ToastEl}
        <IonIcon icon={personOutline} className="prompt-icon" />
        <h3>Login Required</h3>
        <p>You need to be logged in to request a studio session.</p>
        <IonButton color="primary" shape="round" onClick={() => history.push('/account')}>
          Login / Sign Up
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
          <IonButton expand="block" color="primary" className="bk-submit"
            onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <IonSpinner name="crescent" />
              : <><IonIcon slot="start" icon={sendOutline} />Submit Session Request</>}
          </IonButton>
        </div>
      </section>

      {/* ── Calendar ── */}
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
            buttonText={{ timeGridWeek:'Week', dayGridMonth:'Month' }}
            allDaySlot={false}
          />
        </div>
        <div className="cal-legend">
          {(Object.entries(STATUS_COLOR) as [BookingStatus, string][]).map(([s, c]) => (
            <div key={s} className="legend-item">
              <span className="legend-dot" style={{ background: c }} />
              <span className="legend-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── My Bookings ── */}
      <section className="booking-section" style={{ paddingBottom: 32 }}>
        <div className="booking-section-header">
          <IonIcon icon={listOutline} className="bsh-icon" />
          <h2 className="bsh-title">My Session Requests</h2>
        </div>
        {loadingList ? (
          <MyBookingsSkeleton count={2} />
        ) : myBookings.length === 0 ? (
          <div className="bk-empty">
            <IonIcon icon={musicalNotesOutline} />
            <p>No requests yet. Fill in the form above to get started!</p>
          </div>
        ) : (
          <IonList className="my-bk-list" lines="none">
            {myBookings.map(b => (
              <div key={b.id} className="my-bk-item">
                <div className="my-bk-body">
                  <div className="studio-bk-title-row">
                    <p className="my-bk-name">{b.band_artist_name}</p>
                    <IonChip className="studio-type-chip"
                      style={{ '--background': TYPE_COLOR[b.booking_type as BookingType] }}>
                      <IonIcon icon={b.booking_type === 'recording' ? micOutline : musicalNotesOutline} />
                      <IonLabel>{b.booking_type.charAt(0).toUpperCase() + b.booking_type.slice(1)}</IonLabel>
                    </IonChip>
                  </div>
                  <p className="my-bk-meta">
                    <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}&nbsp;·&nbsp;
                    <IonIcon icon={timeOutline} />{fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                  </p>
                </div>
                <IonBadge className={`status-badge badge-${b.status}`}>
                  <IonIcon icon={STATUS_ICON[b.status as BookingStatus] ?? timeOutline} />
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </IonBadge>
              </div>
            ))}
          </IonList>
        )}
      </section>
    </div>
  )
}
