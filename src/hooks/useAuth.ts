'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import type { User, Session } from '@supabase/supabase-js'

interface SignInResult {
  error?: string
  locked?: boolean
  ttl?: number
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null)
  const [isSessionExpiring, setIsSessionExpiring] = useState(false)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.expires_at) {
        const expiresAt = new Date(s.expires_at * 1000)
        setSessionExpiresAt(expiresAt)
        const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
        if (expiresAt < fiveMinFromNow) {
          setIsSessionExpiring(true)
        }
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setUser(s?.user ?? null)

      if (event === 'TOKEN_REFRESHED' && s) {
        // Silencioso — apenas atualizar estado de expiração
        if (s.expires_at) {
          setSessionExpiresAt(new Date(s.expires_at * 1000))
        }
        setIsSessionExpiring(false)
        setIsSessionExpired(false)
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setIsSessionExpired(true)
        setSessionExpiresAt(null)
      }

      if (event === 'INITIAL_SESSION' && s) {
        if (s.expires_at) {
          const expiresAt = new Date(s.expires_at * 1000)
          setSessionExpiresAt(expiresAt)
          const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
          if (expiresAt < fiveMinFromNow) {
            setIsSessionExpiring(true)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Check session expiring periodically
  useEffect(() => {
    if (!sessionExpiresAt) return
    const interval = setInterval(() => {
      const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
      if (sessionExpiresAt < fiveMinFromNow && !isSessionExpired) {
        setIsSessionExpiring(true)
      }
      if (sessionExpiresAt < new Date()) {
        setIsSessionExpired(true)
        setIsSessionExpiring(false)
      }
    }, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [sessionExpiresAt, isSessionExpired])

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      setIsLoading(true)
      try {
        // 1. Verificar lock ANTES de chamar Supabase (SEC-005)
        const lockRes = await fetch(`/api/auth/check-lock?identifier=${encodeURIComponent(email)}`)
        if (lockRes.ok) {
          const lockData = await lockRes.json()
          if (lockData.locked) {
            return { locked: true, ttl: lockData.ttl }
          }
        }

        // 2. Tentar login via Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          // 3. Incrementar contador de falhas (SEC-005)
          await fetch('/api/auth/increment-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email }),
          })
          // AUTH_001: mensagem genérica — não revelar se email existe
          return { error: 'E-mail ou senha incorretos' }
        }

        // 4. Limpar contador após login bem-sucedido
        await fetch('/api/auth/clear-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: email }),
        })

        setIsSessionExpired(false)
        setIsSessionExpiring(false)
        return {}
      } catch {
        return { error: 'E-mail ou senha incorretos' }
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Saiu com sucesso')
  }, [])

  const refreshSession = useCallback(async () => {
    const { error } = await supabase.auth.refreshSession()
    if (!error) {
      setIsSessionExpiring(false)
    }
  }, [supabase])

  const role = (user?.user_metadata?.role as string) ?? 'OPERATOR'
  const isAuthenticated = !!session

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    role,
    signIn,
    signOut,
    refreshSession,
    sessionExpiresAt,
    isSessionExpiring,
    isSessionExpired,
  }
}
