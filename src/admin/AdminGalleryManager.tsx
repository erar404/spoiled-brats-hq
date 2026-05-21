import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonButton, IonIcon, IonInput,
  IonSpinner, IonTextarea, IonToggle,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  addOutline, chevronDownOutline, chevronUpOutline,
  closeOutline, eyeOffOutline, eyeOutline,
  imageOutline, saveOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import './AdminGalleryManager.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type TableName = 'cafe_gallery' | 'studio_gallery' | 'cafe_promos'

interface PhotoRow {
  id: string
  image_url: string
  sort_order: number
  is_active: boolean
  // gallery fields
  alt_text?: string | null
  caption?: string | null
  // promo fields
  title?: string
  description?: string | null
}

interface Config {
  table: TableName
  folder: 'cafe-gallery' | 'studio-gallery' | 'cafe-promos'
  isPromo: boolean
}

const BUCKET = 'venue-photos'

// ── Helper: extract storage path from a public URL ────────────────────────────
function storagePath(url: string): string | null {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  return idx !== -1 ? url.slice(idx + marker.length) : null
}

// ── Hero Image Manager ────────────────────────────────────────────────────────

interface HeroManagerProps {
  settingKey: 'cafe_hero_image' | 'studio_hero_image'
  label: string
  folder: 'cafe-hero' | 'studio-hero'
}

function HeroManager({ settingKey, label, folder }: HeroManagerProps) {
  const { toast, ToastEl } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', settingKey).single()
      .then(({ data }) => {
        const val = data?.value as { url?: string } | null
        if (val?.url) setCurrentUrl(val.url)
      })
  }, [settingKey])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  async function save() {
    if (!file) return
    setSaving(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET).upload(path, file, { upsert: true })

    if (uploadErr) {
      toast('Upload failed. ' + uploadErr.message, 'danger')
      setSaving(false)
      return
    }

    const newUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    const { error: settingsErr } = await supabase.from('system_settings')
      .update({ value: { url: newUrl } })
      .eq('key', settingKey)

    setSaving(false)
    if (settingsErr) { toast('Failed to save setting.', 'danger'); return }

    setCurrentUrl(newUrl)
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    toast(`${label} hero image updated.`, 'success')
  }

  function discard() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
  }

  const display = preview ?? currentUrl

  return (
    <div className="hero-manager">
      {ToastEl}
      <p className="hero-manager-label">{label}</p>
      <div
        className="hero-manager-preview"
        onClick={() => fileRef.current?.click()}
        style={display ? { backgroundImage: `url('${display}')` } : undefined}
      >
        {!display && (
          <div className="gallery-upload-hint">
            <IonIcon icon={imageOutline} />
            <span>Tap to upload</span>
          </div>
        )}
        <div className="hero-manager-overlay">
          <IonIcon icon={imageOutline} />
          <span>Change</span>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display:'none' }} onChange={handleFile} />
      {file && (
        <div className="hero-manager-actions">
          <IonButton color="primary" shape="round" onClick={save} disabled={saving}>
            {saving ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={saveOutline} />Save Hero</>}
          </IonButton>
          <IonButton fill="outline" color="medium" shape="round" onClick={discard} disabled={saving}>
            Discard
          </IonButton>
        </div>
      )}
    </div>
  )
}

// ── Gallery Manager ───────────────────────────────────────────────────────────

