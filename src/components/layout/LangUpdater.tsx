'use client'

import { useEffect } from 'react'

/**
 * Atualiza document.documentElement.lang dinamicamente com o locale da rota.
 * Necessário porque o root layout do App Router não tem acesso ao locale param
 * e mantém lang="pt-BR" como fallback. Este componente corrige isso no cliente,
 * garantindo conformidade WCAG 3.1.1 para todos os 4 locales (pt-BR, en-US, it-IT, es-ES).
 */
export function LangUpdater({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
