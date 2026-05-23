import { useCallback, useEffect, useState } from 'react'
import {
  IonButton, IonIcon, IonInput, IonNote, IonSpinner,
} from '@ionic/react'
import {
  checkmarkCircleOutline, eyeOffOutline, eyeOutline,
  mailOutline, saveOutline, warningOutline,
} from 'ionicons/icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import './AdminEmailSettings.css'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string
  port: string
  user: string
  pass: string
  from: string
}

const DEFAULTS: SmtpConfig = {
  host: 'smtp.gmail.com',
  port: '587',
  user: '',
  pass: '',
  from: '',
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminEmailSettings() {
  const { toast, ToastEl } = useToast()
  const { profile } = useAuth()

  const [cfg,       setCfg]       = useState<SmtpConfig>(DEFAULTS)
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'smtp_config')
      .single()

    if (data?.value) {
      const v = data.value as Record<string, string>
      setCfg({
        host: v.host ?? DEFAULTS.host,
        port: String(v.port ?? DEFAULTS.port),
        user: v.user ?? '',
        pass: v.pass ?? '',
        from: v.from ?? '',
      })
      setLastSaved(data.updated_at)
      setConfigured(!!(v.user && v.pass))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function save() {
    if (!cfg.user.trim()) return toast('Gmail address is required.', 'warning')
    if (!cfg.pass.trim()) return toast('App Password is required.', 'warning')

    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({
      key:   'smtp_config',
      value: {
        host: cfg.host.trim() || 'smtp.gmail.com',
        port: Number(cfg.port) || 587,
        user: cfg.user.trim(),
        pass: cfg.pass.trim(),
        from: cfg.from.trim() || cfg.user.trim(),
      },
    })
    setSaving(false)
    if (error) { toast(error.message, 'danger'); return }
    toast('Email settings saved.', 'success')
    load()
  }

  async function sendTest() {
    const toEmail = profile?.email
    if (!toEmail) {
      return toast('No email address on your admin profile — cannot send test.', 'warning')
    }

    setTesting(true)
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type:         'test',
        to_name:      profile?.first_name ?? 'Admin',
        to_email:     toEmail,
        booking_id:   '0',
        band_name:    '',
        session_type: '',
        booking_date: '',
        start_time:   '',
        end_time:     '',
        amount:       '',
      },
    })
    setTesting(false)

    if (error) {
      toast(`Test failed: ${error.message}`, 'danger')
    } else {
      toast(`Test email sent to ${toEmail}.`, 'success')
    }
  }

  function field(key: keyof SmtpConfig) {
    return (e: CustomEvent) => setCfg(prev => ({ ...prev, [key]: (e.detail.value ?? '') as string }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <IonSpinner name="crescent" color="primary" />
      </div>
    )
  }

  return (
    <>
      {ToastEl}

      <div className="aes-wrap">

        {/* Status banner */}
        <div className={`aes-status-banner ${configured ? 'aes-status-banner--ok' : 'aes-status-banner--warn'}`}>
          <IonIcon icon={configured ? checkmarkCircleOutline : warningOutline} />
          <div>
            <p className="aes-status-title">
              {configured ? 'Email configured' : 'Email not configured'}
            </p>
            <p className="aes-status-sub">
              {configured
                ? `Sending via ${cfg.user}${lastSaved ? ` · Saved ${new Date(lastSaved).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}`
                : 'Payment notifications and invoices will not be sent until you configure SMTP below.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="aes-section">
          <h3 className="aes-section-title">SMTP Configuration</h3>
          <p className="aes-section-desc">
            Use a Gmail account with an <strong>App Password</strong> (not your regular password).
            The credentials are stored securely in the database and never exposed in the frontend bundle.
          </p>

          <div className="aes-row-2">
            <div className="p7-field" style={{ marginBottom: 0 }}>
              <IonInput
                label="SMTP Host" labelPlacement="stacked" fill="outline"
                value={cfg.host} onIonInput={field('host')}
                placeholder="smtp.gmail.com" className="p7-input"
              />
            </div>
            <div className="p7-field aes-port-field" style={{ marginBottom: 0 }}>
              <IonInput
                label="Port" labelPlacement="stacked" fill="outline"
                type="number" value={cfg.port} onIonInput={field('port')}
                placeholder="587" className="p7-input"
              />
            </div>
          </div>

          <div className="p7-field">
            <IonInput
              label="Gmail Address" labelPlacement="stacked" fill="outline"
              type="email" value={cfg.user} onIonInput={field('user')}
              placeholder="you@gmail.com" className="p7-input"
            />
          </div>

          <div className="p7-field aes-pass-wrap">
            <IonInput
              label="App Password" labelPlacement="stacked" fill="outline"
              type={showPass ? 'text' : 'password'} value={cfg.pass}
              onIonInput={field('pass')}
              placeholder="xxxx xxxx xxxx xxxx" className="p7-input"
            />
            <button
              className="aes-eye-btn"
              type="button"
              onClick={() => setShowPass(v => !v)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              <IonIcon icon={showPass ? eyeOffOutline : eyeOutline} />
            </button>
          </div>

          <div className="p7-field">
            <IonInput
              label="From Address" labelPlacement="stacked" fill="outline"
              value={cfg.from} onIonInput={field('from')}
              placeholder='Kâjon Music <you@gmail.com>' className="p7-input"
            />
            <IonNote style={{ fontSize: 12, padding: '4px 4px 0' }}>
              Shown in recipients' inboxes. Defaults to Gmail address if blank.
            </IonNote>
          </div>

          <div className="aes-actions">
            <IonButton color="primary" onClick={save} disabled={saving || testing}>
              {saving
                ? <IonSpinner name="crescent" />
                : <><IonIcon slot="start" icon={saveOutline} />Save Settings</>}
            </IonButton>
            <IonButton fill="outline" onClick={sendTest} disabled={saving || testing || !configured}>
              {testing
                ? <IonSpinner name="crescent" />
                : <><IonIcon slot="start" icon={mailOutline} />Send Test Email</>}
            </IonButton>
          </div>

          {!configured && (
            <p className="aes-test-note">Save your credentials first to enable the test.</p>
          )}
          {configured && !profile?.email && (
            <p className="aes-test-note">Add an email to your admin profile to enable the test.</p>
          )}
        </div>

        {/* Help */}
        <div className="aes-help">
          <h3 className="aes-section-title">How to get a Gmail App Password</h3>
          <ol className="aes-steps">
            <li>Go to <strong>myaccount.google.com</strong> and sign in with your Gmail</li>
            <li>Navigate to <strong>Security → 2-Step Verification</strong> (must be enabled)</li>
            <li>Scroll to the bottom → click <strong>App passwords</strong></li>
            <li>Select <em>Mail</em> + <em>Other device</em>, give it a name, click <strong>Generate</strong></li>
            <li>Copy the <strong>16-character code</strong> and paste it into the App Password field above</li>
          </ol>
          <div className="aes-tip">
            <IonIcon icon={warningOutline} />
            <p>
              Never use your regular Google password here. App Passwords are separate one-time tokens
              that can be revoked at any time without changing your account password.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
