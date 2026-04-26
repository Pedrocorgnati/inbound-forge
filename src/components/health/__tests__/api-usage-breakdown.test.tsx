// @vitest-environment jsdom
// NOTE: requer `npm install -D jsdom` para rodar com este ambiente
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { mockApiUsageData } from '@/__tests__/mocks/handlers'

vi.mock('@/hooks/useApiUsage', () => ({
  useApiUsage: vi.fn((period: string) => ({
    data: mockApiUsageData,
    isLoading: false,
    totalCostUSD: 0.03,
    error: null,
    period,
  })),
}))

vi.mock('@/components/health/UsageBar', () => ({
  UsageBar: ({ service }: { service: string }) => (
    <div data-testid={`usage-bar-${service}`} />
  ),
}))

import { ApiUsageBreakdown } from '../ApiUsageBreakdown'
import { useApiUsage } from '@/hooks/useApiUsage'

describe('ApiUsageBreakdown', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renderiza o componente com data-testid correto', () => {
    render(<ApiUsageBreakdown />)
    expect(screen.getByTestId('api-usage-breakdown')).toBeDefined()
  })

  it('renderiza UsageBar para cada serviço', () => {
    render(<ApiUsageBreakdown />)
    expect(screen.getByTestId('usage-bar-anthropic')).toBeDefined()
    expect(screen.getByTestId('usage-bar-ideogram')).toBeDefined()
  })

  it('renderiza abas de período (Dia, Semana, Mes)', () => {
    render(<ApiUsageBreakdown />)
    expect(screen.getByTestId('period-tab-day')).toBeDefined()
    expect(screen.getByTestId('period-tab-week')).toBeDefined()
    expect(screen.getByTestId('period-tab-month')).toBeDefined()
  })

  it('aba "month" está selecionada por default', () => {
    render(<ApiUsageBreakdown />)
    const monthTab = screen.getByTestId('period-tab-month')
    expect(monthTab.getAttribute('aria-selected')).toBe('true')
  })

  it('muda período ao clicar na aba "day"', async () => {
    render(<ApiUsageBreakdown />)
    fireEvent.click(screen.getByTestId('period-tab-day'))
    expect(vi.mocked(useApiUsage)).toHaveBeenCalledWith('day')
  })

  it('exibe estado de erro quando error está presente', () => {
    vi.mocked(useApiUsage).mockReturnValue({
      data: null,
      isLoading: false,
      totalCostUSD: 0,
      error: 'Erro de rede',
    })
    render(<ApiUsageBreakdown />)
    expect(screen.getByText('Erro de rede')).toBeDefined()
  })

  it('exibe skeleton no estado de loading', () => {
    vi.mocked(useApiUsage).mockReturnValue({
      data: null,
      isLoading: true,
      totalCostUSD: 0,
      error: null,
    })
    render(<ApiUsageBreakdown />)
    // Barras de uso não devem aparecer no loading
    expect(screen.queryByTestId('usage-bar-anthropic')).toBeNull()
  })
})
