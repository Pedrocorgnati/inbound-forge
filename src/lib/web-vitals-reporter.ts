'use client'

// Web Vitals reporter (TASK-14 ST004 / CL-278)
// Intake-Review TASK-19 ST002 (CL-TR-005): LCP > 2500ms dispara Sentry captureMessage
// tagueado para geracao de issue.
// Encaminha metricas (LCP, INP, CLS, FCP, TTFB) para endpoint interno + Sentry.

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

const ENDPOINT = '/api/v1/vitals'

const THRESHOLDS: Record<string, number> = {
  LCP: 2500,
  FID: 100,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
}

function send(metric: Metric) {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const payload = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    path,
  })

  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon(ENDPOINT, payload)
  } else {
    fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => undefined)
  }

  try {
    const sentry = (globalThis as {
      Sentry?: {
        addBreadcrumb?: (b: unknown) => void
        captureMessage?: (msg: string, opts: unknown) => void
      }
    }).Sentry
    sentry?.addBreadcrumb?.({
      category: 'web-vitals',
      message: `${metric.name} ${metric.rating}`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: { value: metric.value, id: metric.id, path },
    })

    // CL-TR-005: issue Sentry quando metrica ultrapassa threshold.
    const threshold = THRESHOLDS[metric.name]
    if (threshold !== undefined && metric.value > threshold && sentry?.captureMessage) {
      sentry.captureMessage(
        `${metric.name} ${Math.round(metric.value)} acima de ${threshold}`,
        {
          level: 'warning',
          tags: { metric: metric.name.toLowerCase(), path, rating: metric.rating },
          extra: { value: metric.value, id: metric.id },
        },
      )
    }
  } catch {
    // ignore
  }
}

export function registerWebVitals(): void {
  if (typeof window === 'undefined') return
  onCLS(send)
  onFCP(send)
  onINP(send)
  onLCP(send)
  onTTFB(send)
}
