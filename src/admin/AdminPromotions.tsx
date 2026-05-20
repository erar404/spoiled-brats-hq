import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonButton, IonIcon, IonInput, IonModal,
  IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import {
  addOutline, calendarOutline, closeOutline,
  imageOutline, saveOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import type { PromotionRow, PromotionType } from '../types/database'
import './AdminPromotions.css'
import './AdminBookings.css'
import './AdminPhase7.css'

const BUCKET = 'venue-photos'
const FOLDER = 'promotions'

const TYPE_LABELS: Record<PromotionType, string> = {
  event:     'Event',
  menu_item: 'Menu Item',
  others:    'Others',
}

const EMPTY_FORM = {
  title:          '',
  description:    '',
  promotion_type: 'others' as PromotionType,
  is_permanent:   true,
  start_date:     '',
  end_date:       '',
  event_date:     '',
  is_active:      true,
  sort_order:     '0',
}
type FormState = typeof EMPTY_FORM

export default function AdminPromotions() {
  const { toast, ToastEl } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows,     setRows]     = useState<PromotionRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<PromotionRow | null>(null)
  const [isNew,    setIsNew]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgFile,  setImgFile]  = useState<File | null>(null)
  const [preview,  setPreview]  = useState('')
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('promotions').select('*').order('sort_order').order('created_at')
    setRows((data ?? []) as unknown as PromotionRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function field<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openNew() {
    setIsNew(true); setSelected(null)
    setForm({ ...EMPTY_FORM, sort_order: String((rows[rows.length - 1]?.sort_order ?? 0) + 1) })
    setImgFile(null); setPreview('')
  }

  function openEdit(row: PromotionRow) {
    setIsNew(false); setSelected(row)
    setForm({
      title:          row.title,
      description:    row.description ?? '',
      promotion_type: row.promotion_type,
      is_permanent:   row.is_permanent,
      start_date:     row.start_date  ?? '',
      end_date:       row.end_date    ?? '',
      event_date:     row.event_date  ?? '',
      is_active:      row.is_active,
      sort_order:     String(row.sort_order),
    })
    setImgFile(null); setPreview(row.image_url ?? '')
  }

  function closeModal() { setSelected(null); setIsNew(false) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview && isNew) URL.revokeObjectURL(preview)
    setImgFile(f)
    setPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  async function uploadImg(): Promise<string | null> {
    if (!imgFile) return selected?.image_url ?? null
    const ext  = imgFile.name.split('.').pop() ?? 'jpg'
    const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, imgFile)
    if (error) { toast('Image upload failed: ' + error.message, 'danger'); return null }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function syncSchedule(
    promoId: string,
    prev: PromotionRow | null,
  ) {
    const isEvent   = form.promotion_type === 'event'
    const prevEvent = prev?.promotion_type === 'event'
    const schedPayload = {
      event_name:      form.title.trim(),
      booking_date:    form.event_date,
      booking_details: form.description.trim() || null,
      rent_whole_place: false,
      status:          'approved' as const,
      user_id:         null,
    }

    if (isEvent && form.event_date) {
      if (!prev?.linked_schedule_id) {
        // New event — create schedule entry
        const { data: sched } = await supabase
          .from('cafe_schedule').insert(schedPayload).select('id').single()
        if (sched) {
          await (supabase.from('promotions') as any)
            .update({ linked_schedule_id: sched.id }).eq('id', promoId)
        }
      } else {
        // Update existing schedule entry
        await supabase.from('cafe_schedule')
          .update({ event_name: schedPayload.event_name, booking_date: schedPayload.booking_date, booking_details: schedPayload.booking_details })
          .eq('id', prev.linked_schedule_id)
      }
    } else if (!isEvent && prevEvent && prev?.linked_schedule_id) {
      // Type changed away from event — remove schedule entry
      await supabase.from('cafe_schedule').delete().eq('id', prev.linked_schedule_id)
      await (supabase.from('promotions') as any).update({ linked_schedule_id: null }).eq('id', promoId)
    }
  }

  async function save() {
    if (!form.title.trim()) return toast('Title is required.', 'warning')
    if (form.promotion_type === 'event' && !form.event_date)
      return toast('Event date is required for event promotions.', 'warning')
    if (!form.is_permanent && !form.start_date && !form.end_date)
      return toast('Set at least one date for a time-limited promotion.', 'warning')

    setSaving(true)
    const imageUrl = await uploadImg()
    if (imageUrl === null && imgFile) { setSaving(false); return }

    const payload = {
      title:          form.title.trim(),
      description:    form.description.trim() || null,
      image_url:      imageUrl,
      promotion_type: form.promotion_type,
      is_permanent:   form.is_permanent,
      start_date:     form.is_permanent ? null : (form.start_date || null),
      end_date:       form.is_permanent ? null : (form.end_date   || null),
      event_date:     form.promotion_type === 'event' ? (form.event_date || null) : null,
      is_active:      form.is_active,
      sort_order:     parseInt(form.sort_order) || 0,
    }

    let promoId = selected?.id ?? ''

    if (isNew) {
      const { data, error } = await (supabase.from('promotions') as any)
        .insert(payload).select('id').single()
      if (error) { toast(error.message, 'danger'); setSaving(false); return }
      promoId = (data as any).id
    } else if (selected) {
      const { error } = await (supabase.from('promotions') as any)
        .update(payload).eq('id', selected.id)
      if (error) { toast(error.message, 'danger'); setSaving(false); return }
    }

    await syncSchedule(promoId, selected)

    setSaving(false)
    toast(isNew ? 'Promotion created.' : 'Promotion updated.', 'success')
    if (preview && isNew) URL.revokeObjectURL(preview)
    closeModal()
    load()
  }

  async function deletePromo() {
    if (!selected) return
    setDeleting(true)

    if (selected.linked_schedule_id) {
      await supabase.from('cafe_schedule').delete().eq('id', selected.linked_schedule_id)
    }
    if (selected.image_url) {
      const path = selected.image_url.split(`/${BUCKET}/`)[1]
      if (path) await supabase.storage.from(BUCKET).remove([path])
    }

    const { error } = await supabase.from('promotions').delete().eq('id', selected.id)
    setDeleting(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Promotion deleted.', 'medium')
    closeModal(); load()
  }

  const isOpen = isNew || !!selected

  return (
    <>
      {ToastEl}

      <div className="promo-admin-toolbar">
        <span className="gallery-count">{rows.length} promotion{rows.length !== 1 ? 's' : ''}</span>
        <IonButton color="primary" shape="round" onClick={openNew} style={{ margin:0 }}>
          <IonIcon slot="start" icon={addOutline} />New Promotion
        </IonButton>
      </div>

      {loading ? (
        <div className="gallery-loading"><IonSpinner name="crescent" color="primary" /></div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={calendarOutline} />
          <p>No promotions yet. Create your first one.</p>
        </div>
      ) : (
        <div className="promo-admin-list">
          {rows.map(row => {
            const typeLabel = TYPE_LABELS[row.promotion_type]
            return (
              <div
                key={row.id}
                className={`promo-admin-card ${!row.is_active ? 'promo-admin-card--inactive' : ''}`}
                onClick={() => openEdit(row)}
              >
                <div
                  className="promo-admin-img"
                  style={row.image_url ? { backgroundImage: `url('${row.image_url}')` } : undefined}
                >
                  {!row.image_url && <IonIcon icon={imageOutline} />}
                </div>
                <div className="promo-admin-body">
                  <div className="promo-admin-badges">
                    <span className={`promo-type-badge promo-type-badge--${row.promotion_type}`}>
                      {typeLabel}
                    </span>
                    {!row.is_active && (
                      <span className="promo-type-badge promo-type-badge--inactive">Hidden</span>
                    )}
                    {row.is_permanent
                      ? <span className="promo-type-badge promo-type-badge--perm">Ongoing</span>
                      : <span className="promo-type-badge promo-type-badge--timed">Timed</span>
                    }
                  </div>
                  <p className="promo-admin-title">{row.title}</p>
                  {row.promotion_type === 'event' && row.event_date && (
                    <p className="promo-admin-date">
                      <IonIcon icon={calendarOutline} />
                      {new Date(row.event_date + 'T00:00:00').toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  )}
                  {!row.is_permanent && (row.start_date || row.end_date) && (
                    <p className="promo-admin-date">
                      <IonIcon icon={calendarOutline} />
                      {row.start_date ?? '—'} → {row.end_date ?? 'open'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      <IonModal isOpen={isOpen} onDidDismiss={closeModal}
        breakpoints={[0, 0.7, 0.95]} initialBreakpoint={0.92}>
        <div className="detail-modal-content">
          <div className="detail-modal-header">
            <p className="detail-modal-title">
              {isNew ? 'New Promotion' : 'Edit Promotion'}
            </p>
            <IonButton fill="clear" className="detail-modal-close" onClick={closeModal}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </div>

          {/* Image upload */}
          <div
            className="promo-modal-img"
            style={preview ? { backgroundImage: `url('${preview}')` } : undefined}
            onClick={() => fileRef.current?.click()}
          >
            {!preview && (
              <div className="gallery-upload-hint">
                <IonIcon icon={imageOutline} />
                <span>Tap to add image</span>
              </div>
            )}
            <div className="hero-manager-overlay">
              <IonIcon icon={imageOutline} /><span>Change</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display:'none' }} onChange={handleFile} />

          {/* Title */}
          <div className="p7-field">
            <IonInput label="Title *" labelPlacement="stacked" fill="outline"
              value={form.title}
              onIonInput={e => field('title', e.detail.value ?? '')}
              placeholder="e.g. Live Music Friday" className="p7-input" />
          </div>

          {/* Description */}
          <div className="p7-field">
            <IonTextarea label="Description" labelPlacement="stacked" fill="outline"
              value={form.description}
              onIonInput={e => field('description', e.detail.value ?? '')}
              placeholder="Details about this promotion…"
              rows={3} autoGrow className="p7-input" />
          </div>

          {/* Promotion type */}
          <div className="p7-field">
            <IonSelect
              label="Promotion Type *" labelPlacement="stacked" fill="outline"
              value={form.promotion_type}
              onIonChange={e => field('promotion_type', e.detail.value as PromotionType)}
              interface="popover" className="p7-input"
            >
              <IonSelectOption value="event">Event</IonSelectOption>
              <IonSelectOption value="menu_item">Menu Item</IonSelectOption>
              <IonSelectOption value="others">Others</IonSelectOption>
            </IonSelect>
          </div>

          {/* Event date — shown when type = event */}
          {form.promotion_type === 'event' && (
            <div className="p7-field">
              <IonInput label="Event Date *" labelPlacement="stacked" fill="outline"
                type="date" value={form.event_date}
                onIonInput={e => field('event_date', e.detail.value ?? '')}
                className="p7-input" />
            </div>
          )}

          {/* Permanent vs timed */}
          <div className="menu-avail-row">
            <span className="menu-avail-label">Permanent (ongoing)</span>
            <IonToggle
              checked={form.is_permanent}
              onIonChange={e => field('is_permanent', e.detail.checked)}
              color="primary"
            />
          </div>

          {/* Date range — only for timed promotions */}
          {!form.is_permanent && (
            <div className="menu-price-row" style={{ marginBottom:14 }}>
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="Start Date" labelPlacement="stacked" fill="outline"
                  type="date" value={form.start_date}
                  onIonInput={e => field('start_date', e.detail.value ?? '')}
                  className="p7-input" />
              </div>
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="End Date" labelPlacement="stacked" fill="outline"
                  type="date" value={form.end_date}
                  onIonInput={e => field('end_date', e.detail.value ?? '')}
                  className="p7-input" />
              </div>
            </div>
          )}

          {/* Sort order + active toggle */}
          <div className="menu-price-row" style={{ marginBottom:14 }}>
            <div className="p7-field" style={{ marginBottom:0 }}>
              <IonInput label="Sort Order" labelPlacement="stacked" fill="outline"
                type="number" value={form.sort_order}
                onIonInput={e => field('sort_order', e.detail.value ?? '0')}
                min="0" className="p7-input" />
            </div>
            <div className="menu-avail-row" style={{ flex:1, margin:0 }}>
              <span className="menu-avail-label">Visible</span>
              <IonToggle
                checked={form.is_active}
                onIonChange={e => field('is_active', e.detail.checked)}
                color="primary"
              />
            </div>
          </div>

          {/* Event-linked calendar note */}
          {form.promotion_type === 'event' && (
            <p className="promo-event-note">
              This promotion will automatically appear on the cafe booking calendar as an approved event.
            </p>
          )}

          {/* Actions */}
          <div className="p7-modal-actions">
            {!isNew && (
              <IonButton fill="outline" color="danger" onClick={deletePromo} disabled={deleting}>
                {deleting ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={trashOutline} />}
              </IonButton>
            )}
            <IonButton className="p7-save-btn" onClick={save} disabled={saving} style={{ flex:1 }}>
              {saving
                ? <IonSpinner name="crescent" />
                : <><IonIcon slot="start" icon={saveOutline} />{isNew ? 'Create' : 'Save Changes'}</>
              }
            </IonButton>
          </div>
        </div>
      </IonModal>
    </>
  )
}
