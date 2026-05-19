import { useState } from 'react'
import {
  IonButton, IonInput, IonNote, IonSegment,
  IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react'
import { useAuth } from '../context/AuthContext'
import './LoginSignUp.css'

type AuthMode = 'login' | 'signup'
type LoginMethod = 'email' | 'phone'
type PhoneStep = 'input' | 'verify'

export default function LoginSignUp() {
  const {
    signInWithEmail, signInWithGoogle, signInWithPhone,
    verifyPhoneOtp, signUpWithEmail,
  } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [method, setMethod] = useState<LoginMethod>('email')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  // Sign up fields
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  function reset() { setError(''); setSuccess('') }

  async function wrap(fn: () => Promise<void>) {
    setLoading(true); reset()
    try { await fn() } finally { setLoading(false) }
  }

  async function onEmailLogin() {
    if (!email || !password) return setError('Please fill in all fields.')
    await wrap(async () => {
      const err = await signInWithEmail(email, password)
      if (err) setError(err)
    })
  }

  async function onGoogleLogin() {
    await wrap(async () => {
      const err = await signInWithGoogle()
      if (err) setError(err)
    })
  }

  async function onSendOtp() {
    if (!phone) return setError('Please enter your mobile number.')
    await wrap(async () => {
      const err = await signInWithPhone(phone)
      if (err) setError(err)
      else { setPhoneStep('verify'); setSuccess('OTP sent! Check your messages.') }
    })
  }

  async function onVerifyOtp() {
    if (!otp) return setError('Please enter the OTP.')
    await wrap(async () => {
      const err = await verifyPhoneOtp(phone, otp)
      if (err) setError(err)
    })
  }

  async function onSignUp() {
    if (!suEmail || !suPassword || !username || !firstName || !lastName)
      return setError('Please fill in all fields.')
    if (suPassword !== suConfirm) return setError('Passwords do not match.')
    if (suPassword.length < 6) return setError('Password must be at least 6 characters.')
    await wrap(async () => {
      const { error: err, needsVerification } = await signUpWithEmail(
        suEmail, suPassword, username, firstName, lastName
      )
      if (err) setError(err)
      else if (needsVerification)
        setSuccess('Account created! Check your email to verify your account.')
    })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">

        {/* Brand header */}
        <div className="auth-logos">
          <img src="/cafe-logo-transparent.png" alt="Spoiled Brats Cafe" className="auth-logo" />
          <div className="auth-logo-divider" />
          <img src="/studio-logo-transparent.png" alt="Kajon Music Studio" className="auth-logo" />
        </div>
        <h1 className="auth-title">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="auth-tagline">
          Where the aroma of artisanal coffee meets the rhythm of professional sound.
        </p>

        {/* Mode toggle */}
        <IonSegment
          value={mode}
          onIonChange={e => { setMode(e.detail.value as AuthMode); reset() }}
          className="auth-segment"
        >
          <IonSegmentButton value="login"><IonLabel>Login</IonLabel></IonSegmentButton>
          <IonSegmentButton value="signup"><IonLabel>Sign Up</IonLabel></IonSegmentButton>
        </IonSegment>

        {/* Feedback messages */}
        {error && <div className="auth-message auth-message--error"><p>{error}</p></div>}
        {success && <div className="auth-message auth-message--success"><p>{success}</p></div>}

        {/* ---- LOGIN ---- */}
        {mode === 'login' && (
          <>
            <IonButton expand="block" fill="outline" className="google-btn" onClick={onGoogleLogin} disabled={loading}>
              <span slot="start" style={{ display:'flex', flexShrink:0 }}><svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg></span>
              Continue with Google
            </IonButton>

            <div className="auth-divider"><span>or</span></div>

            <div className="auth-method-toggle">
              <button className={`method-btn ${method === 'email' ? 'active' : ''}`}
                onClick={() => { setMethod('email'); reset() }}>Email</button>
              <button className={`method-btn ${method === 'phone' ? 'active' : ''}`}
                onClick={() => { setMethod('phone'); reset(); setPhoneStep('input') }}>Phone</button>
            </div>

            {method === 'email' && (
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

            {method === 'phone' && phoneStep === 'input' && (
              <>
                <div className="auth-field">
                  <IonInput label="Mobile Number" labelPlacement="stacked" fill="outline"
                    type="tel" value={phone} className="auth-input"
                    onIonInput={e => setPhone(e.detail.value ?? '')}
                    placeholder="+63 917 123 4567" />
                </div>
                <IonNote className="auth-hint">Include country code (e.g. +63 for PH)</IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onSendOtp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Send OTP'}
                </IonButton>
              </>
            )}

            {method === 'phone' && phoneStep === 'verify' && (
              <>
                <div className="auth-field">
                  <IonInput label="OTP Code" labelPlacement="stacked" fill="outline"
                    type="number" value={otp} className="auth-input"
                    onIonInput={e => setOtp(e.detail.value ?? '')}
                    placeholder="123456" />
                </div>
                <IonNote className="auth-hint">Sent to {phone}</IonNote>
                <IonButton expand="block" color="primary" className="auth-submit-btn"
                  onClick={onVerifyOtp} disabled={loading}>
                  {loading ? <IonSpinner name="crescent" /> : 'Verify OTP'}
                </IonButton>
                <button className="auth-text-link" onClick={() => setPhoneStep('input')}>
                  ← Change number
                </button>
              </>
            )}
          </>
        )}

        {/* ---- SIGN UP ---- */}
        {mode === 'signup' && (
          <>
            <div className="auth-field-row">
              <div className="auth-field">
                <IonInput label="First Name" labelPlacement="stacked" fill="outline"
                  value={firstName} className="auth-input"
                  onIonInput={e => setFirstName(e.detail.value ?? '')}
                  placeholder="Juan" />
              </div>
              <div className="auth-field">
                <IonInput label="Last Name" labelPlacement="stacked" fill="outline"
                  value={lastName} className="auth-input"
                  onIonInput={e => setLastName(e.detail.value ?? '')}
                  placeholder="Dela Cruz" />
              </div>
            </div>
            <div className="auth-field">
              <IonInput label="Username" labelPlacement="stacked" fill="outline"
                value={username} className="auth-input"
                onIonInput={e => setUsername(e.detail.value ?? '')}
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
              onClick={onSignUp} disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : 'Create Account'}
            </IonButton>
          </>
        )}

        {/* Footer */}
        <p className="auth-footer-text">
          By continuing, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
        <p className="auth-copyright">
          © 2024 Spoiled Brats & Kajon. Crafting moments, capturing sound.
        </p>
      </div>
    </div>
  )
}
