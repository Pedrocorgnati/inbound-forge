'use client'
/**
 * Rastreabilidade: CL-262, TASK-8 ST005
 * Hook que expõe estado de sessão com refresh transparente via Supabase onAuthStateChange.
 * Em TOKEN_REFRESHED: invalida queries SWR/React Query.
 * Em SIGNED_OUT: redireciona para login.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

export interface SessionRefreshState {
  session: Session | null
  isRefreshing: boolean
  lastRefreshAt: Date | null
}

export function useSessionRefresh(): SessionRefreshState {
  const router = useRouter()
  const [state, setState] = useState<SessionRefreshState>({
    session: null,
    isRefreshing: false,
    lastRefreshAt: null,
  })
  const mountedRef = useRef(true)

  const invalidateQueries = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      if (mountedRef.current) {
        setState((s) => ({ ...s, session: data.session }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return

      if (event === 'TOKEN_REFRESHED') {
        setState({ session, isRefreshing: false, lastRefreshAt: new Date() })
        invalidateQueries()
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setState((s) => ({ ...s, session }))
      } else if (event === 'SIGNED_OUT') {
        setState({ session: null, isRefreshing: false, lastRefreshAt: null })
        router.push('/login')
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [router, invalidateQueries])

  return state
}
