import { useState } from 'react'
import {
  IonButton, IonInput, IonNote, IonSegment,
  IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import './LoginSignUp.css'

type AuthMode       = 'login'  | 'signup'
type LoginMethod    = 'email'  | 'phone'
type SignupMethod   = 'email'  | 'phone'
type LoginPhoneStep = 'input'  | 'verify'
type SignupPhoneStep = 'info'  | 'phone'  | 'verify'

const AREA_CODES = [
  { code: '+63',  label: '🇵🇭 +63'  },
  { code: '+1',   label: '🇺🇸 +1'   },
  { code: '+44',  label: '🇬🇧 +44'  },
  { code: '+61',  label: '🇦🇺 +61'  },
  { code: '+65',  label: '🇸🇬 +65'  },
  { code: '+60',  label: '🇲🇾 +60'  },
  { code: '+852', label: '🇭🇰 +852' },
  { code: '+81',  label: '🇯🇵 +81'  },
  { code: '+82',  label: '🇰🇷 +82'  },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+91',  label: '🇮🇳 +91'  },
]

function buildPhone(area: string, local: string) {
  return `${area}${local.replace(/^0+/, '').replace(/\s+/g, '')}`
}

interface PhoneRowProps {
  areaCode: string
  onAreaChange: (v: string) => void
  localNum: string
  onLocalChange: (v: string) => void
  disabled?: boolean
}

function PhoneRow({ areaCode, onAreaChange, localNum, onLocalChange, disabled }: PhoneRowProps) {
  return (
    <div className="auth-phone-row">
      <select
        className="auth-area-select"
        value={areaCode}
        onChange={e => onAreaChange(e.target.value)}
        disabled={disabled}
        aria-label="Country code"
      >
        {AREA_CODES.map(ac => (
          <option key={ac.code} value={ac.code}>{ac.label}</option>
        ))}
      </select>
      <div style={{ flex: 1 }}>
        <IonInput
          fill="outline"
          type="tel"
          inputMode="tel"
          value={localNum}
          onIonInput={e => onLocalChange(e.detail.value ?? '')}
          placeholder="917 123 4567"
          className="auth-input"
          aria-label="Phone number"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default function LoginSignUp() {
  const {
    signInWithEmail, signInWithGoogle, signInWithPhone,
    verifyPhoneOtp, signUpWithEmail, refreshProfile,
  } = useAuth()
  const { toast, ToastEl } = useToast()

  const [mode,           setMode]           = useState<AuthMode>('login')
  const [loginMethod,    setLoginMethod]    = useState<LoginMethod>('email')
  const [loginPhoneStep, setLoginPhoneStep] = useState<LoginPhoneStep>('input')
  const [signupMethod,   setSignupMethod]   = useState<SignupMethod>('email')
  const [signupPhoneStep, setSignupPhoneStep] = useState<SignupPhoneStep>('info')
  const [loading,        setLoading]        = useState(false)
  const [redirectNotice, setRedirectNotice] = useState('')

  // Shared phone state — used by both login and signup phone flows
  const [areaCode, setAreaCode] = useState('+63')
  const [localNum, setLocalNum] = useState('')

  // Login
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loginOtp, setLoginOtp] = useState('')

  // Email sign-up
  const [suEmail,     setSuEmail]     = useState('')
  const [suPassword,  setSuPassword]  = useState('')
  const [suConfirm,   setSuConfirm]   = useState('')
  const [suUsername,  setSuUsername]  = useState('')
  const [suFirstName, setSuFirstName] = useState('')
  const [suLastName,  setSuLastName]  = useState('')

  // Phone sign-up
  const [spFirstName, setSpFirstName] = useState('')
  const [spLastName,  setSpLastName]  = useState('')
  const [spUsername,  setSpUsername]  = useState('')
  const [spOtp,       setSpOtp]       = useState('')

  async function wrap(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  function switchMode(m: AuthMode) {
    setMode(m)
    setRedirectNotice('')
  }

  // ── Login ────────────────────────────────────────────

  async function onEmailLogin() {
    if (!email || !password) return toast('Please fill in all fields.', 'warning')
    await wrap(async () => {
      const err = await signInWithEmail(email, password)
      if (err) toast(err, 'danger')
    })
  }

  async function onGoogleLogin() {
    await wrap(async () => {
      const err = await signInWithGoogle()
      if (err) toast(err, 'danger')
    })
  }

  async function onSendLoginOtp() {
    const phone = buildPhone(areaCode, localNum)
    if (!localNum.trim()) return toast('Please enter your mobile number.', 'warning')

    await wrap(async () => {
      const { data: exists, error: rpcErr } = await supabase.rpc(
        'phone_is_registered' as any, { p_phone: phone } as any
      )
      if (rpcErr) { toast('Could not verify number. Try again.', 'danger'); return }

      if (!exists) {
        setMode('signup')
        setSignupMethod('phone')
        setSignupPhoneStep('info')
        setRedirectNotice(
          `${phone} isn't registered yet. Complete your sign up below.`
        )
        return
      }

      const err = await signInWithPhone(phone)
      if (err) toast(err, 'danger')
      else {
        setLoginPhoneStep('verify')
        toast('OTP sent! Check your messages.', 'success')
      }
    })
  }

  async function onVerifyLoginOtp() {
    const phone = buildPhone(areaCode, localNum)
    if (!loginOtp.trim()) return toast('Please enter the OTP.', 'warning')
    await wrap(async () => {
      const err = await verifyPhoneOtp(phone, loginOtp)
      if (err) toast(err, 'danger')
    })
  }

  // ── Email sign-up ────────────────────────────────────

  async function onEmailSignUp() {
    if (!suEmail || !suPassword || !suUsername || !suFirstName || !suLastName)
      return toast('Please fill in all fields.', 'warning')
    if (suPassword !== suConfirm)   return toast('Passwords do not match.', 'warning')
    if (suPassword.length < 6)      return toast('Password must be at least 6 characters.', 'warning')
    await wrap(async () => {
      const { error: err, needsVerification } = await signUpWithEmail(
        suEmail, suPassword, suUsername, suFirstName, suLastName
      )
      if (err) toast(err, 'danger')
      else if (needsVerification)
        toast('Account created! Check your email to verify your account.', 'success')
    })
  }

  // ── Phone sign-up ────────────────────────────────────

  function onPhoneSignupNext() {
    if (!spFirstName.trim() || !spLastName.trim() || !spUsername.trim())
      return toast('Please fill in all fields.', 'warning')
    setSignupPhoneStep('phone')
  }

  async function onPhoneSignupSendOtp() {
    const phone = buildPhone(areaCode, localNum)
    if (!localNum.trim()) return toast('Please enter your mobile number.', 'warning')

    await wrap(async () => {
      const { data: exists } = await supabase.rpc(
        'phone_is_registered' as any, { p_phone: phone } as any
      )
      if (exists) {
        toast('This number is already registered. Please sign in instead.', 'warning')
        setMode('login')
        setLoginMethod('phone')
        setSignupPhoneStep('info')
        return
      }
      const err = await signInWithPhone(phone)
      if (err) toast(err, 'danger')
      else {
        setSignupPhoneStep('verify')
        toast('OTP sent! Check your messages.', 'success')
      }
    })
  }

  async function onPhoneSignupVerify() {
    const phone = buildPhone(areaCode, localNum)
    if (!spOtp.trim()) return toast('Please enter the OTP.', 'warning')
    await wrap(async () => {
      const err = await verifyPhoneOtp(phone, spOtp)
      if (err) { toast(err, 'danger'); return }

      // ensureProfile creates a minimal profile; update with collected info
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({
          first_name: spFirstName.trim(),
          last_name:  spLastName.trim(),
          username:   spUsername.trim(),
        }).eq('auth_id', user.id)
        await refreshProfile()
      }
      toast('Account created! Welcome.', 'success')
    })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-logos">
          <img src="/cafe-logo-transparent.png"   alt="Spoiled Brats Cafe"  className="auth-logo" />
          <div className="auth-logo-divider" />
          <img src="/studio-logo-transparent.png" alt="Kajon Music Studio"  className="auth-logo" />
        </div>
        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="auth-tagline">
          Where the aroma of artisanal coffee meets the rhythm of professional sound.
        </p>

        {/* Mode toggle */}
        <IonSegment
          value={mode}
          onIonChange={e => switchMode(e.detail.value as AuthMode)}
          className="auth-segment"
        >
          <IonSegmentButton value="login"><IonLabel>Login</IonLabel></IonSegmentButton>
          <IonSegmentButton value="signup"><IonLabel>Sign Up</IonLabel></IonSegmentButton>
        </IonSegment>

        {ToastEl}

        {/* Redirect notice (shown when login phone redirects to signup) */}
        {redirectNotice && (
          <div className="auth-notice" role="status">{redirectNotice}</div>
        )}

        {/* ══ LOGIN ══════════════════════════════════════ */}
        {mode === 'login' && (
          <>
            <IonButton
              expand="block" fill="outline"
              className="google-btn"
              onClick={onGoogleLogin}
              disabled={loading}
            >
              <span slot="start" style={{ display:'flex', flexShrink:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </span>
              Continue with Google
            </IonButton>

            <div className="auth-divider"><span>or</span></div>

            <div className="auth-method-toggle">
              <button
                className={`method-btn ${loginMethod === 'email' ? 'active' : ''}`}
                aria-pressed={loginMethod === 'email'}
                onClick={() => { setLoginMethod('email'); setLoginPhoneStep('input') }}
              >Email</button>
              <button
                className={`method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                aria-pressed={loginMethod === 'phone'}
                onClick={() => { setLoginMethod('phone'); setLoginPhoneStep('input') }}
              >Phone</button>
            </div>

            {loginMethod === 'email' && (
              <>
                <div className="auth-field">
                  <IonInput label="Email Address" labelPlacement="stacked" fill="outline"
                    type="email" value={email} className="auth-input"
                    onIonInput={e => setEmail(e.detail.value ?? '')}
                    placeholder="hello@example.com" />
                </div>
                <div className="auth-field">
                  <IonInput label="Password" labelPlacement="stacked" fill="outline"
                    type="password" value={password} className="auth-input"
                    onIonInput={e => setPassword(e.detail.value ?? '')}
                    placeholder="••••••••" />
                </div>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onEmailLogin} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Continue'}
                </IonButton>
              </>
            )}

            {loginMethod === 'phone' && loginPhoneStep === 'input' && (
              <>
                <p className="auth-field-label">Mobile Number</p>
                <PhoneRow
                  areaCode={areaCode} onAreaChange={setAreaCode}
                  localNum={localNum} onLocalChange={setLocalNum}
                  disabled={loading}
                />
                <IonNote className="auth-hint">
                  No leading zero — e.g. 917 123 4567 for a PH number.
                </IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onSendLoginOtp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Send OTP'}
                </IonButton>
              </>
            )}

            {loginMethod === 'phone' && loginPhoneStep === 'verify' && (
              <>
                <div className="auth-field">
                  <IonInput label="OTP Code" labelPlacement="stacked" fill="outline"
                    type="text" inputMode="numeric" maxlength={6}
                    value={loginOtp} className="auth-input"
                    onIonInput={e => setLoginOtp(e.detail.value ?? '')}
                    placeholder="123456" />
                </div>
                <IonNote className="auth-hint">
                  Sent to {buildPhone(areaCode, localNum)}
                </IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onVerifyLoginOtp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Verify OTP'}
                </IonButton>
                <button className="auth-text-link"
                  onClick={() => setLoginPhoneStep('input')}>
                  Change number
                </button>
              </>
            )}
          </>
        )}

        {/* ══ SIGN UP ════════════════════════════════════ */}
        {mode === 'signup' && (
          <>
            <div className="auth-method-toggle">
              <button
                className={`method-btn ${signupMethod === 'email' ? 'active' : ''}`}
                aria-pressed={signupMethod === 'email'}
                onClick={() => { setSignupMethod('email'); setRedirectNotice('') }}
              >Email</button>
              <button
                className={`method-btn ${signupMethod === 'phone' ? 'active' : ''}`}
                aria-pressed={signupMethod === 'phone'}
                onClick={() => { setSignupMethod('phone'); setSignupPhoneStep('info') }}
              >Phone</button>
            </div>

            {/* Email sign-up */}
            {signupMethod === 'email' && (
              <>
                <div className="auth-field-row">
                  <div className="auth-field">
                    <IonInput label="First Name" labelPlacement="stacked" fill="outline"
                      value={suFirstName} className="auth-input"
                      onIonInput={e => setSuFirstName(e.detail.value ?? '')}
                      placeholder="Juan" />
                  </div>
                  <div className="auth-field">
                    <IonInput label="Last Name" labelPlacement="stacked" fill="outline"
                      value={suLastName} className="auth-input"
                      onIonInput={e => setSuLastName(e.detail.value ?? '')}
                      placeholder="Dela Cruz" />
                  </div>
                </div>
                <div className="auth-field">
                  <IonInput label="Username" labelPlacement="stacked" fill="outline"
                    value={suUsername} className="auth-input"
                    onIonInput={e => setSuUsername(e.detail.value ?? '')}
                    placeholder="juandelacruz" />
                </div>
                <div className="auth-field">
                  <IonInput label="Email Address" labelPlacement="stacked" fill="outline"
                    type="email" value={suEmail} className="auth-input"
                    onIonInput={e => setSuEmail(e.detail.value ?? '')}
                    placeholder="hello@example.com" />
                </div>
                <div className="auth-field">
                  <IonInput label="Password" labelPlacement="stacked" fill="outline"
                    type="password" value={suPassword} className="auth-input"
                    onIonInput={e => setSuPassword(e.detail.value ?? '')}
                    placeholder="Min. 6 characters" />
                </div>
                <div className="auth-field">
                  <IonInput label="Confirm Password" labelPlacement="stacked" fill="outline"
                    type="password" value={suConfirm} className="auth-input"
                    onIonInput={e => setSuConfirm(e.detail.value ?? '')}
                    placeholder="••••••••" />
                </div>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onEmailSignUp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Create Account'}
                </IonButton>
              </>
            )}

            {/* Phone sign-up — Step 1: Personal info */}
            {signupMethod === 'phone' && signupPhoneStep === 'info' && (
              <>
                <p className="auth-step-label">Step 1 of 3 — Your Details</p>
                <div className="auth-field-row">
                  <div className="auth-field">
                    <IonInput label="First Name" labelPlacement="stacked" fill="outline"
                      value={spFirstName} className="auth-input"
                      onIonInput={e => setSpFirstName(e.detail.value ?? '')}
                      placeholder="Juan" />
                  </div>
                  <div className="auth-field">
                    <IonInput label="Last Name" labelPlacement="stacked" fill="outline"
                      value={spLastName} className="auth-input"
                      onIonInput={e => setSpLastName(e.detail.value ?? '')}
                      placeholder="Dela Cruz" />
                  </div>
                </div>
                <div className="auth-field">
                  <IonInput label="Username" labelPlacement="stacked" fill="outline"
                    value={spUsername} className="auth-input"
                    onIonInput={e => setSpUsername(e.detail.value ?? '')}
                    placeholder="juandelacruz" />
                </div>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onPhoneSignupNext} disabled={loading}>
                  Next
                </IonButton>
              </>
            )}

            {/* Phone sign-up — Step 2: Phone number */}
            {signupMethod === 'phone' && signupPhoneStep === 'phone' && (
              <>
                <p className="auth-step-label">Step 2 of 3 — Mobile Number</p>
                <PhoneRow
                  areaCode={areaCode} onAreaChange={setAreaCode}
                  localNum={localNum} onLocalChange={setLocalNum}
                  disabled={loading}
                />
                <IonNote className="auth-hint">
                  No leading zero — e.g. 917 123 4567 for a PH number.
                </IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onPhoneSignupSendOtp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Send OTP'}
                </IonButton>
                <button className="auth-text-link"
                  onClick={() => setSignupPhoneStep('info')}>
                  Back
                </button>
              </>
            )}

            {/* Phone sign-up — Step 3: Verify */}
            {signupMethod === 'phone' && signupPhoneStep === 'verify' && (
              <>
                <p className="auth-step-label">Step 3 of 3 — Verify</p>
                <div className="auth-field">
                  <IonInput label="OTP Code" labelPlacement="stacked" fill="outline"
                    type="text" inputMode="numeric" maxlength={6}
                    value={spOtp} className="auth-input"
                    onIonInput={e => setSpOtp(e.detail.value ?? '')}
                    placeholder="123456" />
                </div>
                <IonNote className="auth-hint">
                  Sent to {buildPhone(areaCode, localNum)}
                </IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onPhoneSignupVerify} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Verify & Create Account'}
                </IonButton>
                <button className="auth-text-link"
                  onClick={() => setSignupPhoneStep('phone')}>
                  Change number
                </button>
              </>
            )}
          </>
        )}

        <p className="auth-footer-text">
          By continuing, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
        <p className="auth-copyright">
          © 2026 Spoiled Brats & Kajon. Crafting moments, capturing sound.
        </p>
      </div>
    </div>
  )
}
