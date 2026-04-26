'use client'

// Web Vitals reporting — LCP, CLS, INP, FCP, TTFB
// PERF-003: métricas Core Web Vitals para monitoramento em produção
// Sentry captura automaticamente via withSentryConfig, mas este componente
// adiciona visibilidade em dev e permite envio customizado se necessário.

import { useReportWebVitals } from 'next/web-vitals'
import type { Metric } from 'web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric: Metric) => {
    if (process.env.NODE_ENV === 'development') {
      const thresholds: Record<string, number> = {
        LCP: 2500, FCP: 1800, CLS: 0.1, INP: 200, TTFB: 800,
      }
      const threshold = thresholds[metric.name] ?? 2500
      const status = metric.value <= threshold ? '✅' : '⚠️'
      const unit = metric.name === 'CLS' ? '' : 'ms'
      console.log(`[Web Vital] ${status} ${metric.name}: ${metric.value.toFixed(metric.name === 'CLS' ? 4 : 1)}${unit}`)
    }
    // Produção: Sentry captura automaticamente via SDK.
    // Para envio customizado, descomentar:
    // navigator.sendBeacon?.('/api/vitals', JSON.stringify({ name: metric.name, value: metric.value, id: metric.id }))
  })

  return null
}
