'use client'

// TASK-4 ST001 — Roving tabindex hook para navegacao por teclado em grids
// Rastreabilidade: CL-267 (A11y baseline)

import { useCallback, useRef, useState, KeyboardEvent } from 'react'

export interface RovingTabIndexOptions {
  itemsCount: number
  columns: number
  /** Ativar o item no Enter/Space */
  onActivate?: (index: number) => void
}

export interface RovingItemProps {
  tabIndex: number
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onFocus: () => void
  ref: (el: HTMLElement | null) => void
  'data-roving-index': number
}

export function useRovingTabIndex({ itemsCount, columns, onActivate }: RovingTabIndexOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemsRef = useRef<Array<HTMLElement | null>>([])

  const focusItem = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(itemsCount - 1, idx))
    setFocusedIndex(clamped)
    const el = itemsRef.current[clamped]
    if (el) el.focus()
  }, [itemsCount])

  const getItemProps = useCallback((index: number): RovingItemProps => ({
    tabIndex: index === focusedIndex ? 0 : -1,
    ref: (el: HTMLElement | null) => {
      itemsRef.current[index] = el
    },
    onFocus: () => setFocusedIndex(index),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      let next = index
      switch (e.key) {
        case 'ArrowRight':
          next = Math.min(itemsCount - 1, index + 1)
          break
        case 'ArrowLeft':
          next = Math.max(0, index - 1)
          break
        case 'ArrowDown':
          next = Math.min(itemsCount - 1, index + columns)
          break
        case 'ArrowUp':
          next = Math.max(0, index - columns)
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = itemsCount - 1
          break
        case 'Enter':
        case ' ':
          if (onActivate) {
            e.preventDefault()
            onActivate(index)
          }
          return
        default:
          return
      }
      e.preventDefault()
      focusItem(next)
    },
    'data-roving-index': index,
  }), [focusedIndex, itemsCount, columns, onActivate, focusItem])

  return { focusedIndex, getItemProps, focusItem }
}