export default function AdminGalleryManager({ config }: { config: Config }) {
  const { table, folder, isPromo } = config
  const { toast, ToastEl } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [rows,     setRows]     = useState<PhotoRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<PhotoRow | null>(null)
  const [isNew,    setIsNew]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  // form
  const [imgFile,  setImgFile]  = useState<File | null>(null)
  const [preview,  setPreview]  = useState('')
  const [altText,  setAltText]  = useState('')
  const [caption,  setCaption]  = useState('')
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [sortOrd,  setSortOrd]  = useState('0')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from(table as any)
      .select('*').order('sort_order').order('created_at')
    setRows((data ?? []) as unknown as PhotoRow[])
    setLoading(false)
  }, [table])

  useEffect(() => { load() }, [load])

  function openNew() {
    setIsNew(true); setSelected(null)
    setImgFile(null); setPreview('')
    setAltText(''); setCaption(''); setTitle(''); setDesc('')
    setSortOrd(String((rows[rows.length - 1]?.sort_order ?? 0) + 1))
    setIsActive(true)
  }

  function openEdit(row: PhotoRow) {
    setIsNew(false); setSelected(row)
    setImgFile(null); setPreview(row.image_url)
    setAltText(row.alt_text ?? ''); setCaption(row.caption ?? '')
    setTitle(row.title ?? ''); setDesc(row.description ?? '')
    setSortOrd(String(row.sort_order)); setIsActive(row.is_active)
  }

  function closeModal() { setSelected(null); setIsNew(false) }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview && isNew) URL.revokeObjectURL(preview)
    setImgFile(f)
    setPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!imgFile) return selected?.image_url ?? null
    const ext  = imgFile.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, imgFile)
    if (error) { toast('Upload failed: ' + error.message, 'danger'); return null }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function save() {
    if (isPromo && !title.trim()) return toast('Title is required.', 'warning')
    if (isNew && !imgFile) return toast('Please select an image.', 'warning')
    setSaving(true)

    const imageUrl = await uploadPhoto()
    if (!imageUrl) { setSaving(false); return }

    const base = { image_url: imageUrl, sort_order: parseInt(sortOrd) || 0, is_active: isActive }
    const payload = isPromo
      ? { ...base, title: title.trim(), description: desc.trim() || null }
      : { ...base, alt_text: altText.trim() || null, caption: caption.trim() || null }

    let err = null
    if (isNew) {
      ({ error: err } = await supabase.from(table as any).insert(payload as any))
    } else if (selected) {
      ({ error: err } = await supabase.from(table as any).update(payload as any).eq('id', selected.id))
    }

    setSaving(false)
    if (err) { toast((err as { message: string }).message, 'danger'); return }
    toast(isNew ? 'Photo added.' : 'Photo updated.', 'success')
    closeModal()
    load()
  }

  async function deleteRow() {
    if (!selected) return
    setDeleting(true)
    // Remove from storage if it was uploaded there
    const path = storagePath(selected.image_url)
    if (path) await supabase.storage.from(BUCKET).remove([path])
    const { error } = await supabase.from(table as any).delete().eq('id', selected.id)
    setDeleting(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Photo removed.', 'medium')
    closeModal()
    load()
  }

  async function toggleActive(row: PhotoRow) {
    setToggling(row.id)
    await supabase.from(table as any).update({ is_active: !row.is_active }).eq('id', row.id)
    setToggling(null)
    load()
  }

  async function move(row: PhotoRow, dir: 'up' | 'down') {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(r => r.id === row.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      supabase.from(table as any).update({ sort_order: other.sort_order }).eq('id', row.id),
      supabase.from(table as any).update({ sort_order: row.sort_order }).eq('id', other.id),
    ])
    load()
  }

  const isOpen = isNew || !!selected

  return (
    <>
      {ToastEl}

      <div className="gallery-toolbar">
        <span className="gallery-count">{rows.length} photo{rows.length !== 1 ? 's' : ''}</span>
        <IonButton color="primary" shape="round" onClick={openNew} style={{ margin:0 }}>
          <IonIcon slot="start" icon={addOutline} />Add Photo
        </IonButton>
      </div>

      {loading ? (
        <div className="gallery-loading"><IonSpinner name="crescent" color="primary" /></div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={imageOutline} />
          <p>No photos yet. Add your first one.</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {rows.map(row => (
            <div key={row.id} className={`gallery-card ${!row.is_active ? 'gallery-card--hidden' : ''}`}>
              <div className="gallery-card-img" onClick={() => openEdit(row)}
                style={{ backgroundImage: `url('${row.image_url}')` }}>
                {!row.is_active && (
                  <div className="gallery-card-badge">
                    <IonIcon icon={eyeOffOutline} />Hidden
                  </div>
                )}
              </div>
              <div className="gallery-card-body">
                <span className="gallery-card-meta">
                  {isPromo ? (row.title ?? '—') : (row.alt_text ?? row.caption ?? '—')}
                </span>
                <div className="gallery-card-actions">
                  <button className="gallery-icon-btn" onClick={() => move(row, 'up')}
                    aria-label="Move up"><IonIcon icon={chevronUpOutline} /></button>
                  <button className="gallery-icon-btn" onClick={() => move(row, 'down')}
                    aria-label="Move down"><IonIcon icon={chevronDownOutline} /></button>
                  <button
                    className={`gallery-icon-btn ${row.is_active ? 'gallery-icon-btn--active' : ''}`}
                    onClick={() => toggleActive(row)}
                    aria-label={row.is_active ? 'Hide' : 'Show'}
                    disabled={toggling === row.id}
                  >
                    {toggling === row.id
                      ? <IonSpinner name="crescent" style={{ width:14, height:14 }} />
                      : <IonIcon icon={row.is_active ? eyeOutline : eyeOffOutline} />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <AppModal isOpen={isOpen} onDidDismiss={closeModal}
        breakpoints={[0, 0.7, 0.95]} initialBreakpoint={0.85}>
        <div className="detail-modal-content">
          <div className="detail-modal-header">
            <p className="detail-modal-title">{isNew ? 'Add Photo' : 'Edit Photo'}</p>
            <IonButton fill="clear" className="detail-modal-close" onClick={closeModal}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </div>

          {/* Image pick */}
          <div className="gallery-modal-img" onClick={() => fileRef.current?.click()}
            style={preview ? { backgroundImage: `url('${preview}')` } : undefined}>
            {!preview && (
              <div className="gallery-upload-hint">
                <IonIcon icon={imageOutline} />
                <span>Tap to select image</span>
              </div>
            )}
            <div className="hero-manager-overlay">
              <IonIcon icon={imageOutline} /><span>Change</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display:'none' }} onChange={handleFileChange} />

          {/* Metadata */}
          {isPromo ? (
            <>
              <div className="p7-field">
                <IonInput label="Title *" labelPlacement="stacked" fill="outline"
                  value={title} onIonInput={e => setTitle(e.detail.value ?? '')}
                  placeholder="e.g. Freshly Roasted" className="p7-input" />
              </div>
              <div className="p7-field">
                <IonTextarea label="Description" labelPlacement="stacked" fill="outline"
                  value={desc} onIonInput={e => setDesc(e.detail.value ?? '')}
                  placeholder="Short promo caption…" rows={2} autoGrow className="p7-input" />
              </div>
            </>
          ) : (
            <>
              <div className="p7-field">
                <IonInput label="Alt Text" labelPlacement="stacked" fill="outline"
                  value={altText} onIonInput={e => setAltText(e.detail.value ?? '')}
                  placeholder="Describe the image for accessibility" className="p7-input" />
              </div>
              <div className="p7-field">
                <IonInput label="Caption" labelPlacement="stacked" fill="outline"
                  value={caption} onIonInput={e => setCaption(e.detail.value ?? '')}
                  placeholder="Optional caption" className="p7-input" />
              </div>
            </>
          )}

          <div className="menu-price-row">
            <div className="p7-field" style={{ marginBottom:0 }}>
              <IonInput label="Sort Order" labelPlacement="stacked" fill="outline"
                type="number" value={sortOrd}
                onIonInput={e => setSortOrd(e.detail.value ?? '0')}
                min="0" className="p7-input" />
            </div>
            <div className="menu-avail-row" style={{ flex:1, margin:0 }}>
              <span className="menu-avail-label">Visible</span>
              <IonToggle checked={isActive} onIonChange={e => setIsActive(e.detail.checked)}
                color="primary" />
            </div>
          </div>

          <div className="p7-modal-actions">
            {!isNew && (
              <IonButton fill="outline" color="danger" onClick={deleteRow} disabled={deleting}>
                {deleting ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={trashOutline} />}
              </IonButton>
            )}
            <IonButton className="p7-save-btn" onClick={save} disabled={saving} style={{ flex:1 }}>
              {saving
                ? <IonSpinner name="crescent" />
                : <><IonIcon slot="start" icon={saveOutline} />{isNew ? 'Add Photo' : 'Save Changes'}</>
              }
            </IonButton>
          </div>
        </div>
      </AppModal>
    </>
  )
}

// ── Photos tab root (gallery + hero) ─────────────────────────────────────────

type PhotoSection = 'cafe-gallery' | 'studio-gallery' | 'cafe-promos' | 'hero'

export function AdminPhotosTab() {
  const [section, setSection] = useState<PhotoSection>('cafe-gallery')

  const CONFIGS: Record<Exclude<PhotoSection, 'hero'>, Config> = {
    'cafe-gallery':   { table: 'cafe_gallery',  folder: 'cafe-gallery',   isPromo: false },
    'studio-gallery': { table: 'studio_gallery', folder: 'studio-gallery', isPromo: false },
    'cafe-promos':    { table: 'cafe_promos',    folder: 'cafe-promos',    isPromo: true  },
  }

  return (
    <div>
      <div className="gallery-section-tabs">
        {(['cafe-gallery', 'studio-gallery', 'cafe-promos', 'hero'] as PhotoSection[]).map(s => (
          <button
            key={s}
            className={`gallery-section-tab ${section === s ? 'gallery-section-tab--active' : ''}`}
            onClick={() => setSection(s)}
          >
            {{ 'cafe-gallery':'Cafe Gallery', 'studio-gallery':'Studio Gallery', 'cafe-promos':'Promos', 'hero':'Hero Images' }[s]}
          </button>
        ))}
      </div>

      {section !== 'hero' && (
        <AdminGalleryManager config={CONFIGS[section]} />
      )}

      {section === 'hero' && (
        <div className="hero-managers">
          <HeroManager
            settingKey="cafe_hero_image"
            label="Cafe Hero"
            folder="cafe-hero"
          />
          <HeroManager
            settingKey="studio_hero_image"
            label="Studio Hero"
            folder="studio-hero"
          />
        </div>
      )}
    </div>
  )
}
