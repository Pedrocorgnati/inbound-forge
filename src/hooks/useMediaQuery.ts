'use client'

import { useEffect, useState } from 'react'

/**
 * useMediaQuery — hook reativo para CSS media queries.
 * SSR-safe: retorna `false` no servidor (não match), atualiza no mount.
 *
 * Exemplo:
 *   const isMobile = useMediaQuery('(max-width: 767px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)

    update()

    if (mql.addEventListener) {
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    // Fallback Safari < 14
    mql.addListener(update)
    return () => mql.removeListener(update)
  }, [query])

  return matches
}

export const MOBILE_QUERY = '(max-width: 767px)'
