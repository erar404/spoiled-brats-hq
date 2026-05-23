import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRow } from '../types/database'

// ── Context shape ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserRow | null
  isAdmin: boolean
  loading: boolean
  justConfirmed: boolean
  clearJustConfirmed: () => void
  showWelcome: boolean
  clearWelcome: () => void
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signInWithPhone: (phone: string) => Promise<string | null>
  verifyPhoneOtp: (phone: string, token: string) => Promise<string | null>
  signUpWithEmail: (
    email: string, password: string,
    username: string, firstName: string, lastName: string
  ) => Promise<{ error: string | null; needsVerification: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null, user: null, profile: null, isAdmin: false, loading: true,
  justConfirmed: false, clearJustConfirmed: () => {},
  showWelcome: false, clearWelcome: () => {},
  signInWithEmail: async () => null,
  signInWithGoogle: async () => null,
  signInWithPhone: async () => null,
  verifyPhoneOtp: async () => null,
  signUpWithEmail: async () => ({ error: null, needsVerification: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

// ── Profile helpers ────────────────────────────────────────────────────────────

async function ensureProfile(authUser: User): Promise<UserRow | null> {
  // ① Try to find an existing profile row
  const { data, error: selErr } = await supabase
    .from('users').select('*').eq('auth_id', authUser.id).single()

  if (data) return data

  // PGRST116 = PostgREST "no rows returned by .single()"; anything else is a
  // permission or network error — bail without creating a duplicate row.
  if (selErr && selErr.code !== 'PGRST116') return null

  // ② Profile doesn't exist — create it
  const meta = authUser.user_metadata ?? {}
  const base   = meta.username
    || authUser.email?.split('@')[0]
    || (authUser.phone ? `user${authUser.phone.slice(-4)}` : null)
    || 'user'
  const suffix = meta.username ? '' : `_${Math.random().toString(36).slice(2, 5)}`

  const { data: created, error: insErr } = await supabase.from('users').insert({
    username:   `${base}${suffix}`,
    email:      authUser.email  ?? null,
    phone:      authUser.phone  ?? null,
    first_name: meta.first_name ?? (meta.full_name?.split(' ')[0]              ?? null),
    last_name:  meta.last_name  ?? (meta.full_name?.split(' ').slice(1).join(' ') ?? null),
    auth_id:    authUser.id,
    role:       'user' as const,
  }).select().single()

  if (created) return created

  // ③ 23505 = unique violation: a concurrent call just won the INSERT race.
  //    Re-fetch the row that was just created.
  if (insErr?.code === '23505') {
    const { data: existing } = await supabase
      .from('users').select('*').eq('auth_id', authUser.id).single()
    return existing ?? null
  }

  return null
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)

  // Capture the email-confirmation flag synchronously BEFORE the SDK clears the
  // URL hash (Supabase appends #access_token=…&type=signup on the redirect).
  const [justConfirmed, setJustConfirmed] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return params.get('type') === 'signup' && !!params.get('access_token')
  })
  // Keep a ref so loadProfile (async, stale closure) can read the current value.
  const justConfirmedRef = useRef(justConfirmed)
  useEffect(() => { justConfirmedRef.current = justConfirmed }, [justConfirmed])

  function clearJustConfirmed() { setJustConfirmed(false) }

  const [showWelcome, setShowWelcome] = useState(false)

  function clearWelcome() {
    if (user) localStorage.setItem(`sbhq_welcomed_${user.id}`, '1')
    setShowWelcome(false)
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  async function loadProfile(authUser: User) {
    const p = await ensureProfile(authUser)
    // Only update with a real profile — never overwrite a valid profile with null
    // from a concurrent call that lost the INSERT race and got an error back.
    if (p !== null) {
      setProfile(p)
      // Show the welcome modal once per user on their first login.
      // Skip for email-confirmation redirects — those already get EmailConfirmedModal.
      const key = `sbhq_welcomed_${authUser.id}`
      if (!localStorage.getItem(key) && !justConfirmedRef.current) {
        setShowWelcome(true)
      }
    }
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  // ── Auth state bootstrap ────────────────────────────────────────────────────

  useEffect(() => {
    // Are there email-confirmation hash tokens in the URL?
    // If yes, we keep the splash screen up until SIGNED_IN fires so the user
    // never sees a flash of the unauthenticated screen.
    const hasHashTokens = window.location.hash.includes('access_token=')

    // doneLoading() may only fire once — whichever path resolves first wins.
    let finished = false
    function doneLoading() { if (!finished) { finished = true; setLoading(false) } }

    // ── Subscribe FIRST ────────────────────────────────────────────────────────
    // Registering onAuthStateChange before calling getSession() ensures the
    // Supabase SDK parses the URL hash immediately.  Without this ordering,
    // getSession() tries to auto-refresh the stale post-signup token (stored in
    // localStorage after signUp()) before the hash tokens are in scope, which
    // triggers the "Invalid Refresh Token" error.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        loadProfile(session.user).finally(doneLoading)
      } else {
        setProfile(null)
        // On INITIAL_SESSION with no session: if hash tokens are present we
        // expect a SIGNED_IN event to follow — keep loading to avoid the flash.
        if (!(event === 'INITIAL_SESSION' && hasHashTokens)) {
          doneLoading()
        }
      }
    })

    // ── getSession() — loading trigger only, not a loadProfile source ──────────
    // We do NOT call loadProfile here; onAuthStateChange handles that for every
    // event.  Calling it from both places caused concurrent ensureProfile runs
    // (all see 0 rows → all INSERT → first wins, others get 409 → return null →
    // setProfile(null) overwrote the correct profile).
    supabase.auth.getSession().then(({ error }) => {
      // If refresh failed and there are no hash tokens to rescue us, stop loading.
      if (error && !hasHashTokens) doneLoading()
    })

    // Safety valve: if hash tokens are present but expire or fail validation,
    // the SIGNED_IN event never fires — release the splash after 6 s.
    const safetyTimer = hasHashTokens
      ? setTimeout(doneLoading, 6_000)
      : undefined

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ────────────────────────────────────────────────────────────

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error?.message ?? null
  }

  async function signInWithPhone(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    return error?.message ?? null
  }

  async function verifyPhoneOtp(phone: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    return error?.message ?? null
  }

  async function signUpWithEmail(
    email: string, password: string,
    username: string, firstName: string, lastName: string
  ): Promise<{ error: string | null; needsVerification: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, first_name: firstName, last_name: lastName } },
    })
    if (error) return { error: error.message, needsVerification: false }

    // Do NOT call signOut here. The onAuthStateChange(SIGNED_IN) listener will
    // create the profile row via loadProfile → ensureProfile. When the user later
    // confirms their email and returns with hash tokens, ensureProfile will find
    // that row via SELECT and return it without attempting a duplicate INSERT.
    // (Calling signOut raced with loadProfile — the session was cleared before
    // ensureProfile's INSERT could run, making all three in-flight INSERT calls
    // fail with 409 and never create the profile row.)
    return { error: null, needsVerification: !data.user?.email_confirmed_at }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  // ── Provider ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      session, user, profile,
      isAdmin: profile?.role === 'admin',
      loading,
      justConfirmed, clearJustConfirmed,
      showWelcome, clearWelcome,
      signInWithEmail, signInWithGoogle, signInWithPhone,
      verifyPhoneOtp, signUpWithEmail, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
