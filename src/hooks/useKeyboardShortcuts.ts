'use client'

import { useEffect } from 'react'
import type { ShortcutMap } from '@/types/keyboard'

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target

      // Não disparar em campos de texto (inputs, textareas, contenteditable)
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      // Construir a key combo
      let combo = ''
      if (event.ctrlKey) combo += 'ctrl+'
      if (event.shiftKey) combo += 'shift+'
      if (event.altKey) combo += 'alt+'
      combo += event.key.toLowerCase()

      const shortcut = shortcuts[combo] ?? shortcuts[event.key.toLowerCase()]
      if (!shortcut) return

      event.preventDefault()
      shortcut.onTrigger?.()
    }

    document.addEventListener('keydown', handleKeyDown)

    // Cleanup: remove listener no unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts])
}
