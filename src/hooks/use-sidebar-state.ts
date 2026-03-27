'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sidebar:collapsed'

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Hydrate from localStorage + auto-collapse for tablet
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const width = window.innerWidth

      if (width >= 768 && width < 1024) {
        // Tablet: collapse by default
        setCollapsed(true)
      } else if (stored !== null) {
        setCollapsed(stored === 'true')
      }
    } catch {
      console.warn('[Sidebar] localStorage unavailable — using default state')
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        console.warn('[Sidebar] Could not persist collapse state')
      }
      return next
    })
  }, [])

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return { collapsed, mobileOpen, toggleCollapsed, openMobile, closeMobile }
}
