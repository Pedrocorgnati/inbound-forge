'use client'

// Inicializa coleta de Web Vitals (TASK-14 ST004 / CL-278)

import { useEffect } from 'react'
import { registerWebVitals } from '@/lib/web-vitals-reporter'

export function WebVitalsInit() {
  useEffect(() => {
    registerWebVitals()
  }, [])
  return null
}
