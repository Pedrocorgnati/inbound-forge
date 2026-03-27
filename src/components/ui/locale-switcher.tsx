'use client'

import * as React from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { routing } from '@/i18n/config'

const LOCALE_LABELS: Record<string, string> = {
  'pt-BR': 'Portugues',
  'en-US': 'English',
  'it-IT': 'Italiano',
  'es-ES': 'Espanol',
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value
    const segments = pathname.split('/')
    segments[1] = nextLocale
    router.replace(segments.join('/'))
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label="Idioma"
      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  )
}
