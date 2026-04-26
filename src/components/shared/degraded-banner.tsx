'use client'

/**
 * DegradedBanner — Inbound Forge
 * TASK-2 ST005 / intake-review Graceful Degradation
 *
 * Banner amarelo informando operador sobre serviços degradados (CL-132).
 * Dismissible com re-exibição após 5 minutos.
 */
import React, { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface DegradedBannerProps {
  /** Lista de nomes amigáveis de serviços degradados */
  services: string[]
}

const DISMISS_KEY = 'degraded-banner-dismissed-at'
const REDISPLAY_MS = 5 * 60 * 1000 // 5 minutos

export function DegradedBanner({ services }: DegradedBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (services.length === 0) return

    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10)
        if (elapsed < REDISPLAY_MS) {
          setVisible(false)
          return
        }
      }
    } catch {
      // localStorage indisponível — mostrar banner
    }

    setVisible(true)
  }, [services])

  if (!visible || services.length === 0) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignorar
    }
    setVisible(false)
  }

  const serviceList = services.join(', ')

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 mt-0.5" aria-hidden />
      <div className="flex-1 text-sm">
        <span className="font-semibold">Modo limitado</span>
        {' — '}
        <span>
          {services.length === 1
            ? `${serviceList} temporariamente indisponível.`
            : `Os seguintes serviços estão indisponíveis: ${serviceList}.`}
        </span>{' '}
        <span className="text-yellow-700">
          Você pode continuar navegando. Funcionalidades afetadas serão restauradas automaticamente.
        </span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso de modo limitado"
        className="shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
