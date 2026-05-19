import { useCallback, useEffect, useState } from 'react'
import { IonButton, IonIcon, IonInput, IonSegment, IonSegmentButton, IonLabel, IonSpinner } from '@ionic/react'
import { cafeOutline, checkmarkOutline, musicalNotesOutline, saveOutline } from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import './AdminBookings.css'
import './AdminPhase7.css'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
type Day = typeof DAYS[number]
interface DayHours { open: string; close: string }
type WeekHours = Partial<Record<Day, DayHours>>

const DEFAULT_HOURS: WeekHours = {
  monday:    { open:'08:00', close:'21:00' },
  tuesday:   { open:'08:00', close:'21:00' },
  wednesday: { open:'08:00', close:'21:00' },
  thursday:  { open:'08:00', close:'21:00' },
  friday:    { open:'08:00', close:'22:00' },
  saturday:  { open:'09:00', close:'22:00' },
  sunday:    { open:'09:00', close:'20:00' },
}

type Venue = 'cafe' | 'studio'

export default function AdminScheduleSettings() {
  const { toast, ToastEl } = useToast()
  const [venue,       setVenue]       = useState<Venue>('cafe')
  const [cafeHours,   setCafeHours]   = useState<WeekHours>(DEFAULT_HOURS)
  const [studioHours, setStudioHours] = useState<WeekHours>(DEFAULT_HOURS)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['cafe_hours', 'studio_hours'])

    data?.forEach(row => {
      if (row.key === 'cafe_hours')   setCafeHours(row.value as WeekHours)
      if (row.key === 'studio_hours') setStudioHours(row.value as WeekHours)
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function updateHour(v: Venue, day: Day, field: 'open' | 'close', val: string) {
    const setter = v === 'cafe' ? setCafeHours : setStudioHours
    setter(prev => ({
      ...prev,
      [day]: { ...((prev[day]) ?? { open:'', close:'' }), [field]: val },
    }))
  }

  async function save() {
    setSaving(true)
    const key   = venue === 'cafe' ? 'cafe_hours' : 'studio_hours'
    const value = venue === 'cafe' ? cafeHours    : studioHours
    const { error } = await supabase.from('system_settings').upsert({
      key, value: value as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })
    setSaving(false)
    if (error) toast(error.message, 'danger')
    else toast(`${venue === 'cafe' ? 'Cafe' : 'Studio'} hours saved.`, 'success')
  }

  const hours = venue === 'cafe' ? cafeHours : studioHours

  return (
    <>
      <IonSegment value={venue} onIonChange={e => setVenue(e.detail.value as Venue)}
        className="settings-venue-segment">
        <IonSegmentButton value="cafe">
          <IonIcon icon={cafeOutline} />
          <IonLabel>Cafe Hours</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="studio">
          <IonIcon icon={musicalNotesOutline} />
          <IonLabel>Studio Hours</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
          <IonSpinner name="crescent" color="primary" />
        </div>
      ) : (
        <>
          <div className="hours-table">
            {DAYS.map(day => (
              <div key={day} className="hours-row">
                <span className="hours-day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                <IonInput
                  type="time"
                  value={hours[day]?.open ?? ''}
                  onIonInput={e => updateHour(venue, day, 'open', e.detail.value ?? '')}
                  className="hours-input"
                />
                <span className="hours-separator">–</span>
                <IonInput
                  type="time"
                  value={hours[day]?.close ?? ''}
                  onIonInput={e => updateHour(venue, day, 'close', e.detail.value ?? '')}
                  className="hours-input"
                />
              </div>
            ))}
          </div>

          {ToastEl}
          <IonButton expand="block" className="settings-save-btn" onClick={save} disabled={saving}>
            {saving
              ? <IonSpinner name="crescent" />
              : <><IonIcon slot="start" icon={saveOutline} />Save {venue === 'cafe' ? 'Cafe' : 'Studio'} Hours</>
            }
          </IonButton>
        </>
      )}
    </>
  )
}
