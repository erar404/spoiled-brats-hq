import { useCallback, useEffect, useState } from 'react'
import {
  IonBadge, IonButton, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonNote, IonRefresher, IonRefresherContent,
  IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  sendOutline, calendarOutline, listOutline, personOutline,
  checkmarkCircleOutline, alertCircleOutline, timeOutline,
  closeCircleOutline, peopleOutline, homeOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { MyBookingsSkeleton } from '../components/Skeletons'
import type { CafeScheduleRow, BookingStatus, BlockedScheduleRow } from '../types/database'
import './CafeBooking.css'

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#fea451', approved: '#687959', rejected: '#ba1a1a', cancelled: '#8a7269',
}
const STATUS_ICON: Record<BookingStatus, string> = {
  pending: timeOutline, approved: checkmarkCircleOutline,
  rejected: alertCircleOutline, cancelled: closeCircleOutline,
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function today() { return new Date().toISOString().split('T')[0] }

export default function CafeBooking() {
  const { session, profile, isAdmin } = useAuth()
  const history = useHistory()
  const { toast, ToastEl } = useToast()

  const [eventName,      setEventName]      = useState('')
  const [bookingDate,    setBookingDate]     = useState('')
  const [bookingDetails, setBookingDetails]  = useState('')
  const [rentWhole,      setRentWhole]       = useState(false)
  const [numSeats,       setNumSeats]        = useState('')
  const [submitting,     setSubmitting]      = useState(false)
  const [calEvents,      setCalEvents]       = useState<EventInput[]>([])
  const [myBookings,     setMyBookings]      = useState<CafeScheduleRow[]>([])
  const [loadingList,    setLoadingList]     = useState(false)

  const loadCal = useCallback(async () => {
    const [{ data: bookingData }, { data: blockData }] = await Promise.all([
      supabase
        .from('cafe_schedule')
        .select('id, event_name, booking_date, status')
        .in('status', isAdmin ? ['pending', 'approved'] : ['approved']),
      supabase
        .from('blocked_schedules')
        .select('*')
        .eq('venue', 'cafe'),
    ])
    const bookingEvents: EventInput[] = (bookingData ?? []).map(row => ({
      id: `bk-${row.id}`,
      title: isAdmin ? row.event_name : 'Booked',
      date: row.booking_date,
      backgroundColor: STATUS_COLOR[row.status as BookingStatus] ?? '#8a7269',
      borderColor: 'transparent', textColor: '#ffffff',
    }))
    const blockedEvents: EventInput[] = ((blockData ?? []) as BlockedScheduleRow[]).map(r => ({
      id: `bl-${r.id}`,
      title: 'ADMIN BLOCKED SCHED',
      date: r.block_date,
      allDay: true,
      backgroundColor: '#2d1320',
      borderColor: '#2d1320',
      textColor: '#ffffff',
    }))
    setCalEvents([...bookingEvents, ...blockedEvents])
  }, [isAdmin])

  const loadMine = useCallback(async () => {
    if (!profile) return
    setLoadingList(true)
    const { data } = await supabase
      .from('cafe_schedule').select('*')
      .eq('user_id', profile.id).order('booking_date', { ascending: false })
    setMyBookings(data ?? [])
    setLoadingList(false)
  }, [profile])

  useEffect(() => { loadCal(); if (session) loadMine() }, [loadCal, loadMine, session])

  async function handleSubmit() {
    if (!eventName.trim())   return toast('Event name is required.', 'warning')
    if (!bookingDate)         return toast('Booking date is required.', 'warning')
    if (!rentWhole && (!numSeats || Number(numSeats) < 1))
      return toast('Please enter the number of seats.', 'warning')

    // Check admin blocks
    const { data: blocks, error: blockErr } = await supabase
      .from('blocked_schedules')
      .select('id')
      .eq('venue', 'cafe')
      .eq('block_date', bookingDate)
    if (blockErr) {
      toast('Could not verify date availability. Your request will still be reviewed by the admin.', 'warning')
    } else if (blocks && blocks.length > 0) {
      return toast('This date has been blocked by the admin and is unavailable for booking.', 'danger')
    }

    setSubmitting(true)
    const { error } = await supabase.from('cafe_schedule').insert({
      user_id: profile!.id,
      event_name: eventName.trim(),
      booking_date: bookingDate,
      booking_details: bookingDetails.trim() || null,
      rent_whole_place: rentWhole,
      num_seats: rentWhole ? null : Number(numSeats),
    })
    setSubmitting(false)

    if (error) {
      toast(error.message, 'danger')
    } else {
      toast("Booking request submitted! We'll confirm shortly.", 'success')
      setEventName(''); setBookingDate(''); setBookingDetails('')
      setRentWhole(false); setNumSeats('')
      loadCal(); loadMine()
    }
  }

  if (!session) {
    return (
      <div className="booking-login-prompt">
        {ToastEl}
        <IonIcon icon={personOutline} className="prompt-icon" aria-hidden="true" />
        <h3>Sign in to book a table</h3>
        <p>Create a free account to request dates, track your bookings, and get confirmation updates.</p>
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
          <IonIcon icon={sendOutline} className="bsh-icon" />
          <h2 className="bsh-title">Request a Booking</h2>
        </div>
        <div className="booking-card">
          <div className="bk-field">
            <IonInput label="Event Name *" labelPlacement="stacked" fill="outline"
              value={eventName} onIonInput={e => setEventName(e.detail.value ?? '')}
              placeholder="e.g. Birthday Dinner, Company Outing" className="bk-input" />
          </div>
          <div className="bk-field">
            <IonInput label="Booking Date *" labelPlacement="stacked" fill="outline"
              type="date" value={bookingDate}
              onIonInput={e => setBookingDate(e.detail.value ?? '')}
              min={today()} className="bk-input" />
          </div>
          <div className="bk-field">
            <IonTextarea label="Booking Details" labelPlacement="stacked" fill="outline"
              value={bookingDetails} onIonInput={e => setBookingDetails(e.detail.value ?? '')}
              placeholder="Describe your event, special requests, setup needs…"
              autoGrow rows={3} className="bk-input" />
          </div>
          <IonItem lines="none" className="bk-toggle-item">
            <IonIcon icon={homeOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Rent the Whole Place</h3>
              <IonNote>Reserve all seats exclusively for your event</IonNote>
            </IonLabel>
            <IonToggle slot="end" checked={rentWhole}
              onIonChange={e => { setRentWhole(e.detail.checked); setNumSeats('') }}
              color="primary" />
          </IonItem>
          {!rentWhole && (
            <div className="bk-field bk-field--indent">
              <IonInput label="Number of Seats *" labelPlacement="stacked" fill="outline"
                type="number" value={numSeats}
                onIonInput={e => setNumSeats(e.detail.value ?? '')}
                placeholder="How many guests?" min="1" className="bk-input">
                <IonIcon slot="start" icon={peopleOutline} />
              </IonInput>
            </div>
          )}
          <IonButton expand="block" color="primary" className="bk-submit"
            onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <IonSpinner name="crescent" />
              : <><IonIcon slot="start" icon={sendOutline} />Submit Booking Request</>}
          </IonButton>
        </div>
      </section>

      {/* ── Calendar ── */}
      <section className="booking-section">
        <div className="booking-section-header">
          <IonIcon icon={calendarOutline} className="bsh-icon" />
          <h2 className="bsh-title">{isAdmin ? 'All Cafe Bookings' : 'Availability Calendar'}</h2>
        </div>
        {!isAdmin && (
          <p className="cal-note">Highlighted dates are already booked. Choose an available date above.</p>
        )}
        <div className="cal-wrap">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth" events={calEvents} height="auto"
            headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
            displayEventTime={false} eventDisplay="block"
          />
        </div>
        <div className="cal-legend">
          {(Object.entries(STATUS_COLOR) as [BookingStatus, string][]).map(([s, c]) => (
            <div key={s} className="legend-item">
              <span className="legend-dot" style={{ background: c }} />
              <span className="legend-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            </div>
          ))}
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#2d1320' }} />
            <span className="legend-label">Admin Blocked</span>
          </div>
        </div>
      </section>

      {/* ── My Bookings ── */}
      <section className="booking-section">
        <div className="booking-section-header">
          <IonIcon icon={listOutline} className="bsh-icon" />
          <h2 className="bsh-title">My Booking Requests</h2>
        </div>
        {loadingList ? (
          <MyBookingsSkeleton count={2} />
        ) : myBookings.length === 0 ? (
          <div className="bk-empty">
            <IonIcon icon={calendarOutline} aria-hidden="true" />
            <p>No bookings yet. Choose a date above and we'll confirm within 24 hours.</p>
          </div>
        ) : (
          <IonList className="my-bk-list" lines="none">
            {myBookings.map(b => (
              <div key={b.id} className="my-bk-item">
                <div className="my-bk-body">
                  <p className="my-bk-name">{b.event_name}</p>
                  <p className="my-bk-meta">
                    <IonIcon icon={calendarOutline} />{fmtDate(b.booking_date)}&nbsp;·&nbsp;
                    {b.rent_whole_place
                      ? <><IonIcon icon={homeOutline} /> Whole place</>
                      : <><IonIcon icon={peopleOutline} /> {b.num_seats} seats</>}
                  </p>
                  {b.booking_details && <p className="my-bk-details">{b.booking_details}</p>}
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
