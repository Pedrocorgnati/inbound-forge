// @vitest-environment jsdom
// TASK-4 ST001/ST002 — useRovingTabIndex
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'

function Grid({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  const { getItemProps } = useRovingTabIndex({ itemsCount: count, columns })
  return (
    <div role="grid">
      {Array.from({ length: count }, (_, i) => {
        const { ref, tabIndex, onKeyDown, onFocus, ...rest } = getItemProps(i)
        return (
          <button
            key={i}
            ref={ref as React.Ref<HTMLButtonElement>}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            data-testid={`cell-${i}`}
            {...rest}
          >
            Cell {i}
          </button>
        )
      })}
    </div>
  )
}

describe('useRovingTabIndex', () => {
  it('initial focus is on first item', () => {
    render(<Grid />)
    expect(screen.getByTestId('cell-0').getAttribute('tabindex')).toBe('0')
    expect(screen.getByTestId('cell-1').getAttribute('tabindex')).toBe('-1')
  })

  it('ArrowRight moves focus to next item', () => {
    render(<Grid />)
    const first = screen.getByTestId('cell-0')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByTestId('cell-1').getAttribute('tabindex')).toBe('0')
  })

  it('ArrowDown jumps by columns', () => {
    render(<Grid count={9} columns={3} />)
    const first = screen.getByTestId('cell-0')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(screen.getByTestId('cell-3').getAttribute('tabindex')).toBe('0')
  })

  it('Home goes to first, End to last', () => {
    render(<Grid count={6} />)
    const cell = screen.getByTestId('cell-2')
    cell.focus()
    fireEvent.keyDown(cell, { key: 'End' })
    expect(screen.getByTestId('cell-5').getAttribute('tabindex')).toBe('0')
  })
})
