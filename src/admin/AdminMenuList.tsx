import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IonButton, IonContent, IonIcon, IonInput,
  IonSelect, IonSelectOption, IonSpinner, IonToggle,
} from '@ionic/react'
import AppModal from '../components/AppModal'
import {
  addOutline, cafeOutline, closeOutline, imageOutline,
  saveOutline, trashOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { MenuGridSkeleton } from '../components/Skeletons'
import type { CafeMenuRow } from '../types/database'
import './AdminBookings.css'
import './AdminPhase7.css'

const CATEGORIES = ['Coffee & Tea', 'Food & Snacks', 'Desserts', 'Drinks', 'Merchandise', 'Other']

const EMPTY_FORM = {
  name: '', description: '', price: '', category: '', image_url: '',
  is_available: true, is_limited: false, start_date: '', end_date: '',
}

type FormState = typeof EMPTY_FORM

export default function AdminMenuList() {
  const { toast, ToastEl } = useToast()
  const [items,    setItems]    = useState<CafeMenuRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<CafeMenuRow | null>(null)
  const [isNew,    setIsNew]    = useState(false)
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageFile,  setImageFile]  = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cafe_menu').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setIsNew(true)
    setSelected(null)
    setForm(EMPTY_FORM)
    setPreviewUrl('')
    setImageFile(null)
  }

  function openEdit(item: CafeMenuRow) {
    setIsNew(false)
    setSelected(item)
    setForm({
      name:         item.name,
      description:  item.description ?? '',
      price:        String(item.price),
      category:     item.category ?? '',
      image_url:    item.image_url ?? '',
      is_available: item.is_available,
      is_limited:   item.is_limited,
      start_date:   item.start_date ?? '',
      end_date:     item.end_date   ?? '',
    })
    setPreviewUrl(item.image_url ?? '')
    setImageFile(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return form.image_url || null
    const ext  = imageFile.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, imageFile, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(path)
    return publicUrl
  }

  async function save() {
    if (!form.name.trim()) return toast('Item name is required.', 'warning')
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) return toast('Please enter a valid price (0 or more).', 'warning')
    if (form.is_limited && form.start_date && form.end_date && form.start_date > form.end_date)
      return toast('End date must be on or after the start date.', 'warning')
    setSaving(true)

    const imageUrl = await uploadImage()
    const payload = {
      name:         form.name.trim(),
      description:  form.description.trim() || null,
      price:        price,
      category:     form.category || null,
      image_url:    imageUrl,
      is_available: form.is_available,
      is_limited:   form.is_limited,
      start_date:   form.is_limited && form.start_date ? form.start_date : null,
      end_date:     form.is_limited && form.end_date   ? form.end_date   : null,
    }

    let error = null
    if (isNew) {
      ({ error } = await supabase.from('cafe_menu').insert(payload))
    } else if (selected) {
      ({ error } = await supabase.from('cafe_menu').update(payload).eq('id', selected.id))
    }

    setSaving(false)
    if (error) { toast((error as { message: string }).message, 'danger'); return }
    toast(isNew ? 'Menu item added.' : 'Menu item updated.', 'success')
    setSelected(null)
    setIsNew(false)
    load()
  }

  async function deleteItem() {
    if (!selected) return
    setDeleting(true)
    const { error } = await supabase.from('cafe_menu').delete().eq('id', selected.id)
    setDeleting(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Menu item deleted.', 'medium')
    setSelected(null)
    load()
  }

  const isOpen = isNew || !!selected

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontFamily:'var(--font-headline)', fontSize:15, fontWeight:700, color:'var(--color-on-surface)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        <IonButton color="primary" shape="round" className="menu-add-btn"
          onClick={openNew} style={{ margin:0 }}>
          <IonIcon slot="start" icon={addOutline} />Add Item
        </IonButton>
      </div>

      {ToastEl}
      {loading ? (
        <MenuGridSkeleton count={6} />
      ) : items.length === 0 ? (
        <div className="admin-empty">
          <IonIcon icon={cafeOutline} />
          <p>No menu items yet. Add your first item!</p>
        </div>
      ) : (
        <div className="menu-grid">
          {items.map(item => (
            <div key={item.id}
              className={`menu-card ${!item.is_available ? 'menu-unavailable' : ''}`}
              onClick={() => openEdit(item)}>
              <div style={{ position:'relative' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="menu-img" loading="lazy" />
                  : <div className="menu-img-placeholder"><IonIcon icon={cafeOutline} /></div>
                }
                {item.is_limited && (
                  <span className="menu-limited-badge">LIMITED</span>
                )}
              </div>
              <div className="menu-card-body">
                <p className="menu-card-name">{item.name}</p>
                <div className="menu-card-bottom">
                  <span className="menu-card-price">₱{item.price.toFixed(2)}</span>
                  {item.category && <span className="menu-card-cat">{item.category}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <AppModal isOpen={isOpen} onDidDismiss={() => { setSelected(null); setIsNew(false) }}
        breakpoints={[0, 0.75, 0.95]} initialBreakpoint={0.85}>
        <IonContent>
        <div className="detail-modal-content">
          <div className="detail-modal-header">
            <p className="detail-modal-title">{isNew ? 'Add Menu Item' : 'Edit Menu Item'}</p>
            <IonButton fill="clear" className="detail-modal-close"
              onClick={() => { setSelected(null); setIsNew(false) }}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </div>

          {/* Image upload */}
          <div className="menu-modal-img-wrap" onClick={() => fileRef.current?.click()}>
            {previewUrl
              ? <img src={previewUrl} alt="Preview" />
              : (
                <div className="menu-img-upload-hint">
                  <IonIcon icon={imageOutline} />
                  <span>Tap to upload image</span>
                </div>
              )
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={handleFileChange} />

          <div className="p7-field">
            <IonInput label="Item Name *" labelPlacement="stacked" fill="outline"
              value={form.name} onIonInput={e => setForm(f => ({ ...f, name: e.detail.value ?? '' }))}
              placeholder="e.g. Iced White Chocolate Coffee" maxlength={100} className="p7-input" />
          </div>

          <div className="p7-field">
            <IonInput label="Description" labelPlacement="stacked" fill="outline"
              value={form.description}
              onIonInput={e => setForm(f => ({ ...f, description: e.detail.value ?? '' }))}
              placeholder="Short description…" maxlength={500} className="p7-input" />
          </div>

          <div className="menu-price-row">
            <div className="p7-field" style={{ marginBottom:0 }}>
              <IonInput label="Price (₱) *" labelPlacement="stacked" fill="outline"
                type="number" value={form.price}
                onIonInput={e => setForm(f => ({ ...f, price: e.detail.value ?? '' }))}
                min="0" step="0.01" className="p7-input" />
            </div>
            <div className="p7-field" style={{ marginBottom:0 }}>
              <IonSelect label="Category" labelPlacement="stacked" fill="outline"
                value={form.category}
                onIonChange={e => setForm(f => ({ ...f, category: e.detail.value ?? '' }))}
                interface="popover" className="p7-input">
                <IonSelectOption value="">— None —</IonSelectOption>
                {CATEGORIES.map(c => <IonSelectOption key={c} value={c}>{c}</IonSelectOption>)}
              </IonSelect>
            </div>
          </div>

          <div className="menu-avail-row">
            <span className="menu-avail-label">Available on menu</span>
            <IonToggle checked={form.is_available}
              onIonChange={e => setForm(f => ({ ...f, is_available: e.detail.checked }))}
              color="primary" />
          </div>

          <div className="menu-avail-row">
            <span className="menu-avail-label">Limited-time item</span>
            <IonToggle checked={form.is_limited}
              onIonChange={e => setForm(f => ({
                ...f, is_limited: e.detail.checked,
                start_date: e.detail.checked ? f.start_date : '',
                end_date:   e.detail.checked ? f.end_date   : '',
              }))}
              color="secondary" />
          </div>

          {form.is_limited && (
            <div className="menu-price-row">
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="Start Date" labelPlacement="stacked" fill="outline"
                  type="date" value={form.start_date}
                  onIonInput={e => setForm(f => ({ ...f, start_date: e.detail.value ?? '' }))}
                  className="p7-input" />
              </div>
              <div className="p7-field" style={{ marginBottom:0 }}>
                <IonInput label="End Date" labelPlacement="stacked" fill="outline"
                  type="date" value={form.end_date}
                  onIonInput={e => setForm(f => ({ ...f, end_date: e.detail.value ?? '' }))}
                  className="p7-input" />
              </div>
            </div>
          )}

          <div className="p7-modal-actions">
            {!isNew && (
              <IonButton fill="outline" color="danger" onClick={deleteItem} disabled={deleting}>
                {deleting ? <IonSpinner name="crescent" /> : <IonIcon slot="icon-only" icon={trashOutline} />}
              </IonButton>
            )}
            <IonButton className="p7-save-btn" onClick={save} disabled={saving} style={{ flex:1 }}>
              {saving ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={saveOutline} />{isNew ? 'Add Item' : 'Save Changes'}</>}
            </IonButton>
          </div>
        </div>
        </IonContent>
      </AppModal>
    </>
  )
}
