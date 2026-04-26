'use client'

// TASK-1 ST004 (CL-029): detecta inatividade do usuario e dispara callback.
// Usado por InactivityNudge para mostrar toast contextual apos 45s sem input.

import { useCallback, useEffect, useRef } from 'react'

interface UseInactivityTimerOptions {
  enabled?: boolean
  events?: (keyof DocumentEventMap)[]
}

const DEFAULT_EVENTS: (keyof DocumentEventMap)[] = [
  'keydown',
  'mousemove',
  'mousedown',
  'touchstart',
  'scroll',
  'input',
]

export function useInactivityTimer(
  idleMs: number,
  onIdle: () => void,
  options: UseInactivityTimerOptions = {}
) {
  const { enabled = true, events = DEFAULT_EVENTS } = options
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onIdleRef.current(), idleMs)
  }, [idleMs])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    reset()

    const handler = () => reset()
    for (const evt of events) {
      document.addEventListener(evt, handler, { passive: true })
    }
    return () => {
      for (const evt of events) document.removeEventListener(evt, handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, events, reset])

  return { reset }
}
