'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveReturn {
  status: AutosaveStatus
  lastSaved: Date | null
  triggerSave: () => void
}

export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 2000,
  enabled = true
): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveFnRef = useRef(saveFn)
  const dataRef = useRef(data)
  const isMountedRef = useRef(true)
  const isSavingRef = useRef(false)
  const isFirstRender = useRef(true)

  // Keep refs in sync
  saveFnRef.current = saveFn
  dataRef.current = data

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const executeSave = useCallback(async () => {
    if (isSavingRef.current || !isMountedRef.current) return

    isSavingRef.current = true
    setStatus('saving')

    try {
      await saveFnRef.current(dataRef.current)
      if (isMountedRef.current) {
        setStatus('saved')
        setLastSaved(new Date())
      }
    } catch {
      if (isMountedRef.current) {
        setStatus('error')
      }
    } finally {
      isSavingRef.current = false
    }
  }, [])

  const triggerSave = useCallback(() => {
    cancelPending()
    executeSave()
  }, [cancelPending, executeSave])

  // Debounce on data change
  useEffect(() => {
    if (!enabled) return

    // Skip first render to avoid saving initial data
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    cancelPending()

    timeoutRef.current = setTimeout(() => {
      executeSave()
    }, delay)

    return () => {
      cancelPending()
    }
  }, [data, delay, enabled, cancelPending, executeSave])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      cancelPending()
    }
  }, [cancelPending])

  return { status, lastSaved, triggerSave }
}
