import { useCallback, useEffect, useState } from 'react'
import {
  IonButton, IonChip, IonContent, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonNote, IonSegment,
  IonSegmentButton, IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput } from '@fullcalendar/core'
import {
  addOutline, banOutline, cafeOutline, calendarOutline,
  closeOutline, musicalNotesOutline, timeOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import type { BlockedScheduleRow, BlockedVenue } from '../types/database'
import './AdminBlockedSchedules.css'

const BLOCK_COLOR = '#2d1320'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function today() { return new Date().toISOString().split('T')[0] }

export default function AdminBlockedSchedules() {
  const { profile } = useAuth()
  const { toast, ToastEl } = useToast()

  const [venue,       setVenue]       = useState<BlockedVenue>('cafe')
  const [blocks,      setBlocks]      = useState<BlockedScheduleRow[]>([])
  const [calEvents,   setCalEvents]   = useState<EventInput[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  // Form state
  const [fVenue,      setFVenue]      = useState<BlockedVenue>('cafe')
  const [fDate,       setFDate]       = useState('')
  const [fWholeDay,   setFWholeDay]   = useState(true)
  const [fStart,      setFStart]      = useState('')
  const [fEnd,        setFEnd]        = useState('')
  const [fReason,     setFReason]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('blocked_schedules')
      .select('*')
      .eq('venue', venue)
      .order('block_date', { ascending: true })
    const rows = (data ?? []) as BlockedScheduleRow[]
    setBlocks(rows)
    setCalEvents(rows.map(r => ({
      id:    r.id,
      title: 'ADMIN BLOCKED SCHED',
      ...(r.start_time && r.end_time
        ? { start: `${r.block_date}T${r.start_time}`, end: `${r.block_date}T${r.end_time}` }
        : { date: r.block_date, allDay: true }),
      backgroundColor: BLOCK_COLOR,
      borderColor: BLOCK_COLOR,
      textColor: '#ffffff',
    })))
    setLoading(false)
  }, [venue])

  useEffect(() => { load() }, [load])

  function openModal() {
    setFVenue(venue)
    setFDate('')
    setFWholeDay(true)
    setFStart('')
    setFEnd('')
    setFReason('')
    setShowModal(true)
  }

  async function handleAdd() {
    if (!fDate) return toast('Date is required.', 'warning')
    if (fDate < today()) return toast('Cannot block a past date.', 'warning')
    if (!fWholeDay) {
      if (!fStart || !fEnd)       return toast('Start and end time are required.', 'warning')
      if (fStart >= fEnd)         return toast('End time must be after start time.', 'warning')
    }

    // Duplicate / overlap check
    const { data: existing } = await supabase
      .from('blocked_schedules')
      .select('start_time, end_time')
      .eq('venue', fVenue)
      .eq('block_date', fDate)
    if (existing && existing.length > 0) {
      const overlaps = existing.some(b => {
        if (!b.start_time || !b.end_time) return true           // existing whole-day block
        if (fWholeDay) return true                               // new whole-day covers everything
        return fStart < b.end_time && fEnd > b.start_time       // time overlap
      })
      if (overlaps) return toast('A block already exists for this date and time.', 'warning')
    }

    setSubmitting(true)
    const { error } = await supabase.from('blocked_schedules').insert({
      venue:      fVenue,
      block_date: fDate,
      start_time: fWholeDay ? null : fStart,
      end_time:   fWholeDay ? null : fEnd,
      reason:     fReason.trim() || null,
      created_by: profile?.id ?? null,
    })
    setSubmitting(false)

    if (error) { toast(error.message, 'danger'); return }
    toast('Schedule blocked successfully.', 'success')
    setShowModal(false)
    if (fVenue === venue) load()
    else setVenue(fVenue)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('blocked_schedules').delete().eq('id', id)
    setDeleting(null)
    if (error) { toast(error.message, 'danger'); return }
    toast('Block removed.', 'medium')
    load()
  }

  const cafeBlocks  = blocks.filter(b => b.venue === 'cafe')
  const studioBlocks = blocks.filter(b => b.venue === 'studio')
  const shown = venue === 'cafe' ? cafeBlocks : studioBlocks

  return (
    <div className="blocked-sched-page">
      {ToastEl}

      {/* Header row */}
      <div className="blocked-header">
        <div className="blocked-header-left">
          <IonIcon icon={banOutline} className="blocked-header-icon" />
          <h2 className="blocked-header-title">Blocked Dates &amp; Times</h2>
        </div>
        <IonButton shape="round" color="primary" onClick={openModal}>
          <IonIcon slot="start" icon={addOutline} />Block a Date
        </IonButton>
      </div>

      {/* Venue toggle */}
      <IonSegment value={venue} onIonChange={e => setVenue(e.detail.value as BlockedVenue)}
        className="blocked-venue-segment">
        <IonSegmentButton value="cafe">
          <IonIcon icon={cafeOutline} /><IonLabel>Cafe</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="studio">
          <IonIcon icon={musicalNotesOutline} /><IonLabel>Studio</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {/* Calendar */}
      <div className="blocked-cal-wrap">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calEvents}
          height="auto"
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
          displayEventTime={false}
          eventDisplay="block"
        />
      </div>

      {/* List */}
      <div className="blocked-list-header">
        <IonIcon icon={calendarOutline} />
        <h3>
          {venue === 'cafe' ? 'Cafe' : 'Studio'} Blocks
          <span className="blocked-count">{shown.length}</span>
        </h3>
      </div>

      {loading ? (
        <div className="blocked-loading"><IonSpinner name="crescent" /></div>
      ) : shown.length === 0 ? (
        <div className="blocked-empty">
          <IonIcon icon={calendarOutline} />
          <p>No blocked dates for {venue === 'cafe' ? 'the cafe' : 'the studio'} yet.</p>
        </div>
      ) : (
        <IonList lines="none" className="blocked-list">
          {shown.map(b => (
            <div key={b.id} className="blocked-item">
              <div className="blocked-item-dot" />
              <div className="blocked-item-body">
                <p className="blocked-item-date">{fmtDate(b.block_date)}</p>
                {b.start_time && b.end_time ? (
                  <IonChip className="blocked-time-chip">
                    <IonIcon icon={timeOutline} />
                    <IonLabel>{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</IonLabel>
                  </IonChip>
                ) : (
                  <IonChip className="blocked-allday-chip">
                    <IonLabel>All day</IonLabel>
                  </IonChip>
                )}
                {b.reason && <p className="blocked-item-reason">{b.reason}</p>}
              </div>
              <IonButton
                fill="clear" color="danger" size="small"
                onClick={() => handleDelete(b.id)}
                disabled={deleting === b.id}
                className="blocked-del-btn"
              >
                {deleting === b.id
                  ? <IonSpinner name="crescent" />
                  : <IonIcon slot="icon-only" icon={trashOutline} />}
              </IonButton>
            </div>
          ))}
        </IonList>
      )}

      {/* Add Modal */}
      <AppModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}
        breakpoints={[0, 0.85, 1]} initialBreakpoint={0.85}>
        <IonContent>
        <div className="detail-modal-content">
          <div className="detail-modal-header">
            <p className="detail-modal-title">Block a Date / Time</p>
            <IonButton fill="clear" onClick={() => setShowModal(false)}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </div>

          {/* Venue */}
          <p className="blocked-form-label">Venue *</p>
          <IonSegment value={fVenue} onIonChange={e => setFVenue(e.detail.value as BlockedVenue)}
            className="blocked-venue-segment" style={{ marginBottom: 16 }}>
            <IonSegmentButton value="cafe">
              <IonIcon icon={cafeOutline} /><IonLabel>Cafe</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="studio">
              <IonIcon icon={musicalNotesOutline} /><IonLabel>Studio</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Date */}
          <div style={{ marginBottom: 12 }}>
            <IonInput
              label="Date *" labelPlacement="stacked" fill="outline"
              type="date" value={fDate}
              onIonInput={e => setFDate(e.detail.value ?? '')}
              min={today()}
            />
          </div>

          {/* Whole day toggle */}
          <IonItem lines="none" className="blocked-toggle-item">
            <IonIcon icon={calendarOutline} slot="start" color="primary" />
            <IonLabel>
              <h3>Block whole day</h3>
              <IonNote>Disable toggle to set a specific time range</IonNote>
            </IonLabel>
            <IonToggle
              slot="end" checked={fWholeDay}
              onIonChange={e => { setFWholeDay(e.detail.checked); setFStart(''); setFEnd('') }}
              color="primary"
            />
          </IonItem>

          {/* Time range */}
          {!fWholeDay && (
            <div className="blocked-time-row">
              <div style={{ flex: 1 }}>
                <IonInput label="Start Time *" labelPlacement="stacked" fill="outline"
                  type="time" value={fStart}
                  onIonInput={e => setFStart(e.detail.value ?? '')} />
              </div>
              <IonIcon icon={timeOutline} className="blocked-time-divider" />
              <div style={{ flex: 1 }}>
                <IonInput label="End Time *" labelPlacement="stacked" fill="outline"
                  type="time" value={fEnd}
                  onIonInput={e => setFEnd(e.detail.value ?? '')} />
              </div>
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: 16, marginTop: 12 }}>
            <IonTextarea
              label="Reason (optional)" labelPlacement="stacked" fill="outline"
              value={fReason} onIonInput={e => setFReason(e.detail.value ?? '')}
              maxlength={200}
              placeholder="e.g. Private event, Maintenance, Holiday closure…"
              autoGrow rows={2}
            />
          </div>

          <IonItem lines="none" style={{ '--background': 'var(--color-surface-container-low)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
            <IonNote style={{ fontSize: 12, padding: '10px 0', lineHeight: 1.55 }}>
              Blocked slots will appear as <strong>"ADMIN BLOCKED SCHED"</strong> on all calendars and will prevent new bookings from being submitted for that date/time.
            </IonNote>
          </IonItem>

          <IonButton expand="block" color="primary" style={{ '--border-radius': 'var(--radius)' }}
            onClick={handleAdd} disabled={submitting}>
            {submitting
              ? <IonSpinner name="crescent" />
              : <><IonIcon slot="start" icon={banOutline} />Block This Schedule</>}
          </IonButton>
        </div>
        </IonContent>
      </AppModal>
    </div>
  )
}
