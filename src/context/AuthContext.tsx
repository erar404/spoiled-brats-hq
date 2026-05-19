import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRow } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserRow | null
  isAdmin: boolean
  loading: boolean
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
  signInWithEmail: async () => null,
  signInWithGoogle: async () => null,
  signInWithPhone: async () => null,
  verifyPhoneOtp: async () => null,
  signUpWithEmail: async () => ({ error: null, needsVerification: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

async function ensureProfile(authUser: User): Promise<UserRow | null> {
  const { data } = await supabase
    .from('users').select('*').eq('auth_id', authUser.id).single()
  if (data) return data

  const meta = authUser.user_metadata ?? {}
  const base = meta.username || authUser.email?.split('@')[0]
    || (authUser.phone ? `user${authUser.phone.slice(-4)}` : null) || 'user'
  const suffix = meta.username ? '' : `_${Math.random().toString(36).slice(2, 5)}`
  const username = `${base}${suffix}`

  const { data: created } = await supabase.from('users').insert({
    username,
    email: authUser.email ?? null,
    phone: authUser.phone ?? null,
    first_name: meta.first_name ?? (meta.full_name?.split(' ')[0] ?? null),
    last_name: meta.last_name ?? (meta.full_name?.split(' ').slice(1).join(' ') ?? null),
    auth_id: authUser.id,
    role: 'user' as const,
  }).select().single()

  return created ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(authUser: User) {
    const p = await ensureProfile(authUser)
    setProfile(p)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

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
    return { error: null, needsVerification: !data.user?.email_confirmed_at }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile,
      isAdmin: profile?.role === 'admin',
      loading,
      signInWithEmail, signInWithGoogle, signInWithPhone,
      verifyPhoneOtp, signUpWithEmail, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
