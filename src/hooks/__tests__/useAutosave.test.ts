import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAutosave } from '../useAutosave'

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('[SUCCESS] dispara onSave após delay', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const delay = 1000

    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, saveFn, delay),
      { initialProps: { data: 'initial' } }
    )

    // Primeira renderização não dispara save (skip first render)
    expect(saveFn).not.toHaveBeenCalled()

    // Mudar data para disparar o debounce
    rerender({ data: 'updated' })

    // Antes do delay: não deve ter chamado
    expect(saveFn).not.toHaveBeenCalled()

    // Avançar o timer e aguardar a promise resolver
    await act(async () => {
      vi.advanceTimersByTime(delay)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith('updated')
    expect(result.current.status).toBe('saved')
    expect(result.current.lastSaved).toBeInstanceOf(Date)
  })

  it('[ERROR] popula error state quando onSave rejeita', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Network error'))
    const delay = 500

    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, saveFn, delay),
      { initialProps: { data: 'v1' } }
    )

    // Mudar data para disparar debounce
    rerender({ data: 'v2' })

    await act(async () => {
      vi.advanceTimersByTime(delay)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('error')
  })

  it('[EDGE] cancela timer no unmount sem chamar onSave', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const delay = 2000

    const { rerender, unmount } = renderHook(
      ({ data }) => useAutosave(data, saveFn, delay),
      { initialProps: { data: 'a' } }
    )

    // Mudar data para agendar o timer
    rerender({ data: 'b' })

    // Unmount antes do delay
    unmount()

    // Avançar além do delay
    await act(async () => {
      vi.advanceTimersByTime(delay + 1000)
    })

    // onSave nunca deve ter sido chamado
    expect(saveFn).not.toHaveBeenCalled()
  })
})
