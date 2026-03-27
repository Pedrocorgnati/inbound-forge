'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { KEYBOARD_SHORTCUTS } from '@/constants/keyboard-shortcuts'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'
import { AccountLockBanner } from './AccountLockBanner'
import { GlobalSkeletonAudit } from './GlobalSkeletonAudit'
import type { ShortcutMap } from '@/types/keyboard'

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
  locale: string
  lockReason?: 'invalid_credentials' | 'usage_limit' | null
}

export function KeyboardShortcutsProvider({
  children,
  locale,
  lockReason = null,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const handleLockAction = useCallback(() => {
    if (lockReason === 'invalid_credentials') {
      router.push(`/${locale}/settings`)
    } else if (lockReason === 'usage_limit') {
      router.push(`/${locale}/settings?tab=usage`)
    }
  }, [lockReason, locale, router])

  const shortcutMap: ShortcutMap = useMemo(() => {
    const map: ShortcutMap = {}

    for (const [combo, shortcut] of Object.entries(KEYBOARD_SHORTCUTS)) {
      if (shortcut.action === 'navigate' && shortcut.target) {
        map[combo] = {
          ...shortcut,
          onTrigger: () => router.push(`/${locale}${shortcut.target}`),
        }
      } else if (shortcut.action === 'modal' && shortcut.target === 'shortcuts') {
        map[combo] = {
          ...shortcut,
          onTrigger: () => setShortcutsOpen(true),
        }
      } else {
        map[combo] = { ...shortcut }
      }
    }

    return map
  }, [locale, router])

  useKeyboardShortcuts(shortcutMap)

  return (
    <>
      <AccountLockBanner reason={lockReason} onAction={handleLockAction} />
      {children}
      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <GlobalSkeletonAudit />
    </>
  )
}
