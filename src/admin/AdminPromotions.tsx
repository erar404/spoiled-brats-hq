import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonButton, IonContent, IonIcon, IonInput,
  IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  addOutline, calendarOutline, closeCircleOutline, closeOutline,
  cloudUploadOutline, imageOutline, saveOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import type { PromotionRow, PromotionType } from '../types/database'
import './AdminPromotions.css'
import './AdminBookings.css'
import './AdminPhase7.css'

const BUCKET       = 'venue-photos'
const FOLDER       = 'promotions'
const MAX_PHOTOS   = 5
const MAX_FILE_MB  = 5
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024

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

// Each slot is either an already-uploaded URL or a local File waiting to be uploaded
type PhotoSlot =
  | { kind: 'url';  url: string }
  | { kind: 'file'; file: File; preview: string }

function slotPreview(s: PhotoSlot) {
  return s.kind === 'url' ? s.url : s.preview
}

export default function AdminPromotions() {
  const { toast, ToastEl } = useToast()
  const fileRef    = useRef<HTMLInputElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const photosRef  = useRef<PhotoSlot[]>([])

  const [rows,      setRows]      = useState<PromotionRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<PromotionRow | null>(null)
  const [isNew,     setIsNew]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [photos,    setPhotos]    = useState<PhotoSlot[]>([])
  const [dragActive, setDragActive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('promotions').select('*').order('sort_order').order('created_at')
    setRows((data ?? []) as unknown as PromotionRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Keep ref in sync so the unmount cleanup sees latest state
  photosRef.current = photos
  useEffect(() => () => { revokeNewPreviews(photosRef.current) }, [])

  function revokeNewPreviews(slots: PhotoSlot[]) {
    slots.forEach(s => { if (s.kind === 'file') URL.revokeObjectURL(s.preview) })
  }

  function field<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openNew() {
    setIsNew(true); setSelected(null)
    setForm({ ...EMPTY_FORM, sort_order: String((rows[rows.length - 1]?.sort_order ?? 0) + 1) })
    setPhotos([])
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
    // Prefer photo_urls array; fall back to legacy image_url
    const urls = row.photo_urls?.length
      ? row.photo_urls
      : row.image_url ? [row.image_url] : []
    setPhotos(urls.map(url => ({ kind: 'url', url } as PhotoSlot)))
  }

  function closeModal() {
    revokeNewPreviews(photos)
    setSelected(null); setIsNew(false); setPhotos([])
  }

  // ── File helpers ────────────────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const all       = Array.from(files)
    const images    = all.filter(f => f.type.startsWith('image/'))
    const nonImages = all.length - images.length
    const tooLarge  = images.filter(f => f.size > MAX_FILE_SIZE)
    const valid     = images.filter(f => f.size <= MAX_FILE_SIZE)

    if (nonImages > 0 && valid.length === 0) {
      toast('No image files found. Drop JPEG, PNG, WebP, or GIF files.', 'warning')
      return
    }
    if (tooLarge.length > 0) {
      toast(`${tooLarge.length} file${tooLarge.length > 1 ? 's were' : ' was'} skipped — max ${MAX_FILE_MB} MB per image.`, 'warning')
    }

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      toast(`Maximum ${MAX_PHOTOS} photos already reached.`, 'medium')
      return
    }
    const toAdd = valid.slice(0, remaining)
    if (valid.length > remaining) {
      toast(`Added ${toAdd.length} photo${toAdd.length > 1 ? 's' : ''}. ${MAX_PHOTOS} photo limit reached.`, 'medium')
    }
    const newSlots: PhotoSlot[] = toAdd.map(file => ({
      kind: 'file', file, preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newSlots])
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      const slot = prev[index]
      if (slot.kind === 'file') URL.revokeObjectURL(slot.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setDragActive(true)
  }
  function onDragLeave(e: React.DragEvent) {
    // Only deactivate when leaving the drop zone itself, not a child
    if (!dropRef.current?.contains(e.relatedTarget as Node)) setDragActive(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  type UploadResult = { url: string; path: string | null }

  async function uploadSlot(slot: PhotoSlot): Promise<UploadResult | null> {
    if (slot.kind === 'url') return { url: slot.url, path: null }
    const ext  = slot.file.name.split('.').pop() ?? 'jpg'
    const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, slot.file)
    if (error) { toast('Image upload failed: ' + error.message, 'danger'); return null }
    return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path }
  }

  async function uploadAll(): Promise<string[] | null> {
    const results = await Promise.all(photos.map(uploadSlot))
    const failed  = results.some(r => r === null)
    if (failed) {
      // Clean up any files that did upload before the failure
      const uploaded = results
        .filter((r): r is UploadResult => r !== null && r.path !== null)
        .map(r => r.path as string)
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded)
      return null
    }
    return (results as UploadResult[]).map(r => r.url)
  }

  // ── Schedule sync (unchanged) ───────────────────────────────────────────────

  async function syncSchedule(promoId: string, prev: PromotionRow | null) {
    const isEvent   = form.promotion_type === 'event'
    const prevEvent = prev?.promotion_type === 'event'
    const schedPayload = {
      event_name:       form.title.trim(),
      booking_date:     form.event_date,
      booking_details:  form.description.trim() || null,
      rent_whole_place: false,
      status:           'approved' as const,
      user_id:          null,
    }
    if (isEvent && form.event_date) {
      if (!prev?.linked_schedule_id) {
        const { data: sched } = await supabase
          .from('cafe_schedule').insert(schedPayload).select('id').single()
        if (sched) {
          await (supabase.from('promotions') as any)
            .update({ linked_schedule_id: sched.id }).eq('id', promoId)
        }
      } else {
        await supabase.from('cafe_schedule')
          .update({ event_name: schedPayload.event_name, booking_date: schedPayload.booking_date, booking_details: schedPayload.booking_details })
          .eq('id', prev.linked_schedule_id)
      }
    } else if (!isEvent && prevEvent && prev?.linked_schedule_id) {
      await supabase.from('cafe_schedule').delete().eq('id', prev.linked_schedule_id)
      await (supabase.from('promotions') as any).update({ linked_schedule_id: null }).eq('id', promoId)
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function save() {
    if (!form.title.trim()) return toast('Title is required.', 'warning')
    if (form.promotion_type === 'event' && !form.event_date)
      return toast('Event date is required for event promotions.', 'warning')
    if (!form.is_permanent && !form.start_date && !form.end_date)
      return toast('Set at least one date for a time-limited promotion.', 'warning')

    setSaving(true)
    const uploadedUrls = await uploadAll()
    if (uploadedUrls === null) { setSaving(false); return }

    const payload = {
      title:          form.title.trim(),
      description:    form.description.trim() || null,
      image_url:      uploadedUrls[0] ?? null,
      photo_urls:     uploadedUrls,
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
    revokeNewPreviews(photos)
    closeModal(); load()
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function deletePromo() {
    if (!selected) return
    setDeleting(true)
    if (selected.linked_schedule_id) {
      await supabase.from('cafe_schedule').delete().eq('id', selected.linked_schedule_id)
    }
    const allUrls = selected.photo_urls?.length
      ? selected.photo_urls
      : selected.image_url ? [selected.image_url] : []
    for (const url of allUrls) {
      const path = url.split(`/${BUCKET}/`)[1]
      if (path) await supabase.storage.from(BUCKET).remove([path])
    }
    const { error } = await supabase.from('promotions').delete().eq('id', selected.id)
    setDeleting(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Promotion deleted.', 'medium')
    closeModal(); load()
  }

  const isOpen    = isNew || !!selected
  const canAdd    = photos.length < MAX_PHOTOS
  const thumbUrl  = (row: PromotionRow) =>
    row.photo_urls?.[0] ?? row.image_url ?? null

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
            const thumb     = thumbUrl(row)
            const photoCount = row.photo_urls?.length ?? (row.image_url ? 1 : 0)
            return (
              <div
                key={row.id}
                className={`promo-admin-card ${!row.is_active ? 'promo-admin-card--inactive' : ''}`}
                onClick={() => openEdit(row)}
              >
                <div
                  className="promo-admin-img"
                  style={thumb ? { backgroundImage: `url('${thumb}')` } : undefined}
                >
                  {!thumb && <IonIcon icon={imageOutline} />}
                  {photoCount > 1 && (
                    <span className="promo-photo-count">{photoCount}</span>
                  )}
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
                      {row.start_date ?? '—'} to {row.end_date ?? 'open'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      <AppModal isOpen={isOpen} onDidDismiss={closeModal}
        breakpoints={[0, 0.7, 0.98]} initialBreakpoint={0.98}>
        <IonContent>
          <div className="detail-modal-content promo-modal-content">
            <div className="detail-modal-header">
              <p className="detail-modal-title">
                {isNew ? 'New Promotion' : 'Edit Promotion'}
              </p>
              <IonButton fill="clear" className="detail-modal-close" onClick={closeModal}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            {/* ── Photo upload section ── */}
            <div
              ref={dropRef}
              className={`promo-photos-section${dragActive ? ' promo-photos-section--drag' : ''}`}
              onDragOver={onDragOver}
              onDragEnter={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="promo-photos-label">
                <IonIcon icon={imageOutline} />
                <span>Photos <span className="promo-photos-count">{photos.length}/{MAX_PHOTOS}</span></span>
              </div>

              {dragActive && (
                <div className="promo-drag-overlay">
                  <IonIcon icon={cloudUploadOutline} />
                  <span>Drop photos here</span>
                </div>
              )}

              {photos.length === 0 && !dragActive ? (
                <div
                  className="promo-photos-empty"
                  onClick={() => fileRef.current?.click()}
                >
                  <IonIcon icon={cloudUploadOutline} className="promo-photos-empty-icon" />
                  <p className="promo-photos-empty-text">
                    Drag &amp; drop photos here, or click to browse
                  </p>
                  <p className="promo-photos-empty-hint">JPEG, PNG, WebP, GIF — up to {MAX_PHOTOS} photos</p>
                </div>
              ) : (
                <div className="promo-photos-grid">
                  {photos.map((slot, i) => (
                    <div key={i} className="promo-photo-thumb">
                      <img src={slotPreview(slot)} alt={`Photo ${i + 1}`} draggable={false} />
                      <button
                        className="promo-photo-remove"
                        onClick={() => removePhoto(i)}
                        aria-label="Remove photo"
                        type="button"
                      >
                        <IonIcon icon={closeCircleOutline} />
                      </button>
                      {i === 0 && <span className="promo-photo-primary-badge">Cover</span>}
                    </div>
                  ))}
                  {canAdd && (
                    <div
                      className="promo-photo-add-slot"
                      onClick={() => fileRef.current?.click()}
                    >
                      <IonIcon icon={addOutline} />
                      <span>Add</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display:'none' }}
              onChange={handleFileInput}
            />

            {/* Title */}
            <div className="p7-field">
              <IonInput label="Title *" labelPlacement="stacked" fill="outline"
                value={form.title} maxlength={100}
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

            {/* Event date */}
            {form.promotion_type === 'event' && (
              <div className="p7-field">
                <IonInput label="Event Date *" labelPlacement="stacked" fill="outline"
                  type="date" value={form.event_date}
                  onIonInput={e => field('event_date', e.detail.value ?? '')}
                  className="p7-input" />
              </div>
            )}

            {/* Permanent toggle */}
            <div className="menu-avail-row">
              <span className="menu-avail-label">Permanent (ongoing)</span>
              <IonToggle
                checked={form.is_permanent}
                onIonChange={e => field('is_permanent', e.detail.checked)}
                color="primary"
              />
            </div>

            {/* Date range */}
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

            {/* Sort + visibility */}
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

            {/* Event note */}
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
        </IonContent>
      </AppModal>
    </>
  )
}
