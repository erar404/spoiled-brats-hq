import { useCallback, useEffect, useState } from 'react'
import { IonButton, IonIcon, IonInput, IonSegment, IonSegmentButton, IonLabel, IonSpinner } from '@ionic/react'
import { cafeOutline, musicalNotesOutline, saveOutline, qrCodeOutline } from 'ionicons/icons'
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

interface StudioPricing { rehearsal: number; recording: number }
const DEFAULT_PRICING: StudioPricing = { rehearsal: 600, recording: 1200 }

export default function AdminScheduleSettings() {
  const { toast, ToastEl } = useToast()
  const [venue,         setVenue]         = useState<Venue>('studio')
  const [cafeHours,     setCafeHours]     = useState<WeekHours>(DEFAULT_HOURS)
  const [studioHours,   setStudioHours]   = useState<WeekHours>(DEFAULT_HOURS)
  const [pricing,       setPricing]       = useState<StudioPricing>(DEFAULT_PRICING)
  const [gcashNum,      setGcashNum]      = useState('')
  const [gcashName,     setGcashName]     = useState('')
  const [gcashQrUrl,    setGcashQrUrl]    = useState('')
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [savingPricing, setSavingPricing] = useState(false)
  const [savingGcash,   setSavingGcash]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['cafe_hours', 'studio_hours', 'studio_pricing', 'gcash_info'])

    data?.forEach(row => {
      if (row.key === 'cafe_hours')    setCafeHours(row.value as WeekHours)
      if (row.key === 'studio_hours')  setStudioHours(row.value as WeekHours)
      if (row.key === 'studio_pricing') setPricing(row.value as unknown as StudioPricing)
      if (row.key === 'gcash_info') {
        const g = row.value as { number?: string; name?: string; qr_url?: string }
        setGcashNum(g.number ?? '')
        setGcashName(g.name ?? '')
        setGcashQrUrl(g.qr_url ?? '')
      }
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

  async function saveGcash() {
    setSavingGcash(true)
    const { error } = await supabase.from('system_settings').upsert({
      key: 'gcash_info',
      value: { number: gcashNum.trim(), name: gcashName.trim(), qr_url: gcashQrUrl.trim() } as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })
    setSavingGcash(false)
    if (error) toast(error.message, 'danger')
    else toast('GCash payment info saved.', 'success')
  }

  async function savePricing() {
    if (pricing.rehearsal <= 0 || pricing.recording <= 0)
      return toast('Rates must be greater than zero.', 'warning')
    setSavingPricing(true)
    const { error } = await supabase.from('system_settings').upsert({
      key: 'studio_pricing',
      value: pricing as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })
    setSavingPricing(false)
    if (error) toast(error.message, 'danger')
    else toast('Studio pricing saved.', 'success')
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

          {/* Studio-only: session pricing */}
          {venue === 'studio' && (
            <>
              <p className="pricing-section-title">Session Rates (₱ per hour)</p>
              <div className="hours-table">
                <div className="hours-row">
                  <span className="hours-day" style={{ minWidth: 160 }}>Rehearsal</span>
                  <IonInput
                    type="number" min="0" step="50"
                    value={pricing.rehearsal}
                    onIonInput={e => setPricing(p => ({ ...p, rehearsal: Number(e.detail.value) || 0 }))}
                    className="hours-input"
                  />
                  <span className="hours-separator">/hr</span>
                </div>
                <div className="hours-row">
                  <span className="hours-day" style={{ minWidth: 160 }}>Recording / Mixing</span>
                  <IonInput
                    type="number" min="0" step="50"
                    value={pricing.recording}
                    onIonInput={e => setPricing(p => ({ ...p, recording: Number(e.detail.value) || 0 }))}
                    className="hours-input"
                  />
                  <span className="hours-separator">/hr</span>
                </div>
              </div>
              <IonButton expand="block" className="settings-save-btn" onClick={savePricing} disabled={savingPricing}>
                {savingPricing
                  ? <IonSpinner name="crescent" />
                  : <><IonIcon slot="start" icon={saveOutline} />Save Studio Pricing</>
                }
              </IonButton>

              {/* GCash payment info */}
              <p className="pricing-section-title">
                <IonIcon icon={qrCodeOutline} style={{ marginRight:6, verticalAlign:'middle' }} />
                GCash Payment Info
              </p>
              <div className="p7-field">
                <IonInput label="GCash Number" labelPlacement="stacked" fill="outline"
                  type="tel" value={gcashNum}
                  onIonInput={e => setGcashNum(e.detail.value ?? '')}
                  placeholder="e.g. 09171234567" className="p7-input" />
              </div>
              <div className="p7-field">
                <IonInput label="Account Name" labelPlacement="stacked" fill="outline"
                  value={gcashName}
                  onIonInput={e => setGcashName(e.detail.value ?? '')}
                  placeholder="e.g. Juan Dela Cruz" className="p7-input" />
              </div>
              <div className="p7-field">
                <IonInput label="QR Code Image URL" labelPlacement="stacked" fill="outline"
                  type="url" value={gcashQrUrl}
                  onIonInput={e => setGcashQrUrl(e.detail.value ?? '')}
                  placeholder="https://… (upload to venue-photos and paste URL)"
                  className="p7-input" />
              </div>
              {gcashQrUrl && (
                <img src={gcashQrUrl} alt="GCash QR preview"
                  style={{ width:140, height:140, objectFit:'contain', borderRadius:'var(--radius-lg)', border:'1px solid var(--color-outline-variant)', marginBottom:12 }} />
              )}
              <IonButton expand="block" className="settings-save-btn" onClick={saveGcash} disabled={savingGcash}>
                {savingGcash
                  ? <IonSpinner name="crescent" />
                  : <><IonIcon slot="start" icon={saveOutline} />Save GCash Info</>
                }
              </IonButton>
            </>
          )}
        </>
      )}
    </>
  )
}
