import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import { vi, describe, it, expect } from 'vitest'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import type { ShortcutMap } from '@/types/keyboard'

const shortcuts: ShortcutMap = {
  'ctrl+1': { description: 'Dashboard', action: 'navigate', target: '/dashboard' },
}

describe('useKeyboardShortcuts', () => {
  it('[SUCCESS] shortcut dispara fora de input', () => {
    const handler = vi.fn()
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '1') handler()
    })
    renderHook(() => useKeyboardShortcuts(shortcuts))
    fireEvent.keyDown(document, { key: '1', ctrlKey: true })
    expect(handler).toHaveBeenCalled()
  })

  it('[EDGE] NÃO dispara quando foco está em input', () => {
    const prevented = vi.fn()
    renderHook(() => useKeyboardShortcuts(shortcuts))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: '1', ctrlKey: true })
    // preventDefault não deve ter sido chamado pelo hook (foco em input)
    expect(prevented).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('[EDGE] remove listener no unmount sem leaks', () => {
    const spy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts))
    unmount()
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
  })
})
